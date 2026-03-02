"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUiLanguage } from "../../../../lib/ui-language";
import {
  getCompanyOrderCatalog,
  updateCompanyOrderCatalog,
  type CompanyOrderCatalogItem,
  type CompanyOrderCatalogSupplier,
} from "../../../../lib/api/company-orders-admin";

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
  const lang = useUiLanguage();
  const tr = useCallback(
    (en: string, es: string) => (lang === "es" ? es : en),
    [lang],
  );
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
      const suppliers = await getCompanyOrderCatalog();
      setCatalog(suppliers);
      setStatusKind("success");
      setStatus(tr("Catalog loaded.", "Catálogo cargado."));
    } catch (error) {
      setStatusKind("danger");
      setStatus(
        error instanceof Error
          ? error.message
          : tr(
              "Unable to load company order catalog.",
              "No se pudo cargar el catálogo de órdenes de empresa.",
            ),
      );
    } finally {
      setLoading(false);
    }
  }, [tr]);

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
    updater: (
      supplier: CompanyOrderCatalogSupplier,
    ) => CompanyOrderCatalogSupplier,
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
    setStatus(
      tr(
        "New supplier added. Set supplier name and items, then save.",
        "Proveedor nuevo agregado. Define el nombre y artículos, luego guarda.",
      ),
    );
  };

  const handleRemoveSupplier = (supplierIndex: number) => {
    setCatalog((previous) =>
      previous.filter((_, index) => index !== supplierIndex),
    );
    setStatusKind("info");
    setStatus(tr("Supplier removed.", "Proveedor eliminado."));
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
        tr(
          "Add at least one supplier with at least one valid item (Spanish and English names).",
          "Agrega al menos un proveedor con un artículo válido (nombre en español e inglés).",
        ),
      );
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      const nextCatalog = await updateCompanyOrderCatalog({ suppliers });
      setCatalog(nextCatalog);
      setStatusKind("success");
      setStatus(
        tr("Catalog saved successfully.", "Catálogo guardado correctamente."),
      );
    } catch (error) {
      setStatusKind("danger");
      setStatus(
        error instanceof Error
          ? error.message
          : tr(
              "Unable to save company order catalog.",
              "No se pudo guardar el catálogo de órdenes de empresa.",
            ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>{tr("Company Order Catalog", "Catálogo de Órdenes de Empresa")}</h1>
        <p className="text-muted mb-0">
          {tr(
            "Manage suppliers and items used by Company Orders.",
            "Administra proveedores y artículos usados por Órdenes de Empresa.",
          )}
        </p>
      </div>

      <div className="admin-card d-flex flex-column gap-3">
        <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
          <div className="text-muted small">
            {tr(
              "Use this screen to add, edit, or remove supplier items.",
              "Usa esta pantalla para agregar, editar o eliminar artículos de proveedores.",
            )}
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
              {tr("Refresh", "Actualizar")}
            </button>
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={handleAddSupplier}
              disabled={loading || saving}
            >
              {tr("Add Supplier", "Agregar Proveedor")}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={loading || saving}
            >
              {saving
                ? tr("Saving...", "Guardando...")
                : tr("Save Catalog", "Guardar Catálogo")}
            </button>
          </div>
        </div>

        {status ? (
          <div className={`alert alert-${statusKind} mb-0`} role="alert">
            {status}
          </div>
        ) : null}

        {loading ? (
          <div className="text-muted">
            {tr("Loading catalog...", "Cargando catálogo...")}
          </div>
        ) : (
          <div className="row g-3">
            <div className="col-12 col-lg-4">
              <div className="list-group">
                {catalog.length === 0 ? (
                  <div className="text-muted small border rounded p-3">
                    {tr(
                      "No suppliers yet. Add a supplier to start.",
                      "Aún no hay proveedores. Agrega uno para comenzar.",
                    )}
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
                      <span>
                        {supplier.supplierName ||
                          tr(`Supplier ${index + 1}`, `Proveedor ${index + 1}`)}
                      </span>
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
                <div className="text-muted">
                  {tr(
                    "Select a supplier to edit.",
                    "Selecciona un proveedor para editar.",
                  )}
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  <div className="row g-2 align-items-end">
                    <div className="col-12 col-md-8">
                      <label className="form-label">
                        {tr("Supplier Name", "Nombre del Proveedor")}
                      </label>
                      <input
                        className="form-control"
                        value={selectedSupplier.supplierName}
                        onChange={(event) =>
                          updateSupplier(selectedSupplierIndex, (supplier) => ({
                            ...supplier,
                            supplierName: event.target.value,
                          }))
                        }
                        placeholder={tr(
                          "Supplier name",
                          "Nombre del proveedor",
                        )}
                      />
                    </div>
                    <div className="col-6 col-md-2">
                      <button
                        type="button"
                        className="btn btn-outline-primary w-100"
                        onClick={() => handleAddItem(selectedSupplierIndex)}
                      >
                        {tr("Add Item", "Agregar Artículo")}
                      </button>
                    </div>
                    <div className="col-6 col-md-2">
                      <button
                        type="button"
                        className="btn btn-outline-danger w-100"
                        onClick={() =>
                          handleRemoveSupplier(selectedSupplierIndex)
                        }
                      >
                        {tr("Delete", "Eliminar")}
                      </button>
                    </div>
                  </div>

                  <div className="d-flex flex-column gap-2">
                    {selectedSupplier.items.length === 0 ? (
                      <div className="text-muted small border rounded p-3">
                        {tr(
                          "No items for this supplier. Add an item.",
                          "No hay artículos para este proveedor. Agrega un artículo.",
                        )}
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
                                {tr("Spanish Name", "Nombre en Español")}
                              </label>
                              <input
                                className="form-control"
                                value={item.nameEs}
                                onChange={(event) =>
                                  updateSupplier(
                                    selectedSupplierIndex,
                                    (supplier) => ({
                                      ...supplier,
                                      items: supplier.items.map(
                                        (entry, index) =>
                                          index === itemIndex
                                            ? {
                                                ...entry,
                                                nameEs: event.target.value,
                                              }
                                            : entry,
                                      ),
                                    }),
                                  )
                                }
                                placeholder={tr("nameEs", "nombreEs")}
                              />
                            </div>
                            <div className="col-12 col-md-5">
                              <label className="form-label mb-1">
                                {tr("English Name", "Nombre en Inglés")}
                              </label>
                              <input
                                className="form-control"
                                value={item.nameEn}
                                onChange={(event) =>
                                  updateSupplier(
                                    selectedSupplierIndex,
                                    (supplier) => ({
                                      ...supplier,
                                      items: supplier.items.map(
                                        (entry, index) =>
                                          index === itemIndex
                                            ? {
                                                ...entry,
                                                nameEn: event.target.value,
                                              }
                                            : entry,
                                      ),
                                    }),
                                  )
                                }
                                placeholder={tr("nameEn", "nombreEn")}
                              />
                            </div>
                            <div className="col-12 col-md-2">
                              <button
                                type="button"
                                className="btn btn-outline-danger w-100"
                                onClick={() =>
                                  handleRemoveItem(
                                    selectedSupplierIndex,
                                    itemIndex,
                                  )
                                }
                              >
                                {tr("Remove", "Quitar")}
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
