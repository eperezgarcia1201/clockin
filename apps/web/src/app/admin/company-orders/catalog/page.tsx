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

const readErrorMessage = async (response: Response, fallback: string) => {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };
  return payload.error || payload.message || fallback;
};

const sanitizeCatalogForSave = (
  catalog: CompanyOrderCatalogSupplier[],
): CompanyOrderCatalogSupplier[] => {
  return catalog
    .map((supplier) => {
      const supplierName = supplier.supplierName.trim();
      const items = supplier.items
        .map((item) => {
          const nameEs = item.nameEs.trim();
          const nameEn = item.nameEn.trim();
          if (!nameEs && !nameEn) {
            return null;
          }
          return {
            nameEs: nameEs || nameEn,
            nameEn: nameEn || nameEs,
          };
        })
        .filter((item): item is CompanyOrderCatalogItem => Boolean(item));

      return {
        supplierName,
        items,
      };
    })
    .filter((supplier) => supplier.supplierName && supplier.items.length > 0);
};

export default function AdminCompanyOrdersCatalogPage() {
  const [catalog, setCatalog] = useState<CompanyOrderCatalogSupplier[]>([]);
  const [selectedSupplierIndex, setSelectedSupplierIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "danger" | "info">(
    "info",
  );

  const selectedSupplier = useMemo(
    () => catalog[selectedSupplierIndex] ?? null,
    [catalog, selectedSupplierIndex],
  );

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    try {
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
      setStatusKind("success");
      setStatus("Catalog loaded.");
    } catch (error) {
      setStatusKind("danger");
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to load company order catalog.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (!catalog.length) {
      if (selectedSupplierIndex !== 0) {
        setSelectedSupplierIndex(0);
      }
      return;
    }
    if (selectedSupplierIndex >= catalog.length) {
      setSelectedSupplierIndex(catalog.length - 1);
    }
  }, [catalog.length, selectedSupplierIndex]);

  const updateSupplier = (
    supplierIndex: number,
    updater: (supplier: CompanyOrderCatalogSupplier) => CompanyOrderCatalogSupplier,
  ) => {
    setCatalog((previous) =>
      previous.map((supplier, index) =>
        index === supplierIndex ? updater(supplier) : supplier,
      ),
    );
  };

  const handleAddSupplier = () => {
    setCatalog((previous) => {
      setSelectedSupplierIndex(previous.length);
      return [
        ...previous,
        {
          supplierName: "",
          items: [{ nameEs: "", nameEn: "" }],
        },
      ];
    });
    setStatusKind("info");
    setStatus("New supplier added. Set supplier name and items, then save.");
  };

  const handleRemoveSupplier = (supplierIndex: number) => {
    setCatalog((previous) => previous.filter((_, index) => index !== supplierIndex));
    setStatusKind("info");
    setStatus("Supplier removed.");
  };

  const handleAddItem = (supplierIndex: number) => {
    updateSupplier(supplierIndex, (supplier) => ({
      ...supplier,
      items: [...supplier.items, { nameEs: "", nameEn: "" }],
    }));
  };

  const handleRemoveItem = (supplierIndex: number, itemIndex: number) => {
    updateSupplier(supplierIndex, (supplier) => ({
      ...supplier,
      items: supplier.items.filter((_, index) => index !== itemIndex),
    }));
  };

  const handleSave = async () => {
    const suppliers = sanitizeCatalogForSave(catalog);
    if (!suppliers.length) {
      setStatusKind("danger");
      setStatus(
        "Add at least one supplier with at least one valid item (Spanish and English names).",
      );
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/company-orders/catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suppliers }),
      });
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Unable to save company order catalog."),
        );
      }

      const payload = (await response.json()) as {
        suppliers?: CompanyOrderCatalogSupplier[];
      };
      const nextCatalog = Array.isArray(payload.suppliers)
        ? payload.suppliers
        : suppliers;
      setCatalog(nextCatalog);
      setStatusKind("success");
      setStatus("Catalog saved successfully.");
    } catch (error) {
      setStatusKind("danger");
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to save company order catalog.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>Company Order Catalog</h1>
        <p className="text-muted mb-0">
          Manage suppliers and items used by Company Orders.
        </p>
      </div>

      <div className="admin-card d-flex flex-column gap-3">
        <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
          <div className="text-muted small">
            Use this screen to add, edit, or remove supplier items.
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                void loadCatalog();
              }}
              disabled={loading || saving}
            >
              Refresh
            </button>
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={handleAddSupplier}
              disabled={loading || saving}
            >
              Add Supplier
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={loading || saving}
            >
              {saving ? "Saving..." : "Save Catalog"}
            </button>
          </div>
        </div>

        {status ? (
          <div className={`alert alert-${statusKind} mb-0`} role="alert">
            {status}
          </div>
        ) : null}

        {loading ? (
          <div className="text-muted">Loading catalog...</div>
        ) : (
          <div className="row g-3">
            <div className="col-12 col-lg-4">
              <div className="list-group">
                {catalog.length === 0 ? (
                  <div className="text-muted small border rounded p-3">
                    No suppliers yet. Add a supplier to start.
                  </div>
                ) : (
                  catalog.map((supplier, index) => (
                    <button
                      key={`supplier-${index}`}
                      type="button"
                      className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
                        index === selectedSupplierIndex ? "active" : ""
                      }`}
                      onClick={() => setSelectedSupplierIndex(index)}
                    >
                      <span>{supplier.supplierName || `Supplier ${index + 1}`}</span>
                      <span className="badge text-bg-secondary rounded-pill">
                        {supplier.items.length}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="col-12 col-lg-8">
              {!selectedSupplier ? (
                <div className="text-muted">Select a supplier to edit.</div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  <div className="row g-2 align-items-end">
                    <div className="col-12 col-md-8">
                      <label className="form-label">Supplier Name</label>
                      <input
                        className="form-control"
                        value={selectedSupplier.supplierName}
                        onChange={(event) =>
                          updateSupplier(selectedSupplierIndex, (supplier) => ({
                            ...supplier,
                            supplierName: event.target.value,
                          }))
                        }
                        placeholder="Supplier name"
                      />
                    </div>
                    <div className="col-6 col-md-2">
                      <button
                        type="button"
                        className="btn btn-outline-primary w-100"
                        onClick={() => handleAddItem(selectedSupplierIndex)}
                      >
                        Add Item
                      </button>
                    </div>
                    <div className="col-6 col-md-2">
                      <button
                        type="button"
                        className="btn btn-outline-danger w-100"
                        onClick={() => handleRemoveSupplier(selectedSupplierIndex)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="d-flex flex-column gap-2">
                    {selectedSupplier.items.length === 0 ? (
                      <div className="text-muted small border rounded p-3">
                        No items for this supplier. Add an item.
                      </div>
                    ) : (
                      selectedSupplier.items.map((item, itemIndex) => (
                        <div
                          key={`supplier-${selectedSupplierIndex}-item-${itemIndex}`}
                          className="border rounded p-2"
                        >
                          <div className="row g-2 align-items-end">
                            <div className="col-12 col-md-5">
                              <label className="form-label mb-1">
                                Spanish Name
                              </label>
                              <input
                                className="form-control"
                                value={item.nameEs}
                                onChange={(event) =>
                                  updateSupplier(selectedSupplierIndex, (supplier) => ({
                                    ...supplier,
                                    items: supplier.items.map((entry, index) =>
                                      index === itemIndex
                                        ? { ...entry, nameEs: event.target.value }
                                        : entry,
                                    ),
                                  }))
                                }
                                placeholder="nameEs"
                              />
                            </div>
                            <div className="col-12 col-md-5">
                              <label className="form-label mb-1">
                                English Name
                              </label>
                              <input
                                className="form-control"
                                value={item.nameEn}
                                onChange={(event) =>
                                  updateSupplier(selectedSupplierIndex, (supplier) => ({
                                    ...supplier,
                                    items: supplier.items.map((entry, index) =>
                                      index === itemIndex
                                        ? { ...entry, nameEn: event.target.value }
                                        : entry,
                                    ),
                                  }))
                                }
                                placeholder="nameEn"
                              />
                            </div>
                            <div className="col-12 col-md-2">
                              <button
                                type="button"
                                className="btn btn-outline-danger w-100"
                                onClick={() =>
                                  handleRemoveItem(selectedSupplierIndex, itemIndex)
                                }
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
