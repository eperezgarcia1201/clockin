"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUiLanguage } from "../../lib/ui-language";

type TenantFeatures = {
  requirePin: boolean;
  reportsEnabled: boolean;
  allowManualTimeEdits: boolean;
  dailySalesReportingEnabled: boolean;
  companyOrdersEnabled: boolean;
  multiLocationEnabled: boolean;
  liquorInventoryEnabled: boolean;
  premiumFeaturesEnabled: boolean;
};

type TenantAccount = {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
  features: TenantFeatures;
  counts: {
    employees: number;
    memberships: number;
  };
  createdAt: string;
  updatedAt: string;
};

type TenantsResponse = {
  tenants?: TenantAccount[];
  error?: string;
};

const toPercent = (value: number, total: number) => {
  if (total <= 0) {
    return 0;
  }
  return Math.round((value / total) * 100);
};

const formatTimeAgo = (isoDate: string, lang: "en" | "es") => {
  const tr = (en: string, es: string) => (lang === "es" ? es : en);
  const timestamp = new Date(isoDate).getTime();
  if (!Number.isFinite(timestamp)) {
    return tr("unknown", "desconocido");
  }

  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return tr("just now", "ahora");
  if (minutes < 60) return lang === "es" ? `hace ${minutes}m` : `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return lang === "es" ? `hace ${hours}h` : `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return lang === "es" ? `hace ${days}d` : `${days}d ago`;

  return new Date(isoDate).toLocaleDateString();
};

