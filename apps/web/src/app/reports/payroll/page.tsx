"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchEmployeesRequest,
  fetchPayrollReportRequest,
} from "../../../lib/api/reports-core";
import {
  useUiCopy,
  useUiLanguage,
  type UiLang,
} from "../../../lib/ui-language";

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

const copy: Record<UiLang, Record<string, string>> = {
  en: {
    title: "Payroll Summary",
    period: "Period",
    weekly: "Weekly",
    biweekly: "Bi-Weekly",
    monthly: "Monthly",
    custom: "Custom",
    from: "From",
    to: "To",
    employee: "Employee",
    allEmployees: "All Employees",
    roundMinutes: "Round Minutes",
    doNotRound: "Do not round",
    nearest5: "Nearest 5 minutes",
    nearest10: "Nearest 10 minutes",
    nearest15: "Nearest 15 minutes",
    nearest20: "Nearest 20 minutes",
    nearest30: "Nearest 30 minutes",
    weekStartsOn: "Week Starts On",
    sunday: "Sunday",
    monday: "Monday",
    overtimeHours: "Overtime (hrs)",
    running: "Running...",
    runReport: "Run Report",
    exportExcel: "Export Excel",
    noPayrollData: "No payroll data for this range.",
    hourlyRate: "Hourly Rate",
    totalHours: "Total Hours",
    hoursAbbr: "hrs",
    totalPay: "Total Pay",
    editTimes: "Edit Times",
    weekStart: "Week Start",
    total: "Total",
    regular: "Regular",
    overtime: "Overtime",
    decimal: "Decimal",
    regularPay: "Regular Pay",
    overtimePay: "OT Pay",
  },
  es: {
    title: "Resumen de Nómina",
    period: "Periodo",
    weekly: "Semanal",
    biweekly: "Quincenal",
    monthly: "Mensual",
    custom: "Personalizado",
    from: "Desde",
    to: "Hasta",
    employee: "Empleado",
    allEmployees: "Todos los empleados",
    roundMinutes: "Redondeo de minutos",
    doNotRound: "No redondear",
    nearest5: "Cada 5 minutos",
    nearest10: "Cada 10 minutos",
    nearest15: "Cada 15 minutos",
    nearest20: "Cada 20 minutos",
    nearest30: "Cada 30 minutos",
    weekStartsOn: "Inicio de semana",
    sunday: "Domingo",
    monday: "Lunes",
    overtimeHours: "Horas extra (hrs)",
    running: "Ejecutando...",
    runReport: "Generar reporte",
    exportExcel: "Exportar Excel",
    noPayrollData: "No hay datos de nómina en este rango.",
    hourlyRate: "Pago por hora",
    totalHours: "Horas totales",
    hoursAbbr: "hrs",
    totalPay: "Pago total",
    editTimes: "Editar horas",
    weekStart: "Inicio de semana",
    total: "Total",
    regular: "Regular",
    overtime: "Extra",
    decimal: "Decimal",
    regularPay: "Pago regular",
    overtimePay: "Pago extra",
  },
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

export default function PayrollReport() {
  const lang = useUiLanguage();
  const t = useUiCopy(copy, lang);
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
      const response = await fetchEmployeesRequest();
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

      const response = await fetchPayrollReportRequest(params);
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
        <h1>{t.title}</h1>
      </div>

      <div className="admin-card report-filters">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-3">
            <label className="form-label">{t.period}</label>
            <select
              className="form-select"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              <option value="weekly">{t.weekly}</option>
              <option value="biweekly">{t.biweekly}</option>
              <option value="monthly">{t.monthly}</option>
              <option value="custom">{t.custom}</option>
            </select>
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">{t.from}</label>
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
            <label className="form-label">{t.to}</label>
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
            <label className="form-label">{t.employee}</label>
            <select
              className="form-select"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
            >
              <option value="">{t.allEmployees}</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">{t.roundMinutes}</label>
            <select
              className="form-select"
              value={round}
              onChange={(event) => setRound(event.target.value)}
            >
              <option value="0">{t.doNotRound}</option>
              <option value="5">{t.nearest5}</option>
              <option value="10">{t.nearest10}</option>
              <option value="15">{t.nearest15}</option>
              <option value="20">{t.nearest20}</option>
              <option value="30">{t.nearest30}</option>
            </select>
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">{t.weekStartsOn}</label>
            <select
              className="form-select"
              value={weekStartsOn}
              onChange={(event) => setWeekStartsOn(event.target.value)}
            >
              <option value="0">{t.sunday}</option>
              <option value="1">{t.monday}</option>
            </select>
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">{t.overtimeHours}</label>
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
              {loading ? t.running : t.runReport}
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
              {t.exportExcel}
            </a>
          </div>
        </div>
      </div>

      {report && report.employees.length === 0 && (
        <div className="admin-card">
          <p className="mb-0">{t.noPayrollData}</p>
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
                    {t.hourlyRate}: {currency.format(employee.hourlyRate || 0)}
                  </div>
                </div>
                <div className="report-card-meta">
                  <div className="report-total">
                    <div className="report-total-label">{t.totalHours}</div>
                    <div className="report-total-value">
                      {employee.totalHoursFormatted}
                      <span className="report-total-decimal">
                        {employee.totalHoursDecimal.toFixed(2)} {t.hoursAbbr}
                      </span>
                    </div>
                    <div className="report-total-pay">
                      {t.totalPay}: {currency.format(employee.totalPay || 0)}
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
                    {t.editTimes}
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                  </a>
                </div>
              </div>
              <div className="table-responsive">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>{t.weekStart}</th>
                      <th>{t.total}</th>
                      <th>{t.regular}</th>
                      <th>{t.overtime}</th>
                      <th>{t.decimal}</th>
                      <th>{t.regularPay}</th>
                      <th>{t.overtimePay}</th>
                      <th>{t.totalPay}</th>
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
