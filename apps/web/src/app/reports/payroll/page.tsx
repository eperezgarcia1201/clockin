"use client";

import { useEffect, useMemo, useState } from "react";

type Employee = { id: string; name: string };

type WeekRow = {
  weekStart: string;
  totalMinutes: number;
  totalHoursFormatted: string;
  totalHoursDecimal: number;
  regularMinutes: number;
  regularHoursFormatted: string;
  overtimeMinutes: number;
  overtimeHoursFormatted: string;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
};

type EmployeePayroll = {
  id: string;
  name: string;
  hourlyRate: number;
  totalMinutes: number;
  totalHoursFormatted: string;
  totalHoursDecimal: number;
  totalPay: number;
  weeks: WeekRow[];
};

type PayrollResponse = {
  range: { from: string; to: string };
  roundMinutes: number;
  weekStartsOn: number;
  overtimeThreshold: number;
  overtimeMultiplier: number;
  employees: EmployeePayroll[];
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

export default function PayrollReport() {
  const today = useMemo(() => new Date(), []);
  const thirtyDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 27);
    return date;
  }, []);

  const [period, setPeriod] = useState("custom");
  const [from, setFrom] = useState(formatDate(thirtyDaysAgo));
  const [to, setTo] = useState(formatDate(today));
  const [round, setRound] = useState("15");
  const [weekStartsOn, setWeekStartsOn] = useState("1");
  const [overtimeThreshold, setOvertimeThreshold] = useState("40");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [report, setReport] = useState<PayrollResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [tzOffset, setTzOffset] = useState(0);

  useEffect(() => {
    setTzOffset(-new Date().getTimezoneOffset());
  }, []);
  const currency = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }),
    [],
  );

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
      params.set("weekStartsOn", weekStartsOn);
      params.set("overtimeThreshold", overtimeThreshold);
      if (employeeId) {
        params.set("employeeId", employeeId);
      }

      const response = await fetch(
        `/api/reports/payroll?${params.toString()}`,
        {
          cache: "no-store",
        },
      );
      if (!response.ok) {
        throw new Error("Unable to load report");
      }
      const data = (await response.json()) as PayrollResponse;
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
        <h1>Payroll Summary</h1>
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
          <div className="col-12 col-md-3">
            <label className="form-label">Week Starts On</label>
            <select
              className="form-select"
              value={weekStartsOn}
              onChange={(event) => setWeekStartsOn(event.target.value)}
            >
              <option value="0">Sunday</option>
              <option value="1">Monday</option>
            </select>
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">Overtime (hrs)</label>
            <input
              className="form-control"
              type="number"
              value={overtimeThreshold}
              onChange={(event) => setOvertimeThreshold(event.target.value)}
              min={0}
              max={80}
            />
          </div>
          <div className="col-12 d-flex gap-2 flex-wrap">
            <button className="btn btn-primary" onClick={runReport}>
              {loading ? "Running..." : "Run Report"}
            </button>
            <a
              className="btn btn-outline-secondary"
              href={`/api/reports/payroll/export?${new URLSearchParams({
                from,
                to,
                round,
                tzOffset: String(tzOffset),
                weekStartsOn,
                overtimeThreshold,
                ...(employeeId ? { employeeId } : {}),
              }).toString()}`}
            >
              Export Excel
            </a>
          </div>
        </div>
      </div>

      {report && report.employees.length === 0 && (
        <div className="admin-card">
          <p className="mb-0">No payroll data for this range.</p>
        </div>
      )}

      {report && report.employees.length > 0 && (
        <div className="report-results">
          {report.employees.map((employee) => (
            <div key={employee.id} className="report-card">
              <div className="report-card-header">
                <div>
                  <div className="report-employee">{employee.name}</div>
                  <div className="report-range">
                    {report.range.from} → {report.range.to}
                  </div>
                  <div className="report-rate">
                    Hourly Rate: {currency.format(employee.hourlyRate || 0)}
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
                    <div className="report-total-pay">
                      Total Pay: {currency.format(employee.totalPay || 0)}
                    </div>
                  </div>
                  <a
                    className="report-edit-btn"
                    href={`/admin/time?${new URLSearchParams({
                      employeeId: employee.id,
                      from: report.range.from,
                      to: report.range.to,
                      returnTo: "/reports/payroll",
                    }).toString()}`}
                  >
                    Edit Times
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                  </a>
                </div>
              </div>
              <div className="table-responsive">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Week Start</th>
                      <th>Total</th>
                      <th>Regular</th>
                      <th>Overtime</th>
                      <th>Decimal</th>
                      <th>Regular Pay</th>
                      <th>OT Pay</th>
                      <th>Total Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employee.weeks.map((week) => (
                      <tr key={week.weekStart}>
                        <td>{week.weekStart}</td>
                        <td>{week.totalHoursFormatted}</td>
                        <td>{week.regularHoursFormatted}</td>
                        <td>{week.overtimeHoursFormatted}</td>
                        <td>{week.totalHoursDecimal.toFixed(2)}</td>
                        <td>{currency.format(week.regularPay || 0)}</td>
                        <td>{currency.format(week.overtimePay || 0)}</td>
                        <td>{currency.format(week.totalPay || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
