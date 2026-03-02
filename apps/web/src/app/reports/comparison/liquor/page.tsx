"use client";

import { useMemo, useState } from "react";
import { useUiCopy, useUiLanguage } from "../../../../lib/ui-language";
import {
  aggregateByGranularity,
  applyRangePreset,
  bucketLabel,
  comparisonCopy,
  fetchComparisonReport,
  granularityLabel,
  money,
  signed,
  type ComparisonGranularity,
  type ComparisonResponse,
} from "../shared";

const quantity = (value: number) => Number(value || 0).toFixed(3);

export default function LiquorComparisonPage() {
  const lang = useUiLanguage();
  const t = useUiCopy(comparisonCopy, lang);
  const initialRange = useMemo(() => applyRangePreset("30d"), []);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [preset, setPreset] = useState("30d");
  const [granularity, setGranularity] = useState<ComparisonGranularity>("day");
  const [weekStartsOn, setWeekStartsOn] = useState<"0" | "1">("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ComparisonResponse | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      if (from > to) {
        throw new Error('"From" must be before or equal to "To".');
      }
      const data = await fetchComparisonReport({
        from,
        to,
        weekStartsOn,
        trendWeeks: "8",
      });
      setReport(data);
    } catch (loadError) {
      setReport(null);
      setError(loadError instanceof Error ? loadError.message : "Unable to load report.");
    } finally {
      setLoading(false);
    }
  };

  const buildExportHref = (format: "excel" | "csv" | "pdf") =>
    `/api/reports/comparison/export?${new URLSearchParams({
      format,
      section: "liquor",
      from,
      to,
      granularity,
      weekStartsOn,
      trendWeeks: "8",
      tzOffset: String(-new Date().getTimezoneOffset()),
    }).toString()}`;

  const applyPreset = (value: string) => {
    setPreset(value);
    const range = applyRangePreset(value);
    setFrom(range.from);
    setTo(range.to);
  };

  const consumptionRows = useMemo(() => {
    if (!report?.liquor.enabled) {
      return [];
    }
    return aggregateByGranularity(
      report.liquor.byDate,
      granularity,
      (acc, row) => ({
        ...acc,
        quantity: acc.quantity + row.quantity,
        cost: acc.cost + row.cost,
      }),
      Number(weekStartsOn) as 0 | 1,
    );
  }, [granularity, report, weekStartsOn]);

  const maxQuantity = useMemo(() => {
    if (!consumptionRows.length) {
      return 1;
    }
    return Math.max(...consumptionRows.map((row) => row.quantity), 1);
  }, [consumptionRows]);

  return (
    <div className="reports-page comparison-page">
      <div className="admin-header">
        <h1>{t.liquorTitle}</h1>
        <p className="mb-0 text-muted">
          {t.liquorSubtitle}
        </p>
      </div>

      <div className="admin-card report-filters">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-2">
            <label className="form-label">{t.quickRange}</label>
            <select
              className="form-select"
              value={preset}
              onChange={(event) => applyPreset(event.target.value)}
            >
              <option value="7d">{t.last7Days}</option>
              <option value="30d">{t.last30Days}</option>
              <option value="90d">{t.last90Days}</option>
              <option value="ytd">{t.yearToDate}</option>
              <option value="custom">{t.custom}</option>
            </select>
          </div>
          <div className="col-12 col-md-2">
            <label className="form-label">{t.from}</label>
            <input
              className="form-control"
              type="date"
              value={from}
              onChange={(event) => {
                setPreset("custom");
                setFrom(event.target.value);
              }}
            />
          </div>
          <div className="col-12 col-md-2">
            <label className="form-label">{t.to}</label>
            <input
              className="form-control"
              type="date"
              value={to}
              onChange={(event) => {
                setPreset("custom");
                setTo(event.target.value);
              }}
            />
          </div>
          <div className="col-12 col-md-2">
            <label className="form-label">{t.compareBy}</label>
            <select
              className="form-select"
              value={granularity}
              onChange={(event) =>
                setGranularity(event.target.value as ComparisonGranularity)
              }
            >
              <option value="day">{t.day}</option>
              <option value="week">{t.week}</option>
              <option value="month">{t.month}</option>
            </select>
          </div>
          <div className="col-12 col-md-2">
            <label className="form-label">{t.weekStartsOn}</label>
            <select
              className="form-select"
              value={weekStartsOn}
              onChange={(event) => setWeekStartsOn(event.target.value as "0" | "1")}
            >
              <option value="1">{t.monday}</option>
              <option value="0">{t.sunday}</option>
            </select>
          </div>
          <div className="col-12 col-md-2 d-flex gap-2 flex-wrap">
            <button className="btn btn-primary" onClick={load}>
              {loading ? t.loading : t.run}
            </button>
            <a className="btn btn-outline-secondary" href={buildExportHref("excel")}>
              {t.exportExcel}
            </a>
            <a className="btn btn-outline-secondary" href={buildExportHref("csv")}>
              {t.exportCsv}
            </a>
            <a className="btn btn-outline-secondary" href={buildExportHref("pdf")}>
              {t.downloadPdf}
            </a>
            <a className="btn btn-outline-secondary" href="/reports/comparison">
              {t.combined}
            </a>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-0" role="alert">
          {error}
        </div>
      )}

      {!report && !loading && (
        <div className="admin-card">
          <p className="mb-0">{t.generatePrompt}</p>
        </div>
      )}

      {report && !report.liquor.enabled && (
        <div className="admin-card">
          <p className="mb-0">{t.liquorDisabled}</p>
        </div>
      )}

      {report && report.liquor.enabled && (
        <>
          <div className="comparison-metrics-grid">
            <div className="comparison-metric-card">
              <div className="comparison-metric-label">{t.currentConsumedQty}</div>
              <div className="comparison-metric-current">
                {quantity(report.liquor.summary.currentQuantity)}
              </div>
            </div>
            <div className="comparison-metric-card">
              <div className="comparison-metric-label">{t.previousConsumedQty}</div>
              <div className="comparison-metric-current">
                {quantity(report.liquor.summary.previousQuantity)}
              </div>
            </div>
            <div className="comparison-metric-card">
              <div className="comparison-metric-label">{t.qtyDelta}</div>
              <div className="comparison-metric-current">
                {signed(report.liquor.summary.deltaQuantity)}
              </div>
            </div>
            <div className="comparison-metric-card">
              <div className="comparison-metric-label">{t.currentCostImpact}</div>
              <div className="comparison-metric-current">
                {money(report.liquor.summary.currentCost)}
              </div>
            </div>
            <div className="comparison-metric-card">
              <div className="comparison-metric-label">{t.previousCostImpact}</div>
              <div className="comparison-metric-current">
                {money(report.liquor.summary.previousCost)}
              </div>
            </div>
            <div className="comparison-metric-card">
              <div className="comparison-metric-label">{t.costDelta}</div>
              <div className="comparison-metric-current">
                {signed(report.liquor.summary.deltaCost, true)}
              </div>
            </div>
          </div>

          <div className="admin-card">
            <h2 className="h5 mb-3">{t.topConsumedLiquor}</h2>
            <div className="table-responsive">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t.company}</th>
                    <th>{t.liquorName}</th>
                    <th>{t.kind}</th>
                    <th>{t.currentQty}</th>
                    <th>{t.previousQty}</th>
                    <th>{t.deltaQty}</th>
                    <th>{t.currentCost}</th>
                    <th>{t.previousCost}</th>
                    <th>{t.deltaCost}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.liquor.topConsumed.map((row) => (
                    <tr key={row.itemId}>
                      <td>{row.company}</td>
                      <td>{row.itemName}</td>
                      <td>{row.kind || "-"}</td>
                      <td>{quantity(row.currentQuantity)}</td>
                      <td>{quantity(row.previousQuantity)}</td>
                      <td>{signed(row.deltaQuantity)}</td>
                      <td>{money(row.currentCost)}</td>
                      <td>{money(row.previousCost)}</td>
                      <td>{signed(row.deltaCost, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="admin-card">
            <h2 className="h5 mb-3">
              {granularityLabel(granularity, lang)} {t.consumptionCurrentRange}
            </h2>
            <div className="comparison-chart-grid">
              {consumptionRows.map((row) => (
                <div className="comparison-chart-row" key={row.date}>
                  <div className="comparison-chart-label">
                    <div>{bucketLabel(row.date, granularity)}</div>
                  </div>
                  <div className="comparison-chart-bars">
                    <div
                      className="comparison-chart-bar comparison-chart-bar--tips"
                      style={{ width: `${Math.min((row.quantity / maxQuantity) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="comparison-chart-meta">
                    <div>{quantity(row.quantity)}</div>
                    <div className="text-muted small">{money(row.cost)}</div>
                  </div>
                </div>
              ))}
            </div>
            {!consumptionRows.length && (
              <p className="small text-muted mb-0 mt-3">
                {t.noLiquorRows}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
