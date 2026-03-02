import type {
  ExportLiquorAnalyticsParams,
  LiquorAnalyticsDerivedData,
} from "./liquor-analytics-export-types";

export const buildLiquorAnalyticsDerivedData = ({
  liquorMonthly,
  liquorMonthlyPrevious,
  liquorYearly,
  liquorMovements,
  liquorCounts,
  liquorBottleScans,
}: Pick<
  ExportLiquorAnalyticsParams,
  | "liquorMonthly"
  | "liquorMonthlyPrevious"
  | "liquorYearly"
  | "liquorMovements"
  | "liquorCounts"
  | "liquorBottleScans"
>): LiquorAnalyticsDerivedData => {
  const previousRowsByItem = new Map(
    (liquorMonthlyPrevious?.rows || []).map((row) => [row.itemId, row]),
  );

  const comparisonRows = (liquorMonthly.rows || [])
    .map((row) => {
      const previous = previousRowsByItem.get(row.itemId);
      const currentMl = row.actualUsageUnits ?? 0;
      const previousMl = previous?.actualUsageUnits ?? 0;
      const currentCost = row.actualUsageCost ?? 0;
      const previousCost = previous?.actualUsageCost ?? 0;
      return {
        name: row.name,
        supplierName: row.supplierName || "",
        currentMl,
        previousMl,
        deltaMl: Number((currentMl - previousMl).toFixed(3)),
        currentCost,
        previousCost,
        deltaCost: Number((currentCost - previousCost).toFixed(2)),
      };
    })
    .sort((a, b) => Math.abs(b.deltaCost) - Math.abs(a.deltaCost));

  const monthlySummary = liquorMonthly.summary;
  const previousSummary = liquorMonthlyPrevious?.summary || null;
  const currentUsageMl = (liquorMonthly.rows || []).reduce(
    (total, row) => total + (row.actualUsageUnits || 0),
    0,
  );
  const previousUsageMl = (liquorMonthlyPrevious?.rows || []).reduce(
    (total, row) => total + (row.actualUsageUnits || 0),
    0,
  );
  const currentUsageCost = monthlySummary.actualUsageCost || 0;
  const previousUsageCost = previousSummary?.actualUsageCost || 0;
  const usageMlDelta = Number((currentUsageMl - previousUsageMl).toFixed(3));
  const usageCostDelta = Number((currentUsageCost - previousUsageCost).toFixed(2));

  const sortedMovements = [...liquorMovements].sort((a, b) => {
    const aTime = Date.parse(a.occurredAt || a.createdAt);
    const bTime = Date.parse(b.occurredAt || b.createdAt);
    return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
  });

  const sortedCounts = [...liquorCounts].sort((a, b) => {
    const aTime = Date.parse(a.updatedAt || a.createdAt || a.countDate);
    const bTime = Date.parse(b.updatedAt || b.createdAt || b.countDate);
    return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
  });

  const sortedScans = [...liquorBottleScans].sort((a, b) => {
    const aTime = Date.parse(a.measuredAt || a.createdAt);
    const bTime = Date.parse(b.measuredAt || b.createdAt);
    return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
  });

  return {
    liquorMonthly,
    liquorMonthlyPrevious,
    liquorYearly,
    comparisonRows,
    monthlySummary,
    previousSummary,
    currentUsageMl,
    previousUsageMl,
    currentUsageCost,
    previousUsageCost,
    usageMlDelta,
    usageCostDelta,
    sortedMovements,
    sortedCounts,
    sortedScans,
  };
};
