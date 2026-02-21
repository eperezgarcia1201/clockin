"use client";

import { useEffect, useMemo, useState } from "react";
import { useUiLanguage } from "../../../lib/ui-language";

type Lang = "en" | "es";
type Employee = { id: string; name: string };

type DayTip = {
  date: string;
  cashTips: number;
  creditCardTips: number;
  totalTips: number;
};

type EmployeeTipReport = {
  id: string;
  name: string;
  totalCashTips: number;
  totalCreditCardTips: number;
  totalTips: number;
  days: DayTip[];
};

type TipsReportResponse = {
  range: { from: string; to: string };
  employees: EmployeeTipReport[];
};

const copy: Record<Lang, Record<string, string>> = {
  en: {
    title: "Tips Report",
    period: "Period",
    weekly: "Weekly",
    biweekly: "Bi-Weekly",
    monthly: "Monthly",
    custom: "Custom",
    from: "From",
    to: "To",
    employee: "Employee",
    allServers: "All Servers",
    runReport: "Run Report",
    running: "Running...",
    downloadPdf: "Download PDF",
    noData: "No tip records found for this date range.",
    totalTips: "Total Tips",
    cash: "Cash",
    creditCard: "Credit Card",
    date: "Date",
    allGood: "Unable to load tips report",
  },
  es: {
    title: "Reporte de Propinas",
    period: "Período",
    weekly: "Semanal",
    biweekly: "Quincenal",
    monthly: "Mensual",
    custom: "Personalizado",
    from: "Desde",
    to: "Hasta",
    employee: "Empleado",
    allServers: "Todos los Meseros",
    runReport: "Ejecutar Reporte",
    running: "Procesando...",
    downloadPdf: "Descargar PDF",
    noData: "No se encontraron propinas para este rango.",
    totalTips: "Total de Propinas",
    cash: "Efectivo",
    creditCard: "Tarjeta",
    date: "Fecha",
    allGood: "No se pudo cargar el reporte de propinas",
  },
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const formatMoney = (value: number, lang: Lang) =>
  new Intl.NumberFormat(lang === "es" ? "es-US" : "en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

export default function TipsReportPage() {
  const lang = useUiLanguage();
  const t = useMemo(() => copy[lang] ?? copy.en, [lang]);

  const today = useMemo(() => new Date(), []);
  const sevenDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return date;
  }, []);

  const [period, setPeriod] = useState("weekly");
  const [from, setFrom] = useState(formatDate(sevenDaysAgo));
  const [to, setTo] = useState(formatDate(today));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [report, setReport] = useState<TipsReportResponse | null>(null);
  const [loading, setLoading] = useState(false);

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

    void loadEmployees();
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
      if (employeeId) {
        params.set("employeeId", employeeId);
      }

      const response = await fetch(`/api/reports/tips?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(t.allGood);
      }
      const data = (await response.json()) as TipsReportResponse;
      setReport(data);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runReport();
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
              <option value="">{t.allServers}</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 d-flex gap-2 flex-wrap">
            <button className="btn btn-primary" onClick={() => void runReport()}>
              {loading ? t.running : t.runReport}
            </button>
            <a
              className="btn btn-outline-secondary"
              href={`/api/reports/tips/export?${new URLSearchParams({
                from,
                to,
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
          <p className="mb-0">{t.noData}</p>
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
                    <div className="report-total-label">{t.totalTips}</div>
                    <div className="report-total-value">
                      {formatMoney(employee.totalTips, lang)}
                      <span className="report-total-decimal">
                        {t.creditCard} {formatMoney(employee.totalCreditCardTips, lang)} / {t.cash}{" "}
                        {formatMoney(employee.totalCashTips, lang)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="table-responsive">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>{t.date}</th>
                      <th>{t.cash}</th>
                      <th>{t.creditCard}</th>
                      <th>{t.totalTips}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employee.days.map((day) => (
                      <tr key={`${employee.id}-${day.date}`}>
                        <td>{day.date}</td>
                        <td>{formatMoney(day.cashTips, lang)}</td>
                        <td>{formatMoney(day.creditCardTips, lang)}</td>
                        <td>{formatMoney(day.totalTips, lang)}</td>
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
