import type { LiquorAnalyticsDerivedData } from "./liquor-analytics-export-types";
import {
  escapeHtml,
  formatMoneyValue,
  formatPercentValue,
  formatQtyValue,
  renderTable,
} from "./liquor-analytics-export-utils";

export const buildLiquorAnalyticsExcelHtml = (data: LiquorAnalyticsDerivedData) => {
  const {
    liquorMonthly,
    liquorMonthlyPrevious,
    liquorYearly,
    comparisonRows,
    monthlySummary,
    currentUsageMl,
    previousUsageMl,
    currentUsageCost,
    previousUsageCost,
    usageMlDelta,
    usageCostDelta,
    sortedMovements,
    sortedCounts,
  } = data;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
body { font-family: Arial, sans-serif; font-size: 12px; color: #111827; }
h1,h2 { margin: 8px 0; }
table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; }
th { background: #eff6ff; font-weight: 700; }
.muted { color: #6b7280; }
</style>
</head>
<body>
<h1>Liquor Control Export (${escapeHtml(liquorMonthly.month)})</h1>
<p class="muted">Generated ${escapeHtml(new Date().toISOString())}</p>
${renderTable(
  "Summary",
  ["Metric", "Value"],
  [
    ["Month", liquorMonthly.month],
    ["Previous Month", liquorMonthlyPrevious?.month || "-"],
    ["Opening Inventory Value", formatMoneyValue(monthlySummary.openingInventoryValue)],
    ["Closing Inventory Value", formatMoneyValue(monthlySummary.closingInventoryValue)],
    ["Liquor Sales", formatMoneyValue(monthlySummary.liquorSales)],
    ["Actual Usage Cost", formatMoneyValue(monthlySummary.actualUsageCost)],
    ["Actual Usage Cost %", formatPercentValue(monthlySummary.actualUsageCostPercent)],
    ["Current Usage ML", formatQtyValue(currentUsageMl)],
    ["Previous Usage ML", formatQtyValue(previousUsageMl)],
    ["Usage ML Delta", formatQtyValue(usageMlDelta)],
    ["Current Usage Cost", formatMoneyValue(currentUsageCost)],
    ["Previous Usage Cost", formatMoneyValue(previousUsageCost)],
    ["Usage Cost Delta", formatMoneyValue(usageCostDelta)],
  ],
)}
${renderTable(
  "Bottle Month Comparison",
  ["Item", "Supplier", "Current ML", "Previous ML", "Delta ML", "Current Cost", "Previous Cost", "Delta Cost"],
  comparisonRows.map((row) => [
    row.name,
    row.supplierName || "-",
    formatQtyValue(row.currentMl),
    formatQtyValue(row.previousMl),
    formatQtyValue(row.deltaMl),
    formatMoneyValue(row.currentCost),
    formatMoneyValue(row.previousCost),
    formatMoneyValue(row.deltaCost),
  ]),
)}
${renderTable(
  "Item Usage Detail",
  ["Item", "Supplier", "Opening ML", "Received ML", "Issued ML", "Closing ML", "Usage ML", "Variance ML", "Unit Cost", "Usage Cost"],
  (liquorMonthly.rows || []).map((row) => [
    row.name,
    row.supplierName || "-",
    formatQtyValue(row.openingUnits),
    formatQtyValue(row.receivedUnits),
    formatQtyValue(row.issuedUnits),
    formatQtyValue(row.closingUnits),
    formatQtyValue(row.actualUsageUnits),
    formatQtyValue(row.varianceUnits),
    formatMoneyValue(row.unitCost),
    formatMoneyValue(row.actualUsageCost),
  ]),
)}
${renderTable(
  "Recent Movements",
  ["Date", "Location", "Item", "Type", "Qty", "User", "Notes"],
  sortedMovements.map((row) => [
    row.occurredAt,
    row.officeName,
    row.itemName,
    row.type,
    formatQtyValue(row.quantity),
    row.createdBy || "-",
    row.notes || "",
  ]),
)}
${renderTable(
  "Recent Counts",
  ["Date", "Location", "Item", "Bar", "Bodega Bottles", "Bodega ML", "Qty", "User", "Notes"],
  sortedCounts.map((row) => [
    row.countDate,
    row.officeName || "-",
    row.itemName || row.itemId,
    formatQtyValue(row.barQuantity),
    formatQtyValue(row.bodegaBottleCount),
    formatQtyValue(row.bodegaQuantity),
    formatQtyValue(row.quantity),
    row.createdBy || "-",
    row.notes || "",
  ]),
)}
${liquorYearly
  ? renderTable(
      "Yearly Control",
      ["Month", "Sales", "Actual Usage Cost", "Actual Cost %", "Variance"],
      liquorYearly.months.map((row) => [
        row.month,
        formatMoneyValue(row.liquorSales),
        formatMoneyValue(row.actualUsageCost),
        formatPercentValue(row.actualUsageCostPercent),
        formatMoneyValue(row.usageCostVariance),
      ]),
    )
  : ""}
</body>
</html>`;
};
