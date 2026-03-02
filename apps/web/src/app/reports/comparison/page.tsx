"use client";

import { useMemo, useState } from "react";
import { useUiCopy, useUiLanguage } from "../../../lib/ui-language";
import {
  aggregateByGranularity,
  applyRangePreset,
  bucketLabel,
  comparisonCopy,
  fetchComparisonReport,
  granularityLabel,
  hours,
  money,
  percent,
  signed,
  type ComparisonGranularity,
  type ComparisonResponse,
} from "./shared";

type RangeTrendRow = {
  date: string;
  sales: number;
  expenses: number;
  wages: number;
  tips: number;
  laborHours: number;
  net: number;
};

type SalesExpenseRow = {
  date: string;
  foodSales: number;
  liquorSales: number;
  totalSales: number;
  totalExpenses: number;
  expenseCount: number;
  cashExpenses: number;
  debitCardExpenses: number;
  checkExpenses: number;
};

export default function ComparisonReportPage() {
  const lang = useUiLanguage();
  const t = useUiCopy(comparisonCopy, lang);
  const initialRange = useMemo(() => applyRangePreset("30d"), []);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [preset, setPreset] = useState("30d");
  const [granularity, setGranularity] = useState<ComparisonGranularity>("day");
  const [weekStartsOn, setWeekStartsOn] = useState<"0" | "1">("1");
  const [trendWeeks, setTrendWeeks] = useState("8");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ComparisonResponse | null>(null);

  const applyPreset = (value: string) => {
    setPreset(value);
    const range = applyRangePreset(value);
    setFrom(range.from);
    setTo(range.to);
  };

  const runReport = async () => {
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
        trendWeeks,
      });
      setReport(data);
    } catch (requestError) {
      setReport(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load comparison report.",
      );
    } finally {
      setLoading(false);
    }
  };

  const buildExportHref = (format: "excel" | "csv" | "pdf") =>
    `/api/reports/comparison/export?${new URLSearchParams({
      format,
      section: "combined",
      from,
      to,
      granularity,
      weekStartsOn,
      trendWeeks,
      tzOffset: String(-new Date().getTimezoneOffset()),
    }).toString()}`;

  const trendRows = useMemo<RangeTrendRow[]>(() => {
    if (!report) {
      return [];
    }
    const byDate = new Map<string, RangeTrendRow>();

    const ensureDate = (date: string) => {
      const existing = byDate.get(date);
      if (existing) {
        return existing;
      }
      const created: RangeTrendRow = {
        date,
        sales: 0,
        expenses: 0,
        wages: 0,
        tips: 0,
        laborHours: 0,
        net: 0,
      };
      byDate.set(date, created);
      return created;
    };

    report.salesComparison.currentDaily.forEach((row) => {
      const target = ensureDate(row.date);
      target.sales += row.totalSales;
    });
    report.expensesComparison.currentDaily.forEach((row) => {
      const target = ensureDate(row.date);
      target.expenses += row.totalExpenses;
    });
    report.payroll.currentDaily.forEach((row) => {
      const target = ensureDate(row.date);
      target.wages += row.wages;
      target.tips += row.tips;
      target.laborHours += row.laborHours;
    });

    const baseRows = Array.from(byDate.values())
      .map((row) => ({
        ...row,
        net: row.sales - row.expenses,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return aggregateByGranularity(
      baseRows,
      granularity,
      (acc, row) => ({
        ...acc,
        sales: acc.sales + row.sales,
        expenses: acc.expenses + row.expenses,
        wages: acc.wages + row.wages,
        tips: acc.tips + row.tips,
        laborHours: acc.laborHours + row.laborHours,
        net: acc.net + row.net,
      }),
      Number(weekStartsOn) as 0 | 1,
    );
  }, [granularity, report, weekStartsOn]);

  const maxTrendValue = useMemo(() => {
    const limitedRows = trendRows.slice(-Number(trendWeeks));
    if (!limitedRows.length) {
      return 1;
    }
    const values = limitedRows.flatMap((row) => [
      row.sales,
      row.expenses,
      row.wages,
      row.tips,
      row.laborHours,
    ]);
    return Math.max(...values, 1);
  }, [trendRows, trendWeeks]);

  const displayTrendRows = useMemo(
    () => trendRows.slice(-Number(trendWeeks)),
    [trendRows, trendWeeks],
  );

  const salesExpenseRows = useMemo<SalesExpenseRow[]>(() => {
    if (!report) {
      return [];
    }
    const byDate = new Map<string, SalesExpenseRow>();

    const ensureDate = (date: string) => {
      const existing = byDate.get(date);
      if (existing) {
        return existing;
      }
      const created: SalesExpenseRow = {
        date,
        foodSales: 0,
        liquorSales: 0,
        totalSales: 0,
        totalExpenses: 0,
        expenseCount: 0,
        cashExpenses: 0,
        debitCardExpenses: 0,
        checkExpenses: 0,
      };
      byDate.set(date, created);
      return created;
    };

    report.salesComparison.currentDaily.forEach((row) => {
      const target = ensureDate(row.date);
      target.foodSales += row.foodSales;
      target.liquorSales += row.liquorSales;
      target.totalSales += row.totalSales;
    });

    report.expensesComparison.currentDaily.forEach((row) => {
      const target = ensureDate(row.date);
      target.totalExpenses += row.totalExpenses;
      target.expenseCount += row.expenseCount;
      target.cashExpenses += row.cashExpenses;
      target.debitCardExpenses += row.debitCardExpenses;
      target.checkExpenses += row.checkExpenses;
    });

    const baseRows = Array.from(byDate.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    return aggregateByGranularity(
      baseRows,
      granularity,
      (acc, row) => ({
        ...acc,
        foodSales: acc.foodSales + row.foodSales,
        liquorSales: acc.liquorSales + row.liquorSales,
        totalSales: acc.totalSales + row.totalSales,
        totalExpenses: acc.totalExpenses + row.totalExpenses,
        expenseCount: acc.expenseCount + row.expenseCount,
        cashExpenses: acc.cashExpenses + row.cashExpenses,
        debitCardExpenses: acc.debitCardExpenses + row.debitCardExpenses,
        checkExpenses: acc.checkExpenses + row.checkExpenses,
      }),
      Number(weekStartsOn) as 0 | 1,
    );
  }, [granularity, report, weekStartsOn]);

  const maxDailySalesExpenseValue = useMemo(() => {
    if (!salesExpenseRows.length) {
      return 1;
    }
    const values = [
      ...salesExpenseRows.map((row) => row.foodSales),
      ...salesExpenseRows.map((row) => row.liquorSales),
      ...salesExpenseRows.map((row) => row.totalSales),
      ...salesExpenseRows.map((row) => row.totalExpenses),
    ];
    return Math.max(...values, 1);
  }, [salesExpenseRows]);

  const highestSalesRow = useMemo(() => {
    if (!salesExpenseRows.length) {
      return null;
    }
    return salesExpenseRows.reduce((best, row) =>
      row.totalSales > best.totalSales ? row : best,
    );
  }, [salesExpenseRows]);

  const highestExpenseRow = useMemo(() => {
    if (!salesExpenseRows.length) {
      return null;
    }
    return salesExpenseRows.reduce((best, row) =>
      row.totalExpenses > best.totalExpenses ? row : best,
    );
  }, [salesExpenseRows]);

  const rangeGroupLabel = useMemo(() => {
    if (granularity === "week") {
      return lang === "es" ? "semana" : "week";
    }
    if (granularity === "month") {
      return lang === "es" ? "mes" : "month";
    }
    return lang === "es" ? "día" : "day";
  }, [granularity, lang]);

  const metricCards = useMemo(() => {
    if (!report) {
      return [];
    }
    return [
      {
        label: t.laborHours,
        current: hours(report.totals.current.laborHours),
        previous: hours(report.totals.previous.laborHours),
        delta: signed(report.totals.delta.laborHours.delta),
        percent: percent(report.totals.delta.laborHours.percent),
      },
      {
        label: t.estimatedWages,
        current: money(report.totals.current.estimatedWages),
        previous: money(report.totals.previous.estimatedWages),
        delta: signed(report.totals.delta.estimatedWages.delta, true),
        percent: percent(report.totals.delta.estimatedWages.percent),
      },
      {
        label: t.tips,
        current: money(report.totals.current.tips),
        previous: money(report.totals.previous.tips),
        delta: signed(report.totals.delta.tips.delta, true),
        percent: percent(report.totals.delta.tips.percent),
      },
      {
        label: t.sales,
        current: money(report.totals.current.sales),
        previous: money(report.totals.previous.sales),
        delta: signed(report.totals.delta.sales.delta, true),
        percent: percent(report.totals.delta.sales.percent),
      },
      {
        label: t.expenses,
        current: money(report.totals.current.expenses),
        previous: money(report.totals.previous.expenses),
        delta: signed(report.totals.delta.expenses.delta, true),
        percent: percent(report.totals.delta.expenses.percent),
      },
      {
        label: t.net,
        current: money(report.totals.current.net),
        previous: money(report.totals.previous.net),
        delta: signed(report.totals.delta.net.delta, true),
        percent: percent(report.totals.delta.net.percent),
      },
    ];
  }, [report, t]);

  return (
    <div className="reports-page comparison-page">
      <div className="admin-header">
        <h1>{t.title}</h1>
        <p className="mb-0 text-muted">
          {t.subtitle}
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
            <label className="form-label">{t.trendPoints}</label>
            <select
              className="form-select"
              value={trendWeeks}
              onChange={(event) => setTrendWeeks(event.target.value)}
            >
              <option value="4">4 {t.points}</option>
              <option value="8">8 {t.points}</option>
              <option value="12">12 {t.points}</option>
              <option value="16">16 {t.points}</option>
              <option value="26">26 {t.points}</option>
            </select>
          </div>
          <div className="col-12 col-md-4 d-flex gap-2 flex-wrap">
            <button className="btn btn-primary" onClick={runReport}>
              {loading ? t.generating : t.generateReport}
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
            <a className="btn btn-outline-secondary" href="/reports/comparison/employees">
              {t.employeeActivity}
            </a>
            <a className="btn btn-outline-secondary" href="/reports/comparison/liquor">
              {t.liquorConsumption}
            </a>
            <a className="btn btn-outline-secondary" href="/reports/comparison/payroll">
              {t.payrollDates}
            </a>
            {report && (
              <span className="small text-muted align-self-center">
                {lang === "es" ? "Actualizado" : "Updated"}{" "}
                {new Date(report.generatedAt).toLocaleString("en-US")}
              </span>
            )}
          </div>
        </div>
      </div>

      {!report && !loading && (
        <div className="admin-card">
          <p className="mb-0">{t.generatePrompt}</p>
        </div>
      )}

      {error && (
        <div className="alert alert-danger mb-0" role="alert">
          {error}
        </div>
      )}

      {report && (
        <>
          <div className="admin-card comparison-period-header">
            <div>
              <div className="comparison-period-title">{t.currentRange}</div>
              <div className="comparison-period-range">
                {report.period.current.from} {lang === "es" ? "a" : "to"}{" "}
                {report.period.current.to}
              </div>
            </div>
            <div>
              <div className="comparison-period-title">{t.previousMatchingRange}</div>
              <div className="comparison-period-range">
                {report.period.previous.from} {lang === "es" ? "a" : "to"}{" "}
                {report.period.previous.to}
              </div>
            </div>
          </div>

          <div className="comparison-metrics-grid">
            {metricCards.map((metric) => (
              <div className="comparison-metric-card" key={metric.label}>
                <div className="comparison-metric-label">{metric.label}</div>
                <div className="comparison-metric-current">{metric.current}</div>
                <div className="comparison-metric-meta">
                  {t.previous}: {metric.previous}
                </div>
                <div className="comparison-metric-delta">
                  {t.change}: {metric.delta} ({metric.percent})
                </div>
              </div>
            ))}
          </div>

          <div className="admin-card">
            <h2 className="h5 mb-3">
              {granularityLabel(granularity, lang)} {t.trendChart}
            </h2>
            <div className="comparison-chart-legend">
              <span className="comparison-legend-chip comparison-legend-chip--sales">
                {t.sales}
              </span>
              <span className="comparison-legend-chip comparison-legend-chip--expenses">
                {t.expenses}
              </span>
              <span className="comparison-legend-chip comparison-legend-chip--wages">
                {t.wages}
              </span>
              <span className="comparison-legend-chip comparison-legend-chip--tips">
                {t.tips}
              </span>
              <span className="comparison-legend-chip comparison-legend-chip--hours">
                {t.laborHours}
              </span>
            </div>
            <div className="comparison-chart-grid">
              {displayTrendRows.map((row) => (
                <div className="comparison-chart-row" key={row.date}>
                  <div className="comparison-chart-label">
                    <div>{bucketLabel(row.date, granularity)}</div>
                  </div>
                  <div className="comparison-chart-bars">
                    <div
                      className="comparison-chart-bar comparison-chart-bar--sales"
                      style={{ width: `${(row.sales / maxTrendValue) * 100}%` }}
                    />
                    <div
                      className="comparison-chart-bar comparison-chart-bar--expenses"
                      style={{ width: `${(row.expenses / maxTrendValue) * 100}%` }}
                    />
                    <div
                      className="comparison-chart-bar comparison-chart-bar--wages"
                      style={{ width: `${(row.wages / maxTrendValue) * 100}%` }}
                    />
                    <div
                      className="comparison-chart-bar comparison-chart-bar--tips"
                      style={{ width: `${(row.tips / maxTrendValue) * 100}%` }}
                    />
                    <div
                      className="comparison-chart-bar comparison-chart-bar--hours"
                      style={{ width: `${(row.laborHours / maxTrendValue) * 100}%` }}
                    />
                  </div>
                  <div className="comparison-chart-meta">
                    <div>{money(row.sales)}</div>
                    <div className="text-muted small">{hours(row.laborHours)}</div>
                    <div className="text-muted small">
                      {t.net}: {money(row.net)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {!displayTrendRows.length && (
              <p className="small text-muted mb-0 mt-3">
                {t.noTrendRows}
              </p>
            )}
          </div>

          <div className="admin-card">
            <h2 className="h5 mb-3">
              {granularityLabel(granularity, lang)} {t.salesExpensesComparison}
            </h2>
            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6">
                <div className="comparison-metric-card">
                  <div className="comparison-metric-label">
                    {t.highestSalesCurrent} {rangeGroupLabel} {t.currentRangeSuffix}
                  </div>
                  <div className="comparison-metric-current">
                    {highestSalesRow
                      ? bucketLabel(highestSalesRow.date, granularity)
                      : "-"}
                  </div>
                  <div className="comparison-metric-meta">
                    {highestSalesRow ? money(highestSalesRow.totalSales) : t.noSalesData}
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="comparison-metric-card">
                  <div className="comparison-metric-label">
                    {t.highestExpensesCurrent} {rangeGroupLabel} {t.currentRangeSuffix}
                  </div>
                  <div className="comparison-metric-current">
                    {highestExpenseRow
                      ? bucketLabel(highestExpenseRow.date, granularity)
                      : "-"}
                  </div>
                  <div className="comparison-metric-meta">
                    {highestExpenseRow
                      ? money(highestExpenseRow.totalExpenses)
                      : t.noExpenseData}
                  </div>
                </div>
              </div>
            </div>

            <div className="comparison-chart-grid">
              {salesExpenseRows.map((row) => {
                return (
                  <div className="comparison-chart-row" key={row.date}>
                    <div className="comparison-chart-label">
                      <div>{bucketLabel(row.date, granularity)}</div>
                    </div>
                    <div className="comparison-chart-bars">
                      <div
                        className="comparison-chart-bar comparison-chart-bar--sales"
                        style={{
                          width: `${(row.foodSales / maxDailySalesExpenseValue) * 100}%`,
                        }}
                      />
                      <div
                        className="comparison-chart-bar comparison-chart-bar--tips"
                        style={{
                          width: `${(row.liquorSales / maxDailySalesExpenseValue) * 100}%`,
                        }}
                      />
                      <div
                        className="comparison-chart-bar comparison-chart-bar--hours"
                        style={{
                          width: `${(row.totalSales / maxDailySalesExpenseValue) * 100}%`,
                        }}
                      />
                      <div
                        className="comparison-chart-bar comparison-chart-bar--expenses"
                        style={{
                          width: `${(row.totalExpenses / maxDailySalesExpenseValue) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="comparison-chart-meta">
                      <div>
                        {t.sales}: {money(row.totalSales)}
                      </div>
                      <div className="text-muted small">
                        {t.foodSales} {money(row.foodSales)} · {t.liquorSales}{" "}
                        {money(row.liquorSales)}
                      </div>
                      <div className="text-muted small">
                        {t.expenses}: {money(row.totalExpenses)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="table-responsive mt-3">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t.period}</th>
                    <th>{t.foodSales}</th>
                    <th>{t.liquorSales}</th>
                    <th>{t.totalSales}</th>
                    <th>{t.totalExpenses}</th>
                    <th>{t.expenseCount}</th>
                  </tr>
                </thead>
                <tbody>
                  {salesExpenseRows.map((row) => {
                    return (
                      <tr key={`${row.date}-table`}>
                        <td>{bucketLabel(row.date, granularity)}</td>
                        <td>{money(row.foodSales)}</td>
                        <td>{money(row.liquorSales)}</td>
                        <td>{money(row.totalSales)}</td>
                        <td>{money(row.totalExpenses)}</td>
                        <td>{row.expenseCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-xl-4">
              <div className="admin-card h-100">
                <h2 className="h5 mb-3">{t.topWorkersCurrent}</h2>
                <div className="comparison-list">
                  {report.employees.currentLeaders.slice(0, 8).map((row) => (
                    <div className="comparison-list-row" key={row.employeeId}>
                      <div>
                        <div className="fw-semibold">{row.name}</div>
                        <div className="small text-muted">
                          {t.tips} {money(row.currentTips)}
                        </div>
                      </div>
                      <div className="text-end">
                        <div>{hours(row.currentHours)}</div>
                        <div className="small text-muted">{money(row.currentWages)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-12 col-xl-4">
              <div className="admin-card h-100">
                <h2 className="h5 mb-3">{t.topWorkersPrevious}</h2>
                <div className="comparison-list">
                  {report.employees.previousLeaders.slice(0, 8).map((row) => (
                    <div className="comparison-list-row" key={row.employeeId}>
                      <div>
                        <div className="fw-semibold">{row.name}</div>
                        <div className="small text-muted">
                          {t.tips} {money(row.previousTips)}
                        </div>
                      </div>
                      <div className="text-end">
                        <div>{hours(row.previousHours)}</div>
                        <div className="small text-muted">{money(row.previousWages)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-12 col-xl-4">
              <div className="admin-card h-100">
                <h2 className="h5 mb-3">{t.biggestWorkloadChanges}</h2>
                <div className="comparison-list">
                  {report.employees.changes.slice(0, 8).map((row) => (
                    <div className="comparison-list-row" key={row.employeeId}>
                      <div>
                        <div className="fw-semibold">{row.name}</div>
                        <div className="small text-muted">
                          {t.tips}: {signed(row.deltaTips, true)}
                        </div>
                      </div>
                      <div className="text-end">
                        <div>{signed(row.deltaHours)}h</div>
                        <div className="small text-muted">
                          {t.wages}: {signed(row.deltaWages, true)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="admin-card">
            <h2 className="h5 mb-3">{t.highlights}</h2>
            <ul className="mb-2">
              {report.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
            {report.notes.map((note) => (
              <p className="small text-muted mb-0" key={note}>
                {note}
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
