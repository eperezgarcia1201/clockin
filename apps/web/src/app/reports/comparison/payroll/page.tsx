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
  hours,
  money,
  type ComparisonGranularity,
  type ComparisonResponse,
} from "../shared";

export default function PayrollComparisonPage() {
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
      section: "payroll",
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

  const payrollCurrentRows = useMemo(() => {
    if (!report) {
      return [];
    }
    return aggregateByGranularity(
      report.payroll.currentDaily,
      granularity,
      (acc, row) => ({
        ...acc,
        laborHours: acc.laborHours + row.laborHours,
        wages: acc.wages + row.wages,
        tips: acc.tips + row.tips,
        totalComp: acc.totalComp + row.totalComp,
        employeeCount: Math.max(acc.employeeCount, row.employeeCount),
      }),
      Number(weekStartsOn) as 0 | 1,
    );
  }, [granularity, report, weekStartsOn]);

  const payrollPreviousRows = useMemo(() => {
    if (!report) {
      return [];
    }
    return aggregateByGranularity(
      report.payroll.previousDaily,
      granularity,
      (acc, row) => ({
        ...acc,
        laborHours: acc.laborHours + row.laborHours,
        wages: acc.wages + row.wages,
        tips: acc.tips + row.tips,
        totalComp: acc.totalComp + row.totalComp,
        employeeCount: Math.max(acc.employeeCount, row.employeeCount),
      }),
      Number(weekStartsOn) as 0 | 1,
    );
  }, [granularity, report, weekStartsOn]);

  const highestCurrentPayrollRow = useMemo(() => {
    if (!payrollCurrentRows.length) {
      return null;
    }
    return payrollCurrentRows.reduce((best, row) =>
      row.wages > best.wages ? row : best,
    );
  }, [payrollCurrentRows]);

  const highestPreviousPayrollRow = useMemo(() => {
    if (!payrollPreviousRows.length) {
      return null;
    }
    return payrollPreviousRows.reduce((best, row) =>
      row.wages > best.wages ? row : best,
    );
  }, [payrollPreviousRows]);

  const rangeGroupLabel = useMemo(() => {
    if (granularity === "week") {
      return lang === "es" ? "semana" : "week";
    }
    if (granularity === "month") {
      return lang === "es" ? "mes" : "month";
    }
    return lang === "es" ? "día" : "day";
  }, [granularity, lang]);

  return (
    <div className="reports-page comparison-page">
      <div className="admin-header">
        <h1>{t.payrollTitle}</h1>
        <p className="mb-0 text-muted">
          {t.payrollSubtitle}
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

      {report && (
        <>
          <div className="comparison-metrics-grid">
            <div className="comparison-metric-card">
              <div className="comparison-metric-label">
                {t.highestPayrollCurrent} {rangeGroupLabel} {t.currentRangeSuffix}
              </div>
              <div className="comparison-metric-current">
                {highestCurrentPayrollRow
                  ? bucketLabel(highestCurrentPayrollRow.date, granularity)
                  : "-"}
              </div>
              <div className="comparison-metric-meta">
                {highestCurrentPayrollRow
                  ? `${money(highestCurrentPayrollRow.wages)} ${t.wages.toLowerCase()}`
                  : t.noRows}
              </div>
            </div>
            <div className="comparison-metric-card">
              <div className="comparison-metric-label">
                {t.highestPayrollPrevious} {rangeGroupLabel} ({t.previous})
              </div>
              <div className="comparison-metric-current">
                {highestPreviousPayrollRow
                  ? bucketLabel(highestPreviousPayrollRow.date, granularity)
                  : "-"}
              </div>
              <div className="comparison-metric-meta">
                {highestPreviousPayrollRow
                  ? `${money(highestPreviousPayrollRow.wages)} ${t.wages.toLowerCase()}`
                  : t.noRows}
              </div>
            </div>
            <div className="comparison-metric-card">
              <div className="comparison-metric-label">{t.currentTotalWages}</div>
              <div className="comparison-metric-current">
                {money(report.totals.current.estimatedWages)}
              </div>
            </div>
          </div>

          <div className="admin-card">
            <h2 className="h5 mb-3">
              {lang === "es" ? "Actual" : "Current"}{" "}
              {granularityLabel(granularity, lang).toLowerCase()} {t.payrollCurrentRange}
            </h2>
            <div className="table-responsive">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t.period}</th>
                    <th>{t.laborHours}</th>
                    <th>{t.wages}</th>
                    <th>{t.tips}</th>
                    <th>{t.totalComp}</th>
                    <th>{t.employees}</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollCurrentRows.map((row) => (
                    <tr key={row.date}>
                      <td>{bucketLabel(row.date, granularity)}</td>
                      <td>{hours(row.laborHours)}</td>
                      <td>{money(row.wages)}</td>
                      <td>{money(row.tips)}</td>
                      <td>{money(row.totalComp)}</td>
                      <td>{row.employeeCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!payrollCurrentRows.length && (
              <p className="small text-muted mb-0 mt-3">
                {t.noPayrollRows}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
