"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthActions } from "./auth-actions";

type Variant = "admin" | "reports";
type Lang = "en" | "es";
type Theme = "light" | "dark";

const translations: Record<Lang, Record<string, string>> = {
  en: {
    dashboard: "Dashboard",
    users: "Users",
    offices: "Offices",
    reports: "Reports",
    admin: "Admin",
    userSummary: "User Summary",
    createUser: "Create New User",
    userSearch: "User Search",
    officeSummary: "Office Summary",
    createOffice: "Create New Office",
    groupSummary: "Group Summary",
    createGroup: "Create New Group",
    groupsTitle: "Groups",
    statusTitle: "In/Out Status",
    miscTitle: "Misc",
    statusSummary: "Status Summary",
    createStatus: "Create Status",
    manageSchedules: "Manage Schedules",
    timeEdits: "Edit Time",
    systemSettings: "System Settings",
    databaseTools: "Database Tools",
    runReports: "Run Reports",
    reportMenu: "Report Menu",
    dailyReports: "Daily Reports",
    hoursReports: "Hours Reports",
    payrollReports: "Payroll Summary",
    auditReports: "Audit Reports",
    notifications: "Notifications",
    backToAdmin: "Back to Admin",
    language: "Language",
    theme: "Theme",
    logout: "Logout",
    light: "Light",
    dark: "Dark",
  },
  es: {
    dashboard: "Tablero",
    users: "Usuarios",
    offices: "Oficinas",
    reports: "Reportes",
    admin: "Admin",
    userSummary: "Resumen de Usuarios",
    createUser: "Crear Usuario",
    userSearch: "Buscar Usuario",
    officeSummary: "Resumen de Oficinas",
    createOffice: "Crear Oficina",
    groupSummary: "Resumen de Grupos",
    createGroup: "Crear Grupo",
    groupsTitle: "Grupos",
    statusTitle: "Estado Entrada/Salida",
    miscTitle: "Misceláneo",
    statusSummary: "Resumen de Estado",
    createStatus: "Crear Estado",
    manageSchedules: "Gestionar Horarios",
    timeEdits: "Editar Tiempo",
    systemSettings: "Configuración",
    databaseTools: "Herramientas DB",
    runReports: "Ejecutar Reportes",
    reportMenu: "Menú de Reportes",
    dailyReports: "Reportes Diarios",
    hoursReports: "Reporte de Horas",
    payrollReports: "Resumen de Nómina",
    auditReports: "Reporte de Auditoría",
    notifications: "Notificaciones",
    backToAdmin: "Volver a Admin",
    language: "Idioma",
    theme: "Tema",
    logout: "Salir",
    light: "Claro",
    dark: "Oscuro",
  },
};

const getStorage = (key: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(key) || fallback;
};