export default function OwnerDashboardPage() {
  const lang = useUiLanguage();
  const tr = (en: string, es: string) => (lang === "es" ? es : en);
  const [tenants, setTenants] = useState<TenantAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadTenants = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/tenant-accounts", { cache: "no-store" });
        const data = (await response.json()) as TenantsResponse;
        if (!response.ok) {
          throw new Error(
            data.error ||
              tr(
                "Unable to load tenant accounts.",
                "No se pudieron cargar las cuentas de tenant.",
              ),
          );
        }

        if (mounted) {
          setTenants(data.tenants || []);
        }
      } catch (requestError) {
        if (mounted) {
          setTenants([]);
          setError(
            requestError instanceof Error
              ? requestError.message
              : tr(
                  "Unable to load tenant accounts.",
                  "No se pudieron cargar las cuentas de tenant.",
                ),
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadTenants();
    return () => {
      mounted = false;
    };
  }, []);

  const dashboard = useMemo(() => {
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter((tenant) => tenant.isActive).length;
    const inactiveTenants = totalTenants - activeTenants;
    const totalEmployees = tenants.reduce(
      (sum, tenant) => sum + tenant.counts.employees,
      0,
    );
    const avgEmployees =
      totalTenants > 0 ? Number((totalEmployees / totalTenants).toFixed(1)) : 0;
    const activeRate = toPercent(activeTenants, totalTenants);

    const featureUsage = [
      {
        key: "dailySalesReportingEnabled",
        label: tr("Daily Sales Reporting", "Reporte Diario de Ventas"),
        enabledCount: tenants.filter(
          (tenant) => tenant.features.dailySalesReportingEnabled,
        ).length,
      },
      {
        key: "companyOrdersEnabled",
        label: tr("Company Orders", "Ordenes de Compania"),
        enabledCount: tenants.filter(
          (tenant) => tenant.features.companyOrdersEnabled,
        ).length,
      },
      {
        key: "reportsEnabled",
        label: tr("Reports Suite", "Suite de Reportes"),
        enabledCount: tenants.filter((tenant) => tenant.features.reportsEnabled)
          .length,
      },
      {
        key: "requirePin",
        label: tr("Require PIN", "Requiere PIN"),
        enabledCount: tenants.filter((tenant) => tenant.features.requirePin).length,
      },
      {
        key: "allowManualTimeEdits",
        label: tr("Manual Time Edits", "Ediciones Manuales de Tiempo"),
        enabledCount: tenants.filter(
          (tenant) => tenant.features.allowManualTimeEdits,
        ).length,
      },
      {
        key: "multiLocationEnabled",
        label: tr("Multi-Location", "Multi-Ubicacion"),
        enabledCount: tenants.filter(
          (tenant) => tenant.features.multiLocationEnabled,
        ).length,
      },
      {
        key: "liquorInventoryEnabled",
        label: tr("Liquor Inventory", "Inventario de Licor"),
        enabledCount: tenants.filter(
          (tenant) => tenant.features.liquorInventoryEnabled,
        ).length,
      },
      {
        key: "premiumFeaturesEnabled",
        label: tr("Premium Features", "Funciones Premium"),
        enabledCount: tenants.filter(
          (tenant) => tenant.features.premiumFeaturesEnabled,
        ).length,
      },
    ].map((feature) => ({
      ...feature,
      percentage: toPercent(feature.enabledCount, totalTenants),
    }));

    const busiestTenants = [...tenants]
      .sort((a, b) => b.counts.employees - a.counts.employees)
      .slice(0, 6);
    const maxEmployees = Math.max(
      1,
      ...busiestTenants.map((tenant) => tenant.counts.employees),
    );

    const recentUpdates = [...tenants]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .slice(0, 6);

    const newestTenants = [...tenants]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 4);

    return {
      totalTenants,
      activeTenants,
      inactiveTenants,
      totalEmployees,
      avgEmployees,
      activeRate,
      featureUsage,
      busiestTenants,
      maxEmployees,
      recentUpdates,
      newestTenants,
    };
  }, [tenants]);

  return (
    <div className="owner-dashboard-page">
      <section className="owner-hero-panel">
        <div className="owner-hero-copy">
          <div className="owner-kicker">
            <i className="fa-solid fa-crown" aria-hidden="true" />
            {tr("Websys Owner Control Center", "Centro de Control Owner Websys")}
          </div>
          <h1>{tr("Scale Every Tenant From One Dashboard", "Escala Cada Tenant Desde Un Solo Panel")}</h1>
          <p>
            {tr(
              "Activate features, monitor adoption, and drive operational health across all tenants from this command center.",
              "Activa funciones, monitorea adopcion e impulsa la salud operativa de todos los tenants desde este centro de control.",
            )}
          </p>
          <div className="owner-hero-actions">
            <Link href="/owner/tenants" className="btn btn-primary">
              <i className="fa-solid fa-building-user" aria-hidden="true" />
              {tr("Open Tenant Accounts", "Abrir Cuentas de Tenant")}
            </Link>
            <Link href="/owner/tenants" className="btn btn-outline-primary">
              <i className="fa-solid fa-sliders" aria-hidden="true" />
              {tr("Configure Features", "Configurar Funciones")}
            </Link>
          </div>
        </div>

        <div className="owner-hero-metrics">
          <div className="owner-ring-card">
            <div
              className="owner-ring"
              style={{
                background: `conic-gradient(#2f67d1 0 ${dashboard.activeRate}%, rgba(47, 103, 209, 0.15) ${dashboard.activeRate}% 100%)`,
              }}
            >
              <div className="owner-ring-inner">
                <strong>{dashboard.activeRate}%</strong>
                <span>{tr("Active", "Activo")}</span>
              </div>
            </div>
            <div className="owner-ring-meta">
              <strong>{dashboard.activeTenants}</strong>
              <span>{tr("Active Tenants", "Tenants Activos")}</span>
            </div>
          </div>

          <div className="owner-mini-grid">
            <div className="owner-mini-card">
              <span>{tr("New This Cycle", "Nuevos en Este Ciclo")}</span>
              <strong>{dashboard.newestTenants.length}</strong>
            </div>
            <div className="owner-mini-card">
              <span>{tr("Feature Modules", "Modulos de Funciones")}</span>
              <strong>{dashboard.featureUsage.length}</strong>
            </div>
            <div className="owner-mini-card">
              <span>{tr("Total Workforce", "Fuerza Laboral Total")}</span>
              <strong>{dashboard.totalEmployees}</strong>
            </div>
            <div className="owner-mini-card">
              <span>{tr("Avg / Tenant", "Prom / Tenant")}</span>
              <strong>{dashboard.avgEmployees}</strong>
            </div>
          </div>
        </div>
      </section>

      {error && <div className="alert alert-warning mb-0">{error}</div>}

      <section className="owner-kpi-grid">
        <article className="owner-kpi-card owner-kpi-card--blue">
          <div className="owner-kpi-icon">
            <i className="fa-solid fa-city" aria-hidden="true" />
          </div>
          <span>{tr("Total Tenants", "Tenants Totales")}</span>
          <strong>{loading ? "..." : dashboard.totalTenants}</strong>
          <small>{tr("All tenant organizations managed", "Todas las organizaciones tenant gestionadas")}</small>
        </article>
        <article className="owner-kpi-card owner-kpi-card--green">
          <div className="owner-kpi-icon">
            <i className="fa-solid fa-circle-check" aria-hidden="true" />
          </div>
          <span>{tr("Active Tenants", "Tenants Activos")}</span>
          <strong>{loading ? "..." : dashboard.activeTenants}</strong>
          <small>{tr("Tenants currently enabled", "Tenants actualmente habilitados")}</small>
        </article>
        <article className="owner-kpi-card owner-kpi-card--amber">
          <div className="owner-kpi-icon">
            <i className="fa-solid fa-circle-pause" aria-hidden="true" />
          </div>
          <span>{tr("Inactive Tenants", "Tenants Inactivos")}</span>
          <strong>{loading ? "..." : dashboard.inactiveTenants}</strong>
          <small>{tr("Needs reactivation review", "Requiere revision de reactivacion")}</small>
        </article>
        <article className="owner-kpi-card owner-kpi-card--violet">
          <div className="owner-kpi-icon">
            <i className="fa-solid fa-users" aria-hidden="true" />
          </div>
          <span>{tr("Employees Tracked", "Empleados Registrados")}</span>
          <strong>{loading ? "..." : dashboard.totalEmployees}</strong>
          <small>{tr("Across all tenant workforces", "En toda la fuerza laboral de tenants")}</small>
        </article>
      </section>

      <section className="owner-panel-grid">
        <article className="owner-panel owner-panel--feature">
          <header className="owner-panel-header">
            <h2>{tr("Feature Adoption", "Adopcion de Funciones")}</h2>
            <span>{tr("Owner controlled modules", "Modulos controlados por owner")}</span>
          </header>

          <div className="owner-bar-list">
            {dashboard.featureUsage.map((feature) => (
              <div key={feature.key} className="owner-bar-row">
                <div className="owner-bar-label">{feature.label}</div>
                <div className="owner-bar-track">
                  <div
                    className="owner-bar-fill"
                    style={{ width: `${feature.percentage}%` }}
                  />
                </div>
                <div className="owner-bar-value">
                  {feature.enabledCount}/{dashboard.totalTenants || 0}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="owner-panel owner-panel--load">
          <header className="owner-panel-header">
            <h2>{tr("Tenant Workforce Load", "Carga Laboral por Tenant")}</h2>
            <span>{tr("Top tenants by active employees", "Top tenants por empleados activos")}</span>
          </header>

          {dashboard.busiestTenants.length === 0 ? (
            <p className="owner-empty">{tr("No tenant data yet.", "Aun no hay datos de tenants.")}</p>
          ) : (
            <div className="owner-load-list">
              {dashboard.busiestTenants.map((tenant) => {
                const width = Math.round(
                  (tenant.counts.employees / dashboard.maxEmployees) * 100,
                );
                return (
                  <div key={tenant.id} className="owner-load-row">
                    <div className="owner-load-copy">
                      <strong>{tenant.name}</strong>
                      <span>{tenant.subdomain}</span>
                    </div>
                    <div className="owner-load-track">
                      <div
                        className="owner-load-fill"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <div className="owner-load-value">{tenant.counts.employees}</div>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </section>

      <section className="owner-panel-grid owner-panel-grid--lower">
        <article className="owner-panel owner-panel--modules">
          <header className="owner-panel-header">
            <h2>{tr("System Modules", "Modulos del Sistema")}</h2>
            <span>{tr("Fast navigation for management", "Navegacion rapida para gestion")}</span>
          </header>
          <div className="owner-module-grid">
            <Link href="/owner/tenants" className="owner-module-link">
              <i className="fa-solid fa-building-user" aria-hidden="true" />
              <div>
                <strong>{tr("Tenant Accounts", "Cuentas de Tenant")}</strong>
                <span>{tr("Create and manage tenants", "Crear y gestionar tenants")}</span>
              </div>
            </Link>
            <Link href="/owner/tenants" className="owner-module-link">
              <i className="fa-solid fa-toggle-on" aria-hidden="true" />
              <div>
                <strong>{tr("Feature Control", "Control de Funciones")}</strong>
                <span>{tr("Enable/disable tenant modules", "Habilitar/deshabilitar modulos tenant")}</span>
              </div>
            </Link>
            <Link href="/owner/tenants" className="owner-module-link">
              <i className="fa-solid fa-user-lock" aria-hidden="true" />
              <div>
                <strong>{tr("Admin Credentials", "Credenciales Admin")}</strong>
                <span>{tr("Rotate tenant admin access", "Rotar accesos admin del tenant")}</span>
              </div>
            </Link>
            <Link href="/owner/tenants" className="owner-module-link">
              <i className="fa-solid fa-chart-line" aria-hidden="true" />
              <div>
                <strong>{tr("Growth Insights", "Insights de Crecimiento")}</strong>
                <span>{tr("Track tenant expansion and activity", "Rastrear expansion y actividad del tenant")}</span>
              </div>
            </Link>
          </div>
        </article>

        <article className="owner-panel owner-panel--activity">
          <header className="owner-panel-header">
            <h2>{tr("Recent Tenant Activity", "Actividad Reciente de Tenants")}</h2>
            <span>{tr("Most recently updated accounts", "Cuentas actualizadas mas recientemente")}</span>
          </header>
          {dashboard.recentUpdates.length === 0 ? (
            <p className="owner-empty">{tr("No recent updates yet.", "Aun no hay actualizaciones recientes.")}</p>
          ) : (
            <ul className="owner-activity-list">
              {dashboard.recentUpdates.map((tenant) => (
                <li key={tenant.id} className="owner-activity-item">
                  <div className="owner-activity-dot" />
                  <div className="owner-activity-copy">
                    <strong>{tenant.name}</strong>
                    <span>
                      {tenant.isActive ? tr("Active", "Activo") : tr("Inactive", "Inactivo")} •{" "}
                      {tr("Updated", "Actualizado")} {formatTimeAgo(tenant.updatedAt, lang)}
                    </span>
                  </div>
                  <span className="owner-activity-count">
                    {tenant.counts.employees} {tr("emp", "emp")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}
