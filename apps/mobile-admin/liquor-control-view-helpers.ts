import type {
  LiquorBottleScanRow,
  LiquorCatalogItem,
  LiquorCountRow,
  LiquorMonthlyReport,
  LiquorMovementRow,
} from "./types";
import { matchesLiquorSearch, sortLiquorSuggestions } from "./liquor-control-search";
import type { LiquorSheetRow } from "./liquor-control-sheet-helpers";

export {
  buildLiquorSheetRows,
  syncLiquorSheetDrafts,
} from "./liquor-control-sheet-helpers";
export {
  formatMoneyValue,
  formatPercentValue,
  formatQtyValue,
} from "./liquor-control-formatters";

type LiquorQuickCountFormState = {
  itemId: string;
  bodegaBottleCount: string;
};

type LiquorKindFormState = {
  newKind: string;
  deleteKind: string;
};

type BuildLiquorControlViewModelArgs = {
  liquorMovements: LiquorMovementRow[];
  liquorCounts: LiquorCountRow[];
  liquorBottleScans: LiquorBottleScanRow[];
  liquorMonthly: LiquorMonthlyReport | null;
  liquorMonthlyPrevious: LiquorMonthlyReport | null;
  liquorCatalog: LiquorCatalogItem[];
  liquorQuickCountForm: LiquorQuickCountFormState;
  liquorSheetRows: LiquorSheetRow[];
  liquorInventorySearch: string;
  liquorCatalogSearch: string;
  liquorInventoryVisibleCount: number;
  liquorCatalogVisibleCount: number;
  liquorCatalogBrandQuery: string;
  liquorKinds: string[];
  liquorKindForm: LiquorKindFormState;
};

