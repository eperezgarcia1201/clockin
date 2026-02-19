"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthActions } from "./auth-actions";

type Variant = "admin" | "reports";
type Lang = "en" | "es";
type Theme = "light" | "dark";
type Office = { id: string; name: string };
type AccessPermissions = {
  dashboard: boolean;
  users: boolean;
  locations: boolean;
  manageMultiLocation: boolean;
  groups: boolean;
  statuses: boolean;
  schedules: boolean;
  companyOrders: boolean;
  reports: boolean;
  tips: boolean;
  salesCapture: boolean;
  notifications: boolean;
  settings: boolean;
  timeEdits: boolean;
};

const translations: Record<Lang, Record<string, string>> = {
  en: {
    dashboard: "Dashboard",
    users: "Users",
    offices: "Locations",
    reports: "Reports",
    admin: "Admin",
    userSummary: "User Summary",
    createUser: "Create New User",
    userSearch: "User Search",
    officeSummary: "Location Summary",
    createOffice: "Create New Location",
    groupSummary: "Group Summary",
    createGroup: "Create New Group",
    groupsTitle: "Groups",
    statusTitle: "In/Out Status",
    miscTitle: "Misc",
    statusSummary: "Status Summary",
    createStatus: "Create Status",
    manageSchedules: "Manage Schedules",
    companyOrders: "Company Orders",
    companyOrdersCatalog: "Order Catalog",
    timeEdits: "Edit Time",
    systemSettings: "System Settings",
    companyInfo: "Company Info",
    companyOrderArchive: "Company Orders",
    databaseTools: "Database Tools",
    runReports: "Run Reports",
    reportMenu: "Report Menu",
    dailyReports: "Daily Reports",
    hoursReports: "Hours Reports",
    payrollReports: "Payroll Summary",
    auditReports: "Audit Reports",
    tipsReports: "Tips Reports",
    salesReports: "Sales Reports",
    dailySales: "Daily Sales",
    expensesReport: "Expenses",
    notifications: "Notifications",
    backToAdmin: "Back to Admin",
    locationScope: "Location",
    allLocations: "All Locations",
    parentScope: "Parent",
    language: "Language",
    theme: "Theme",
    logout: "Logout",
    light: "Light",
    dark: "Dark",
  },
  es: {
    dashboard: "Tablero",
    users: "Usuarios",
    offices: "Ubicaciones",
    reports: "Reportes",
    admin: "Admin",
    userSummary: "Resumen de Usuarios",
    createUser: "Crear Usuario",
    userSearch: "Buscar Usuario",
    officeSummary: "Resumen de Ubicaciones",
    createOffice: "Crear Ubicación",
    groupSummary: "Resumen de Grupos",
    createGroup: "Crear Grupo",
    groupsTitle: "Grupos",
    statusTitle: "Estado Entrada/Salida",
    miscTitle: "Misceláneo",
    statusSummary: "Resumen de Estado",
    createStatus: "Crear Estado",
    manageSchedules: "Gestionar Horarios",
    companyOrders: "Ordenes de Empresa",
    companyOrdersCatalog: "Catalogo de Ordenes",
    timeEdits: "Editar Tiempo",
    systemSettings: "Configuración",
    companyInfo: "Información Empresa",
    companyOrderArchive: "Ordenes Empresa",
    databaseTools: "Herramientas DB",
    runReports: "Ejecutar Reportes",
    reportMenu: "Menú de Reportes",
    dailyReports: "Reportes Diarios",
    hoursReports: "Reporte de Horas",
    payrollReports: "Resumen de Nómina",
    auditReports: "Reporte de Auditoría",
    tipsReports: "Reporte de Propinas",
    salesReports: "Reporte de Ventas",
    dailySales: "Ventas Diarias",
    expensesReport: "Gastos",
    notifications: "Notificaciones",
    backToAdmin: "Volver a Admin",
    locationScope: "Ubicacion",
    allLocations: "Todas las ubicaciones",
    parentScope: "Principal",
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

const ACTIVE_LOCATION_STORAGE_KEY = "clockin_active_location_id";
const ACTIVE_LOCATION_ALL_STORAGE_KEY = "clockin_active_location_all";
const ACTIVE_LOCATION_COOKIE_KEY = "clockin_active_location_id";

const readCookieValue = (key: string) => {
  if (typeof document === "undefined") return "";
  const keyPrefix = `${key}=`;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(keyPrefix));
  if (!cookie) return "";

  const rawValue = cookie.slice(keyPrefix.length).trim();
  if (!rawValue) return "";
  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
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
  const [hydrated, setHydrated] = useState(false);
  const [accessLoaded, setAccessLoaded] = useState(false);
  const [multiLocationEnabled, setMultiLocationEnabled] = useState(false);
  const [offices, setOffices] = useState<Office[]>([]);
  const [officesLoaded, setOfficesLoaded] = useState(false);
  const [officesLoadSucceeded, setOfficesLoadSucceeded] = useState(false);
  const [activeLocationId, setActiveLocationId] = useState("");
  const [locationScopeInitialized, setLocationScopeInitialized] =
    useState(false);
  const [permissions, setPermissions] = useState<AccessPermissions>({
    dashboard: true,
    users: true,
    locations: true,
    manageMultiLocation: false,
    groups: true,
    statuses: true,
    schedules: true,
    companyOrders: true,
    reports: true,
    tips: true,
    salesCapture: true,
    notifications: true,
    settings: true,
    timeEdits: true,
  });

  useEffect(() => {
    setLang(getStorage("clockin-lang", "en") as Lang);
    setTheme(getStorage("clockin-theme", "light") as Theme);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = theme;
    }
    if (hydrated && typeof window !== "undefined") {
      localStorage.setItem("clockin-theme", theme);
    }
  }, [hydrated, theme]);

  useEffect(() => {
    if (hydrated && typeof window !== "undefined") {
      localStorage.setItem("clockin-lang", lang);
      window.dispatchEvent(new Event("clockin-lang-change"));
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [hydrated, lang]);

  useEffect(() => {
    const loadAccess = async () => {
      try {
        const response = await fetch("/api/access/me", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as {
          multiLocationEnabled?: boolean;
          permissions?: Partial<AccessPermissions>;
        };
        setMultiLocationEnabled(Boolean(data.multiLocationEnabled));
        if (data.permissions) {
          setPermissions((prev) => ({ ...prev, ...data.permissions }));
        }
      } catch {
        // keep defaults
      } finally {
        setAccessLoaded(true);
      }
    };
    void loadAccess();
  }, []);

  const t = useMemo(() => translations[lang] ?? translations.en, [lang]);
  const can = (feature: keyof AccessPermissions) => permissions[feature];
  const canManageMultiLocation =
    multiLocationEnabled && can("manageMultiLocation");
  const isCompanyOrdersCatalog =
    pathname?.startsWith("/admin/company-orders/catalog") || false;

  const handleLocationScopeChange = (nextLocationId: string) => {
    setActiveLocationId(nextLocationId);
    if (typeof window !== "undefined") {
      if (nextLocationId) {
        sessionStorage.setItem(ACTIVE_LOCATION_STORAGE_KEY, nextLocationId);
        sessionStorage.removeItem(ACTIVE_LOCATION_ALL_STORAGE_KEY);
      } else {
        sessionStorage.removeItem(ACTIVE_LOCATION_STORAGE_KEY);
        sessionStorage.setItem(ACTIVE_LOCATION_ALL_STORAGE_KEY, "1");
      }
    }
    if (typeof document !== "undefined") {
      if (nextLocationId) {
        document.cookie = `${ACTIVE_LOCATION_COOKIE_KEY}=${encodeURIComponent(nextLocationId)}; path=/`;
      } else {
        document.cookie = `${ACTIVE_LOCATION_COOKIE_KEY}=; path=/; max-age=0`;
      }
    }
    if (typeof window !== "undefined") {
      window.location.assign(pathname || "/admin");
    }
  };

  useEffect(() => {
    if (!accessLoaded) {
      return;
    }
    if (!canManageMultiLocation) {
      setOffices([]);
      setOfficesLoaded(false);
      setOfficesLoadSucceeded(false);
      setActiveLocationId("");
      setLocationScopeInitialized(false);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(ACTIVE_LOCATION_STORAGE_KEY);
        sessionStorage.removeItem(ACTIVE_LOCATION_ALL_STORAGE_KEY);
      }
      if (typeof document !== "undefined") {
        document.cookie = `${ACTIVE_LOCATION_COOKIE_KEY}=; path=/; max-age=0`;
      }
      return;
    }

    const loadOffices = async () => {
      setOfficesLoaded(false);
      setOfficesLoadSucceeded(false);
      try {
        const response = await fetch("/api/offices", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { offices?: Office[] };
        setOffices(data.offices || []);
        setOfficesLoadSucceeded(true);
      } catch {
        // ignore
      } finally {
        setOfficesLoaded(true);
      }
    };

    void loadOffices();
  }, [accessLoaded, canManageMultiLocation]);

  useEffect(() => {
    if (!canManageMultiLocation) return;
    if (!officesLoaded || !officesLoadSucceeded) return;
    if (offices.length === 0) {
      setActiveLocationId("");
      setLocationScopeInitialized(true);
      return;
    }

    const fromSession =
      typeof window !== "undefined"
        ? (sessionStorage.getItem(ACTIVE_LOCATION_STORAGE_KEY) || "").trim()
        : "";
    const fromCookie = readCookieValue(ACTIVE_LOCATION_COOKIE_KEY).trim();
    const persistedLocationId = fromSession || fromCookie;
    const explicitAllSelection =
      typeof window !== "undefined" &&
      sessionStorage.getItem(ACTIVE_LOCATION_ALL_STORAGE_KEY) === "1";

    if (explicitAllSelection) {
      setActiveLocationId("");
      setLocationScopeInitialized(true);
      return;
    }

    if (
      persistedLocationId &&
      offices.some((office) => office.id === persistedLocationId)
    ) {
      setActiveLocationId((prev) => {
        if (prev && offices.some((office) => office.id === prev)) {
          return prev;
        }
        return persistedLocationId;
      });
      setLocationScopeInitialized(true);
      return;
    }

    setActiveLocationId((prev) => {
      if (prev && offices.some((office) => office.id === prev)) {
        return prev;
      }
      return offices[0].id;
    });
    setLocationScopeInitialized(true);
  }, [canManageMultiLocation, offices, officesLoaded, officesLoadSucceeded]);

  useEffect(() => {
    if (!canManageMultiLocation) return;
    if (!locationScopeInitialized) return;
    if (typeof window !== "undefined") {
      if (activeLocationId) {
        sessionStorage.setItem(ACTIVE_LOCATION_STORAGE_KEY, activeLocationId);
      } else {
        sessionStorage.removeItem(ACTIVE_LOCATION_STORAGE_KEY);
      }
    }
    if (typeof document !== "undefined") {
      if (activeLocationId) {
        document.cookie = `${ACTIVE_LOCATION_COOKIE_KEY}=${encodeURIComponent(activeLocationId)}; path=/`;
      } else {
        document.cookie = `${ACTIVE_LOCATION_COOKIE_KEY}=; path=/; max-age=0`;
      }
    }
  }, [activeLocationId, canManageMultiLocation, locationScopeInitialized]);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(ACTIVE_LOCATION_STORAGE_KEY);
      sessionStorage.removeItem(ACTIVE_LOCATION_ALL_STORAGE_KEY);
    }
    if (typeof document !== "undefined") {
      document.cookie = `${ACTIVE_LOCATION_COOKIE_KEY}=; path=/; max-age=0`;
    }
    router.push("/admin-login");
  };

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-branding">
          <div className="admin-logo">
            <Image
              src="/websys-logo.png"
              alt="Websys logo"
              width={38}
              height={38}
              className="admin-logo-image"
              priority
            />
          </div>
          <div className="admin-brand-text">
            <div className="admin-brand-name">Websys</div>
            <div className="admin-brand-sub">Clockin Admin</div>
          </div>
        </div>
        <nav className="admin-topnav">
          {can("dashboard") && (
            <Link
              className={`topnav-link ${
                pathname === "/admin" ? "is-active" : ""
              }`}
              href="/admin"
            >
              <i className="fa-solid fa-grid-2" aria-hidden="true" />
              {t.dashboard}
            </Link>
          )}
          {can("users") && (
            <Link
              className={`topnav-link ${
                pathname?.startsWith("/admin/users") ? "is-active" : ""
              }`}
              href="/admin/users"
            >
              <i className="fa-solid fa-user" aria-hidden="true" />
              {t.users}
            </Link>
          )}
          {can("locations") && (
            <Link
              className={`topnav-link ${
                pathname?.startsWith("/admin/offices") ? "is-active" : ""
              }`}
              href="/admin/offices"
            >
              <i className="fa-solid fa-building" aria-hidden="true" />
              {t.offices}
            </Link>
          )}
          {can("schedules") && (
            <Link
              className={`topnav-link ${
                pathname?.startsWith("/admin/schedules") ? "is-active" : ""
              }`}
              href="/admin/schedules"
            >
              <i className="fa-solid fa-calendar-days" aria-hidden="true" />
              {t.manageSchedules}
            </Link>
          )}
          {can("companyOrders") && (
            <Link
              className={`topnav-link ${
                pathname?.startsWith("/admin/company-orders") &&
                !isCompanyOrdersCatalog
                  ? "is-active"
                  : ""
              }`}
              href="/admin/company-orders"
            >
              <i className="fa-solid fa-truck-ramp-box" aria-hidden="true" />
              {t.companyOrders}
            </Link>
          )}
          {can("reports") && (
            <Link
              className={`topnav-link ${
                pathname?.startsWith("/reports") ? "is-active" : ""
              }`}
              href="/reports"
            >
              <i className="fa-solid fa-chart-column" aria-hidden="true" />
              {t.reports}
            </Link>
          )}
          {can("salesCapture") && (
            <Link
              className={`topnav-link ${
                pathname?.startsWith("/reports/sales") ? "is-active" : ""
              }`}
              href="/reports/sales"
            >
              <i className="fa-solid fa-cash-register" aria-hidden="true" />
              {t.dailySales}
            </Link>
          )}
          {can("salesCapture") && (
            <Link className="topnav-link" href="/reports/sales#expenses-section">
              <i className="fa-solid fa-file-invoice-dollar" aria-hidden="true" />
              {t.expensesReport}
            </Link>
          )}
          {can("notifications") && (
            <Link
              className={`topnav-link ${
                pathname?.startsWith("/admin/notifications") ? "is-active" : ""
              }`}
              href="/admin/notifications"
            >
              <i className="fa-solid fa-bell" aria-hidden="true" />
              {t.notifications}
            </Link>
          )}
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
            {canManageMultiLocation && (
              <label className="admin-control admin-control-location">
                <span>{t.locationScope}</span>
                <select
                  className="admin-select admin-select-location"
                  value={activeLocationId}
                  onChange={(event) =>
                    handleLocationScopeChange(event.target.value)
                  }
                >
                  <option value="">{`${t.allLocations} (${t.parentScope})`}</option>
                  {offices.map((office) => (
                    <option key={office.id} value={office.id}>
                      {office.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
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
              <i
                className="fa-solid fa-right-from-bracket"
                aria-hidden="true"
              />
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
                {can("users") && (
                  <>
                    <Link className="admin-link" href="/admin/users">
                      <i className="fa-solid fa-id-card" aria-hidden="true" />
                      {t.userSummary}
                    </Link>
                    <Link className="admin-link" href="/admin/users/new">
                      <i className="fa-solid fa-user-plus" aria-hidden="true" />
                      {t.createUser}
                    </Link>
                    <Link className="admin-link" href="/admin/users/search">
                      <i
                        className="fa-solid fa-magnifying-glass"
                        aria-hidden="true"
                      />
                      {t.userSearch}
                    </Link>
                  </>
                )}
              </div>
              {can("locations") && (
                <div className="admin-section">
                  <div className="admin-section-title">{t.offices}</div>
                  <Link className="admin-link" href="/admin/offices">
                    <i className="fa-solid fa-city" aria-hidden="true" />
                    {t.officeSummary}
                  </Link>
                  {multiLocationEnabled && (
                    <Link className="admin-link" href="/admin/offices/new">
                      <i className="fa-solid fa-plus" aria-hidden="true" />
                      {t.createOffice}
                    </Link>
                  )}
                </div>
              )}
              {can("groups") && (
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
              )}
              {can("statuses") && (
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
              )}
              <div className="admin-section">
                <div className="admin-section-title">{t.miscTitle}</div>
                {can("schedules") && (
                  <Link className="admin-link" href="/admin/schedules">
                    <i className="fa-solid fa-clock" aria-hidden="true" />
                    {t.manageSchedules}
                  </Link>
                )}
                {can("companyOrders") && (
                  <>
                    <Link className="admin-link" href="/admin/company-orders">
                      <i
                        className="fa-solid fa-truck-ramp-box"
                        aria-hidden="true"
                      />
                      {t.companyOrders}
                    </Link>
                    <Link
                      className="admin-link"
                      href="/admin/company-orders/catalog"
                    >
                      <i className="fa-solid fa-list-check" aria-hidden="true" />
                      {t.companyOrdersCatalog}
                    </Link>
                  </>
                )}
                {can("notifications") && (
                  <Link className="admin-link" href="/admin/notifications">
                    <i className="fa-solid fa-bell" aria-hidden="true" />
                    {t.notifications}
                  </Link>
                )}
                {can("settings") && (
                  <>
                    <Link className="admin-link" href="/admin/settings">
                      <i className="fa-solid fa-sliders" aria-hidden="true" />
                      {t.systemSettings}
                    </Link>
                    <Link className="admin-link" href="/admin/company">
                      <i
                        className="fa-solid fa-building-user"
                        aria-hidden="true"
                      />
                      {t.companyInfo}
                    </Link>
                    <Link className="admin-link" href="/admin/dbupgrade">
                      <i className="fa-solid fa-database" aria-hidden="true" />
                      {t.databaseTools}
                    </Link>
                  </>
                )}
              </div>
              {(can("reports") || can("tips") || can("salesCapture")) && (
                <div className="admin-section">
                  <div className="admin-section-title">{t.reports}</div>
                  {can("reports") && (
                    <Link className="admin-link" href="/reports">
                      <i
                        className="fa-solid fa-file-lines"
                        aria-hidden="true"
                      />
                      {t.runReports}
                    </Link>
                  )}
                  {can("tips") && (
                    <Link className="admin-link" href="/reports/tips">
                      <i
                        className="fa-solid fa-hand-holding-dollar"
                        aria-hidden="true"
                      />
                      {t.tipsReports}
                    </Link>
                  )}
                  {can("salesCapture") && (
                    <Link className="admin-link" href="/reports/sales">
                      <i
                        className="fa-solid fa-cash-register"
                        aria-hidden="true"
                      />
                      {t.salesReports}
                    </Link>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="admin-section">
                <div className="admin-section-title">{t.reports}</div>
                <Link className="admin-link" href="/reports">
                  <i
                    className="fa-solid fa-clipboard-list"
                    aria-hidden="true"
                  />
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
                  <i
                    className="fa-solid fa-money-check-dollar"
                    aria-hidden="true"
                  />
                  {t.payrollReports}
                </Link>
                <Link className="admin-link" href="/reports/audit">
                  <i className="fa-solid fa-shield" aria-hidden="true" />
                  {t.auditReports}
                </Link>
                <Link className="admin-link" href="/reports/tips">
                  <i
                    className="fa-solid fa-hand-holding-dollar"
                    aria-hidden="true"
                  />
                  {t.tipsReports}
                </Link>
                <Link className="admin-link" href="/reports/sales">
                  <i className="fa-solid fa-cash-register" aria-hidden="true" />
                  {t.salesReports}
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
