import type { Lang } from "./copy";
import type { ReportType } from "./types";

export type ReportRow = Record<string, unknown>;

export type PdfColumn = {
  header: string;
  width: number;
  align?: "left" | "right";
  value: (row: ReportRow) => string;
};

export type PdfReportConfig = {
  title: string;
  headerColor: [number, number, number];
  columns: PdfColumn[];
  summaryLabel: (language: Lang) => string;
  summaryValue: (rows: ReportRow[]) => string;
};

const toFixedNumber = (value: unknown, decimals: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return (0).toFixed(decimals);
  }
  return parsed.toFixed(decimals);
};

const toMoney = (value: unknown) => `$${toFixedNumber(value, 2)}`;

export const countUniqueEmployees = (rows: ReportRow[]) => {
  const names = new Set<string>();
  rows.forEach((row) => {
    const raw = String(row.name || row.employeeName || "").trim();
    if (raw) {
      names.add(raw.toLowerCase());
    }
  });
  return names.size || rows.length;
};

export const reportConfigs: Record<ReportType, PdfReportConfig> = {
  daily: {
    title: "DAILY REPORT",
    headerColor: [0.121569, 0.160784, 0.215686],
    columns: [
      { header: "Employee Name", width: 216, value: (row) => String(row.name || "-") },
      { header: "Total Hours", width: 108, align: "right", value: (row) => toFixedNumber(row.totalHoursDecimal, 2) },
      { header: "Formatted Time", width: 108, value: (row) => String(row.totalHoursFormatted || "-") },
    ],
    summaryLabel: (lang) => (lang === "es" ? "Horas totales trabajadas" : "Total Hours Worked"),
    summaryValue: (rows) =>
      toFixedNumber(
        rows.reduce((sum, row) => sum + Number(row.totalHoursDecimal || 0), 0),
        2,
      ),
  },
  hours: {
    title: "HOURS REPORT",
    headerColor: [0.121569, 0.160784, 0.215686],
    columns: [
      { header: "Employee Name", width: 216, value: (row) => String(row.name || "-") },
      { header: "Total Hours", width: 108, align: "right", value: (row) => toFixedNumber(row.totalHoursDecimal, 2) },
      { header: "Formatted Time", width: 108, value: (row) => String(row.totalHoursFormatted || "-") },
    ],
    summaryLabel: (lang) => (lang === "es" ? "Horas totales trabajadas" : "Total Hours Worked"),
    summaryValue: (rows) =>
      toFixedNumber(
        rows.reduce((sum, row) => sum + Number(row.totalHoursDecimal || 0), 0),
        2,
      ),
  },
  payroll: {
    title: "PAYROLL REPORT",
    headerColor: [0.058824, 0.090196, 0.164706],
    columns: [
      { header: "Employee Name", width: 201.6, value: (row) => String(row.name || "-") },
      { header: "Hourly Rate", width: 86.4, align: "right", value: (row) => toMoney(row.hourlyRate) },
      { header: "Hours", width: 72, align: "right", value: (row) => toFixedNumber(row.totalHoursDecimal, 2) },
      { header: "Total Pay", width: 86.4, align: "right", value: (row) => toMoney(row.totalPay) },
    ],
    summaryLabel: (lang) => (lang === "es" ? "Nomina total" : "Total Payroll"),
    summaryValue: (rows) =>
      toMoney(rows.reduce((sum, row) => sum + Number(row.totalPay || 0), 0)),
  },
  tips: {
    title: "TIPS REPORT",
    headerColor: [0.023529, 0.372549, 0.27451],
    columns: [
      { header: "Employee Name", width: 201.6, value: (row) => String(row.name || "-") },
      { header: "Cash Tips", width: 86.4, align: "right", value: (row) => toMoney(row.totalCashTips) },
      { header: "Card Tips", width: 86.4, align: "right", value: (row) => toMoney(row.totalCreditCardTips) },
      { header: "Total Tips", width: 86.4, align: "right", value: (row) => toMoney(row.totalTips) },
    ],
    summaryLabel: (lang) => (lang === "es" ? "Propinas totales" : "Total Tips Collected"),
    summaryValue: (rows) =>
      toMoney(rows.reduce((sum, row) => sum + Number(row.totalTips || 0), 0)),
  },
  audit: {
    title: "AUDIT REPORT",
    headerColor: [0.121569, 0.160784, 0.215686],
    columns: [
      { header: "Employee", width: 160, value: (row) => String(row.employeeName || row.name || "-") },
      { header: "Type", width: 90, value: (row) => String(row.type || "-") },
      { header: "Occurred At", width: 120, value: (row) => String(row.occurredAt || row.createdAt || "-") },
      { header: "Notes", width: 90.8, value: (row) => String(row.notes || "-") },
    ],
    summaryLabel: (lang) => (lang === "es" ? "Total de registros" : "Total Records"),
    summaryValue: (rows) => String(rows.length),
  },
};
