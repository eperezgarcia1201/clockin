import type { Lang } from "./copy";
import {
  buildSimplePdf,
  encodeText,
  escapeCsvValue,
  renderTable,
  sanitizeFilename,
  writeExportBytes,
} from "./liquor-analytics-export-utils";
import { buildReportLayoutPdf } from "./report-export-pdf-layout";
import type { ReportType } from "./types";

export type ReportExportFormat = "pdf" | "csv" | "excel";

type ExportColumn = {
  header: string;
  value: (row: Record<string, unknown>) => string;
};

const toMoney = (value: unknown) =>
  Number.isFinite(Number(value)) ? Number(value).toFixed(2) : "0.00";

const toHours = (value: unknown) =>
  Number.isFinite(Number(value)) ? Number(value).toFixed(2) : "0.00";

const columnsByType: Record<ReportType, ExportColumn[]> = {
  daily: [
    { header: "Employee", value: (row) => String(row.name || "") },
    { header: "Hours", value: (row) => toHours(row.totalHoursDecimal) },
    {
      header: "Formatted",
      value: (row) => String(row.totalHoursFormatted || ""),
    },
  ],
  hours: [
    { header: "Employee", value: (row) => String(row.name || "") },
    { header: "Hours", value: (row) => toHours(row.totalHoursDecimal) },
    {
      header: "Formatted",
      value: (row) => String(row.totalHoursFormatted || ""),
    },
  ],
  payroll: [
    { header: "Employee", value: (row) => String(row.name || "") },
    { header: "Hourly Rate", value: (row) => toMoney(row.hourlyRate) },
    { header: "Hours", value: (row) => toHours(row.totalHoursDecimal) },
    { header: "Total Pay", value: (row) => toMoney(row.totalPay) },
  ],
  tips: [
    { header: "Employee", value: (row) => String(row.name || "") },
    { header: "Cash Tips", value: (row) => toMoney(row.totalCashTips) },
    {
      header: "Card Tips",
      value: (row) => toMoney(row.totalCreditCardTips),
    },
    { header: "Total Tips", value: (row) => toMoney(row.totalTips) },
  ],
  audit: [
    {
      header: "Employee",
      value: (row) => String(row.employeeName || row.name || ""),
    },
    { header: "Type", value: (row) => String(row.type || "") },
    {
      header: "Occurred At",
      value: (row) => String(row.occurredAt || row.createdAt || ""),
    },
    { header: "Notes", value: (row) => String(row.notes || "") },
  ],
};

const buildRows = (
  reportType: ReportType,
  rows: Record<string, unknown>[],
): { headers: string[]; matrix: string[][] } => {
  const columns = columnsByType[reportType];
  const headers = columns.map((column) => column.header);
  const matrix = rows.map((row) =>
    columns.map((column) => column.value(row).trim()),
  );
  return { headers, matrix };
};

export async function exportReportRows(params: {
  reportType: ReportType;
  format: ReportExportFormat;
  fromDate: string;
  toDate: string;
  rows: Record<string, unknown>[];
  language: Lang;
  bytesToBase64: (bytes: Uint8Array) => string;
}) {
  const { reportType, format, fromDate, toDate, rows, language, bytesToBase64 } =
    params;
  if (!rows.length) {
    throw new Error(
      language === "es"
        ? "Genera un reporte primero para poder exportar."
        : "Run a report first before exporting.",
    );
  }

  const { headers, matrix } = buildRows(reportType, rows);
  const baseName = sanitizeFilename(
    `${reportType}-report-${fromDate}-to-${toDate}`,
  );

  if (format === "csv") {
    const csv = [headers, ...matrix]
      .map((row) => row.map((cell) => escapeCsvValue(cell)).join(","))
      .join("\n");
    await writeExportBytes({
      filename: `${baseName}.csv`,
      mimeType: "text/csv; charset=utf-8",
      bytes: encodeText(csv),
      language,
      bytesToBase64,
    });
    return;
  }

  if (format === "excel") {
    const title =
      language === "es"
        ? `Reporte ${reportType.toUpperCase()}`
        : `${reportType.toUpperCase()} Report`;
    const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body>${renderTable(
      title,
      headers,
      matrix,
    )}</body></html>`;
    await writeExportBytes({
      filename: `${baseName}.xls`,
      mimeType: "application/vnd.ms-excel; charset=utf-8",
      bytes: encodeText(html),
      language,
      bytesToBase64,
    });
    return;
  }

  const titleLine =
    language === "es"
      ? `Reporte ${reportType.toUpperCase()} (${fromDate} a ${toDate})`
      : `${reportType.toUpperCase()} Report (${fromDate} to ${toDate})`;
  const pdfLines = [
    titleLine,
    "",
    headers.join(" | "),
    ...matrix.map((row) => row.join(" | ")),
  ];
  let pdfBytes: Uint8Array;
  if (rows.length > 1000) {
    pdfBytes = buildSimplePdf(pdfLines);
  } else {
    try {
      pdfBytes = buildReportLayoutPdf({
        reportType,
        fromDate,
        toDate,
        rows,
        language,
      });
    } catch {
      pdfBytes = buildSimplePdf(pdfLines);
    }
  }

  await writeExportBytes({
    filename: `${baseName}.pdf`,
    mimeType: "application/pdf",
    bytes: pdfBytes,
    language,
    bytesToBase64,
  });
}
