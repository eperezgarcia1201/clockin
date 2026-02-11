"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  const [monthOffset, setMonthOffset] = useState(0);
  const [hydrated, setHydrated] = useState(false);

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

  const calendar = useMemo(() => {
    const base = hydrated ? new Date() : new Date(2024, 0, 1);
    const viewDate = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = hydrated ? new Date() : null;
    const isCurrentMonth =
      !!today && today.getFullYear() === year && today.getMonth() === month;

    const days: {
      day: number;
      isToday: boolean;
    }[] = [];
    for (let i = 0; i < firstDay; i += 1) {
      days.push({ day: 0, isToday: false });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      days.push({
        day,
        isToday: isCurrentMonth && day === today?.getDate(),
      });
    }
    while (days.length % 7 !== 0) {
      days.push({ day: 0, isToday: false });
    }

    return {
      label: viewDate.toLocaleString("default", { month: "long", year: "numeric" }),
      days,
    };
  }, [hydrated, monthOffset]);

  useEffect(() => {
    setHydrated(true);
  }, []);

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

      <div className="admin-card calendar-card">
        <div className="calendar-header">
          <div>
            <h2>Team Calendar</h2>
            <p>View the current month at a glance.</p>
          </div>
          <div className="calendar-controls">
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setMonthOffset((prev) => prev - 1)}
            >
              <i className="fa-solid fa-chevron-left" aria-hidden="true" />
            </button>
            <span className="calendar-label">{calendar.label}</span>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setMonthOffset((prev) => prev + 1)}
            >
              <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="calendar-grid">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="calendar-day calendar-day--head">
              {day}
            </div>
          ))}
          {calendar.days.map((cell, index) => (
            <div
              key={`${cell.day}-${index}`}
              className={`calendar-day${cell.day ? "" : " is-empty"}${
                cell.isToday ? " is-today" : ""
              }`}
            >
              {cell.day ? cell.day : ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
