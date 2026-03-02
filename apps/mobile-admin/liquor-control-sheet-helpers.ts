import type { LiquorCatalogItem, LiquorCountRow, LiquorSheetDraft } from "./types";

export type LiquorSheetRow = {
  item: LiquorCatalogItem;
  barQuantity: number;
  bodegaQuantity: number;
  bodegaBottleCount: number;
  inventory: number;
  total: number | null;
};

export const syncLiquorSheetDrafts = (
  previous: Record<string, LiquorSheetDraft>,
  liquorSheetRows: LiquorSheetRow[],
): Record<string, LiquorSheetDraft> => {
  const next: Record<string, LiquorSheetDraft> = {};
  liquorSheetRows.forEach((row) => {
    const existing = previous[row.item.id];
    next[row.item.id] = existing || {
      name: row.item.name || "",
      brand: row.item.brand || "",
      upc: row.item.upc || "",
      supplierName: row.item.supplierName || "",
      unitCost: String(row.item.unitCost ?? ""),
      sizeMl: row.item.sizeMl === null ? "" : String(row.item.sizeMl),
      barQuantity: String(row.barQuantity || ""),
      bodegaBottleCount: String(row.bodegaBottleCount || ""),
    };
  });
  return next;
};

export const buildLiquorSheetRows = (
  liquorCatalog: LiquorCatalogItem[],
  liquorCounts: LiquorCountRow[],
): LiquorSheetRow[] => {
  const latestLiquorCountByItem = new Map<string, LiquorCountRow>();
  liquorCounts.forEach((count) => {
    if (!latestLiquorCountByItem.has(count.itemId)) {
      latestLiquorCountByItem.set(count.itemId, count);
    }
  });

  return [...liquorCatalog]
    .filter((item) => item.isActive)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => {
      const latestCount = latestLiquorCountByItem.get(item.id);
      const itemSizeMl = latestCount?.itemSizeMl ?? item.sizeMl;
      const barQuantity = latestCount?.barQuantity ?? latestCount?.quantity ?? 0;
      const bodegaQuantity = latestCount?.bodegaQuantity ?? 0;
      const bodegaBottleCount =
        latestCount?.bodegaBottleCount ??
        (itemSizeMl && itemSizeMl > 0 ? Number((bodegaQuantity / itemSizeMl).toFixed(3)) : 0);
      const inventory = barQuantity + bodegaQuantity;
      const total =
        item.sizeMl && item.sizeMl > 0
          ? Number(((item.unitCost * inventory) / item.sizeMl).toFixed(2))
          : null;
      return {
        item,
        barQuantity,
        bodegaQuantity,
        bodegaBottleCount,
        inventory,
        total,
      };
    });
};
