"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

type Summary = {
  total: number;
  admins: number;
  timeAdmins: number;
  reports: number;
};

type HoursReport = {
  range: { from: string; to: string };
  employees: {
    id: string;
    name: string;
    totalHoursDecimal: number;
    totalHoursFormatted: string;
  }[];
};

export default function AdminDashboard() {
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
        const response = await fetch("/api/employees/summary", {
          cache: "no-store",
        });
        if (response.ok) {
          const data = (await response.json()) as Summary;
          setSummary(data);
        }
      } catch {
        // ignore
      }
    };

    load();
  }, []);

  useEffect(() => {
    const loadHours = async () => {
      const now = new Date();
      const to = now.toISOString().slice(0, 10);
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      const from = start.toISOString().slice(0, 10);

      try {
        const params = new URLSearchParams({
          from,
          to,
          round: "0",
          tzOffset: String(-new Date().getTimezoneOffset()),
        });
        const response = await fetch(`/api/reports/hours?${params}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as HoursReport;
        setHoursReport(data);
      } catch {
        // ignore
      }
    };

    loadHours();
  }, []);

  return (
    <div className="admin-dashboard">
      <div className="admin-page-title">
        <span className="admin-page-icon">W</span>
        Administration
      </div>

      <div className="admin-hero">
        <div className="admin-hero-brand">
          <div className="admin-hero-logo">W</div>
          <div>
            <div className="admin-hero-name">Websys</div>
            <div className="admin-hero-sub">ClockIn Admin</div>
          </div>
        </div>
      </div>

      <div className="summary-grid">
        <Link
          className="summary-card summary-card--light summary-card-link"
          href="/admin/users"
        >
          <div className="summary-header">Total Users</div>
          <div className="summary-value">{summary.total}</div>
          <div className="summary-sub">Active Users</div>
          <div className="summary-list">
            <div className="summary-item">
              <i className="fa-solid fa-check" aria-hidden="true" />
              Active Users
            </div>
            <div className="summary-item">
              <i className="fa-solid fa-check" aria-hidden="true" />
              System Administrators
            </div>
          </div>
          <div className="summary-meta">
            <span>500 Customers</span>
            <span>5 collectors</span>
          </div>
        </Link>

        <Link
          className="summary-card summary-card--navy summary-card-link"
          href="/admin/users?role=admin"
        >
          <div className="summary-header">Sys Admin Users</div>
          <div className="summary-value">{summary.admins}</div>
          <div className="summary-sub">System Administrators</div>
          <div className="summary-list">
            <div className="summary-item">
              <i className="fa-solid fa-check" aria-hidden="true" />
              Sys Admin Users
            </div>
            <div className="summary-item">
              <i className="fa-solid fa-check" aria-hidden="true" />
              System Administrators
            </div>
            <div className="summary-item">
              <i className="fa-solid fa-check" aria-hidden="true" />
              Unlimited customers
            </div>
            <div className="summary-item">
              <i className="fa-solid fa-check" aria-hidden="true" />
              Unlimited collectors
            </div>
          </div>
        </Link>

        <Link
          className="summary-card summary-card--purple summary-card-link"
          href="/admin/users?role=time"
        >
          <div className="summary-header">Time Admin Users</div>
          <div className="summary-value">{summary.timeAdmins}</div>
          <div className="summary-sub">Time Administrators</div>
          <div className="summary-list">
            <div className="summary-item">
              <i className="fa-solid fa-check" aria-hidden="true" />
              Sys Admin Users
            </div>
            <div className="summary-item">
              <i className="fa-solid fa-check" aria-hidden="true" />
              Time Admin Users
            </div>
            <div className="summary-item">
              <i className="fa-solid fa-check" aria-hidden="true" />
              Unlimited collectors
            </div>
          </div>
        </Link>

        <Link
          className="summary-card summary-card--teal summary-card-link"
          href="/admin/users?role=reports"
        >
          <div className="summary-header">Reports Users</div>
          <div className="summary-value">{summary.reports}</div>
          <div className="summary-sub">Report Administrators</div>
          <div className="summary-list">
            <div className="summary-item">
              <i className="fa-solid fa-check" aria-hidden="true" />
              Report Administrators
            </div>
          </div>
        </Link>
      </div>

      <div className="admin-card chart-card">
        <div className="chart-header">
          <div>
            <h2>Hours Worked</h2>
            <p>Last 7 days of total hours per employee.</p>
          </div>
          <a className="btn btn-outline-secondary btn-sm" href="/reports/hours">
            View Report
          </a>
        </div>
        {chartRows.length === 0 ? (
          <div className="chart-empty">No hours recorded yet.</div>
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
            <h2>Hours Insights</h2>
            <p>Quick performance snapshot for the current range.</p>
          </div>
        </div>
        <div className="insights-grid">
          <div className="insight-tile">
            <span>Total Hours</span>
            <strong>{totalHours.toFixed(2)}</strong>
            <em>Last 7 days</em>
          </div>
          <div className="insight-tile">
            <span>Average Hours</span>
            <strong>{averageHours.toFixed(2)}</strong>
            <em>Per employee</em>
          </div>
          <div className="insight-tile">
            <span>Top Performer</span>
            <strong>{topPerformer?.name || "N/A"}</strong>
            <em>{topPerformer ? topPerformer.hoursFormatted : "No data"}</em>
          </div>
          <div className="insight-tile">
            <span>40+ Hours</span>
            <strong>{overFortyCount}</strong>
            <em>Potential overtime</em>
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
          <div className="chart-empty">No employee hour data yet.</div>
        )}
      </div>
    </div>
  );
}
