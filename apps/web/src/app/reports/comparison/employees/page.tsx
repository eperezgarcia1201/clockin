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

export default function EmployeeActivityComparisonPage() {
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
      section: "employees",
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

  const activityRows = useMemo(() => {
    if (!report) {
      return [];
    }
    return aggregateByGranularity(
      report.employeeActivity.daily,
      granularity,
      (acc, row) => ({
        ...acc,
        laborHours: acc.laborHours + row.laborHours,
        estimatedWages: acc.estimatedWages + row.estimatedWages,
        punches: acc.punches + row.punches,
        activeEmployees: Math.max(acc.activeEmployees, row.activeEmployees),
      }),
      Number(weekStartsOn) as 0 | 1,
    );
  }, [granularity, report, weekStartsOn]);

  const maxLabor = useMemo(() => {
    if (!activityRows.length) {
      return 1;
    }
    return Math.max(...activityRows.map((row) => row.laborHours), 1);
  }, [activityRows]);

  return (
    <div className="reports-page comparison-page">
      <div className="admin-header">
        <h1>{t.employeeTitle}</h1>
        <p className="mb-0 text-muted">
          {t.employeeSubtitle}
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
          <div className="admin-card">
            <h2 className="h5 mb-3">
              {granularityLabel(granularity, lang)} {t.dailyActivity}
            </h2>
            <div className="comparison-chart-grid">
              {activityRows.map((row) => (
                <div className="comparison-chart-row" key={row.date}>
                  <div className="comparison-chart-label">
                    <div>{bucketLabel(row.date, granularity)}</div>
                  </div>
                  <div className="comparison-chart-bars">
                    <div
                      className="comparison-chart-bar comparison-chart-bar--hours"
                      style={{
                        width: `${Math.min((row.laborHours / maxLabor) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="comparison-chart-meta">
                    <div>{hours(row.laborHours)}</div>
                    <div className="text-muted small">
                      {row.punches} {lang === "es" ? "marcaciones" : "punches"},{" "}
                      {row.activeEmployees} {lang === "es" ? "activos" : "active"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {!activityRows.length && (
              <p className="small text-muted mb-0 mt-3">
                {t.noEmployeeRows}
              </p>
            )}
          </div>

          <div className="admin-card">
            <h2 className="h5 mb-3">{t.topPunchActivity}</h2>
            <div className="comparison-list">
              {report.employeeActivity.topByPunches.slice(0, 20).map((row) => (
                <div className="comparison-list-row" key={row.employeeId}>
                  <div>
                    <div className="fw-semibold">{row.name}</div>
                    <div className="small text-muted">
                      IN {row.inPunches} · OUT {row.outPunches} · BREAK {row.breakPunches} · LUNCH{" "}
                      {row.lunchPunches}
                    </div>
                  </div>
                  <div className="text-end">
                    <div>
                      {row.punches} {lang === "es" ? "marcaciones" : "punches"}
                    </div>
                    <div className="small text-muted">
                      {hours(row.hours)} · {money(row.wages)} · {t.tips} {money(row.tips)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
