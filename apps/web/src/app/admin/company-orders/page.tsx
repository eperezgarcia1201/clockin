"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type CompanyOrderCatalogItem = {
  nameEs: string;
  nameEn: string;
};

type CompanyOrderCatalogSupplier = {
  supplierName: string;
  items: CompanyOrderCatalogItem[];
};

type CompanyOrderItem = {
  id: string;
  nameEs: string;
  nameEn: string;
  quantity: number;
};

type CompanyOrderRow = {
  id: string;
  supplierName: string;
  supplierNames?: string[];
  orderDate: string;
  weekStartDate?: string;
  weekEndDate?: string;
  orderLabel?: string;
  submittedDates?: string[];
  contributors?: string[];
  notes: string;
  officeName: string | null;
  createdBy: string | null;
  totalQuantity: number;
  itemCount: number;
  items: CompanyOrderItem[];
  createdAt: string;
  updatedAt?: string;
};

type CartItem = {
  supplierName: string;
  key: string;
  nameEs: string;
  nameEn: string;
  quantity: number;
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

const buildWeekExportHref = (
  format: "pdf" | "csv" | "excel",
  weekStartDate?: string,
) => {
  const query = new URLSearchParams();
  query.set("format", format);
  query.set("weekStart", weekStartDate || getCurrentWeekStartDateKey());
  return `/api/company-orders/export?${query.toString()}`;
};

const readErrorMessage = async (response: Response, fallback: string) => {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };
  return payload.error || payload.message || fallback;
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

export default function AdminCompanyOrdersPage() {
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
  const [lastSubmittedWeekStart, setLastSubmittedWeekStart] =
    useState<string>(getCurrentWeekStartDateKey());

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
    () => Number(cartItems.reduce((sum, item) => sum + item.quantity, 0).toFixed(2)),
    [cartItems],
  );

  const loadCatalog = useCallback(async () => {
    const response = await fetch("/api/company-orders/catalog", {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(
        await readErrorMessage(
          response,
          "Unable to load company order catalog.",
        ),
      );
    }

    const payload = (await response.json()) as {
      suppliers?: CompanyOrderCatalogSupplier[];
    };
    const suppliers = Array.isArray(payload.suppliers) ? payload.suppliers : [];
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
    const response = await fetch("/api/company-orders?limit=40", {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(
        await readErrorMessage(response, "Unable to load company orders."),
      );
    }

    const payload = (await response.json()) as { orders?: CompanyOrderRow[] };
    const nextOrders = Array.isArray(payload.orders) ? payload.orders : [];
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
          : "Unable to load company orders.",
      );
    } finally {
      setLoading(false);
    }
  }, [loadCatalog, loadOrders]);

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
      setStatus("Add at least one item to the cart.");
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      let weekStart = lastSubmittedWeekStart;
      for (const payload of supplierPayloads) {
        const response = await fetch("/api/company-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierName: payload.supplierName,
            notes: notes.trim() || undefined,
            items: payload.items,
          }),
        });
        if (!response.ok) {
          throw new Error(
            await readErrorMessage(response, "Unable to save company order."),
          );
        }
        const createdOrder = (await response.json().catch(() => ({}))) as {
          weekStartDate?: string;
        };
        if (typeof createdOrder.weekStartDate === "string") {
          weekStart = createdOrder.weekStartDate;
        }
      }

      setLastSubmittedWeekStart(weekStart);
      setSupplierDrafts({});
      setSearchTerm("");
      setNotes("");
      setStatus(
        `Company order saved for ${supplierPayloads.length} suppliers. Use Download buttons to export.`,
      );
      await loadOrders();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to save company order.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (format: "pdf" | "csv" | "excel") => {
    setExportingFormat(format);
    try {
      const query = new URLSearchParams();
      query.set("format", format);
      query.set(
        "weekStart",
        lastSubmittedWeekStart || getCurrentWeekStartDateKey(),
      );
      window.open(`/api/company-orders/export?${query.toString()}`, "_blank");
    } finally {
      setExportingFormat(null);
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

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <div>
          <h1>Place Order</h1>
          <p className="text-muted mb-0">
            Build and submit supplier orders from the shared catalog. Orders merge
            into one weekly purchase order per location.
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
            {loading ? "Refreshing..." : "Refresh Catalog"}
          </button>
        </div>
      </div>

      <div className="row g-4 align-items-start">
        <div className="col-12 col-xxl-8">
          <div className="admin-card d-flex flex-column gap-3">
            <div>
              <h2 className="h4 mb-1">Create Order</h2>
              <p className="text-muted mb-0">
                Select a supplier, search items, and add to cart.
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
                    {supplierSelectedCount > 0 ? ` (${supplierSelectedCount})` : ""}
                  </button>
                );
              })}
            </div>

            <div>
              <label className="form-label">Search Item</label>
              <input
                className="form-control"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search items..."
              />
            </div>

            {supplier ? (
              <div className="row g-2" style={{ maxHeight: 560, overflowY: "auto" }}>
                {filteredItems.length === 0 ? (
                  <div className="col-12 text-muted">
                    No items match this supplier/search.
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
                            <div className="text-muted small">{item.nameEn}</div>
                          </div>
                          {quantityInCart > 0 ? (
                            <span className="badge text-bg-secondary">
                              In cart: {quantityInCart}
                            </span>
                          ) : null}
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => handleAddItem(supplier.supplierName, item)}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="text-muted">No supplier catalog is available.</div>
            )}
          </div>
        </div>

        <div className="col-12 col-xxl-4 d-flex flex-column gap-3">
          <div className="admin-card d-flex flex-column gap-3">
            <h2 className="h4 mb-0">Order Summary</h2>
            <div className="text-muted small">
              {selectedSupplierCount} suppliers | {selectedItemCount} items | total qty {selectedUnitTotal}
            </div>

            {cartItems.length === 0 ? (
              <div className="empty-state">No items added yet.</div>
            ) : (
              <div className="d-flex flex-column gap-2" style={{ maxHeight: 380, overflowY: "auto" }}>
                {cartItems.map((item) => (
                  <div
                    key={`cart-${item.supplierName}-${item.key}`}
                    className="border rounded p-2 d-flex flex-column gap-2"
                  >
                    <div className="fw-semibold">{item.nameEs}</div>
                    <div className="text-muted small">{item.nameEn}</div>
                    <div className="text-muted small">Supplier: {item.supplierName}</div>
                    <div className="d-flex align-items-center gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() =>
                          handleStepItemQuantity(item.supplierName, item.key, -1)
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
                          handleStepItemQuantity(item.supplierName, item.key, 1)
                        }
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm ms-auto"
                        onClick={() => handleRemoveItem(item.supplierName, item.key)}
                      >
                        Remove
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
                ? "Saving..."
                : `Submit Order (${selectedItemCount})`}
            </button>
          </div>

          <div className="admin-card d-flex flex-column gap-3">
            <h2 className="h5 mb-0">Order Notes & Comments</h2>
            <div>
              <label className="form-label">Notes (optional)</label>
              <textarea
                className="form-control"
                rows={5}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add any notes or comments for this order..."
              />
            </div>
          </div>
        </div>
      </div>

      {status && <div className="text-muted">{status}</div>}

      <div className="admin-card d-flex flex-column gap-3">
        <div className="d-flex justify-content-between align-items-center gap-2">
          <h2 className="h5 m-0">Recent Company Orders</h2>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => {
              void loadOrders();
            }}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="empty-state">No company orders yet.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {orders.map((order) => (
              <div className="border rounded p-3" key={order.id}>
                <div className="d-flex flex-column flex-md-row gap-3 align-items-start">
                  <div className="flex-grow-1">
                    <div className="fw-semibold">Order of the Week</div>
                    <div className="text-muted small">
                      Suppliers:{" "}
                      {Array.isArray(order.supplierNames) &&
                      order.supplierNames.length > 0
                        ? order.supplierNames.join(", ")
                        : order.supplierName}
                    </div>
                    {order.orderLabel ? (
                      <div className="text-muted small">{order.orderLabel}</div>
                    ) : null}
                    <div className="text-muted small">
                      Created: {formatDateTime(order.createdAt)}
                    </div>
                    <div className="text-muted small">
                      Last modified:{" "}
                      {formatDateTime(order.updatedAt || order.orderDate)} |{" "}
                      {order.itemCount} items | {order.totalQuantity}
                    </div>
                    <div className="fw-semibold small text-primary-emphasis">
                      Restaurant: {order.officeName || "All locations"}
                      {order.createdBy ? ` | by ${order.createdBy}` : ""}
                    </div>
                    {Array.isArray(order.contributors) &&
                    order.contributors.length > 0 ? (
                      <div className="text-muted small">
                        Contributors: {order.contributors.join(", ")}
                      </div>
                    ) : null}
                    {order.notes ? <div className="mt-2">{order.notes}</div> : null}
                  </div>

                  <div
                    className="d-flex flex-column gap-2 ms-md-auto"
                    style={{ minWidth: 220 }}
                  >
                    <a
                      className="btn btn-primary btn-sm text-nowrap"
                      href={`/api/company-orders/${encodeURIComponent(order.id)}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download Order PDF
                    </a>
                    <a
                      className="btn btn-outline-secondary btn-sm text-nowrap"
                      href={buildWeekExportHref("csv", order.weekStartDate)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download Week CSV
                    </a>
                    <a
                      className="btn btn-outline-secondary btn-sm text-nowrap"
                      href={buildWeekExportHref("excel", order.weekStartDate)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download Week Excel
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
