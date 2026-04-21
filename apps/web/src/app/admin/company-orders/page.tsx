"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useUiLanguage } from "../../../lib/ui-language";
import {
  createCompanyOrder,
  getCompanyOrderCatalog,
  getInPersonShopping,
  listCompanyOrders,
  updateInPersonShoppingItem,
  type CompanyOrderCatalogItem,
  type CompanyOrderCatalogSupplier,
  type CompanyOrderRow,
  type InPersonShoppingItem,
  type InPersonShoppingWeek,
} from "../../../lib/api/company-orders-admin";

type CompanyOrdersTab = "placeOrder" | "inPersonShopping";

type CartItem = {
  supplierName: string;
  key: string;
  nameEs: string;
  nameEn: string;
  quantity: number;
};

type ShoppingDraft = {
  purchasedQuantity: string;
  price: string;
};

type ShoppingSearchResult = {
  supplierName: string;
  item: InPersonShoppingItem;
};

const companyOrderItemKey = (nameEs: string, nameEn: string) =>
  `${nameEs.trim().toLowerCase()}|${nameEn.trim().toLowerCase()}`;

const normalizeDecimalInput = (value: string) => {
  const trimmed = value.replace(/,/g, ".").replace(/[^\d.]/g, "");
  if (!trimmed) {
    return "";
  }
  const parts = trimmed.split(".");
  const integerPart = parts[0] || "0";
  const decimalPart = parts.slice(1).join("").slice(0, 2);
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
};

const parsePositiveDecimal = (value: string) => {
  const parsed = Number(value || "0");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return Number(parsed.toFixed(2));
};

const formatDecimalValue = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }
  return Number(value.toFixed(2)).toString();
};

const clampDecimal = (value: number, max: number) =>
  Number(Math.max(0, Math.min(value, max)).toFixed(2));

