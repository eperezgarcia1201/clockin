"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useUiLanguage } from "../../lib/ui-language";
import {
  getEmployeeSummary,
  getHoursReport,
  type AdminSummary as Summary,
  type HoursReport,
} from "../../lib/api/admin-dashboard";

export default function AdminDashboard() {
  const lang = useUiLanguage();
  const tr = (en: string, es: string) => (lang === "es" ? es : en);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    admins: 0,
    timeAdmins: 0,
    reports: 0,
  });
  const [hoursReport, setHoursReport] = useState<HoursReport | null>(null);

  const chartRows = useMemo(() => {
    const rows =
      hoursReport?.employees.map((employee) => ({
        id: employee.id,
        name: employee.name,
        hours: employee.totalHoursDecimal,
        hoursFormatted: employee.totalHoursFormatted,
      })) || [];
    return rows.sort((a, b) => b.hours - a.hours).slice(0, 8);
  }, [hoursReport]);

  const maxHours = useMemo(() => {
    const values = chartRows.map((row) => row.hours);
    return Math.max(1, ...values);
  }, [chartRows]);

  const totalHours = useMemo(
    () =>
      (hoursReport?.employees || []).reduce(
        (sum, employee) => sum + (employee.totalHoursDecimal || 0),
        0,
      ),
    [hoursReport],
  );

  const averageHours = useMemo(() => {
    const count = hoursReport?.employees?.length || 0;
    return count > 0 ? totalHours / count : 0;
  }, [hoursReport, totalHours]);

  const topPerformer = useMemo(() => chartRows[0] || null, [chartRows]);

  const overFortyCount = useMemo(
    () =>
      (hoursReport?.employees || []).filter(
        (employee) => employee.totalHoursDecimal >= 40,
      ).length,
    [hoursReport],
  );

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getEmployeeSummary();
        setSummary(data);
      } catch {
        // ignore
      }
    };

    void load();
  }, []);

  useEffect(() => {
    const loadHours = async () => {
      const now = new Date();
      const to = now.toISOString().slice(0, 10);
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      const from = start.toISOString().slice(0, 10);

      try {
        const data = await getHoursReport({
          from,
          to,
          round: 0,
          tzOffset: -new Date().getTimezoneOffset(),
        });
        setHoursReport(data);
      } catch {
        // ignore
      }
    };

    void loadHours();
  }, []);

  return (
    <div className="admin-dashboard">
      <div className="admin-page-title">
        <span className="admin-page-icon">
          <Image
            src="/websys-mark.png"
            alt="Websys logo"
            width={40}
            height={40}
            className="admin-page-icon-image"
            priority
          />
        </span>
        {tr("Administration", "Administración")}
      </div>

      <div className="admin-hero">
        <div className="admin-hero-brand">
          <div className="admin-hero-logo">
            <Image
              src="/websys-mark.png"
              alt="Websys logo"
              width={56}
              height={56}
              className="admin-hero-logo-image"
              priority
            />
          </div>
          <div>
            <div className="admin-hero-name">Websys</div>
            <div className="admin-hero-sub">
              {tr("ClockIn Admin", "ClockIn Admin")}
            </div>
          </div>
        </div>
      </div>

      <div className="summary-grid">
        <Link
          className="summary-card summary-card--light summary-card-link"
          href="/admin/users"
        >
          <div className="summary-header">
            {tr("Total Users", "Usuarios Totales")}
          </div>
          <div className="summary-value">{summary.total}</div>
          <div className="summary-sub">
            {tr("Active Users", "Usuarios Activos")}
          </div>
          <div className="summary-list">
            <div className="summary-item">
              <i className="fa-solid fa-check" aria-hidden="true" />
              {tr("Active Users", "Usuarios Activos")}
            </div>
            <div className="summary-item">
              <i className="fa-solid fa-check" aria-hidden="true" />
              {tr("System Administrators", "Administradores del Sistema")}
            </div>
          </div>
          <div className="summary-meta">
            <span>{tr("500 Customers", "500 Clientes")}</span>
            <span>{tr("5 collectors", "5 colectores")}</span>
          </div>
        </Link>

        <Link
          className="summary-card summary-card--navy summary-card-link"
          href="/admin/users?role=admin"
        >
          <div className="summary-header">
            {tr("Sys Admin Users", "Usuarios Sys Admin")}
          </div>
          <div className="summary-value">{summary.admins}</div>
          <div className="summary-sub">
            {tr("System Administrators", "Administradores del Sistema")}
          </div>
          <div className="summary-list">
            <div className="summary-item">
              <i className="fa-solid fa-check" aria-hidden="true" />
              {tr("Sys Admin Users", "Usuarios Sys Admin")}
            </div>
            <div className="summary-item">
              <i className="fa-solid fa-check" aria-hidden="true" />
              {tr("System Administrators", "Administradores del Sistema")}
            </div>
            <div className="summary-item">
              <i className="fa-solid fa-check" aria-hidden="true" />
              {tr("Unlimited customers", "Clientes ilimitados")}
            </div>
            <div className="summary-item">
              <i className="fa-solid fa-check" aria-hidden="true" />
              {tr("Unlimited collectors", "Colectores ilimitados")}
            </div>
          </div>
        </Link>

        <Link
          className="summary-card summary-card--purple summary-card-link"
          href="/admin/users?role=time"
        >
          <div className="summary-header">
            {tr("Time Admin Users", "Usuarios Time Admin")}
          </div>
          <div className="summary-value">{summary.timeAdmins}</div>
          <div className="summary-sub">
            {tr("Time Administrators", "Administradores de Tiempo")}
          </div>
          <div className="summary-list">
            <div className="summary-item">
              <i className="fa-solid fa-check" aria-hidden="true" />
              {tr("Sys Admin Users", "Usuarios Sys Admin")}
            </div>
            <div className="summary-item">
              <i className="fa-solid fa-check" aria-hidden="true" />
              {tr("Time Admin Users", "Usuarios Time Admin")}
            </div>
            <div className="summary-item">
              <i className="fa-solid fa-check" aria-hidden="true" />
              {tr("Unlimited collectors", "Colectores ilimitados")}
            </div>
          </div>
        </Link>

        <Link
          className="summary-card summary-card--teal summary-card-link"
          href="/admin/users?role=reports"
        >
          <div className="summary-header">
            {tr("Reports Users", "Usuarios de Reportes")}
          </div>
          <div className="summary-value">{summary.reports}</div>
          <div className="summary-sub">
            {tr("Report Administrators", "Administradores de Reportes")}
          </div>
          <div className="summary-list">
            <div className="summary-item">
              <i className="fa-solid fa-check" aria-hidden="true" />
              {tr("Report Administrators", "Administradores de Reportes")}
            </div>
          </div>
        </Link>
      </div>

      <div className="admin-card chart-card">
        <div className="chart-header">
          <div>
            <h2>{tr("Hours Worked", "Horas Trabajadas")}</h2>
            <p>
              {tr(
                "Last 7 days of total hours per employee.",
                "Últimos 7 días de horas totales por empleado.",
              )}
            </p>
          </div>
          <a className="btn btn-outline-secondary btn-sm" href="/reports/hours">
            {tr("View Report", "Ver Reporte")}
          </a>
        </div>
        {chartRows.length === 0 ? (
          <div className="chart-empty">
            {tr("No hours recorded yet.", "Aún no hay horas registradas.")}
          </div>
        ) : (
          <div className="chart-bars">
            {chartRows.map((row) => (
              <div key={row.id} className="chart-row">
                <div className="chart-label">{row.name}</div>
                <div className="chart-bar-track">
                  <div
                    className="chart-bar"
                    style={{ width: `${(row.hours / maxHours) * 100}%` }}
                  />
                </div>
                <div className="chart-value">{row.hoursFormatted}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="admin-card insights-card">
        <div className="chart-header">
          <div>
            <h2>{tr("Hours Insights", "Resumen de Horas")}</h2>
            <p>
              {tr(
                "Quick performance snapshot for the current range.",
                "Resumen rápido de rendimiento para el rango actual.",
              )}
            </p>
          </div>
        </div>
        <div className="insights-grid">
          <div className="insight-tile">
            <span>{tr("Total Hours", "Horas Totales")}</span>
            <strong>{totalHours.toFixed(2)}</strong>
            <em>{tr("Last 7 days", "Últimos 7 días")}</em>
          </div>
          <div className="insight-tile">
            <span>{tr("Average Hours", "Horas Promedio")}</span>
            <strong>{averageHours.toFixed(2)}</strong>
            <em>{tr("Per employee", "Por empleado")}</em>
          </div>
          <div className="insight-tile">
            <span>{tr("Top Performer", "Mejor Rendimiento")}</span>
            <strong>{topPerformer?.name || tr("N/A", "N/D")}</strong>
            <em>
              {topPerformer
                ? topPerformer.hoursFormatted
                : tr("No data", "Sin datos")}
            </em>
          </div>
          <div className="insight-tile">
            <span>{tr("40+ Hours", "40+ Horas")}</span>
            <strong>{overFortyCount}</strong>
            <em>{tr("Potential overtime", "Posible tiempo extra")}</em>
          </div>
        </div>
        {chartRows.length > 0 && (
          <div className="insight-rings">
            {chartRows.map((row) => {
              const percent = Math.max(
                0,
                Math.min(100, Math.round((row.hours / maxHours) * 100)),
              );
              return (
                <div key={`ring-${row.id}`} className="insight-ring-card">
                  <div
                    className="insight-ring"
                    style={
                      {
                        "--ring-fill": `${percent * 3.6}deg`,
                      } as CSSProperties
                    }
                  >
                    <span>{percent}%</span>
                  </div>
                  <div className="insight-ring-name">{row.name}</div>
                  <div className="insight-ring-hours">{row.hoursFormatted}</div>
                </div>
              );
            })}
          </div>
        )}
        {chartRows.length === 0 && (
          <div className="chart-empty">
            {tr(
              "No employee hour data yet.",
              "Aún no hay datos de horas por empleado.",
            )}
          </div>
        )}
      </div>
    </div>
  );
}
