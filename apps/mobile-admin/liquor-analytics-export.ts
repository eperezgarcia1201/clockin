import { buildLiquorAnalyticsCsv } from "./liquor-analytics-export-csv";
import { buildLiquorAnalyticsDerivedData } from "./liquor-analytics-export-derived";
import { buildLiquorAnalyticsExcelHtml } from "./liquor-analytics-export-excel";
import { buildLiquorAnalyticsPdfLines } from "./liquor-analytics-export-pdf";
import type {
  ExportLiquorAnalyticsParams,
  LiquorAnalyticsExportFormat,
} from "./liquor-analytics-export-types";
import {
  buildSimplePdf,
  encodeText,
  sanitizeFilename,
  writeExportBytes,
} from "./liquor-analytics-export-utils";

export type { LiquorAnalyticsExportFormat };

export async function exportLiquorAnalytics({
  format,
  language,
  liquorMonthly,
  liquorMonthlyPrevious,
  liquorYearly,
  liquorMovements,
  liquorCounts,
  liquorBottleScans,
  bytesToBase64,
}: ExportLiquorAnalyticsParams) {
  const data = buildLiquorAnalyticsDerivedData({
    liquorMonthly,
    liquorMonthlyPrevious,
    liquorYearly,
    liquorMovements,
    liquorCounts,
    liquorBottleScans,
  });

  const baseName = sanitizeFilename(`liquor-control-${liquorMonthly.month}`);

  if (format === "csv") {
    await writeExportBytes({
      filename: `${baseName}.csv`,
      mimeType: "text/csv; charset=utf-8",
      bytes: encodeText(buildLiquorAnalyticsCsv(data)),
      language,
      bytesToBase64,
    });
    return;
  }

  if (format === "excel") {
    await writeExportBytes({
      filename: `${baseName}.xls`,
      mimeType: "application/vnd.ms-excel; charset=utf-8",
      bytes: encodeText(buildLiquorAnalyticsExcelHtml(data)),
      language,
      bytesToBase64,
    });
    return;
  }

  await writeExportBytes({
    filename: `${baseName}.pdf`,
    mimeType: "application/pdf",
    bytes: buildSimplePdf(buildLiquorAnalyticsPdfLines(data)),
    language,
    bytesToBase64,
  });
}

export type { ExportLiquorAnalyticsParams };
