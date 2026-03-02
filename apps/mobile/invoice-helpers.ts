import type { LiquorInvoiceExtractedRow } from "./types";

export const normalizeLiquorInvoiceRows = (
  rows: Array<Record<string, unknown>>,
): LiquorInvoiceExtractedRow[] =>
  rows
    .map((candidate, index) => {
      const liquorName =
        typeof candidate.liquorName === "string"
          ? candidate.liquorName.trim()
          : "";
      if (!liquorName) {
        return null;
      }
      const matchedItem =
        candidate.matchedItem && typeof candidate.matchedItem === "object"
          ? (candidate.matchedItem as Record<string, unknown>)
          : null;
      const costShock =
        candidate.costShock && typeof candidate.costShock === "object"
          ? (candidate.costShock as Record<string, unknown>)
          : null;
      const costShockSeverity =
        typeof costShock?.severity === "string" &&
        (costShock.severity === "normal" ||
          costShock.severity === "elevated" ||
          costShock.severity === "critical")
          ? costShock.severity
          : "normal";
      const costShockDeltaPct =
        typeof costShock?.deltaPct === "number" &&
        Number.isFinite(costShock.deltaPct)
          ? costShock.deltaPct
          : null;
      return {
        rowNumber:
          typeof candidate.rowNumber === "number" &&
          Number.isFinite(candidate.rowNumber)
            ? candidate.rowNumber
            : index + 1,
        company:
          typeof candidate.company === "string" ? candidate.company.trim() : null,
        liquorName,
        kind: typeof candidate.kind === "string" ? candidate.kind.trim() : null,
        upc: typeof candidate.upc === "string" ? candidate.upc.trim() : null,
        ml:
          typeof candidate.ml === "number" && Number.isFinite(candidate.ml)
            ? candidate.ml
            : null,
        unitCost:
          typeof candidate.unitCost === "number" &&
          Number.isFinite(candidate.unitCost)
            ? candidate.unitCost
            : null,
        quantity:
          typeof candidate.quantity === "number" &&
          Number.isFinite(candidate.quantity)
            ? candidate.quantity
            : null,
        matchedItemId:
          matchedItem && typeof matchedItem.id === "string"
            ? matchedItem.id.trim()
            : null,
        matchedItemName:
          matchedItem && typeof matchedItem.name === "string"
            ? matchedItem.name.trim()
            : null,
        suggestedAction:
          candidate.suggestedAction === "update" ? "update" : "create",
        costShockDeltaPct,
        costShockSeverity,
        costShockFlag: Boolean(costShock?.isShock),
      } satisfies LiquorInvoiceExtractedRow;
    })
    .filter((row): row is LiquorInvoiceExtractedRow => Boolean(row));
