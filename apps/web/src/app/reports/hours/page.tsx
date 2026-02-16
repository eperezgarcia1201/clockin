"use client";

import { useEffect, useMemo, useState } from "react";

type Employee = { id: string; name: string };

type DayHours = {
  date: string;
  minutes: number;
  hoursDecimal: number;
  hoursFormatted: string;
};

type EmployeeReport = {
  id: string;
  name: string;
  totalMinutes: number;
  totalHoursDecimal: number;
  totalHoursFormatted: string;
  days: DayHours[];
};

type ReportResponse = {
  range: { from: string; to: string };
  roundMinutes: number;
  employees: EmployeeReport[];
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const OVERTIME_MINUTES_PER_WEEK = 40 * 60;

const parseIsoDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const parsed = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

const getWeekStartIso = (isoDate: string, weekStartsOn = 1) => {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) return isoDate;
  const day = parsed.getUTCDay();
  const offset = (day - weekStartsOn + 7) % 7;
  parsed.setUTCDate(parsed.getUTCDate() - offset);
  return parsed.toISOString().slice(0, 10);
};

const buildWeeklyOvertime = (days: DayHours[]) => {
  const weeklyTotals = new Map<string, number>();
  for (const day of days) {
    const weekStart = getWeekStartIso(day.date);
    const minutes =
      typeof day.minutes === "number"
        ? day.minutes
        : Math.round((day.hoursDecimal || 0) * 60);
    weeklyTotals.set(weekStart, (weeklyTotals.get(weekStart) || 0) + minutes);
  }

  const weeklyRows = Array.from(weeklyTotals.entries())
    .map(([weekStart, totalMinutes]) => ({
      weekStart,
      totalMinutes,
      totalHours: totalMinutes / 60,
      overtimeMinutes: Math.max(0, totalMinutes - OVERTIME_MINUTES_PER_WEEK),
      overtimeHours: Math.max(0, totalMinutes - OVERTIME_MINUTES_PER_WEEK) / 60,
    }))
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));

  const byDate = new Map<string, { weekStart: string; overtimeHours: number }>();
  days.forEach((day) => {
    const weekStart = getWeekStartIso(day.date);
    const week = weeklyRows.find((row) => row.weekStart === weekStart);
    byDate.set(day.date, {
      weekStart,
      overtimeHours: week?.overtimeHours || 0,
    });
  });

  const totalOvertimeHours = weeklyRows.reduce(
    (sum, row) => sum + row.overtimeHours,
    0,
  );

  return { weeklyRows, byDate, totalOvertimeHours };
};