export function buildLiquorControlViewModel({
  liquorMovements,
  liquorCounts,
  liquorBottleScans,
  liquorMonthly,
  liquorMonthlyPrevious,
  liquorCatalog,
  liquorQuickCountForm,
  liquorSheetRows,
  liquorInventorySearch,
  liquorCatalogSearch,
  liquorInventoryVisibleCount,
  liquorCatalogVisibleCount,
  liquorCatalogBrandQuery,
  liquorKinds,
  liquorKindForm,
}: BuildLiquorControlViewModelArgs) {
  const sortedMovements = [...liquorMovements].sort((a, b) => {
    const aTime = Date.parse(a.occurredAt || a.createdAt);
    const bTime = Date.parse(b.occurredAt || b.createdAt);
    return (
      (Number.isFinite(bTime) ? bTime : 0) -
      (Number.isFinite(aTime) ? aTime : 0)
    );
  });
  const sortedCounts = [...liquorCounts].sort((a, b) => {
    const aTime = Date.parse(a.updatedAt || a.createdAt || a.countDate);
    const bTime = Date.parse(b.updatedAt || b.createdAt || b.countDate);
    return (
      (Number.isFinite(bTime) ? bTime : 0) -
      (Number.isFinite(aTime) ? aTime : 0)
    );
  });
  const sortedScans = [...liquorBottleScans].sort((a, b) => {
    const aTime = Date.parse(a.measuredAt || a.createdAt);
    const bTime = Date.parse(b.measuredAt || b.createdAt);
    return (
      (Number.isFinite(bTime) ? bTime : 0) -
      (Number.isFinite(aTime) ? aTime : 0)
    );
  });

  const monthlySummary = liquorMonthly?.summary || null;
  const monthlyRows = liquorMonthly?.rows || [];
  const monthlyIntelligence = liquorMonthly?.intelligence;
  const sortedCatalogItems = [...liquorCatalog].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
  const quickCountSelectedItem =
    sortedCatalogItems.find(
      (item) => item.id === liquorQuickCountForm.itemId,
    ) || null;
  const quickCountBottleInput = liquorQuickCountForm.bodegaBottleCount.trim()
    ? Number(liquorQuickCountForm.bodegaBottleCount)
    : 0;
  const quickCountBodegaMl =
    quickCountSelectedItem?.sizeMl && quickCountSelectedItem.sizeMl > 0
      ? Number(
          (quickCountBottleInput * quickCountSelectedItem.sizeMl).toFixed(3),
        )
      : 0;
  const sortedLiquorSheetRows = [...liquorSheetRows].sort((a, b) =>
    a.item.name.localeCompare(b.item.name, undefined, { sensitivity: "base" }),
  );

  const inventoryQuery = liquorInventorySearch.trim().toLowerCase();
  const catalogQuery = liquorCatalogSearch.trim().toLowerCase();

  const filteredLiquorSheetRows = inventoryQuery
    ? sortedLiquorSheetRows.filter((row) =>
        matchesLiquorSearch(
          {
            name: row.item.name,
            brand: row.item.brand,
            upc: row.item.upc,
            supplierName: row.item.supplierName,
          },
          inventoryQuery,
        ),
      )
    : sortedLiquorSheetRows;

  const visibleLiquorSheetRows = inventoryQuery
    ? filteredLiquorSheetRows
    : filteredLiquorSheetRows.slice(0, liquorInventoryVisibleCount);

  const hasMoreInventoryRows =
    !inventoryQuery &&
    filteredLiquorSheetRows.length > visibleLiquorSheetRows.length;

  const inventorySuggestions = inventoryQuery
    ? sortLiquorSuggestions(sortedCatalogItems, inventoryQuery).slice(0, 12)
    : [];

  const filteredCatalogItems = catalogQuery
    ? sortedCatalogItems.filter((item) =>
        matchesLiquorSearch(item, catalogQuery),
      )
    : sortedCatalogItems;

  const visibleCatalogItems = catalogQuery
    ? filteredCatalogItems
    : filteredCatalogItems.slice(0, liquorCatalogVisibleCount);

  const hasMoreCatalogItems =
    !catalogQuery && filteredCatalogItems.length > visibleCatalogItems.length;

  const catalogSuggestions = catalogQuery
    ? sortLiquorSuggestions(sortedCatalogItems, catalogQuery).slice(0, 12)
    : [];

  const catalogKindQuery = liquorCatalogBrandQuery.trim().toLowerCase();
  const catalogKindOptions = (
    catalogKindQuery
      ? liquorKinds.filter((kind) =>
          kind.toLowerCase().includes(catalogKindQuery),
        )
      : liquorKinds
  ).slice(0, 12);

  const newKindQuery = liquorKindForm.newKind.trim().toLowerCase();
  const newKindOptions = (
    newKindQuery
      ? liquorKinds.filter((kind) => kind.toLowerCase().includes(newKindQuery))
      : liquorKinds
  ).slice(0, 18);

  const deleteKindQuery = liquorKindForm.deleteKind.trim().toLowerCase();
  const deleteKindOptions = (
    deleteKindQuery
      ? liquorKinds.filter((kind) =>
          kind.toLowerCase().includes(deleteKindQuery),
        )
      : liquorKinds
  ).slice(0, 18);

  const selectedDeleteKindKey = liquorKindForm.deleteKind.trim().toLowerCase();
  const selectedNewKindKey = newKindQuery;

  const previousRowsByItem = new Map(
    (liquorMonthlyPrevious?.rows || []).map((row) => [row.itemId, row]),
  );

  const monthComparisonRows = (liquorMonthly?.rows || [])
    .map((row) => {
      const previous = previousRowsByItem.get(row.itemId);
      const currentMl = row.actualUsageUnits ?? 0;
      const previousMl = previous?.actualUsageUnits ?? 0;
      const currentCost = row.actualUsageCost ?? 0;
      const previousCost = previous?.actualUsageCost ?? 0;
      return {
        itemId: row.itemId,
        name: row.name,
        supplierName: row.supplierName,
        currentMl,
        previousMl,
        deltaMl: Number((currentMl - previousMl).toFixed(3)),
        currentCost,
        previousCost,
        deltaCost: Number((currentCost - previousCost).toFixed(2)),
      };
    })
    .sort((a, b) => Math.abs(b.deltaCost) - Math.abs(a.deltaCost));

  const currentUsageCost = monthlySummary?.actualUsageCost || 0;
  const previousUsageCost =
    liquorMonthlyPrevious?.summary?.actualUsageCost || 0;
  const usageCostDelta = Number(
    (currentUsageCost - previousUsageCost).toFixed(2),
  );

  const currentUsageMl = (liquorMonthly?.rows || []).reduce(
    (total, row) => total + (row.actualUsageUnits || 0),
    0,
  );
  const previousUsageMl = (liquorMonthlyPrevious?.rows || []).reduce(
    (total, row) => total + (row.actualUsageUnits || 0),
    0,
  );
  const usageMlDelta = Number((currentUsageMl - previousUsageMl).toFixed(3));

  return {
    sortedMovements,
    sortedCounts,
    sortedScans,
    monthlySummary,
    monthlyRows,
    monthlyIntelligence,
    sortedCatalogItems,
    quickCountBodegaMl,
    inventoryQuery,
    catalogQuery,
    filteredLiquorSheetRows,
    visibleLiquorSheetRows,
    hasMoreInventoryRows,
    inventorySuggestions,
    filteredCatalogItems,
    visibleCatalogItems,
    hasMoreCatalogItems,
    catalogSuggestions,
    catalogKindOptions,
    newKindOptions,
    deleteKindOptions,
    selectedDeleteKindKey,
    selectedNewKindKey,
    monthComparisonRows,
    currentUsageCost,
    previousUsageCost,
    usageCostDelta,
    currentUsageMl,
    previousUsageMl,
    usageMlDelta,
  };
}

export type LiquorControlViewModel = ReturnType<
  typeof buildLiquorControlViewModel
>;
