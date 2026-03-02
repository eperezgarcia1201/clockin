import type { LiquorAnalyticsDerivedData } from "./liquor-analytics-export-types";
import {
  formatMoneyValue,
  formatPercentValue,
  formatQtyValue,
} from "./liquor-analytics-export-utils";

export const buildLiquorAnalyticsPdfLines = (data: LiquorAnalyticsDerivedData) => {
  const {
    liquorMonthly,
    comparisonRows,
    monthlySummary,
    currentUsageMl,
    previousUsageMl,
    currentUsageCost,
    previousUsageCost,
    usageMlDelta,
    usageCostDelta,
    sortedMovements,
  } = data;

  return [
    `Liquor Control Export - ${liquorMonthly.month}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    `Opening Inventory Value: ${formatMoneyValue(monthlySummary.openingInventoryValue)}`,
    `Closing Inventory Value: ${formatMoneyValue(monthlySummary.closingInventoryValue)}`,
    `Liquor Sales: ${formatMoneyValue(monthlySummary.liquorSales)}`,
    `Actual Usage Cost: ${formatMoneyValue(monthlySummary.actualUsageCost)}`,
    `Actual Usage Cost %: ${formatPercentValue(monthlySummary.actualUsageCostPercent)}`,
    `Current Usage ML: ${formatQtyValue(currentUsageMl)}`,
    `Previous Usage ML: ${formatQtyValue(previousUsageMl)}`,
    `Usage ML Delta: ${formatQtyValue(usageMlDelta)}`,
    `Current Usage Cost: ${formatMoneyValue(currentUsageCost)}`,
    `Previous Usage Cost: ${formatMoneyValue(previousUsageCost)}`,
    `Usage Cost Delta: ${formatMoneyValue(usageCostDelta)}`,
    "",
    "Bottle Month Comparison (Top 60 by cost delta)",
    "Item | Supplier | Current ML | Prev ML | Delta ML | Current Cost | Prev Cost | Delta Cost",
    ...comparisonRows.slice(0, 60).map(
      (row) =>
        `${row.name} | ${row.supplierName || "-"} | ${formatQtyValue(row.currentMl)} | ${formatQtyValue(row.previousMl)} | ${formatQtyValue(row.deltaMl)} | ${formatMoneyValue(row.currentCost)} | ${formatMoneyValue(row.previousCost)} | ${formatMoneyValue(row.deltaCost)}`,
    ),
    "",
    "Item Usage Detail (Top 100 by usage cost)",
    "Item | Supplier | Opening | Received | Issued | Closing | Usage ML | Variance ML | Usage Cost",
    ...(liquorMonthly.rows || [])
      .slice()
      .sort((a, b) => (b.actualUsageCost || 0) - (a.actualUsageCost || 0))
      .slice(0, 100)
      .map(
        (row) =>
          `${row.name} | ${row.supplierName || "-"} | ${formatQtyValue(row.openingUnits)} | ${formatQtyValue(row.receivedUnits)} | ${formatQtyValue(row.issuedUnits)} | ${formatQtyValue(row.closingUnits)} | ${formatQtyValue(row.actualUsageUnits)} | ${formatQtyValue(row.varianceUnits)} | ${formatMoneyValue(row.actualUsageCost)}`,
      ),
    "",
    "Recent Movements (Top 80)",
    "Date | Location | Item | Type | Qty | User",
    ...sortedMovements
      .slice(0, 80)
      .map(
        (row) =>
          `${new Date(row.occurredAt).toLocaleString()} | ${row.officeName} | ${row.itemName} | ${row.type} | ${formatQtyValue(row.quantity)} | ${row.createdBy || "-"}`,
      ),
  ];
};