export default function HoursReport() {
  const today = useMemo(() => new Date(), []);
  const sevenDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return date;
  }, []);

  const [period, setPeriod] = useState("weekly");
  const [from, setFrom] = useState(formatDate(sevenDaysAgo));
  const [to, setTo] = useState(formatDate(today));
  const [round, setRound] = useState("0");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [tzOffset, setTzOffset] = useState(0);

  useEffect(() => {
    setTzOffset(-new Date().getTimezoneOffset());
  }, []);

  const applyPeriod = (value: string) => {
    if (value === "custom") return;
    const now = new Date();
    const end = new Date(now);
    let start = new Date(now);

    if (value === "weekly") {
      start.setDate(now.getDate() - 6);
    } else if (value === "biweekly") {
      start.setDate(now.getDate() - 13);
    } else if (value === "monthly") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    setFrom(formatDate(start));
    setTo(formatDate(end));
  };

  useEffect(() => {
    const loadEmployees = async () => {
      const response = await fetch("/api/employees", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { employees: Employee[] };
      setEmployees(data.employees || []);
    };

    loadEmployees();
  }, []);

  useEffect(() => {
    applyPeriod(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const runReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("from", from);
      params.set("to", to);
      params.set("round", round);
      params.set("tzOffset", String(tzOffset));
      if (employeeId) {
        params.set("employeeId", employeeId);
      }

      const response = await fetch(`/api/reports/hours?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Unable to load report");
      }
      const data = (await response.json()) as ReportResponse;
      setReport(data);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="reports-page">
      <div className="admin-header">
        <h1>Hours Worked Report</h1>
      </div>

      <div className="admin-card report-filters">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-3">
            <label className="form-label">Period</label>
            <select
              className="form-select"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">From</label>
            <input
              className="form-control"
              type="date"
              value={from}
              onChange={(event) => {
                setPeriod("custom");
                setFrom(event.target.value);
              }}
            />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">To</label>
            <input
              className="form-control"
              type="date"
              value={to}
              onChange={(event) => {
                setPeriod("custom");
                setTo(event.target.value);
              }}
            />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">Employee</label>
            <select
              className="form-select"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
            >
              <option value="">All Employees</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">Round Minutes</label>
            <select
              className="form-select"
              value={round}
              onChange={(event) => setRound(event.target.value)}
            >
              <option value="0">Do not round</option>
              <option value="5">Nearest 5 minutes</option>
              <option value="10">Nearest 10 minutes</option>
              <option value="15">Nearest 15 minutes</option>
              <option value="20">Nearest 20 minutes</option>
              <option value="30">Nearest 30 minutes</option>
            </select>
          </div>
          <div className="col-12 d-flex gap-2 flex-wrap">
            <button className="btn btn-primary" onClick={runReport}>
              {loading ? "Running..." : "Run Report"}
            </button>
            <a
              className="btn btn-outline-secondary"
              href={`/api/reports/hours/export?${new URLSearchParams({
                from,
                to,
                round,
                format: "excel",
                tzOffset: String(tzOffset),
                ...(employeeId ? { employeeId } : {}),
              }).toString()}`}
            >
              Export Excel
            </a>
            <a
              className="btn btn-outline-secondary"
              href={`/api/reports/hours/export?${new URLSearchParams({
                from,
                to,
                round,
                format: "pdf",
                tzOffset: String(tzOffset),
                ...(employeeId ? { employeeId } : {}),
              }).toString()}`}
            >
              Download PDF
            </a>
          </div>
        </div>
      </div>

      {report && report.employees.length === 0 && (
        <div className="admin-card">
          <p className="mb-0">No hours recorded for this range.</p>
        </div>
      )}

      {report && report.employees.length > 0 && (
        <div className="report-results">
          {report.employees.map((employee) => {
            const weekly = buildWeeklyOvertime(employee.days);
            return (
              <div key={employee.id} className="report-card">
                <div className="report-card-header">
                  <div>
                    <div className="report-employee">{employee.name}</div>
                    <div className="report-range">
                      {report.range.from} → {report.range.to}
                    </div>
                  </div>
                  <div className="report-card-meta">
                    <div className="report-total">
                      <div className="report-total-label">Total Hours</div>
                      <div className="report-total-value">
                        {employee.totalHoursFormatted}
                        <span className="report-total-decimal">
                          {employee.totalHoursDecimal.toFixed(2)} hrs
                        </span>
                      </div>
                      <div className="report-total-decimal">
                        OT Hours: {weekly.totalOvertimeHours.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Week Start</th>
                        <th>Hours</th>
                        <th>Decimal</th>
                        <th>OT (Week)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employee.days.map((day) => {
                        const weekInfo = weekly.byDate.get(day.date);
                        return (
                          <tr key={day.date}>
                            <td>{day.date}</td>
                            <td>{weekInfo?.weekStart || day.date}</td>
                            <td>{day.hoursFormatted}</td>
                            <td>{day.hoursDecimal.toFixed(2)}</td>
                            <td>{(weekInfo?.overtimeHours || 0).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="table-responsive mt-3">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Week Start</th>
                        <th>Week Total (hrs)</th>
                        <th>OT Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weekly.weeklyRows.map((week) => (
                        <tr key={week.weekStart}>
                          <td>{week.weekStart}</td>
                          <td>{week.totalHours.toFixed(2)}</td>
                          <td>{week.overtimeHours.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