const formatDate = (value: string) => {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return `${month}/${day}/${year.slice(-2)}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });
};

const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getCurrentWeekStartDateKey = () => {
  const now = new Date();
  const utcDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const day = utcDate.getUTCDay();
  const distanceToMonday = (day + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - distanceToMonday);
  return utcDate.toISOString().slice(0, 10);
};

const addDaysToDateKey = (dateKey: string, days: number) => {
  const parsed = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return dateKey;
  }
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
};

const formatWeekLabel = (weekStartDate: string) =>
  `${formatDate(weekStartDate)} - ${formatDate(addDaysToDateKey(weekStartDate, 6))}`;

const openWeekExport = (
  format: "pdf" | "csv" | "excel",
  weekStartDate: string,
) => {
  const query = new URLSearchParams();
  query.set("format", format);
  query.set("weekStart", weekStartDate || getCurrentWeekStartDateKey());
  query.set("downloadTs", String(Date.now()));
  window.open(
    `/api/company-orders/export?${query.toString()}`,
    "_blank",
    "noopener,noreferrer",
  );
};

const openOrderPdf = (orderId: string) => {
  const query = new URLSearchParams();
  query.set("downloadTs", String(Date.now()));
  window.open(
    `/api/company-orders/${encodeURIComponent(orderId)}/pdf?${query.toString()}`,
    "_blank",
    "noopener,noreferrer",
  );
};

const supplierDraftItems = (
  supplier: CompanyOrderCatalogSupplier,
  draftQuantities: Record<string, string> | undefined,
) =>
  supplier.items
    .map((item) => {
      const key = companyOrderItemKey(item.nameEs, item.nameEn);
      const quantity = Number(draftQuantities?.[key] || "");
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return null;
      }
      return {
        key,
        nameEs: item.nameEs,
        nameEn: item.nameEn,
        quantity,
      };
    })
    .filter(
      (
        item,
      ): item is {
        key: string;
        nameEs: string;
        nameEn: string;
        quantity: number;
      } => Boolean(item),
    );

const buildShoppingDraftMap = (data: InPersonShoppingWeek | null) => {
  const next: Record<string, ShoppingDraft> = {};
  data?.suppliers.forEach((supplier) => {
    supplier.items.forEach((item) => {
      next[item.rowKey] = {
        purchasedQuantity: formatDecimalValue(item.purchasedQuantity),
        price: formatDecimalValue(item.price),
      };
    });
  });
  return next;
};

const buildShoppingDraft = (item: InPersonShoppingItem): ShoppingDraft => ({
  purchasedQuantity: formatDecimalValue(item.purchasedQuantity),
  price: formatDecimalValue(item.price),
});

export default function AdminCompanyOrdersPage() {
  const lang = useUiLanguage();
  const tr = useCallback(
    (en: string, es: string) => (lang === "es" ? es : en),
    [lang],
  );
  const currentWeekStart = useMemo(() => getCurrentWeekStartDateKey(), []);

  const [activeTab, setActiveTab] = useState<CompanyOrdersTab>("placeOrder");
  const [catalog, setCatalog] = useState<CompanyOrderCatalogSupplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [notes, setNotes] = useState("");
  const [supplierDrafts, setSupplierDrafts] = useState<
    Record<string, Record<string, string>>
  >({});
  const [orders, setOrders] = useState<CompanyOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [lastSubmittedWeekStart, setLastSubmittedWeekStart] =
    useState(currentWeekStart);

  const [shoppingWeekStart, setShoppingWeekStart] = useState(currentWeekStart);
  const [shoppingData, setShoppingData] = useState<InPersonShoppingWeek | null>(
    null,
  );
  const [shoppingDrafts, setShoppingDrafts] = useState<
    Record<string, ShoppingDraft>
  >({});
  const [shoppingSupplier, setShoppingSupplier] = useState("");
  const [shoppingSearchTerm, setShoppingSearchTerm] = useState("");
  const [shoppingLoading, setShoppingLoading] = useState(false);
  const [shoppingSavingKey, setShoppingSavingKey] = useState<string | null>(
    null,
  );
  const [shoppingStatus, setShoppingStatus] = useState<string | null>(null);

  const supplier = useMemo(
    () =>
      catalog.find((entry) => entry.supplierName === selectedSupplier) ?? null,
    [catalog, selectedSupplier],
  );
  const deferredSearchTerm = useDeferredValue(searchTerm.trim().toLowerCase());
  const deferredShoppingSearchTerm = useDeferredValue(
    shoppingSearchTerm.trim().toLowerCase(),
  );

  const filteredItems = useMemo(() => {
    const source = supplier?.items || [];
    const lookup = deferredSearchTerm;
    if (!lookup) {
      return source;
    }
    return source.filter((item) => {
      const spanish = item.nameEs.toLowerCase();
      const english = item.nameEn.toLowerCase();
      return spanish.includes(lookup) || english.includes(lookup);
    });
  }, [deferredSearchTerm, supplier]);

  const cartItems = useMemo<CartItem[]>(
    () =>
      catalog.flatMap((entry) =>
        supplierDraftItems(entry, supplierDrafts[entry.supplierName]).map(
          (item) => ({
            supplierName: entry.supplierName,
            key: item.key,
            nameEs: item.nameEs,
            nameEn: item.nameEn,
            quantity: item.quantity,
          }),
        ),
      ),
    [catalog, supplierDrafts],
  );

  const selectedItemCount = cartItems.length;

  const selectedSupplierCount = useMemo(
    () => new Set(cartItems.map((item) => item.supplierName)).size,
    [cartItems],
  );

  const selectedUnitTotal = useMemo(
    () =>
      Number(
        cartItems.reduce((sum, item) => sum + item.quantity, 0).toFixed(2),
      ),
    [cartItems],
  );

  const availableWeekStarts = useMemo(() => {
    const values = new Set<string>([currentWeekStart]);
    orders.forEach((order) => {
      if (order.weekStartDate) {
        values.add(order.weekStartDate);
      }
    });
    if (shoppingData?.weekStartDate) {
      values.add(shoppingData.weekStartDate);
    }
    return Array.from(values).sort((a, b) => b.localeCompare(a));
  }, [currentWeekStart, orders, shoppingData?.weekStartDate]);

  const selectedShoppingSupplier = useMemo(
    () =>
      shoppingData?.suppliers.find(
        (entry) => entry.supplierName === shoppingSupplier,
      ) ?? null,
    [shoppingData, shoppingSupplier],
  );

  const filteredShoppingItems = useMemo(() => {
    const source = selectedShoppingSupplier?.items || [];
    const lookup = deferredShoppingSearchTerm;
    if (!lookup) {
      return source;
    }
    return source.filter((item) => {
      const spanish = item.nameEs.toLowerCase();
      const english = item.nameEn.toLowerCase();
      return spanish.includes(lookup) || english.includes(lookup);
    });
  }, [deferredShoppingSearchTerm, selectedShoppingSupplier]);

  const shoppingSearchResults = useMemo<ShoppingSearchResult[]>(() => {
    if (!deferredShoppingSearchTerm) {
      return [];
    }
    return (shoppingData?.suppliers || []).flatMap((supplierEntry) =>
      supplierEntry.items
        .filter((item) => {
          const spanish = item.nameEs.toLowerCase();
          const english = item.nameEn.toLowerCase();
          return (
            spanish.includes(deferredShoppingSearchTerm) ||
            english.includes(deferredShoppingSearchTerm)
          );
        })
        .map((item) => ({
          supplierName: supplierEntry.supplierName,
          item,
        })),
    );
  }, [deferredShoppingSearchTerm, shoppingData?.suppliers]);

  const loadCatalog = useCallback(async () => {
    const suppliers = await getCompanyOrderCatalog();
    setCatalog(suppliers);
    setSelectedSupplier((previous) => {
      if (
        previous &&
        suppliers.some((entry) => entry.supplierName === previous)
      ) {
        return previous;
      }
      return suppliers[0]?.supplierName || "";
    });
  }, []);

  const loadOrders = useCallback(async () => {
    const nextOrders = await listCompanyOrders(40);
    setOrders(nextOrders);
    const newestWeekStart = nextOrders[0]?.weekStartDate || currentWeekStart;
    setLastSubmittedWeekStart(newestWeekStart);
    setShoppingWeekStart((previous) => {
      const knownWeeks = new Set<string>([
        currentWeekStart,
        ...nextOrders
          .map((order) => order.weekStartDate || "")
          .filter((value) => Boolean(value)),
      ]);
      if (previous && knownWeeks.has(previous)) {
        return previous;
      }
      return newestWeekStart;
    });
  }, [currentWeekStart]);

  const loadShopping = useCallback(
    async (weekStartDate: string) => {
      const requestedWeek = weekStartDate || currentWeekStart;
      setShoppingLoading(true);
      setShoppingStatus(null);
      try {
        const nextShopping = await getInPersonShopping(requestedWeek);
        setShoppingData(nextShopping);
        setShoppingDrafts(buildShoppingDraftMap(nextShopping));
        setShoppingSupplier((previous) => {
          if (
            previous &&
            nextShopping.suppliers.some(
              (entry) => entry.supplierName === previous,
            )
          ) {
            return previous;
          }
          return nextShopping.suppliers[0]?.supplierName || "";
        });
      } catch (error) {
        setShoppingData(null);
        setShoppingDrafts({});
        setShoppingSupplier("");
        setShoppingStatus(
          error instanceof Error
            ? error.message
            : tr(
                "Unable to load in person shopping.",
                "No se pudo cargar la compra en persona.",
              ),
        );
      } finally {
        setShoppingLoading(false);
      }
    },
    [currentWeekStart, tr],
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    try {
      await Promise.all([loadCatalog(), loadOrders()]);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : tr(
              "Unable to load company orders.",
              "No se pudieron cargar las órdenes de empresa.",
            ),
      );
    } finally {
      setLoading(false);
    }
  }, [loadCatalog, loadOrders, tr]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    void loadShopping(shoppingWeekStart);
  }, [loadShopping, shoppingWeekStart]);

  const setDraftQuantity = (
    supplierName: string,
    key: string,
    rawValue: string,
  ) => {
    const normalized = normalizeDecimalInput(rawValue);
    setSupplierDrafts((prev) => {
      const currentSupplierValues = prev[supplierName] || {};
      if (!normalized) {
        if (!(key in currentSupplierValues)) {
          return prev;
        }
        const nextSupplierValues = { ...currentSupplierValues };
        delete nextSupplierValues[key];
        const next = { ...prev };
        if (Object.keys(nextSupplierValues).length === 0) {
          delete next[supplierName];
        } else {
          next[supplierName] = nextSupplierValues;
        }
        return next;
      }

      if (currentSupplierValues[key] === normalized) {
        return prev;
      }

      return {
        ...prev,
        [supplierName]: {
          ...currentSupplierValues,
          [key]: normalized,
        },
      };
    });
  };

  const handleAddItem = (
    supplierName: string,
    item: CompanyOrderCatalogItem,
  ) => {
    const key = companyOrderItemKey(item.nameEs, item.nameEn);
    const current = Number((supplierDrafts[supplierName] || {})[key] || "0");
    const next = Number.isFinite(current) && current > 0 ? current + 1 : 1;
    setDraftQuantity(supplierName, key, String(next));
  };

  const handleRemoveItem = (supplierName: string, key: string) => {
    setDraftQuantity(supplierName, key, "");
  };

  const handleStepItemQuantity = (
    supplierName: string,
    key: string,
    delta: number,
  ) => {
    const current = Number((supplierDrafts[supplierName] || {})[key] || "0");
    const next = Number((current + delta).toFixed(2));
    if (!Number.isFinite(next) || next <= 0) {
      setDraftQuantity(supplierName, key, "");
      return;
    }
    setDraftQuantity(supplierName, key, String(next));
  };

  const handleSubmit = async () => {
    const payloadBySupplier = new Map<
      string,
      Array<{ nameEs: string; nameEn: string; quantity: number }>
    >();
    cartItems.forEach((item) => {
      const supplierItems = payloadBySupplier.get(item.supplierName) || [];
      supplierItems.push({
        nameEs: item.nameEs,
        nameEn: item.nameEn,
        quantity: item.quantity,
      });
      payloadBySupplier.set(item.supplierName, supplierItems);
    });
    const supplierPayloads = Array.from(payloadBySupplier.entries()).map(
      ([supplierName, items]) => ({ supplierName, items }),
    );

    if (supplierPayloads.length === 0) {
      setStatus(
        tr(
          "Add at least one item to the cart.",
          "Agrega al menos un artículo al carrito.",
        ),
      );
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      let weekStart = lastSubmittedWeekStart;
      for (const payload of supplierPayloads) {
        const createdOrder = await createCompanyOrder({
          supplierName: payload.supplierName,
          notes: notes.trim() || undefined,
          items: payload.items,
        });
        if (typeof createdOrder.weekStartDate === "string") {
          weekStart = createdOrder.weekStartDate;
        }
      }

      setLastSubmittedWeekStart(weekStart);
      setShoppingWeekStart(weekStart);
      setSupplierDrafts({});
      setSearchTerm("");
      setNotes("");
      setStatus(
        tr(
          `Company order saved for ${supplierPayloads.length} suppliers. You can continue in In Person Shopping or export the week order.`,
          `Orden de empresa guardada para ${supplierPayloads.length} proveedores. Puedes continuar en Compra en Persona o exportar la orden semanal.`,
        ),
      );
      await loadOrders();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : tr(
              "Unable to save company order.",
              "No se pudo guardar la orden de empresa.",
            ),
      );
    } finally {
      setSaving(false);
    }
  };

  const getShoppingDraft = useCallback(
    (item: InPersonShoppingItem): ShoppingDraft =>
      shoppingDrafts[item.rowKey] || buildShoppingDraft(item),
    [shoppingDrafts],
  );

  const setShoppingDraftField = useCallback(
    (
      item: InPersonShoppingItem,
      field: keyof ShoppingDraft,
      rawValue: string,
    ) => {
      const normalized = normalizeDecimalInput(rawValue);
      setShoppingDrafts((prev) => {
        const current = prev[item.rowKey] || buildShoppingDraft(item);
        return {
          ...prev,
          [item.rowKey]: {
            ...current,
            [field]: normalized,
          },
        };
      });
    },
    [],
  );

  const resetShoppingDraft = useCallback((item: InPersonShoppingItem) => {
    setShoppingDrafts((prev) => ({
      ...prev,
      [item.rowKey]: buildShoppingDraft(item),
    }));
  }, []);

  const stepShoppingQuantity = useCallback(
    (item: InPersonShoppingItem, delta: number) => {
      setShoppingDrafts((prev) => {
        const current = prev[item.rowKey] || buildShoppingDraft(item);
        const currentQuantity = parsePositiveDecimal(current.purchasedQuantity);
        const next = clampDecimal(
          currentQuantity + delta,
          item.orderedQuantity,
        );
        return {
          ...prev,
          [item.rowKey]: {
            ...current,
            purchasedQuantity: formatDecimalValue(next),
          },
        };
      });
    },
    [],
  );

  const isShoppingItemDirty = useCallback(
    (item: InPersonShoppingItem) => {
      const draft = getShoppingDraft(item);
      return (
        parsePositiveDecimal(draft.purchasedQuantity) !==
          item.purchasedQuantity ||
        parsePositiveDecimal(draft.price) !== item.price
      );
    },
    [getShoppingDraft],
  );

  const handleSaveShoppingItem = useCallback(
    async (supplierName: string, item: InPersonShoppingItem) => {
      const draft = getShoppingDraft(item);
      const purchasedQuantity = clampDecimal(
        parsePositiveDecimal(draft.purchasedQuantity),
        item.orderedQuantity,
      );
      const price = parsePositiveDecimal(draft.price);

      setShoppingSavingKey(item.rowKey);
      setShoppingStatus(null);
      try {
        await updateInPersonShoppingItem({
          weekStart: shoppingWeekStart,
          supplierName,
          nameEs: item.nameEs,
          nameEn: item.nameEn,
          purchasedQuantity,
          price,
        });
        await loadShopping(shoppingWeekStart);
        setShoppingStatus(
          tr("In person shopping updated.", "Compra en persona actualizada."),
        );
      } catch (error) {
        setShoppingStatus(
          error instanceof Error
            ? error.message
            : tr(
                "Unable to save in person shopping item.",
                "No se pudo guardar el artículo de compra en persona.",
              ),
        );
      } finally {
        setShoppingSavingKey(null);
      }
    },
    [getShoppingDraft, loadShopping, shoppingWeekStart, tr],
  );

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <div>
          <h1>Company Orders</h1>
          <p className="text-muted mb-0">
            {tr(
              "Build weekly supplier orders, then track what gets purchased in person before exporting the final order sheet.",
              "Crea órdenes semanales a proveedores y luego controla lo que se compra en persona antes de exportar la hoja final.",
            )}
          </p>
        </div>
        <div className="admin-actions">
          <button
            className="btn btn-outline-secondary"
            onClick={() => {
              void loadAll();
              void loadShopping(shoppingWeekStart);
            }}
            disabled={loading || shoppingLoading}
          >
            {loading || shoppingLoading
              ? tr("Refreshing...", "Actualizando...")
              : tr("Refresh", "Actualizar")}
          </button>
        </div>
      </div>

      <div className="admin-card d-flex flex-column gap-3">
        <div className="d-flex flex-column flex-xl-row justify-content-between gap-3 align-items-xl-end">
          <div>
            <h2 className="h5 mb-1">
              {tr("Weekly Export", "Exportación Semanal")}
            </h2>
            <p className="text-muted mb-0">
              {tr(
                "Exports use the selected week and subtract anything already marked in In Person Shopping.",
                "Las exportaciones usan la semana seleccionada y restan todo lo ya marcado en Compra en Persona.",
              )}
            </p>
          </div>

          <div className="d-flex flex-wrap gap-2 align-items-end">
            <div>
              <label className="form-label mb-1">{tr("Week", "Semana")}</label>
              <select
                className="form-select"
                value={shoppingWeekStart}
                onChange={(event) => setShoppingWeekStart(event.target.value)}
              >
                {availableWeekStarts.map((weekStartDate) => (
                  <option key={`week-${weekStartDate}`} value={weekStartDate}>
                    {formatWeekLabel(weekStartDate)}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-outline-secondary"
              onClick={() => openWeekExport("pdf", shoppingWeekStart)}
            >
              {tr("Download PDF", "Descargar PDF")}
            </button>
            <button
              className="btn btn-outline-secondary"
              onClick={() => openWeekExport("csv", shoppingWeekStart)}
            >
              {tr("Download CSV", "Descargar CSV")}
            </button>
            <button
              className="btn btn-outline-secondary"
              onClick={() => openWeekExport("excel", shoppingWeekStart)}
            >
              {tr("Download Excel", "Descargar Excel")}
            </button>
          </div>
        </div>
      </div>

      <div className="admin-card d-flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn ${
            activeTab === "placeOrder" ? "btn-primary" : "btn-outline-secondary"
          }`}
          onClick={() => setActiveTab("placeOrder")}
        >
          {tr("Place Order", "Crear Orden")}
        </button>
        <button
          type="button"
          className={`btn ${
            activeTab === "inPersonShopping"
              ? "btn-primary"
              : "btn-outline-secondary"
          }`}
          onClick={() => setActiveTab("inPersonShopping")}
        >
          {tr("In Person Shopping", "Compra en Persona")}
        </button>
      </div>

      {activeTab === "placeOrder" ? (
        <>
          <div className="row g-4 align-items-start">
            <div className="col-12 col-xxl-8">
              <div className="admin-card d-flex flex-column gap-3">
                <div>
                  <h2 className="h4 mb-1">
                    {tr("Create Order", "Crear Orden")}
                  </h2>
                  <p className="text-muted mb-0">
                    {tr(
                      "Select a supplier, search items, and add to cart.",
                      "Selecciona un proveedor, busca artículos y agrégalos al carrito.",
                    )}
                  </p>
                </div>

                <div className="d-flex flex-wrap gap-2">
                  {catalog.map((entry) => {
                    const active = entry.supplierName === selectedSupplier;
                    const supplierSelectedCount = Object.values(
                      supplierDrafts[entry.supplierName] || {},
                    ).filter((value) => Number(value) > 0).length;
                    return (
                      <button
                        key={`supplier-${entry.supplierName}`}
                        type="button"
                        className={`btn btn-sm ${
                          active ? "btn-primary" : "btn-outline-secondary"
                        }`}
                        onClick={() => setSelectedSupplier(entry.supplierName)}
                      >
                        {entry.supplierName}
                        {supplierSelectedCount > 0
                          ? ` (${supplierSelectedCount})`
                          : ""}
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="form-label">
                    {tr("Search Item", "Buscar Artículo")}
                  </label>
                  <input
                    className="form-control"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={tr("Search items...", "Buscar artículos...")}
                  />
                </div>

                {supplier ? (
                  <div
                    className="row g-2"
                    style={{ maxHeight: 560, overflowY: "auto" }}
                  >
                    {filteredItems.length === 0 ? (
                      <div className="col-12 text-muted">
                        {tr(
                          "No items match this supplier/search.",
                          "No hay artículos que coincidan con este proveedor/búsqueda.",
                        )}
                      </div>
                    ) : (
                      filteredItems.map((item) => {
                        const key = companyOrderItemKey(
                          item.nameEs,
                          item.nameEn,
                        );
                        const quantityInCart = Number(
                          (supplierDrafts[supplier.supplierName] || {})[key] ||
                            "0",
                        );
                        return (
                          <div className="col-12 col-xl-6" key={`item-${key}`}>
                            <div className="d-flex align-items-center gap-3 border rounded p-2 h-100">
                              <div className="flex-grow-1">
                                <div className="fw-semibold">{item.nameEs}</div>
                                <div className="text-muted small">
                                  {item.nameEn}
                                </div>
                              </div>
                              {quantityInCart > 0 ? (
                                <span className="badge text-bg-secondary">
                                  {tr("In cart:", "En carrito:")}{" "}
                                  {quantityInCart}
                                </span>
                              ) : null}
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                onClick={() =>
                                  handleAddItem(supplier.supplierName, item)
                                }
                              >
                                {tr("Add", "Agregar")}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : (
                  <div className="text-muted">
                    {tr(
                      "No supplier catalog is available.",
                      "No hay catálogo de proveedores disponible.",
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="col-12 col-xxl-4 d-flex flex-column gap-3">
              <div className="admin-card d-flex flex-column gap-3">
                <h2 className="h4 mb-0">
                  {tr("Order Summary", "Resumen de Orden")}
                </h2>
                <div className="text-muted small">
                  {selectedSupplierCount} {tr("suppliers", "proveedores")} |{" "}
                  {selectedItemCount} {tr("items", "artículos")} |{" "}
                  {tr("total qty", "cantidad total")} {selectedUnitTotal}
                </div>

                {cartItems.length === 0 ? (
                  <div className="empty-state">
                    {tr(
                      "No items added yet.",
                      "Aún no hay artículos agregados.",
                    )}
                  </div>
                ) : (
                  <div
                    className="d-flex flex-column gap-2"
                    style={{ maxHeight: 380, overflowY: "auto" }}
                  >
                    {cartItems.map((item) => (
                      <div
                        key={`cart-${item.supplierName}-${item.key}`}
                        className="border rounded p-2 d-flex flex-column gap-2"
                      >
                        <div className="fw-semibold">{item.nameEs}</div>
                        <div className="text-muted small">{item.nameEn}</div>
                        <div className="text-muted small">
                          {tr("Supplier:", "Proveedor:")} {item.supplierName}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() =>
                              handleStepItemQuantity(
                                item.supplierName,
                                item.key,
                                -1,
                              )
                            }
                          >
                            -
                          </button>
                          <input
                            className="form-control form-control-sm"
                            style={{ maxWidth: 90 }}
                            value={String(item.quantity)}
                            inputMode="decimal"
                            onChange={(event) =>
                              setDraftQuantity(
                                item.supplierName,
                                item.key,
                                event.target.value,
                              )
                            }
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() =>
                              handleStepItemQuantity(
                                item.supplierName,
                                item.key,
                                1,
                              )
                            }
                          >
                            +
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm ms-auto"
                            onClick={() =>
                              handleRemoveItem(item.supplierName, item.key)
                            }
                          >
                            {tr("Remove", "Quitar")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  {saving
                    ? tr("Saving...", "Guardando...")
                    : tr(
                        `Submit Order (${selectedItemCount})`,
                        `Enviar Orden (${selectedItemCount})`,
                      )}
                </button>
              </div>

              <div className="admin-card d-flex flex-column gap-3">
                <h2 className="h5 mb-0">
                  {tr(
                    "Order Notes & Comments",
                    "Notas y Comentarios de la Orden",
                  )}
                </h2>
                <div>
                  <label className="form-label">
                    {tr("Notes (optional)", "Notas (opcional)")}
                  </label>
                  <textarea
                    className="form-control"
                    rows={5}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder={tr(
                      "Add any notes or comments for this order...",
                      "Agrega notas o comentarios para esta orden...",
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          {status && <div className="text-muted">{status}</div>}

          <div className="admin-card d-flex flex-column gap-3">
            <div className="d-flex justify-content-between align-items-center gap-2">
              <h2 className="h5 m-0">
                {tr("Recent Company Orders", "Órdenes Recientes de Empresa")}
              </h2>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  void loadOrders();
                }}
                disabled={loading}
              >
                {tr("Refresh", "Actualizar")}
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="empty-state">
                {tr("No company orders yet.", "Aún no hay órdenes de empresa.")}
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {orders.map((order) => (
                  <div className="border rounded p-3" key={order.id}>
                    <div className="d-flex flex-column flex-md-row gap-3 align-items-start">
                      <div className="flex-grow-1">
                        <div className="fw-semibold">
                          {tr("Order of the Week", "Orden de la Semana")}
                        </div>
                        <div className="text-muted small">
                          {tr("Suppliers:", "Proveedores:")}{" "}
                          {Array.isArray(order.supplierNames) &&
                          order.supplierNames.length > 0
                            ? order.supplierNames.join(", ")
                            : order.supplierName}
                        </div>
                        {order.orderLabel ? (
                          <div className="text-muted small">
                            {order.orderLabel}
                          </div>
                        ) : null}
                        <div className="text-muted small">
                          {tr("Created:", "Creada:")}{" "}
                          {formatDateTime(order.createdAt)}
                        </div>
                        <div className="text-muted small">
                          {tr("Last modified:", "Última modificación:")}{" "}
                          {formatDateTime(order.updatedAt || order.orderDate)} |{" "}
                          {order.itemCount} {tr("items", "artículos")} |{" "}
                          {order.totalQuantity}
                        </div>
                        <div className="fw-semibold small text-primary-emphasis">
                          {tr("Restaurant:", "Ubicación:")}{" "}
                          {order.officeName ||
                            tr("All locations", "Todas las ubicaciones")}
                          {order.createdBy
                            ? lang === "es"
                              ? ` | por ${order.createdBy}`
                              : ` | by ${order.createdBy}`
                            : ""}
                        </div>
                        {Array.isArray(order.contributors) &&
                        order.contributors.length > 0 ? (
                          <div className="text-muted small">
                            {tr("Contributors:", "Contribuyentes:")}{" "}
                            {order.contributors.join(", ")}
                          </div>
                        ) : null}
                        {order.notes ? (
                          <div className="mt-2">{order.notes}</div>
                        ) : null}
                      </div>

                      <div
                        className="d-flex flex-column gap-2 ms-md-auto"
                        style={{ minWidth: 220 }}
                      >
                        <button
                          type="button"
                          className="btn btn-primary btn-sm text-nowrap"
                          onClick={() => openOrderPdf(order.id)}
                        >
                          {tr(
                            "Download Order PDF",
                            "Descargar PDF de la Orden",
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm text-nowrap"
                          onClick={() =>
                            openWeekExport(
                              "csv",
                              order.weekStartDate || lastSubmittedWeekStart,
                            )
                          }
                        >
                          {tr("Download Week CSV", "Descargar CSV Semanal")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm text-nowrap"
                          onClick={() =>
                            openWeekExport(
                              "excel",
                              order.weekStartDate || lastSubmittedWeekStart,
                            )
                          }
                        >
                          {tr("Download Week Excel", "Descargar Excel Semanal")}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {shoppingStatus && <div className="text-muted">{shoppingStatus}</div>}

          <div className="row g-4 align-items-start">
            <div className="col-12 col-xxl-3">
              <div className="admin-card d-flex flex-column gap-3">
                <div>
                  <h2 className="h4 mb-1">
                    {tr("Supplier Tabs", "Pestañas por Proveedor")}
                  </h2>
                  <p className="text-muted mb-0">
                    {tr(
                      "Mark what gets bought in person. The weekly export will only print what remains.",
                      "Marca lo que se compra en persona. La exportación semanal solo imprimirá lo que quede pendiente.",
                    )}
                  </p>
                </div>

                <div>
                  <label className="form-label">
                    {tr("Search Item", "Buscar Artículo")}
                  </label>
                  <input
                    className="form-control"
                    value={shoppingSearchTerm}
                    onChange={(event) =>
                      setShoppingSearchTerm(event.target.value)
                    }
                    placeholder={tr("Search items...", "Buscar artículos...")}
                  />
                </div>

                <div className="small text-muted">
                  {tr("Week:", "Semana:")} {formatWeekLabel(shoppingWeekStart)}
                  <br />
                  {tr("Location:", "Ubicación:")}{" "}
                  {shoppingData?.locationLabel ||
                    tr("All locations", "Todas las ubicaciones")}
                </div>

                {shoppingLoading ? (
                  <div className="text-muted">
                    {tr(
                      "Loading shopping list...",
                      "Cargando lista de compra...",
                    )}
                  </div>
                ) : !shoppingData || shoppingData.suppliers.length === 0 ? (
                  <div className="empty-state">
                    {tr(
                      "No company orders found for this week yet.",
                      "Aún no hay órdenes de empresa para esta semana.",
                    )}
                  </div>
                ) : (
                  <div
                    className="d-flex flex-column gap-2"
                    style={{ maxHeight: 560, overflowY: "auto" }}
                  >
                    {shoppingData.suppliers.map((entry) => {
                      const active = entry.supplierName === shoppingSupplier;
                      return (
                        <button
                          key={`shopping-supplier-${entry.supplierName}`}
                          type="button"
                          className={`btn text-start ${
                            active ? "btn-primary" : "btn-outline-secondary"
                          }`}
                          onClick={() =>
                            setShoppingSupplier(entry.supplierName)
                          }
                        >
                          <div className="fw-semibold">
                            {entry.supplierName}
                          </div>
                          <div className="small">
                            {tr("Remaining items", "Artículos pendientes")}:{" "}
                            {entry.remainingItemCount}/{entry.itemCount}
                          </div>
                          <div className="small">
                            {tr("Remaining qty", "Cantidad pendiente")}:{" "}
                            {entry.totalRemainingQuantity}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="col-12 col-xxl-9">
              <div className="admin-card d-flex flex-column gap-3">
                <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between">
                  <div>
                    <h2 className="h4 mb-1">
                      {deferredShoppingSearchTerm
                        ? tr("Search Results", "Resultados de Búsqueda")
                        : selectedShoppingSupplier?.supplierName ||
                          tr("In Person Shopping", "Compra en Persona")}
                    </h2>
                    <p className="text-muted mb-0">
                      {tr(
                        deferredShoppingSearchTerm
                          ? "Search works across every supplier tab. Save the bought quantity and price, and anything left at zero remaining will disappear from the weekly company order export."
                          : "Use bought quantity and price. Anything left at zero remaining will disappear from the weekly company order export.",
                        deferredShoppingSearchTerm
                          ? "La búsqueda funciona en todas las pestañas de proveedor. Guarda la cantidad comprada y el precio, y todo lo que quede en cero pendiente desaparecerá de la exportación semanal."
                          : "Usa la cantidad comprada y el precio. Todo lo que quede en cero pendiente desaparecerá de la exportación semanal.",
                      )}
                    </p>
                  </div>

                  <div className="d-flex flex-wrap gap-2 small text-muted">
                    <span className="badge text-bg-light">
                      {tr("Ordered", "Ordenado")}:{" "}
                      {shoppingData?.totalOrderedQuantity || 0}
                    </span>
                    <span className="badge text-bg-light">
                      {tr("Bought", "Comprado")}:{" "}
                      {shoppingData?.totalPurchasedQuantity || 0}
                    </span>
                    <span className="badge text-bg-warning">
                      {tr("Remaining", "Pendiente")}:{" "}
                      {shoppingData?.totalRemainingQuantity || 0}
                    </span>
                    <span className="badge text-bg-secondary">
                      {tr("Price total", "Precio total")}: $
                      {shoppingData?.totalPrice.toFixed(2) || "0.00"}
                    </span>
                  </div>
                </div>

                {!deferredShoppingSearchTerm && !selectedShoppingSupplier ? (
                  <div className="empty-state">
                    {tr(
                      "Choose a supplier tab to manage in person shopping.",
                      "Elige una pestaña de proveedor para administrar la compra en persona.",
                    )}
                  </div>
                ) : deferredShoppingSearchTerm &&
                  shoppingSearchResults.length === 0 ? (
                  <div className="empty-state">
                    {tr(
                      "No items match this search.",
                      "No hay artículos que coincidan con esta búsqueda.",
                    )}
                  </div>
                ) : !deferredShoppingSearchTerm &&
                  filteredShoppingItems.length === 0 ? (
                  <div className="empty-state">
                    {tr(
                      "No items match this supplier/search.",
                      "No hay artículos que coincidan con este proveedor/búsqueda.",
                    )}
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {(deferredShoppingSearchTerm
                      ? shoppingSearchResults
                      : filteredShoppingItems.map((item) => ({
                          supplierName:
                            selectedShoppingSupplier?.supplierName || "",
                          item,
                        }))
                    ).map(({ supplierName, item }) => {
                      const draft = getShoppingDraft(item);
                      const draftPurchasedQuantity = clampDecimal(
                        parsePositiveDecimal(draft.purchasedQuantity),
                        item.orderedQuantity,
                      );
                      const isDirty = isShoppingItemDirty(item);
                      const isSaving = shoppingSavingKey === item.rowKey;

                      return (
                        <div
                          key={`shopping-item-${item.rowKey}`}
                          className={`border rounded p-3 ${
                            item.remainingQuantity <= 0
                              ? "bg-success-subtle"
                              : ""
                          }`}
                        >
                          <div className="d-flex flex-column flex-xl-row gap-3 align-items-xl-start">
                            <div className="flex-grow-1">
                              <div
                                className={`fw-semibold ${
                                  item.remainingQuantity <= 0
                                    ? "text-decoration-line-through"
                                    : ""
                                }`}
                              >
                                {item.nameEs}
                              </div>
                              <div className="text-muted small">
                                {item.nameEn}
                              </div>
                              {deferredShoppingSearchTerm ? (
                                <div className="text-muted small mt-1">
                                  {tr("Supplier:", "Proveedor:")} {supplierName}
                                </div>
                              ) : null}

                              <div className="d-flex flex-wrap gap-2 mt-2 small">
                                <span className="badge text-bg-light">
                                  {tr("Ordered", "Ordenado")}:{" "}
                                  {item.orderedQuantity}
                                </span>
                                <span className="badge text-bg-light">
                                  {tr("Bought", "Comprado")}:{" "}
                                  {item.purchasedQuantity}
                                </span>
                                <span
                                  className={`badge ${
                                    item.remainingQuantity > 0
                                      ? "text-bg-warning"
                                      : "text-bg-success"
                                  }`}
                                >
                                  {tr("Remaining", "Pendiente")}:{" "}
                                  {item.remainingQuantity}
                                </span>
                              </div>
                            </div>

                            <div
                              className="d-flex flex-column gap-2"
                              style={{ minWidth: 260 }}
                            >
                              <div>
                                <label className="form-label small mb-1">
                                  {tr(
                                    "Bought in person",
                                    "Comprado en persona",
                                  )}
                                </label>
                                <div className="d-flex align-items-center gap-2">
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={() =>
                                      stepShoppingQuantity(item, -1)
                                    }
                                  >
                                    -
                                  </button>
                                  <input
                                    className="form-control form-control-sm"
                                    inputMode="decimal"
                                    value={draft.purchasedQuantity}
                                    onChange={(event) =>
                                      setShoppingDraftField(
                                        item,
                                        "purchasedQuantity",
                                        event.target.value,
                                      )
                                    }
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={() =>
                                      stepShoppingQuantity(item, 1)
                                    }
                                  >
                                    +
                                  </button>
                                </div>
                                {draftPurchasedQuantity >=
                                item.orderedQuantity ? (
                                  <div className="form-text">
                                    {tr(
                                      "This item is fully covered in person and will be removed from the weekly export.",
                                      "Este artículo ya quedó cubierto en persona y será eliminado de la exportación semanal.",
                                    )}
                                  </div>
                                ) : null}
                              </div>

                              <div>
                                <label className="form-label small mb-1">
                                  {tr("Price", "Precio")}
                                </label>
                                <div className="input-group input-group-sm">
                                  <span className="input-group-text">$</span>
                                  <input
                                    className="form-control"
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    value={draft.price}
                                    onChange={(event) =>
                                      setShoppingDraftField(
                                        item,
                                        "price",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </div>
                              </div>

                              <div className="d-flex gap-2">
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  disabled={!isDirty || isSaving}
                                  onClick={() =>
                                    void handleSaveShoppingItem(
                                      supplierName,
                                      item,
                                    )
                                  }
                                >
                                  {isSaving
                                    ? tr("Saving...", "Guardando...")
                                    : tr("Save", "Guardar")}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary btn-sm"
                                  disabled={!isDirty || isSaving}
                                  onClick={() => resetShoppingDraft(item)}
                                >
                                  {tr("Reset", "Restablecer")}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
