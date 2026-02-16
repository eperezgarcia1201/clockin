"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type TenantFeatures = {
  requirePin: boolean;
  reportsEnabled: boolean;
  allowManualTimeEdits: boolean;
  dailySalesReportingEnabled: boolean;
  multiLocationEnabled: boolean;
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

const formatTimeAgo = (isoDate: string) => {
  const timestamp = new Date(isoDate).getTime();
  if (!Number.isFinite(timestamp)) {
    return "unknown";
  }

  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return new Date(isoDate).toLocaleDateString();
};

export default function OwnerDashboardPage() {
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
          throw new Error(data.error || "Unable to load tenant accounts.");
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
              : "Unable to load tenant accounts.",
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
        label: "Daily Sales Reporting",
        enabledCount: tenants.filter(
          (tenant) => tenant.features.dailySalesReportingEnabled,
        ).length,
      },
      {
        key: "reportsEnabled",
        label: "Reports Suite",
        enabledCount: tenants.filter((tenant) => tenant.features.reportsEnabled)
          .length,
      },
      {
        key: "requirePin",
        label: "Require PIN",
        enabledCount: tenants.filter((tenant) => tenant.features.requirePin).length,
      },
      {
        key: "allowManualTimeEdits",
        label: "Manual Time Edits",
        enabledCount: tenants.filter(
          (tenant) => tenant.features.allowManualTimeEdits,
        ).length,
      },
      {
        key: "multiLocationEnabled",
        label: "Multi-Location",
        enabledCount: tenants.filter(
          (tenant) => tenant.features.multiLocationEnabled,
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
            Websys Owner Control Center
          </div>
          <h1>Scale Every Tenant From One Dashboard</h1>
          <p>
            Activate features, monitor adoption, and drive operational health
            across all tenants from this command center.
          </p>
          <div className="owner-hero-actions">
            <Link href="/owner/tenants" className="btn btn-primary">
              <i className="fa-solid fa-building-user" aria-hidden="true" />
              Open Tenant Accounts
            </Link>
            <Link href="/owner/tenants" className="btn btn-outline-primary">
              <i className="fa-solid fa-sliders" aria-hidden="true" />
              Configure Features
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
                <span>Active</span>
              </div>
            </div>
            <div className="owner-ring-meta">
              <strong>{dashboard.activeTenants}</strong>
              <span>Active Tenants</span>
            </div>
          </div>

          <div className="owner-mini-grid">
            <div className="owner-mini-card">
              <span>New This Cycle</span>
              <strong>{dashboard.newestTenants.length}</strong>
            </div>
            <div className="owner-mini-card">
              <span>Feature Modules</span>
              <strong>4</strong>
            </div>
            <div className="owner-mini-card">
              <span>Total Workforce</span>
              <strong>{dashboard.totalEmployees}</strong>
            </div>
            <div className="owner-mini-card">
              <span>Avg / Tenant</span>
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
          <span>Total Tenants</span>
          <strong>{loading ? "..." : dashboard.totalTenants}</strong>
          <small>All tenant organizations managed</small>
        </article>
        <article className="owner-kpi-card owner-kpi-card--green">
          <div className="owner-kpi-icon">
            <i className="fa-solid fa-circle-check" aria-hidden="true" />
          </div>
          <span>Active Tenants</span>
          <strong>{loading ? "..." : dashboard.activeTenants}</strong>
          <small>Tenants currently enabled</small>
        </article>
        <article className="owner-kpi-card owner-kpi-card--amber">
          <div className="owner-kpi-icon">
            <i className="fa-solid fa-circle-pause" aria-hidden="true" />
          </div>
          <span>Inactive Tenants</span>
          <strong>{loading ? "..." : dashboard.inactiveTenants}</strong>
          <small>Needs reactivation review</small>
        </article>
        <article className="owner-kpi-card owner-kpi-card--violet">
          <div className="owner-kpi-icon">
            <i className="fa-solid fa-users" aria-hidden="true" />
          </div>
          <span>Employees Tracked</span>
          <strong>{loading ? "..." : dashboard.totalEmployees}</strong>
          <small>Across all tenant workforces</small>
        </article>
      </section>

      <section className="owner-panel-grid">
        <article className="owner-panel owner-panel--feature">
          <header className="owner-panel-header">
            <h2>Feature Adoption</h2>
            <span>Owner controlled modules</span>
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
            <h2>Tenant Workforce Load</h2>
            <span>Top tenants by active employees</span>
          </header>

          {dashboard.busiestTenants.length === 0 ? (
            <p className="owner-empty">No tenant data yet.</p>
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
            <h2>System Modules</h2>
            <span>Fast navigation for management</span>
          </header>
          <div className="owner-module-grid">
            <Link href="/owner/tenants" className="owner-module-link">
              <i className="fa-solid fa-building-user" aria-hidden="true" />
              <div>
                <strong>Tenant Accounts</strong>
                <span>Create and manage tenants</span>
              </div>
            </Link>
            <Link href="/owner/tenants" className="owner-module-link">
              <i className="fa-solid fa-toggle-on" aria-hidden="true" />
              <div>
                <strong>Feature Control</strong>
                <span>Enable/disable tenant modules</span>
              </div>
            </Link>
            <Link href="/owner/tenants" className="owner-module-link">
              <i className="fa-solid fa-user-lock" aria-hidden="true" />
              <div>
                <strong>Admin Credentials</strong>
                <span>Rotate tenant admin access</span>
              </div>
            </Link>
            <Link href="/owner/tenants" className="owner-module-link">
              <i className="fa-solid fa-chart-line" aria-hidden="true" />
              <div>
                <strong>Growth Insights</strong>
                <span>Track tenant expansion and activity</span>
              </div>
            </Link>
          </div>
        </article>

        <article className="owner-panel owner-panel--activity">
          <header className="owner-panel-header">
            <h2>Recent Tenant Activity</h2>
            <span>Most recently updated accounts</span>
          </header>
          {dashboard.recentUpdates.length === 0 ? (
            <p className="owner-empty">No recent updates yet.</p>
          ) : (
            <ul className="owner-activity-list">
              {dashboard.recentUpdates.map((tenant) => (
                <li key={tenant.id} className="owner-activity-item">
                  <div className="owner-activity-dot" />
                  <div className="owner-activity-copy">
                    <strong>{tenant.name}</strong>
                    <span>
                      {tenant.isActive ? "Active" : "Inactive"} • Updated{" "}
                      {formatTimeAgo(tenant.updatedAt)}
                    </span>
                  </div>
                  <span className="owner-activity-count">
                    {tenant.counts.employees} emp
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
