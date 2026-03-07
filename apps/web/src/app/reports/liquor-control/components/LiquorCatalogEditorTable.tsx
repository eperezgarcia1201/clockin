"use client";

type Draft = {
  name: string;
  brand: string;
  upc: string;
  supplierName: string;
  unitCost: string;
  sizeMl: string;
  barQuantity: string;
  bodegaBottleCount: string;
};

type CatalogItem = {
  id: string;
  name: string;
  brand: string | null;
  upc: string | null;
  sizeMl: number | null;
  supplierName: string | null;
  unitCost: number;
};

export function LiquorCatalogEditorTable({
  items,
  drafts,
  noItemsLabel,
  companyLabel,
  liquorNameLabel,
  liquorKindLabel,
  qtyMlLabel,
  priceLabel,
  actionsLabel,
  saveLabel,
  disabled,
  onUpdateField,
  onSave,
}: {
  items: CatalogItem[];
  drafts: Record<string, Draft>;
  noItemsLabel: string;
  companyLabel: string;
  liquorNameLabel: string;
  liquorKindLabel: string;
  qtyMlLabel: string;
  priceLabel: string;
  actionsLabel: string;
  saveLabel: string;
  disabled: boolean;
  onUpdateField: (itemId: string, field: keyof Draft, value: string) => void;
  onSave: (itemId: string) => void;
}) {
  return (
    <div className="table-responsive">
      <table className="report-table">
        <thead>
          <tr>
            <th>{companyLabel}</th>
            <th>{liquorNameLabel}</th>
            <th>{liquorKindLabel}</th>
            <th>UPC</th>
            <th>{qtyMlLabel}</th>
            <th>{priceLabel}</th>
            <th>{actionsLabel}</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-muted text-center py-3">
                {noItemsLabel}
              </td>
            </tr>
          ) : null}
          {items.map((item) => {
            const draft = drafts[item.id];

            return (
              <tr key={`catalog-row-${item.id}`}>
                <td>
                  <input
                    className="form-control form-control-sm"
                    value={draft?.supplierName ?? item.supplierName ?? ""}
                    onChange={(event) =>
                      onUpdateField(item.id, "supplierName", event.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    className="form-control form-control-sm"
                    value={draft?.name ?? item.name}
                    onChange={(event) =>
                      onUpdateField(item.id, "name", event.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    className="form-control form-control-sm"
                    list="liquor-kind-options"
                    value={draft?.brand ?? item.brand ?? ""}
                    onChange={(event) =>
                      onUpdateField(item.id, "brand", event.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    className="form-control form-control-sm"
                    value={draft?.upc ?? item.upc ?? ""}
                    onChange={(event) =>
                      onUpdateField(item.id, "upc", event.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    className="form-control form-control-sm"
                    value={draft?.sizeMl ?? String(item.sizeMl ?? "")}
                    onChange={(event) =>
                      onUpdateField(item.id, "sizeMl", event.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    className="form-control form-control-sm"
                    value={draft?.unitCost ?? String(item.unitCost)}
                    onChange={(event) =>
                      onUpdateField(item.id, "unitCost", event.target.value)
                    }
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    disabled={disabled}
                    onClick={() => onSave(item.id)}
                  >
                    {saveLabel}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
