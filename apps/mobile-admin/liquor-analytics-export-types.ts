import type { Lang } from "./copy";
import type {
  LiquorBottleScanRow,
  LiquorCountRow,
  LiquorMonthlyReport,
  LiquorMovementRow,
  LiquorYearlyControl,
} from "./types";

export type LiquorAnalyticsExportFormat = "pdf" | "csv" | "excel";

export type ExportLiquorAnalyticsParams = {
  format: LiquorAnalyticsExportFormat;
  language: Lang;
  liquorMonthly: LiquorMonthlyReport;
  liquorMonthlyPrevious: LiquorMonthlyReport | null;
  liquorYearly: LiquorYearlyControl | null;
  liquorMovements: LiquorMovementRow[];
  liquorCounts: LiquorCountRow[];
  liquorBottleScans: LiquorBottleScanRow[];
  bytesToBase64: (bytes: Uint8Array) => string;
};

export type LiquorMonthComparisonRow = {
  name: string;
  supplierName: string;
  currentMl: number;
  previousMl: number;
  deltaMl: number;
  currentCost: number;
  previousCost: number;
  deltaCost: number;
};

export type LiquorAnalyticsDerivedData = {
  liquorMonthly: LiquorMonthlyReport;
  liquorMonthlyPrevious: LiquorMonthlyReport | null;
  liquorYearly: LiquorYearlyControl | null;
  comparisonRows: LiquorMonthComparisonRow[];
  monthlySummary: LiquorMonthlyReport["summary"];
  previousSummary: LiquorMonthlyReport["summary"] | null;
  currentUsageMl: number;
  previousUsageMl: number;
  currentUsageCost: number;
  previousUsageCost: number;
  usageMlDelta: number;
  usageCostDelta: number;
  sortedMovements: LiquorMovementRow[];
  sortedCounts: LiquorCountRow[];
  sortedScans: LiquorBottleScanRow[];
};
