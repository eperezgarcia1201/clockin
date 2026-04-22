"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUiLanguage } from "../../../../lib/ui-language";
import {
  getCompanyOrderCatalog,
  updateCompanyOrderCatalog,
  type CompanyOrderComparisonUnit,
  type CompanyOrderCatalogItem,
  type CompanyOrderCatalogSupplier,
} from "../../../../lib/api/company-orders-admin";

type EditableCatalogItem = CompanyOrderCatalogItem & {
  clientId: string;
};

type EditableCatalogSupplier = {
  supplierName: string;
  items: EditableCatalogItem[];
};

let nextCatalogClientId = 0;

const createCatalogClientId = () => {
  nextCatalogClientId += 1;
  return `catalog-item-${nextCatalogClientId}`;
};

const toEditableCatalog = (
  suppliers: CompanyOrderCatalogSupplier[],
): EditableCatalogSupplier[] =>
  suppliers.map((supplier) => ({
    supplierName: supplier.supplierName,
    items: supplier.items.map((item) => ({
      ...item,
      clientId: createCatalogClientId(),
    })),
  }));

const normalizeCatalogName = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

const editableItemKey = (item: CompanyOrderCatalogItem) =>
  `${normalizeCatalogName(item.nameEs)}|${normalizeCatalogName(item.nameEn)}`;

