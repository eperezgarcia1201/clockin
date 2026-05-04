"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUiLanguage } from "../../../lib/ui-language";
import {
  createCompanyOrder,
  deleteCompanyOrder,
  getCompanyOrderCatalog,
  listCompanyOrders,
  type CompanyOrderComparisonUnit,
  type CompanyOrderCatalogItem,
  type CompanyOrderCatalogSupplier,
  type CompanyOrderRow,
} from "../../../lib/api/company-orders-admin";

type CartItem = {
  supplierName: string;
  key: string;
  nameEs: string;
  nameEn: string;
  quantity: number;
  comparisonUnit: CompanyOrderComparisonUnit;
  caseSizeLb?: number | null;
};

type QuantityByUnit = {
  each: number;
  case: number;
};

const companyOrderItemKey = (nameEs: string, nameEn: string) =>
  `${nameEs.trim().toLowerCase()}|${nameEn.trim().toLowerCase()}`;

const normalizeQuantityInput = (value: string) => {
  const trimmed = value.replace(/,/g, ".").replace(/[^\d.]/g, "");
  if (!trimmed) {
    return "";
  }
  const parts = trimmed.split(".");
  const integerPart = parts[0] || "0";
  const decimalPart = parts.slice(1).join("").slice(0, 2);
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
};

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

const getLocalDateKey = (value = new Date()) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const dateKey = getLocalDateKey();
  const localDate = new Date(`${dateKey}T00:00:00`);
  const day = localDate.getDay();
  localDate.setDate(localDate.getDate() - day);
  return getLocalDateKey(localDate);
};

const formatWeekRange = (weekStartDate?: string, weekEndDate?: string) => {
  if (!weekStartDate) {
    return "Current week";
  }
  return `${formatDate(weekStartDate)} - ${formatDate(
    weekEndDate || weekStartDate,
  )}`;
};

const buildWeekExportHref = (
  format: "pdf" | "csv" | "excel",
  weekStartDate?: string,
) => {
  const query = new URLSearchParams();
  query.set("format", format);
  query.set("weekStart", weekStartDate || getCurrentWeekStartDateKey());
  return `/api/company-orders/export?${query.toString()}`;
};

const normalizeComparisonUnit = (
  value: CompanyOrderCatalogItem["comparisonUnit"],
): CompanyOrderComparisonUnit => (value === "lb" ? "lb" : "each");

const createQuantityByUnit = (): QuantityByUnit => ({
  each: 0,
  case: 0,
});

const resolveOrderQuantityUnit = (
  comparisonUnit: CompanyOrderComparisonUnit,
) => (comparisonUnit === "lb" ? "case" : "each");

const addQuantityByUnit = (
  totals: QuantityByUnit,
  comparisonUnit: CompanyOrderComparisonUnit,
  quantity: number,
) => {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return totals;
  }
  const unit = resolveOrderQuantityUnit(comparisonUnit);
  totals[unit] = Number((totals[unit] + quantity).toFixed(2));
  return totals;
};

const formatQuantityWithUnit = (
  quantity: number,
  comparisonUnit: CompanyOrderComparisonUnit,
) =>
  `${Number(quantity.toFixed(2))} ${
    comparisonUnit === "lb"
      ? Math.abs(quantity - 1) < 0.005
        ? "case"
        : "cases"
      : "each"
  }`;

const formatQuantitySummaryByUnit = (totals: QuantityByUnit) => {
  const parts: string[] = [];
  if (totals.each > 0) {
    parts.push(`${totals.each} each`);
  }
  if (totals.case > 0) {
    parts.push(
      `${totals.case} ${Math.abs(totals.case - 1) < 0.005 ? "case" : "cases"}`,
    );
  }
  return parts.join(" + ") || "0";
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
        comparisonUnit: normalizeComparisonUnit(item.comparisonUnit),
        caseSizeLb:
          typeof item.caseSizeLb === "number" && item.caseSizeLb > 0
            ? item.caseSizeLb
            : null,
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
        comparisonUnit: CompanyOrderComparisonUnit;
        caseSizeLb: number | null;
      } => Boolean(item),
    );