export function AdminShell({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: Variant;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [lang, setLang] = useState<Lang>("en");
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setLang(getStorage("clockin-lang", "en") as Lang);
    setTheme(getStorage("clockin-theme", "light") as Theme);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = theme;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("clockin-theme", theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("clockin-lang", lang);
    }
  }, [lang]);

  const t = useMemo(() => translations[lang] ?? translations.en, [lang]);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin-login");
  };

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-branding">
          <div className="admin-logo">W</div>
          <div className="admin-brand-text">
            <div className="admin-brand-name">Websys</div>
            <div className="admin-brand-sub">Clockin Admin</div>
          </div>
        </div>
        <nav className="admin-topnav">
          <Link
            className={`topnav-link ${
              pathname === "/admin" ? "is-active" : ""
            }`}
            href="/admin"
          >
            <i className="fa-solid fa-grid-2" aria-hidden="true" />
            {t.dashboard}
          </Link>
          <Link
            className={`topnav-link ${
              pathname?.startsWith("/admin/users") ? "is-active" : ""
            }`}
            href="/admin/users"
          >
            <i className="fa-solid fa-user" aria-hidden="true" />
            {t.users}
          </Link>
          <Link
            className={`topnav-link ${
              pathname?.startsWith("/admin/offices") ? "is-active" : ""
            }`}
            href="/admin/offices"
          >
            <i className="fa-solid fa-building" aria-hidden="true" />
            {t.offices}
          </Link>
          <Link
            className={`topnav-link ${
              pathname?.startsWith("/admin/schedules") ? "is-active" : ""
            }`}
            href="/admin/schedules"
          >
            <i className="fa-solid fa-calendar-days" aria-hidden="true" />
            {t.manageSchedules}
          </Link>
          <Link
            className={`topnav-link ${
              pathname?.startsWith("/reports") ? "is-active" : ""
            }`}
            href="/reports"
          >
            <i className="fa-solid fa-chart-column" aria-hidden="true" />
            {t.reports}
          </Link>
          <Link
            className={`topnav-link ${
              pathname?.startsWith("/admin/notifications") ? "is-active" : ""
            }`}
            href="/admin/notifications"
          >
            <i className="fa-solid fa-bell" aria-hidden="true" />
            {t.notifications}
          </Link>
          <Link
            className={`topnav-link ${
              pathname === "/admin" ? "is-active" : ""
            }`}
            href="/admin"
          >
            <i className="fa-solid fa-user-shield" aria-hidden="true" />
            {t.admin}
          </Link>
        </nav>
        <div className="admin-top-actions">
          <div className="admin-controls">
            <label className="admin-control">
              <span>{t.language}</span>
              <select
                className="admin-select"
                value={lang}
                onChange={(event) => setLang(event.target.value as Lang)}
              >
                <option value="en">EN</option>
                <option value="es">ES</option>
              </select>
            </label>
            <label className="admin-control">
              <span>{t.theme}</span>
              <button
                type="button"
                className="admin-toggle"
                onClick={() =>
                  setTheme((prev) => (prev === "dark" ? "light" : "dark"))
                }
              >
                <i
                  className={`fa-solid ${
                    theme === "dark" ? "fa-moon" : "fa-sun"
                  }`}
                  aria-hidden="true"
                />
                {theme === "dark" ? t.dark : t.light}
              </button>
            </label>
            <button
              type="button"
              className="admin-logout"
              onClick={handleLogout}
            >
              <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
              {t.logout}
            </button>
          </div>
          <AuthActions />
        </div>
      </header>

      <div className="admin-body">
        <aside className="admin-nav">
          {variant === "admin" ? (
            <>
              <div className="admin-section">
                <div className="admin-section-title">{t.users}</div>
                <Link className="admin-link" href="/admin/users">
                  <i className="fa-solid fa-id-card" aria-hidden="true" />
                  {t.userSummary}
                </Link>
                <Link className="admin-link" href="/admin/users/new">
                  <i className="fa-solid fa-user-plus" aria-hidden="true" />
                  {t.createUser}
                </Link>
                <Link className="admin-link" href="/admin/users/search">
                  <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                  {t.userSearch}
                </Link>
              </div>
              <div className="admin-section">
                <div className="admin-section-title">{t.offices}</div>
                <Link className="admin-link" href="/admin/offices">
                  <i className="fa-solid fa-city" aria-hidden="true" />
                  {t.officeSummary}
                </Link>
                <Link className="admin-link" href="/admin/offices/new">
                  <i className="fa-solid fa-plus" aria-hidden="true" />
                  {t.createOffice}
                </Link>
              </div>
              <div className="admin-section">
                <div className="admin-section-title">{t.groupsTitle}</div>
                <Link className="admin-link" href="/admin/groups">
                  <i className="fa-solid fa-users" aria-hidden="true" />
                  {t.groupSummary}
                </Link>
                <Link className="admin-link" href="/admin/groups/new">
                  <i className="fa-solid fa-user-group" aria-hidden="true" />
                  {t.createGroup}
                </Link>
              </div>
              <div className="admin-section">
                <div className="admin-section-title">{t.statusTitle}</div>
                <Link className="admin-link" href="/admin/status">
                  <i className="fa-solid fa-right-left" aria-hidden="true" />
                  {t.statusSummary}
                </Link>
                <Link className="admin-link" href="/admin/status/new">
                  <i className="fa-solid fa-plus" aria-hidden="true" />
                  {t.createStatus}
                </Link>
              </div>
              <div className="admin-section">
                <div className="admin-section-title">{t.miscTitle}</div>
                <Link className="admin-link" href="/admin/schedules">
                  <i className="fa-solid fa-clock" aria-hidden="true" />
                  {t.manageSchedules}
                </Link>
                <Link className="admin-link" href="/admin/time">
                  <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                  {t.timeEdits}
                </Link>
                <Link className="admin-link" href="/admin/notifications">
                  <i className="fa-solid fa-bell" aria-hidden="true" />
                  {t.notifications}
                </Link>
                <Link className="admin-link" href="/admin/settings">
                  <i className="fa-solid fa-sliders" aria-hidden="true" />
                  {t.systemSettings}
                </Link>
                <Link className="admin-link" href="/admin/dbupgrade">
                  <i className="fa-solid fa-database" aria-hidden="true" />
                  {t.databaseTools}
                </Link>
              </div>
              <div className="admin-section">
                <div className="admin-section-title">{t.reports}</div>
                <Link className="admin-link" href="/reports">
                  <i className="fa-solid fa-file-lines" aria-hidden="true" />
                  {t.runReports}
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="admin-section">
                <div className="admin-section-title">{t.reports}</div>
                <Link className="admin-link" href="/reports">
                  <i className="fa-solid fa-clipboard-list" aria-hidden="true" />
                  {t.reportMenu}
                </Link>
                <Link className="admin-link" href="/reports/daily">
                  <i className="fa-solid fa-calendar-day" aria-hidden="true" />
                  {t.dailyReports}
                </Link>
                <Link className="admin-link" href="/reports/hours">
                  <i className="fa-solid fa-stopwatch" aria-hidden="true" />
                  {t.hoursReports}
                </Link>
                <Link className="admin-link" href="/reports/payroll">
                  <i className="fa-solid fa-money-check-dollar" aria-hidden="true" />
                  {t.payrollReports}
                </Link>
                <Link className="admin-link" href="/reports/audit">
                  <i className="fa-solid fa-shield" aria-hidden="true" />
                  {t.auditReports}
                </Link>
              </div>
              <div className="admin-section">
                <div className="admin-section-title">{t.admin}</div>
                <Link className="admin-link" href="/admin/users">
                  <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                  {t.backToAdmin}
                </Link>
              </div>
            </>
          )}
        </aside>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
