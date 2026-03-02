import type {
  LiquorBottleScanRow,
  LiquorCatalogItem,
  LiquorCountRow,
  LiquorMovementRow,
  LiquorMovementType,
} from "./types";

export const normalizeLiquorKinds = (payload: {
  kinds?: Array<string>;
}): string[] =>
  Array.isArray(payload.kinds)
    ? payload.kinds
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    : [];

export const normalizeLiquorCatalogItems = (payload: {
  items?: Array<Record<string, unknown>>;
}): LiquorCatalogItem[] =>
  Array.isArray(payload.items)
    ? (payload.items
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
            upc: typeof candidate.upc === "string" ? candidate.upc : null,
            unitLabel:
              typeof candidate.unitLabel === "string"
                ? candidate.unitLabel
                : null,
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
        .filter((row) => Boolean(row)) as LiquorCatalogItem[])
    : [];

export const normalizeLiquorCounts = (
  payload: { counts?: Array<Record<string, unknown>> },
  fallbackDate: string,
): LiquorCountRow[] =>
  Array.isArray(payload.counts)
    ? (payload.counts
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
            officeId:
              typeof candidate.officeId === "string"
                ? candidate.officeId
                : undefined,
            officeName:
              typeof candidate.officeName === "string"
                ? candidate.officeName
                : null,
            itemId,
            itemName:
              typeof candidate.itemName === "string"
                ? candidate.itemName
                : undefined,
            itemBrand:
              typeof candidate.itemBrand === "string"
                ? candidate.itemBrand
                : null,
            itemUpc:
              typeof candidate.itemUpc === "string" ? candidate.itemUpc : null,
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
            bodegaBottleCount:
              typeof candidate.bodegaBottleCount === "number" &&
              Number.isFinite(candidate.bodegaBottleCount)
                ? candidate.bodegaBottleCount
                : null,
            itemSizeMl:
              typeof candidate.itemSizeMl === "number" &&
              Number.isFinite(candidate.itemSizeMl)
                ? candidate.itemSizeMl
                : null,
            notes: typeof candidate.notes === "string" ? candidate.notes : "",
            createdBy:
              typeof candidate.createdBy === "string"
                ? candidate.createdBy
                : null,
            createdAt:
              typeof candidate.createdAt === "string"
                ? candidate.createdAt
                : undefined,
            updatedAt:
              typeof candidate.updatedAt === "string"
                ? candidate.updatedAt
                : undefined,
          } satisfies LiquorCountRow;
        })
        .filter((row) => Boolean(row)) as LiquorCountRow[])
    : [];

export const normalizeLiquorMovements = (
  payload: { movements?: Array<Record<string, unknown>> },
  movementTypes: LiquorMovementType[],
): LiquorMovementRow[] =>
  Array.isArray(payload.movements)
    ? payload.movements
        .map((candidate) => {
          const id =
            typeof candidate.id === "string" ? candidate.id.trim() : "";
          const itemId =
            typeof candidate.itemId === "string" ? candidate.itemId.trim() : "";
          const officeId =
            typeof candidate.officeId === "string"
              ? candidate.officeId.trim()
              : "";
          const type =
            typeof candidate.type === "string" ? candidate.type.trim() : "";
          const quantity =
            typeof candidate.quantity === "number" &&
            Number.isFinite(candidate.quantity)
              ? candidate.quantity
              : null;
          if (
            !id ||
            !itemId ||
            !officeId ||
            !type ||
            quantity === null ||
            !movementTypes.includes(type as LiquorMovementType)
          ) {
            return null;
          }
          return {
            id,
            officeId,
            officeName:
              typeof candidate.officeName === "string"
                ? candidate.officeName
                : "Location",
            itemId,
            itemName:
              typeof candidate.itemName === "string"
                ? candidate.itemName
                : "Item",
            itemBrand:
              typeof candidate.itemBrand === "string"
                ? candidate.itemBrand
                : null,
            itemUpc:
              typeof candidate.itemUpc === "string" ? candidate.itemUpc : null,
            type: type as LiquorMovementType,
            quantity,
            unitCostOverride:
              typeof candidate.unitCostOverride === "number" &&
              Number.isFinite(candidate.unitCostOverride)
                ? candidate.unitCostOverride
                : null,
            occurredAt:
              typeof candidate.occurredAt === "string"
                ? candidate.occurredAt
                : new Date().toISOString(),
            notes: typeof candidate.notes === "string" ? candidate.notes : "",
            createdBy:
              typeof candidate.createdBy === "string"
                ? candidate.createdBy
                : null,
            createdAt:
              typeof candidate.createdAt === "string"
                ? candidate.createdAt
                : new Date().toISOString(),
          } satisfies LiquorMovementRow;
        })
        .filter((row): row is LiquorMovementRow => Boolean(row))
    : [];

export const normalizeLiquorBottleScans = (payload: {
  scans?: Array<Record<string, unknown>>;
}): LiquorBottleScanRow[] =>
  Array.isArray(payload.scans)
    ? (payload.scans
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
            officeId:
              typeof candidate.officeId === "string"
                ? candidate.officeId
                : undefined,
            officeName:
              typeof candidate.officeName === "string"
                ? candidate.officeName
                : null,
            itemId,
            itemName:
              typeof candidate.itemName === "string"
                ? candidate.itemName
                : "Item",
            itemBrand:
              typeof candidate.itemBrand === "string"
                ? candidate.itemBrand
                : null,
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
            confidence:
              typeof candidate.confidence === "number" &&
              Number.isFinite(candidate.confidence)
                ? candidate.confidence
                : null,
            source:
              typeof candidate.source === "string"
                ? candidate.source
                : undefined,
            createdBy:
              typeof candidate.createdBy === "string"
                ? candidate.createdBy
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
        .filter((row) => Boolean(row)) as LiquorBottleScanRow[])
    : [];
