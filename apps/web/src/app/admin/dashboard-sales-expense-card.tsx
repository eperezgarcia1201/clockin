"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getSalesExpenseReport,
  type SalesExpenseReport,
} from "../../lib/api/admin-dashboard";

type Lang = "en" | "es";

type SalesExpensePoint = {
  date: string;
  sales: number;
  expenses: number;
};

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);

const buildDefaultRange = () => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 13);
  return { from: toIsoDate(start), to: toIsoDate(end) };
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDateLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  });
};

const buildMergedRows = (data: SalesExpenseReport | null): SalesExpensePoint[] => {
  if (!data) {
    return [];
  }
  const byDate = new Map<string, SalesExpensePoint>();
  data.reports.forEach((row) => {
    const key = row.date;
    const current = byDate.get(key) || { date: key, sales: 0, expenses: 0 };
    current.sales += Number(row.totalSales || 0);
    byDate.set(key, current);
  });
  data.expenses.forEach((row) => {
    const key = row.date;
    const current = byDate.get(key) || { date: key, sales: 0, expenses: 0 };
    current.expenses += Number(row.amount || 0);
    byDate.set(key, current);
  });
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
};

export function DashboardSalesExpenseCard({ lang }: { lang: Lang }) {
  const t = (en: string, es: string) => (lang === "es" ? es : en);
  const initialRange = useMemo(() => buildDefaultRange(), []);
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [report, setReport] = useState<SalesExpenseReport | null>(null);

  const rows = useMemo(() => buildMergedRows(report), [report]);
  const maxAmount = useMemo(() => {
    const values = rows.map((row) => Math.max(row.sales, row.expenses));
    return Math.max(1, ...values);
  }, [rows]);
  const totalSales = report?.totals.totalSales || 0;
  const totalExpenses = report?.expenseTotals.totalExpenses || 0;
  const netTotal = totalSales - totalExpenses;

  const loadRange = async (from: string, to: string) => {
    setLoading(true);
    setStatus(null);
    try {
      const data = await getSalesExpenseReport({ from, to });
      setReport(data);
    } catch {
      setStatus(
        t(
          "Unable to load sales and expense totals.",
          "No se pudieron cargar las ventas y gastos.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRange(initialRange.from, initialRange.to);
  }, [initialRange.from, initialRange.to]);

  const applyRange = async () => {
    if (!fromDate || !toDate || fromDate > toDate) {
      setStatus(
        t(
          "Please select a valid date range.",
          "Selecciona un rango de fechas válido.",
        ),
      );
      return;
    }
    await loadRange(fromDate, toDate);
  };

  const salesExportHref = (format: "pdf" | "csv" | "excel") =>
    `/api/reports/sales/export?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}&format=${format}`;
  const expenseExportHref = (format: "pdf" | "csv" | "excel") =>
    `/api/reports/sales/expenses/export?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}&format=${format}`;

  return (
    <div className="admin-card chart-card">
      <div className="chart-header">
        <div>
          <h2>{t("Sales vs Daily Expenses", "Ventas vs Gastos Diarios")}</h2>
          <p>
            {t(
              "Compare totals by day and export by range.",
              "Compara totales por día y exporta por rango.",
            )}
          </p>
        </div>
      </div>

      <div className="row g-2 align-items-end mb-3">
        <div className="col-12 col-md-4">
          <label className="form-label mb-1">{t("From", "Desde")}</label>
          <input
            className="form-control"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label mb-1">{t("To", "Hasta")}</label>
          <input
            className="form-control"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </div>
        <div className="col-12 col-md-4 d-grid">
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => void applyRange()}
            disabled={loading}
          >
            {loading ? t("Loading...", "Cargando...") : t("Apply Range", "Aplicar Rango")}
          </button>
        </div>
      </div>

      <div className="insights-grid mb-3">
        <div className="insight-tile">
          <span>{t("Total Sales", "Ventas Totales")}</span>
          <strong>{formatCurrency(totalSales)}</strong>
          <em>{fromDate} → {toDate}</em>
        </div>
        <div className="insight-tile">
          <span>{t("Total Expenses", "Gastos Totales")}</span>
          <strong>{formatCurrency(totalExpenses)}</strong>
          <em>{fromDate} → {toDate}</em>
        </div>
        <div className="insight-tile">
          <span>{t("Net", "Neto")}</span>
          <strong>{formatCurrency(netTotal)}</strong>
          <em>{t("Sales - Expenses", "Ventas - Gastos")}</em>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <span className="text-muted small align-self-center me-1">
          {t("Sales export:", "Exportar ventas:")}
        </span>
        <a className="btn btn-outline-secondary btn-sm" href={salesExportHref("pdf")}>
          PDF
        </a>
        <a className="btn btn-outline-secondary btn-sm" href={salesExportHref("csv")}>
          CSV
        </a>
        <a className="btn btn-outline-secondary btn-sm" href={salesExportHref("excel")}>
          Excel
        </a>
        <span className="text-muted small align-self-center ms-md-3 me-1">
          {t("Expense export:", "Exportar gastos:")}
        </span>
        <a className="btn btn-outline-secondary btn-sm" href={expenseExportHref("pdf")}>
          PDF
        </a>
        <a className="btn btn-outline-secondary btn-sm" href={expenseExportHref("csv")}>
          CSV
        </a>
        <a className="btn btn-outline-secondary btn-sm" href={expenseExportHref("excel")}>
          Excel
        </a>
      </div>

      {status ? <div className="alert alert-warning mb-3">{status}</div> : null}

      {rows.length === 0 ? (
        <div className="chart-empty">
          {t("No sales/expense rows in this range.", "Sin filas de ventas/gastos en este rango.")}
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {rows.map((row) => (
            <div key={`sales-expense-${row.date}`} className="d-flex flex-column gap-1">
              <div className="d-flex justify-content-between align-items-center">
                <strong>{formatDateLabel(row.date)}</strong>
                <small className="text-muted">{row.date}</small>
              </div>
              <div className="d-flex align-items-center gap-2">
                <small style={{ width: 58 }}>{t("Sales", "Ventas")}</small>
                <div className="chart-bar-track" style={{ flex: 1 }}>
                  <div
                    className="chart-bar"
                    style={{ width: `${(row.sales / maxAmount) * 100}%` }}
                  />
                </div>
                <small>{formatCurrency(row.sales)}</small>
              </div>
              <div className="d-flex align-items-center gap-2">
                <small style={{ width: 58 }}>{t("Expense", "Gasto")}</small>
                <div className="chart-bar-track" style={{ flex: 1 }}>
                  <div
                    className="chart-bar"
                    style={{
                      width: `${(row.expenses / maxAmount) * 100}%`,
                      background:
                        "linear-gradient(135deg, rgba(239,68,68,0.92), rgba(249,115,22,0.9))",
                    }}
                  />
                </div>
                <small>{formatCurrency(row.expenses)}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

