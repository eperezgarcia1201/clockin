"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchEmployeesRequest,
  fetchHoursReportRequest,
} from "../../../lib/api/reports-core";
import {
  useUiCopy,
  useUiLanguage,
  type UiLang,
} from "../../../lib/ui-language";
import { PunchPhotoLinks } from "../components/PunchPhotoLinks";

type Employee = { id: string; name: string };

type DayHours = {
  date: string;
  minutes: number;
  hoursDecimal: number;
  hoursFormatted: string;
  photoCount?: number;
  photoPunches?: Array<{
    punchId: string;
    type: string;
    occurredAt: string;
    photoCapturedAt?: string | null;
  }>;
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

const copy: Record<UiLang, Record<string, string>> = {
  en: {
    title: "Hours Worked Report",
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
    running: "Running...",
    runReport: "Run Report",
    exportExcel: "Export Excel",
    downloadPdf: "Download PDF",
    noHours: "No hours recorded for this range.",
    totalHours: "Total Hours",
    hoursAbbr: "hrs",
    otHours: "OT Hours",
    date: "Date",
    weekStart: "Week Start",
    hours: "Hours",
    decimal: "Decimal",
    otWeek: "OT (Week)",
    weekTotalHours: "Week Total (hrs)",
    photos: "Punch Photos",
  },
  es: {
    title: "Reporte de Horas Trabajadas",
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
    running: "Ejecutando...",
    runReport: "Generar reporte",
    exportExcel: "Exportar Excel",
    downloadPdf: "Descargar PDF",
    noHours: "No hay horas registradas en este rango.",
    totalHours: "Horas totales",
    hoursAbbr: "hrs",
    otHours: "Horas extra",
    date: "Fecha",
    weekStart: "Inicio de semana",
    hours: "Horas",
    decimal: "Decimal",
    otWeek: "HE (semana)",
    weekTotalHours: "Total semanal (hrs)",
    photos: "Fotos de marcación",
  },
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
  const lang = useUiLanguage();
  const t = useUiCopy(copy, lang);
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
      if (employeeId) {
        params.set("employeeId", employeeId);
      }

      const response = await fetchHoursReportRequest(params);
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
          <div className="col-12 d-flex gap-2 flex-wrap">
            <button className="btn btn-primary" onClick={runReport}>
              {loading ? t.running : t.runReport}
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
              {t.exportExcel}
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
              {t.downloadPdf}
            </a>
          </div>
        </div>
      </div>

      {report && report.employees.length === 0 && (
        <div className="admin-card">
          <p className="mb-0">{t.noHours}</p>
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
                      <div className="report-total-label">{t.totalHours}</div>
                      <div className="report-total-value">
                        {employee.totalHoursFormatted}
                        <span className="report-total-decimal">
                          {employee.totalHoursDecimal.toFixed(2)} {t.hoursAbbr}
                        </span>
                      </div>
                      <div className="report-total-decimal">
                        {t.otHours}: {weekly.totalOvertimeHours.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>{t.date}</th>
                        <th>{t.weekStart}</th>
                        <th>{t.hours}</th>
                        <th>{t.decimal}</th>
                        <th>{t.otWeek}</th>
                        <th>{t.photos}</th>
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
                            <td>
                              <PunchPhotoLinks
                                punches={day.photoPunches}
                                lang={lang}
                              />
                            </td>
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
                        <th>{t.weekStart}</th>
                        <th>{t.weekTotalHours}</th>
                        <th>{t.otHours}</th>
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
