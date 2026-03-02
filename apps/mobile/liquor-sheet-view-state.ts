import { useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import type { LiquorCatalogItem, LiquorCountRow, LiquorSheetDraft } from "./types";

export type LiquorSheetRow = {
  item: LiquorCatalogItem;
  barQuantity: number;
  bodegaQuantity: number;
  inventory: number;
  total: number | null;
};

export const useLiquorSheetViewState = (params: {
  liquorCatalog: LiquorCatalogItem[];
  liquorCounts: LiquorCountRow[];
  setLiquorSheetDrafts: Dispatch<
    SetStateAction<Record<string, LiquorSheetDraft>>
  >;
}) => {
  const latestLiquorCountByItem = useMemo(() => {
    const map = new Map<string, LiquorCountRow>();
    params.liquorCounts.forEach((count) => {
      if (!map.has(count.itemId)) {
        map.set(count.itemId, count);
      }
    });
    return map;
  }, [params.liquorCounts]);

  const liquorSheetRows = useMemo(
    () =>
      [...params.liquorCatalog]
        .filter((item) => item.isActive)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => {
          const latestCount = latestLiquorCountByItem.get(item.id);
          const barQuantity =
            latestCount?.barQuantity ?? latestCount?.quantity ?? 0;
          const bodegaQuantity = latestCount?.bodegaQuantity ?? 0;
          const inventory = barQuantity + bodegaQuantity;
          const total =
            item.sizeMl && item.sizeMl > 0
              ? Number(((item.unitCost * inventory) / item.sizeMl).toFixed(2))
              : null;
          return {
            item,
            barQuantity,
            bodegaQuantity,
            inventory,
            total,
          };
        }),
    [latestLiquorCountByItem, params.liquorCatalog],
  );

  useEffect(() => {
    params.setLiquorSheetDrafts((previous) => {
      const next: Record<string, LiquorSheetDraft> = {};
      liquorSheetRows.forEach((row) => {
        const existing = previous[row.item.id];
        next[row.item.id] = existing || {
          supplierName: row.item.supplierName || "",
          unitCost: String(row.item.unitCost ?? ""),
          sizeMl: row.item.sizeMl === null ? "" : String(row.item.sizeMl),
          barQuantity: String(row.barQuantity || ""),
          bodegaQuantity: String(row.bodegaQuantity || ""),
        };
      });
      return next;
    });
  }, [liquorSheetRows, params.setLiquorSheetDrafts]);

  return {
    liquorSheetRows,
  };
};
