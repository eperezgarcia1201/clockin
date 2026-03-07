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

type SpreadsheetRow = {
  item: {
    id: string;
    name: string;
    brand: string | null;
    supplierName: string | null;
    unitCost: number;
    sizeMl: number | null;
  };
  barQuantity: number;
  bodegaBottleCount: number;
  bodegaQuantityMl: number;
};

export function LiquorInventoryCountTable({
  rows,
  drafts,
  noItemsLabel,
  itemLabel,
  barLabel,
  bodegaBottlesLabel,
  bodegaMlLabel,
  inventoryLabel,
  totalLabel,
  actionsLabel,
  saveLabel,
  disabled,
  formatQty,
  formatMoney,
  onUpdateField,
  onSave,
}: {
  rows: SpreadsheetRow[];
  drafts: Record<string, Draft>;
  noItemsLabel: string;
  itemLabel: string;
  barLabel: string;
  bodegaBottlesLabel: string;
  bodegaMlLabel: string;
  inventoryLabel: string;
  totalLabel: string;
  actionsLabel: string;
  saveLabel: string;
  disabled: boolean;
  formatQty: (value: number | null | undefined) => string;
  formatMoney: (value: number | null | undefined) => string;
  onUpdateField: (itemId: string, field: keyof Draft, value: string) => void;
  onSave: (itemId: string) => void;
}) {
  return (
    <div className="table-responsive">
      <table className="report-table">
        <thead>
          <tr>
            <th>{itemLabel}</th>
            <th>{barLabel}</th>
            <th>{bodegaBottlesLabel}</th>
            <th>{bodegaMlLabel}</th>
            <th>{inventoryLabel}</th>
            <th>{totalLabel}</th>
            <th>{actionsLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-muted text-center py-3">
                {noItemsLabel}
              </td>
            </tr>
          ) : null}
          {rows.map((row) => {
            const draft = drafts[row.item.id];
            const bar = Number(draft?.barQuantity ?? row.barQuantity) || 0;
            const qtyMl = Number(draft?.sizeMl ?? row.item.sizeMl) || 0;
            const unitCost = Number(draft?.unitCost ?? row.item.unitCost) || 0;
            const bodegaBottleCount =
              Number(draft?.bodegaBottleCount ?? row.bodegaBottleCount) || 0;
            const bodegaMl =
              qtyMl > 0
                ? bodegaBottleCount * qtyMl
                : Number(row.bodegaQuantityMl) || 0;
            const inventory = bar + bodegaMl;
            const total = qtyMl > 0 ? (unitCost * inventory) / qtyMl : null;
            const detailParts = [
              draft?.supplierName ?? row.item.supplierName ?? "",
              draft?.brand ?? row.item.brand ?? "",
            ].filter(Boolean);

            return (
              <tr key={`inventory-row-${row.item.id}`}>
                <td>
                  <div className="fw-semibold">{draft?.name ?? row.item.name}</div>
                  <div className="small text-muted">
                    {detailParts.length > 0 ? detailParts.join(" • ") : "—"}
                  </div>
                </td>
                <td>
                  <input
                    className="form-control form-control-sm"
                    value={draft?.barQuantity ?? String(row.barQuantity)}
                    onChange={(event) =>
                      onUpdateField(row.item.id, "barQuantity", event.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    className="form-control form-control-sm"
                    value={
                      draft?.bodegaBottleCount ?? String(row.bodegaBottleCount)
                    }
                    onChange={(event) =>
                      onUpdateField(
                        row.item.id,
                        "bodegaBottleCount",
                        event.target.value,
                      )
                    }
                  />
                </td>
                <td>{formatQty(bodegaMl)}</td>
                <td>{formatQty(inventory)}</td>
                <td>{formatMoney(total)}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={disabled}
                    onClick={() => onSave(row.item.id)}
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
