import Link from "next/link";
import type { AdminSummary } from "../../lib/api/admin-dashboard";

export function DashboardSummaryGrid({
  tr,
  summary,
}: {
  tr: (en: string, es: string) => string;
  summary: AdminSummary;
}) {
  return (
    <div className="summary-grid">
      <Link
        className="summary-card summary-card--light summary-card-link"
        href="/admin/users"
      >
        <div className="summary-header">{tr("Total Users", "Usuarios Totales")}</div>
        <div className="summary-value">{summary.total}</div>
        <div className="summary-sub">{tr("Active Users", "Usuarios Activos")}</div>
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
  );
}

