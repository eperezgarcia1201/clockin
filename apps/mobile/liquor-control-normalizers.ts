import type {
  LiquorBottleScanRow,
  LiquorCatalogItem,
  LiquorCountRow,
} from "./types";

export const normalizeLiquorCatalogItems = (payload: {
  items?: Array<Record<string, unknown>>;
}): LiquorCatalogItem[] =>
  Array.isArray(payload.items)
    ? payload.items
        .map((candidate) => {
          const id =
            typeof candidate.id === "string" ? candidate.id.trim() : "";
          const name =
            typeof candidate.name === "string" ? candidate.name.trim() : "";
          if (!id || !name) {
            return null;
          }
          const unitCost =
            typeof candidate.unitCost === "number" &&
            Number.isFinite(candidate.unitCost)
              ? candidate.unitCost
              : 0;
          return {
            id,
            name,
            brand: typeof candidate.brand === "string" ? candidate.brand : null,
            supplierName:
              typeof candidate.supplierName === "string"
                ? candidate.supplierName
                : null,
            sizeMl:
              typeof candidate.sizeMl === "number" &&
              Number.isFinite(candidate.sizeMl)
                ? candidate.sizeMl
                : null,
            unitCost,
            isActive:
              typeof candidate.isActive === "boolean"
                ? candidate.isActive
                : true,
          } satisfies LiquorCatalogItem;
        })
        .filter((row): row is LiquorCatalogItem => Boolean(row))
    : [];

export const normalizeLiquorCounts = (
  payload: { counts?: Array<Record<string, unknown>> },
  fallbackDate: string,
): LiquorCountRow[] =>
  Array.isArray(payload.counts)
    ? payload.counts
        .map((candidate) => {
          const id =
            typeof candidate.id === "string" ? candidate.id.trim() : "";
          const itemId =
            typeof candidate.itemId === "string" ? candidate.itemId.trim() : "";
          if (!id || !itemId) {
            return null;
          }
          const quantity =
            typeof candidate.quantity === "number" &&
            Number.isFinite(candidate.quantity)
              ? candidate.quantity
              : 0;
          return {
            id,
            itemId,
            countDate:
              typeof candidate.countDate === "string"
                ? candidate.countDate
                : fallbackDate,
            quantity,
            barQuantity:
              typeof candidate.barQuantity === "number" &&
              Number.isFinite(candidate.barQuantity)
                ? candidate.barQuantity
                : null,
            bodegaQuantity:
              typeof candidate.bodegaQuantity === "number" &&
              Number.isFinite(candidate.bodegaQuantity)
                ? candidate.bodegaQuantity
                : null,
          } satisfies LiquorCountRow;
        })
        .filter((row): row is LiquorCountRow => Boolean(row))
    : [];

export const normalizeLiquorBottleScans = (payload: {
  scans?: Array<Record<string, unknown>>;
}): LiquorBottleScanRow[] =>
  Array.isArray(payload.scans)
    ? payload.scans
        .map((candidate) => {
          const id =
            typeof candidate.id === "string" ? candidate.id.trim() : "";
          const itemId =
            typeof candidate.itemId === "string" ? candidate.itemId.trim() : "";
          if (!id || !itemId) {
            return null;
          }
          return {
            id,
            itemId,
            itemName:
              typeof candidate.itemName === "string"
                ? candidate.itemName
                : "Item",
            containerKey:
              typeof candidate.containerKey === "string"
                ? candidate.containerKey
                : null,
            fillPercent:
              typeof candidate.fillPercent === "number" &&
              Number.isFinite(candidate.fillPercent)
                ? candidate.fillPercent
                : 0,
            estimatedMl:
              typeof candidate.estimatedMl === "number" &&
              Number.isFinite(candidate.estimatedMl)
                ? candidate.estimatedMl
                : null,
            measuredAt:
              typeof candidate.measuredAt === "string"
                ? candidate.measuredAt
                : new Date().toISOString(),
            createdAt:
              typeof candidate.createdAt === "string"
                ? candidate.createdAt
                : new Date().toISOString(),
          } satisfies LiquorBottleScanRow;
        })
        .filter((row): row is LiquorBottleScanRow => Boolean(row))
    : [];
