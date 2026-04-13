"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchDailyReportRequest,
  fetchEmployeesRequest,
} from "../../../lib/api/reports-core";
import {
  useUiCopy,
  useUiLanguage,
  type UiLang,
} from "../../../lib/ui-language";
import { PunchPhotoLinks } from "../components/PunchPhotoLinks";

type Employee = { id: string; name: string };

type DayRow = {
  date: string;
  minutes: number;
  hoursDecimal: number;
  hoursFormatted: string;
  scheduledPaidMinutes?: number;
  overScheduleMinutes?: number;
  firstIn?: string | null;
  lastOut?: string | null;
  photoCount?: number;
  photoPunches?: Array<{
    punchId: string;
    type: string;
    occurredAt: string;
    photoCapturedAt?: string | null;
  }>;
};

type EmployeeDaily = {
  id: string;
  name: string;
  totalMinutes: number;
  totalHoursDecimal: number;
  totalHoursFormatted: string;
  days: DayRow[];
};

type ReportResponse = {
  range: { from: string; to: string };
  roundMinutes: number;
  employees: EmployeeDaily[];
};

const copy: Record<UiLang, Record<string, string>> = {
  en: {
    title: "Daily Time Report",
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
    noPunches: "No punches recorded for this range.",
    totalHours: "Total Hours",
    hoursAbbr: "hrs",
    editTimes: "Edit Times",
    date: "Date",
    firstIn: "First In",
    lastOut: "Last Out",
    total: "Total",
    decimal: "Decimal",
    actions: "Actions",
    needsReview: "Needs review",
    overSchedule: "Over schedule",
    scheduled: "Scheduled paid",
    span: "Span",
    photos: "Punch Photos",
  },
  es: {
    title: "Reporte Diario de Tiempo",
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
    noPunches: "No hay marcaciones en este rango.",
    totalHours: "Horas totales",
    hoursAbbr: "hrs",
    editTimes: "Editar horas",
    date: "Fecha",
    firstIn: "Primera entrada",
    lastOut: "Última salida",
    total: "Total",
    decimal: "Decimal",
    actions: "Acciones",
    needsReview: "Requiere revisión",
    overSchedule: "Sobre horario",
    scheduled: "Programado pagado",
    span: "Rango",
    photos: "Fotos de marcación",
  },
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const isDateInputValue = (value: string | null) =>
  Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
const formatSpan = (minutes: number) => {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const mins = Math.abs(rounded % 60);
  return `${hours}:${String(mins).padStart(2, "0")}`;
};

export default function DailyReport() {
  const lang = useUiLanguage();
  const t = useUiCopy(copy, lang);
  const searchParams = useSearchParams();
  const today = useMemo(() => new Date(), []);
  const sevenDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return date;
  }, []);
  const initialPeriodParam = searchParams.get("period");
  const initialPeriod =
    initialPeriodParam === "weekly" ||
    initialPeriodParam === "biweekly" ||
    initialPeriodParam === "monthly" ||
    initialPeriodParam === "custom"
      ? initialPeriodParam
      : "weekly";
  const initialFrom = isDateInputValue(searchParams.get("from"))
    ? (searchParams.get("from") as string)
    : formatDate(sevenDaysAgo);
  const initialTo = isDateInputValue(searchParams.get("to"))
    ? (searchParams.get("to") as string)
    : formatDate(today);
  const initialRoundParam = searchParams.get("round");
  const initialRound =
    initialRoundParam === "0" ||
    initialRoundParam === "5" ||
    initialRoundParam === "10" ||
    initialRoundParam === "15" ||
    initialRoundParam === "20" ||
    initialRoundParam === "30"
      ? initialRoundParam
      : "0";
  const initialEmployeeId = searchParams.get("employeeId") || "";

  const [period, setPeriod] = useState(initialPeriod);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [round, setRound] = useState(initialRound);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState(initialEmployeeId);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const tzOffset = useMemo(() => -new Date().getTimezoneOffset(), []);

  const reportReturnTo = useMemo(() => {
    const params = new URLSearchParams({
      period: "custom",
      from,
      to,
      round,
    });
    if (employeeId) {
      params.set("employeeId", employeeId);
    }
    return `/reports/daily?${params.toString()}`;
  }, [employeeId, from, to, round]);

  const buildEditTimesHref = (
    targetEmployeeId: string,
    targetFrom: string,
    targetTo: string,
  ) =>
    `/admin/time?${new URLSearchParams({
      employeeId: targetEmployeeId,
      from: targetFrom,
      to: targetTo,
      returnTo: reportReturnTo,
    }).toString()}`;

  const buildExportHref = (format: "excel" | "pdf") =>
    `/api/reports/daily/export?${new URLSearchParams({
      from,
      to,
      round,
      format,
      tzOffset: String(tzOffset),
      ...(employeeId ? { employeeId } : {}),
    }).toString()}`;

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

      const response = await fetchDailyReportRequest(params);
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
              href={buildExportHref("excel")}
            >
              {t.exportExcel}
            </a>
            <a
              className="btn btn-outline-secondary"
              href={buildExportHref("pdf")}
            >
              {t.downloadPdf}
            </a>
          </div>
        </div>
      </div>

      {report && report.employees.length === 0 && (
        <div className="admin-card">
          <p className="mb-0">{t.noPunches}</p>
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
                  </div>
                  <a
                    className="report-edit-btn"
                    href={buildEditTimesHref(
                      employee.id,
                      report.range.from,
                      report.range.to,
                    )}
                  >
                    {t.editTimes}
                    <i
                      className="fa-solid fa-chevron-right"
                      aria-hidden="true"
                    />
                  </a>
                </div>
              </div>
              <div className="table-responsive">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>{t.date}</th>
                      <th>{t.firstIn}</th>
                      <th>{t.lastOut}</th>
                      <th>{t.total}</th>
                      <th>{t.decimal}</th>
                      <th>{t.photos}</th>
                      <th>{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employee.days.map((day) => {
                      const needsReview =
                        day.hoursFormatted === "0:00" &&
                        (day.firstIn || day.lastOut);
                      const overScheduleMinutes = Math.max(
                        0,
                        day.overScheduleMinutes || 0,
                      );
                      const spanMinutes =
                        day.firstIn && day.lastOut
                          ? Math.max(
                              0,
                              (new Date(day.lastOut).getTime() -
                                new Date(day.firstIn).getTime()) /
                                60000,
                            )
                          : 0;
                      return (
                        <tr key={day.date}>
                          <td>{day.date}</td>
                          <td>
                            {day.firstIn
                              ? new Date(day.firstIn).toLocaleTimeString([], {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </td>
                          <td>
                            {day.lastOut
                              ? new Date(day.lastOut).toLocaleTimeString([], {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </td>
                          <td>
                            {day.hoursFormatted}
                            {needsReview && (
                              <span className="report-flag">
                                {t.needsReview}
                              </span>
                            )}
                            {overScheduleMinutes > 0 && (
                              <span className="report-flag">
                                {t.overSchedule} +
                                {formatSpan(overScheduleMinutes)}
                              </span>
                            )}
                            {typeof day.scheduledPaidMinutes === "number" &&
                              day.scheduledPaidMinutes > 0 && (
                                <span className="report-span">
                                  {t.scheduled}{" "}
                                  {formatSpan(day.scheduledPaidMinutes)}
                                </span>
                              )}
                            {needsReview && spanMinutes > 0 && (
                              <span className="report-span">
                                {t.span} {formatSpan(spanMinutes)}
                              </span>
                            )}
                          </td>
                          <td>{day.hoursDecimal.toFixed(2)}</td>
                          <td>
                            <PunchPhotoLinks
                              punches={day.photoPunches}
                              lang={lang}
                            />
                          </td>
                          <td>
                            <a
                              className={`btn btn-sm ${
                                needsReview || overScheduleMinutes > 0
                                  ? "btn-outline-warning"
                                  : "btn-outline-secondary"
                              }`}
                              href={buildEditTimesHref(
                                employee.id,
                                day.date,
                                day.date,
                              )}
                            >
                              {t.editTimes}
                            </a>
                          </td>
                        </tr>
                      );
                    })}
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