const sanitizeCatalogForSave = (
  catalog: EditableCatalogSupplier[],
): CompanyOrderCatalogSupplier[] => {
  return catalog
    .map((supplier) => {
      const supplierName = supplier.supplierName.trim();
      const items = supplier.items
        .map<CompanyOrderCatalogItem | null>((item) => {
          const nameEs = item.nameEs.trim();
          const nameEn = item.nameEn.trim();
          if (!nameEs && !nameEn) {
            return null;
          }
          return {
            nameEs: nameEs || nameEn,
            nameEn: nameEn || nameEs,
            comparisonUnit: item.comparisonUnit === "lb" ? "lb" : "each",
          };
        })
        .filter((item): item is CompanyOrderCatalogItem => item !== null);

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
  const [catalog, setCatalog] = useState<EditableCatalogSupplier[]>([]);
  const [selectedSupplierIndex, setSelectedSupplierIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "danger" | "info">(
    "info",
  );
  const supplierNameInputRef = useRef<HTMLInputElement | null>(null);
  const addItemNameEsRef = useRef<HTMLInputElement | null>(null);
  const [newItemDraft, setNewItemDraft] = useState<{
    nameEs: string;
    nameEn: string;
    comparisonUnit: CompanyOrderComparisonUnit;
  }>({
    nameEs: "",
    nameEn: "",
    comparisonUnit: "each",
  });
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [transferTargetSupplierIndex, setTransferTargetSupplierIndex] =
    useState("");

  const selectedSupplier = useMemo(
    () => catalog[selectedSupplierIndex] ?? null,
    [catalog, selectedSupplierIndex],
  );

  const formatComparisonUnitLabel = useCallback(
    (value: CompanyOrderComparisonUnit) =>
      value === "lb"
        ? tr("Pounds (lb)", "Libras (lb)")
        : tr("Each item", "Cada unidad"),
    [tr],
  );

  const selectableTransferSuppliers = useMemo(
    () =>
      catalog
        .map((supplier, index) => ({
          index,
          supplierName:
            supplier.supplierName ||
            tr(`Supplier ${index + 1}`, `Proveedor ${index + 1}`),
        }))
        .filter((supplier) => supplier.index !== selectedSupplierIndex),
    [catalog, selectedSupplierIndex, tr],
  );

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    try {
      const suppliers = await getCompanyOrderCatalog();
      setCatalog(toEditableCatalog(suppliers));
      setSelectedItemIds([]);
      setTransferTargetSupplierIndex("");
      setNewItemDraft({
        nameEs: "",
        nameEn: "",
        comparisonUnit: "each",
      });
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

  useEffect(() => {
    setSelectedItemIds([]);
    setTransferTargetSupplierIndex("");
    setNewItemDraft({
      nameEs: "",
      nameEn: "",
      comparisonUnit: "each",
    });
  }, [selectedSupplierIndex]);

  const updateSupplier = (
    supplierIndex: number,
    updater: (
      supplier: EditableCatalogSupplier,
    ) => EditableCatalogSupplier,
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
          items: [],
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

    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        supplierNameInputRef.current?.focus();
      });
    }
  };

  const handleRemoveSupplier = (supplierIndex: number) => {
    setCatalog((previous) =>
      previous.filter((_, index) => index !== supplierIndex),
    );
    setStatusKind("info");
    setStatus(tr("Supplier removed.", "Proveedor eliminado."));
  };

  const handleAddItem = (supplierIndex: number) => {
    const nameEs = newItemDraft.nameEs.trim();
    const nameEn = newItemDraft.nameEn.trim();
    if (!nameEs && !nameEn) {
      setStatusKind("danger");
      setStatus(
        tr(
          "Enter at least one item name before adding it.",
          "Ingresa al menos un nombre del artículo antes de agregarlo.",
        ),
      );
      addItemNameEsRef.current?.focus();
      return;
    }

    updateSupplier(supplierIndex, (supplier) => ({
      ...supplier,
      items: [
        {
          clientId: createCatalogClientId(),
          nameEs: nameEs || nameEn,
          nameEn: nameEn || nameEs,
          comparisonUnit:
            newItemDraft.comparisonUnit === "lb" ? "lb" : "each",
        },
        ...supplier.items,
      ],
    }));
    setNewItemDraft({
      nameEs: "",
      nameEn: "",
      comparisonUnit: newItemDraft.comparisonUnit,
    });
    setStatusKind("info");
    setStatus(
      tr(
        "New item added at the top of the supplier list. Save the catalog when ready.",
        "Nuevo artículo agregado al inicio de la lista del proveedor. Guarda el catálogo cuando esté listo.",
      ),
    );

    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        addItemNameEsRef.current?.focus();
      });
    }
  };

  const handleRemoveItem = (supplierIndex: number, itemIndex: number) => {
    const itemId = catalog[supplierIndex]?.items[itemIndex]?.clientId;
    updateSupplier(supplierIndex, (supplier) => ({
      ...supplier,
      items: supplier.items.filter((_, index) => index !== itemIndex),
    }));
    if (itemId) {
      setSelectedItemIds((previous) =>
        previous.filter((selectedId) => selectedId !== itemId),
      );
    }
  };

  const handleToggleItemSelection = (itemId: string) => {
    setSelectedItemIds((previous) =>
      previous.includes(itemId)
        ? previous.filter((selectedId) => selectedId !== itemId)
        : [...previous, itemId],
    );
  };

  const handleSelectAllItems = () => {
    if (!selectedSupplier) {
      return;
    }
    const nextItemIds = selectedSupplier.items.map((item) => item.clientId);
    setSelectedItemIds((previous) =>
      previous.length === nextItemIds.length ? [] : nextItemIds,
    );
  };

  const handleTransferSelectedItems = () => {
    if (!selectedSupplier) {
      return;
    }
    if (!selectedItemIds.length) {
      setStatusKind("danger");
      setStatus(
        tr(
          "Select at least one item to transfer.",
          "Selecciona al menos un artículo para transferir.",
        ),
      );
      return;
    }
    if (!transferTargetSupplierIndex) {
      setStatusKind("danger");
      setStatus(
        tr(
          "Choose a destination supplier first.",
          "Primero elige un proveedor de destino.",
        ),
      );
      return;
    }

    const destinationIndex = Number(transferTargetSupplierIndex);
    if (Number.isNaN(destinationIndex) || destinationIndex === selectedSupplierIndex) {
      setStatusKind("danger");
      setStatus(
        tr(
          "Choose a different destination supplier.",
          "Elige un proveedor de destino diferente.",
        ),
      );
      return;
    }

    const sourceSupplier = catalog[selectedSupplierIndex];
    const destinationSupplier = catalog[destinationIndex];
    if (!sourceSupplier || !destinationSupplier) {
      return;
    }

    const movingItems = sourceSupplier.items.filter((item) =>
      selectedItemIds.includes(item.clientId),
    );
    if (!movingItems.length) {
      setStatusKind("danger");
      setStatus(
        tr(
          "No selected items were found to transfer.",
          "No se encontraron artículos seleccionados para transferir.",
        ),
      );
      return;
    }

    const remainingItems = sourceSupplier.items.filter(
      (item) => !selectedItemIds.includes(item.clientId),
    );
    const destinationItems = [...destinationSupplier.items];
    const destinationKeys = new Set(
      destinationItems.map((item) => editableItemKey(item)),
    );

    let transferredCount = 0;
    let skippedDuplicates = 0;

    movingItems.forEach((item) => {
      const itemKey = editableItemKey(item);
      if (destinationKeys.has(itemKey)) {
        skippedDuplicates += 1;
        return;
      }
      destinationKeys.add(itemKey);
      destinationItems.push(item);
      transferredCount += 1;
    });

    const nextCatalog = catalog.map((supplier, index) => {
      if (index === selectedSupplierIndex) {
        return {
          ...supplier,
          items: remainingItems,
        };
      }
      if (index === destinationIndex) {
        return {
          ...supplier,
          items: destinationItems,
        };
      }
      return supplier;
    });

    setCatalog(nextCatalog);

    setSelectedItemIds([]);
    setTransferTargetSupplierIndex("");
    setStatusKind("info");
    setStatus(
      tr(
        skippedDuplicates
          ? `Transferred ${transferredCount} item(s). Skipped ${skippedDuplicates} duplicate(s). Save the catalog to keep the move.`
          : `Transferred ${transferredCount} item(s). Save the catalog to keep the move.`,
        skippedDuplicates
          ? `Se transfirieron ${transferredCount} artículo(s). Se omitieron ${skippedDuplicates} duplicado(s). Guarda el catálogo para conservar el cambio.`
          : `Se transfirieron ${transferredCount} artículo(s). Guarda el catálogo para conservar el cambio.`,
      ),
    );
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
      setCatalog(toEditableCatalog(nextCatalog));
      setSelectedItemIds([]);
      setTransferTargetSupplierIndex("");
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
                        ref={supplierNameInputRef}
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
                      <div className="small text-muted">
                        {tr(
                          `${selectedSupplier.items.length} items`,
                          `${selectedSupplier.items.length} artículos`,
                        )}
                      </div>
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

                  <div className="border rounded p-3 bg-body-tertiary">
                    <div className="row g-2 align-items-end">
                      <div className="col-12 col-md-4">
                        <label className="form-label mb-1">
                          {tr("Quick Add Spanish Name", "Alta rápida Nombre en Español")}
                        </label>
                        <input
                          ref={addItemNameEsRef}
                          className="form-control"
                          value={newItemDraft.nameEs}
                          onChange={(event) =>
                            setNewItemDraft((previous) => ({
                              ...previous,
                              nameEs: event.target.value,
                            }))
                          }
                          placeholder={tr("Example: Cafe", "Ejemplo: Café")}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              handleAddItem(selectedSupplierIndex);
                            }
                          }}
                        />
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label mb-1">
                          {tr("Quick Add English Name", "Alta rápida Nombre en Inglés")}
                        </label>
                        <input
                          className="form-control"
                          value={newItemDraft.nameEn}
                          onChange={(event) =>
                            setNewItemDraft((previous) => ({
                              ...previous,
                              nameEn: event.target.value,
                            }))
                          }
                          placeholder={tr("Example: Coffee", "Ejemplo: Coffee")}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              handleAddItem(selectedSupplierIndex);
                            }
                          }}
                        />
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label mb-1">
                          {tr("Measure As", "Medir Como")}
                        </label>
                        <select
                          className="form-select"
                          value={newItemDraft.comparisonUnit}
                          onChange={(event) =>
                            setNewItemDraft((previous) => ({
                              ...previous,
                              comparisonUnit:
                                event.target.value === "lb" ? "lb" : "each",
                            }))
                          }
                        >
                          <option value="each">
                            {tr("Each item", "Cada unidad")}
                          </option>
                          <option value="lb">
                            {tr("Pounds (lb)", "Libras (lb)")}
                          </option>
                        </select>
                      </div>
                      <div className="col-12 col-md-2">
                        <button
                          type="button"
                          className="btn btn-outline-primary w-100"
                          onClick={() => handleAddItem(selectedSupplierIndex)}
                        >
                          {tr("Add Item", "Agregar Artículo")}
                        </button>
                      </div>
                    </div>
                    <div className="form-text">
                      {tr(
                        "Choose whether quantity for this item should mean each item or pounds. New items are inserted at the top so you stay on the same section.",
                        "Elige si la cantidad de este artículo significa cada unidad o libras. Los artículos nuevos se insertan al inicio para que sigas en la misma sección.",
                      )}
                    </div>
                  </div>

                  <div className="border rounded p-3 bg-body-tertiary">
                    <div className="row g-2 align-items-end">
                      <div className="col-12 col-md-4">
                        <div className="form-label mb-1">
                          {tr(
                            "Selected Items",
                            "Artículos Seleccionados",
                          )}
                        </div>
                        <div className="small text-muted">
                          {tr(
                            `${selectedItemIds.length} item(s) selected`,
                            `${selectedItemIds.length} artículo(s) seleccionados`,
                          )}
                        </div>
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="form-label mb-1">
                          {tr("Transfer To", "Transferir a")}
                        </label>
                        <select
                          className="form-select"
                          value={transferTargetSupplierIndex}
                          onChange={(event) =>
                            setTransferTargetSupplierIndex(event.target.value)
                          }
                        >
                          <option value="">
                            {tr(
                              "Choose supplier",
                              "Selecciona proveedor",
                            )}
                          </option>
                          {selectableTransferSuppliers.map((supplier) => (
                            <option
                              key={`transfer-${supplier.index}`}
                              value={supplier.index}
                            >
                              {supplier.supplierName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-6 col-md-2">
                        <button
                          type="button"
                          className="btn btn-outline-secondary w-100"
                          onClick={handleSelectAllItems}
                          disabled={!selectedSupplier.items.length}
                        >
                          {selectedItemIds.length === selectedSupplier.items.length &&
                          selectedSupplier.items.length
                            ? tr("Clear", "Limpiar")
                            : tr("Select All", "Marcar Todos")}
                        </button>
                      </div>
                      <div className="col-6 col-md-2">
                        <button
                          type="button"
                          className="btn btn-outline-primary w-100"
                          onClick={handleTransferSelectedItems}
                          disabled={
                            !selectedItemIds.length ||
                            !transferTargetSupplierIndex
                          }
                        >
                          {tr("Transfer", "Transferir")}
                        </button>
                      </div>
                    </div>
                    <div className="form-text">
                      {tr(
                        "Use this to move selected catalog items to another supplier before saving.",
                        "Usa esto para mover artículos seleccionados a otro proveedor antes de guardar.",
                      )}
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
                          key={item.clientId}
                          className="border rounded p-2"
                        >
                          <div className="row g-2 align-items-end">
                            <div className="col-12 col-md-1">
                              <div className="form-check pt-4">
                                <input
                                  id={`catalog-item-${item.clientId}`}
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={selectedItemIds.includes(item.clientId)}
                                  onChange={() =>
                                    handleToggleItemSelection(item.clientId)
                                  }
                                />
                              </div>
                            </div>
                            <div className="col-12 col-md-4">
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
                            <div className="col-12 col-md-3">
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
                            <div className="col-12 col-md-3">
                              <label className="form-label mb-1">
                                {tr("Measure As", "Medir Como")}
                              </label>
                              <select
                                className="form-select"
                                value={item.comparisonUnit === "lb" ? "lb" : "each"}
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
                                                comparisonUnit:
                                                  event.target.value === "lb"
                                                    ? "lb"
                                                    : "each",
                                              }
                                            : entry,
                                      ),
                                    }),
                                  )
                                }
                              >
                                <option value="each">
                                  {tr("Each item", "Cada unidad")}
                                </option>
                                <option value="lb">
                                  {tr("Pounds (lb)", "Libras (lb)")}
                                </option>
                              </select>
                              <div className="form-text">
                                {formatComparisonUnitLabel(
                                  item.comparisonUnit === "lb" ? "lb" : "each",
                                )}
                              </div>
                            </div>
                            <div className="col-12 col-md-1">
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

                  <div className="d-flex flex-wrap gap-2 justify-content-end border-top pt-3">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        void loadCatalog();
                      }}
                      disabled={loading || saving}
                    >
                      {tr("Reload Catalog", "Recargar Catálogo")}
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