export default function AdminCompanyOrdersPage() {
  const lang = useUiLanguage();
  const tr = useCallback(
    (en: string, es: string) => (lang === "es" ? es : en),
    [lang],
  );
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
  const [exportingFormat, setExportingFormat] = useState<
    "pdf" | "csv" | "excel" | null
  >(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [lastSubmittedWeekStart, setLastSubmittedWeekStart] = useState<string>(
    getCurrentWeekStartDateKey(),
  );

  const supplier = useMemo(
    () =>
      catalog.find((entry) => entry.supplierName === selectedSupplier) ?? null,
    [catalog, selectedSupplier],
  );

  const filteredItems = useMemo(() => {
    const source = supplier?.items || [];
    const lookup = searchTerm.trim().toLowerCase();
    if (!lookup) {
      return source;
    }
    return source.filter((item) => {
      const spanish = item.nameEs.toLowerCase();
      const english = item.nameEn.toLowerCase();
      return spanish.includes(lookup) || english.includes(lookup);
    });
  }, [searchTerm, supplier]);

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
            comparisonUnit: item.comparisonUnit,
            caseSizeLb: item.caseSizeLb,
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

  const selectedQuantitySummary = useMemo(() => {
    const totals = createQuantityByUnit();
    cartItems.forEach((item) =>
      addQuantityByUnit(totals, item.comparisonUnit, item.quantity),
    );
    return formatQuantitySummaryByUnit(totals);
  }, [cartItems]);

  const ordersByWeek = useMemo(() => {
    const groups = new Map<
      string,
      {
        weekStartDate: string;
        weekEndDate: string;
        orders: CompanyOrderRow[];
        updatedAtMs: number;
      }
    >();

    orders.forEach((order) => {
      const weekStartDate = order.weekStartDate || getCurrentWeekStartDateKey();
      const weekEndDate = order.weekEndDate || weekStartDate;
      const group = groups.get(weekStartDate) || {
        weekStartDate,
        weekEndDate,
        orders: [],
        updatedAtMs: 0,
      };
      group.orders.push(order);
      group.weekEndDate = weekEndDate;
      group.updatedAtMs = Math.max(
        group.updatedAtMs,
        Date.parse(order.updatedAt || order.orderDate || order.createdAt) || 0,
      );
      groups.set(weekStartDate, group);
    });

    return Array.from(groups.values()).sort((a, b) => {
      const weekDiff = b.weekStartDate.localeCompare(a.weekStartDate);
      if (weekDiff !== 0) {
        return weekDiff;
      }
      return b.updatedAtMs - a.updatedAtMs;
    });
  }, [orders]);

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
    if (nextOrders[0]?.weekStartDate) {
      setLastSubmittedWeekStart(nextOrders[0].weekStartDate);
    }
  }, []);

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

  const setDraftQuantity = (
    supplierName: string,
    key: string,
    rawValue: string,
  ) => {
    const normalized = normalizeQuantityInput(rawValue);
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
      setSupplierDrafts({});
      setSearchTerm("");
      setNotes("");
      setStatus(
        tr(
          `Company order saved for ${supplierPayloads.length} suppliers. Use Download buttons to export.`,
          `Orden de empresa guardada para ${supplierPayloads.length} proveedores. Usa los botones de descarga para exportar.`,
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

  const handleDownloadForWeek = async (
    format: "pdf" | "csv" | "excel",
    weekStartDate?: string,
  ) => {
    setExportingFormat(format);
    try {
      const query = new URLSearchParams();
      query.set("format", format);
      query.set(
        "weekStart",
        weekStartDate || lastSubmittedWeekStart || getCurrentWeekStartDateKey(),
      );
      window.open(`/api/company-orders/export?${query.toString()}`, "_blank");
    } finally {
      setExportingFormat(null);
    }
  };

  const handleDeleteOrder = async (order: CompanyOrderRow) => {
    const supplierLabel =
      Array.isArray(order.supplierNames) && order.supplierNames.length > 0
        ? order.supplierNames.join(", ")
        : order.supplierName;
    const locationLabel =
      order.officeName || tr("All locations", "Todas las ubicaciones");
    const confirmed = window.confirm(
      tr(
        `Delete the weekly company order for ${supplierLabel} in ${locationLabel}? This removes the full week block for that location.`,
        `¿Eliminar la orden semanal de empresa para ${supplierLabel} en ${locationLabel}? Esto borra el bloque completo de esa semana para esa ubicación.`,
      ),
    );
    if (!confirmed) {
      return;
    }

    setDeletingOrderId(order.id);
    setStatus(null);
    try {
      const deleted = await deleteCompanyOrder(order.id);
      await loadOrders();
      setStatus(
        tr(
          `Deleted ${deleted.deletedCount || 0} company order records for the selected week.`,
          `Se eliminaron ${deleted.deletedCount || 0} registros de órdenes de empresa para la semana seleccionada.`,
        ),
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : tr(
              "Unable to delete company order.",
              "No se pudo eliminar la orden de empresa.",
            ),
      );
    } finally {
      setDeletingOrderId(null);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <div>
          <h1>Place Order</h1>
          <p className="text-muted mb-0">
            {tr(
              "Build and submit supplier orders from the shared catalog. Orders merge into one weekly purchase order per location.",
              "Crea y envía órdenes a proveedores desde el catálogo compartido. Las órdenes se combinan en una sola orden semanal por ubicación.",
            )}
          </p>
        </div>
        <div className="admin-actions">
          <button
            className="btn btn-outline-secondary"
            onClick={() => {
              void loadAll();
            }}
            disabled={loading}
          >
            {loading
              ? tr("Refreshing...", "Actualizando...")
              : tr("Refresh Catalog", "Actualizar Catálogo")}
          </button>
        </div>
      </div>

      <div className="row g-4 align-items-start">
        <div className="col-12 col-xxl-8">
          <div className="admin-card d-flex flex-column gap-3">
            <div>
              <h2 className="h4 mb-1">{tr("Create Order", "Crear Orden")}</h2>
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
                    const key = companyOrderItemKey(item.nameEs, item.nameEn);
                    const quantityInCart = Number(
                      (supplierDrafts[supplier.supplierName] || {})[key] || "0",
                    );
                    return (
                      <div className="col-12 col-xl-6" key={`item-${key}`}>
                        <div className="d-flex align-items-center gap-3 border rounded p-2 h-100">
                          <div className="flex-grow-1">
                            <div className="fw-semibold">{item.nameEs}</div>
                            <div className="text-muted small">
                              {item.nameEn}
                            </div>
                            <div className="text-muted small">
                              {tr("Measured as", "Se mide como")}:{" "}
                              {item.comparisonUnit === "lb"
                                ? tr(
                                    "order by case / compare by lb",
                                    "ordenar por caja / comparar por lb",
                                  )
                                : tr("each item", "cada unidad")}
                            </div>
                            {item.comparisonUnit === "lb" && item.caseSizeLb ? (
                              <div className="text-muted small">
                                {tr("Lb per case:", "Lb por caja:")}{" "}
                                {Number(item.caseSizeLb.toFixed(2))}
                              </div>
                            ) : null}
                          </div>
                          {quantityInCart > 0 ? (
                            <span className="badge text-bg-secondary">
                              {tr("In cart:", "En carrito:")}{" "}
                              {formatQuantityWithUnit(
                                quantityInCart,
                                normalizeComparisonUnit(item.comparisonUnit),
                              )}
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
              {tr("total qty", "cantidad total")} {selectedQuantitySummary}
            </div>

            {cartItems.length === 0 ? (
              <div className="empty-state">
                {tr("No items added yet.", "Aún no hay artículos agregados.")}
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
                    <div className="text-muted small">
                      {tr("Measured as:", "Se mide como:")}{" "}
                      {item.comparisonUnit === "lb"
                        ? tr(
                            "order by case / compare by lb",
                            "ordenar por caja / comparar por lb",
                          )
                        : tr("each item", "cada unidad")}
                    </div>
                    {item.comparisonUnit === "lb" && item.caseSizeLb ? (
                      <div className="text-muted small">
                        {tr("Lb per case:", "Lb por caja:")}{" "}
                        {Number(item.caseSizeLb.toFixed(2))}
                      </div>
                    ) : null}
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
                        aria-label={
                          item.comparisonUnit === "lb"
                            ? tr("Quantity in cases", "Cantidad en cajas")
                            : tr("Quantity in items", "Cantidad en unidades")
                        }
                        onChange={(event) =>
                          setDraftQuantity(
                            item.supplierName,
                            item.key,
                            event.target.value,
                          )
                        }
                      />
                      <span className="text-muted small">
                        {item.comparisonUnit === "lb"
                          ? tr("case(s)", "caja(s)")
                          : tr("each", "cada")}
                      </span>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() =>
                          handleStepItemQuantity(item.supplierName, item.key, 1)
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
              {tr("Order Notes & Comments", "Notas y Comentarios de la Orden")}
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
          <div className="d-flex flex-column gap-3">
            {ordersByWeek.map((week) => (
              <section className="border rounded p-3" key={week.weekStartDate}>
                <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-3">
                  <div>
                    <div className="fw-semibold">
                      {tr("Week Ending Saturday", "Semana que termina sábado")}
                    </div>
                    <div className="text-muted small">
                      {formatWeekRange(week.weekStartDate, week.weekEndDate)}
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm text-nowrap"
                      onClick={() => {
                        void handleDownloadForWeek("pdf", week.weekStartDate);
                      }}
                      disabled={exportingFormat === "pdf"}
                    >
                      {exportingFormat === "pdf"
                        ? tr("Opening...", "Abriendo...")
                        : tr(
                            "Download This Week PDF",
                            "Descargar PDF de esta semana",
                          )}
                    </button>
                    <a
                      className="btn btn-outline-secondary btn-sm text-nowrap"
                      href={buildWeekExportHref("csv", week.weekStartDate)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {tr("Download CSV", "Descargar CSV")}
                    </a>
                    <a
                      className="btn btn-outline-secondary btn-sm text-nowrap"
                      href={buildWeekExportHref("excel", week.weekStartDate)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {tr("Download Excel", "Descargar Excel")}
                    </a>
                  </div>
                </div>

                <div className="d-flex flex-column gap-2">
                  {week.orders.map((order) => (
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
                            className="btn btn-outline-danger btn-sm text-nowrap"
                            onClick={() => {
                              void handleDeleteOrder(order);
                            }}
                            disabled={deletingOrderId === order.id}
                          >
                            {deletingOrderId === order.id
                              ? tr("Deleting...", "Eliminando...")
                              : tr(
                                  "Delete Week Order",
                                  "Eliminar Orden Semanal",
                                )}
                          </button>
                          <a
                            className="btn btn-outline-primary btn-sm text-nowrap"
                            href={`/api/company-orders/${encodeURIComponent(order.id)}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {tr("Supplier PDF", "PDF del proveedor")}
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
