"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useUiLanguage } from "../../lib/ui-language";
import {
  getEmployeeSummary,
  getHoursReport,
  type AdminSummary as Summary,
  type HoursReport,
} from "../../lib/api/admin-dashboard";
import { DashboardHoursInsights } from "./dashboard-hours-insights";
import { DashboardSalesExpenseCard } from "./dashboard-sales-expense-card";
import { DashboardSummaryGrid } from "./dashboard-summary-grid";

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

      <DashboardSummaryGrid tr={tr} summary={summary} />

      <DashboardHoursInsights
        tr={tr}
        chartRows={chartRows}
        maxHours={maxHours}
        totalHours={totalHours}
        averageHours={averageHours}
        topPerformer={topPerformer}
        overFortyCount={overFortyCount}
      />

      <DashboardSalesExpenseCard lang={lang} />
    </div>
  );
}

