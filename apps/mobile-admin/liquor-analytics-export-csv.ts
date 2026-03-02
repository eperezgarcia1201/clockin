import type { LiquorAnalyticsDerivedData } from "./liquor-analytics-export-types";
import {
  escapeCsvValue,
  formatMoneyValue,
  formatPercentValue,
  formatQtyValue,
} from "./liquor-analytics-export-utils";

export const buildLiquorAnalyticsCsv = (data: LiquorAnalyticsDerivedData) => {
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
    sortedScans,
  } = data;

  const csvRows: Array<Array<string | number | null | undefined>> = [
    ["Section", "Metric", "Value"],
    ["Summary", "Month", liquorMonthly.month],
    ["Summary", "Previous Month", liquorMonthlyPrevious?.month || ""],
    ["Summary", "Opening Inventory Value", formatMoneyValue(monthlySummary.openingInventoryValue)],
    ["Summary", "Closing Inventory Value", formatMoneyValue(monthlySummary.closingInventoryValue)],
    ["Summary", "Liquor Sales", formatMoneyValue(monthlySummary.liquorSales)],
    ["Summary", "Actual Usage Cost", formatMoneyValue(monthlySummary.actualUsageCost)],
    ["Summary", "Actual Usage Cost %", formatPercentValue(monthlySummary.actualUsageCostPercent)],
    ["Summary", "Current Usage ML", formatQtyValue(currentUsageMl)],
    ["Summary", "Previous Usage ML", formatQtyValue(previousUsageMl)],
    ["Summary", "Usage ML Delta", formatQtyValue(usageMlDelta)],
    ["Summary", "Current Usage Cost", formatMoneyValue(currentUsageCost)],
    ["Summary", "Previous Usage Cost", formatMoneyValue(previousUsageCost)],
    ["Summary", "Usage Cost Delta", formatMoneyValue(usageCostDelta)],
    [],
    [
      "Bottle Month Comparison",
      "Item",
      "Supplier",
      "Current ML",
      "Previous ML",
      "Delta ML",
      "Current Cost",
      "Previous Cost",
      "Delta Cost",
    ],
  ];

  comparisonRows.forEach((row) => {
    csvRows.push([
      "",
      row.name,
      row.supplierName,
      formatQtyValue(row.currentMl),
      formatQtyValue(row.previousMl),
      formatQtyValue(row.deltaMl),
      formatMoneyValue(row.currentCost),
      formatMoneyValue(row.previousCost),
      formatMoneyValue(row.deltaCost),
    ]);
  });

  csvRows.push(
    [],
    [
      "Item Usage Detail",
      "Item",
      "Supplier",
      "Opening ML",
      "Received ML",
      "Issued ML",
      "Closing ML",
      "Usage ML",
      "Variance ML",
      "Unit Cost",
      "Usage Cost",
    ],
  );
  (liquorMonthly.rows || []).forEach((row) => {
    csvRows.push([
      "",
      row.name,
      row.supplierName || "",
      formatQtyValue(row.openingUnits),
      formatQtyValue(row.receivedUnits),
      formatQtyValue(row.issuedUnits),
      formatQtyValue(row.closingUnits),
      formatQtyValue(row.actualUsageUnits),
      formatQtyValue(row.varianceUnits),
      formatMoneyValue(row.unitCost),
      formatMoneyValue(row.actualUsageCost),
    ]);
  });

  csvRows.push([], ["Movements", "Date", "Location", "Item", "Type", "Qty", "User", "Notes"]);
  sortedMovements.forEach((movement) => {
    csvRows.push([
      "",
      movement.occurredAt,
      movement.officeName,
      movement.itemName,
      movement.type,
      formatQtyValue(movement.quantity),
      movement.createdBy || "",
      movement.notes || "",
    ]);
  });

  csvRows.push(
    [],
    [
      "Counts",
      "Date",
      "Location",
      "Item",
      "Bar",
      "Bodega Bottles",
      "Bodega ML",
      "Qty",
      "User",
      "Notes",
    ],
  );
  sortedCounts.forEach((count) => {
    csvRows.push([
      "",
      count.countDate,
      count.officeName || "",
      count.itemName || "",
      formatQtyValue(count.barQuantity),
      formatQtyValue(count.bodegaBottleCount),
      formatQtyValue(count.bodegaQuantity),
      formatQtyValue(count.quantity),
      count.createdBy || "",
      count.notes || "",
    ]);
  });

  if (sortedScans.length > 0) {
    csvRows.push(
      [],
      ["Bottle Scans", "Measured At", "Location", "Item", "Fill %", "Estimated ML", "Confidence %", "Source", "User"],
    );
    sortedScans.forEach((scan) => {
      csvRows.push([
        "",
        scan.measuredAt,
        scan.officeName || "",
        scan.itemName,
        formatPercentValue(scan.fillPercent),
        formatQtyValue(scan.estimatedMl),
        formatPercentValue(scan.confidence),
        scan.source || "",
        scan.createdBy || "",
      ]);
    });
  }

  if (liquorYearly) {
    csvRows.push([], ["Yearly Control", "Month", "Sales", "Actual Usage Cost", "Actual Cost %", "Variance"]);
    liquorYearly.months.forEach((row) => {
      csvRows.push([
        "",
        row.month,
        formatMoneyValue(row.liquorSales),
        formatMoneyValue(row.actualUsageCost),
        formatPercentValue(row.actualUsageCostPercent),
        formatMoneyValue(row.usageCostVariance),
      ]);
    });
  }

  return csvRows.map((row) => row.map((cell) => escapeCsvValue(cell)).join(",")).join("\n");
};
