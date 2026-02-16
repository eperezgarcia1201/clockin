"use client";

import { useMemo } from "react";
import { useUiLanguage } from "../../lib/ui-language";

type Lang = "en" | "es";

const copy: Record<Lang, Record<string, string>> = {
  en: {
    title: "Run Reports",
    subtitle: "Generate fast, accurate summaries for payroll and compliance.",
    dailyTitle: "Daily Time Report",
    dailyDesc: "Total hours worked in the selected date range per employee.",
    hoursTitle: "Hours Worked Report",
    hoursDesc: "Track total hours and rounding for each employee.",
    payrollTitle: "Payroll Summary",
    payrollDesc: "Weekly totals with overtime and earnings by employee.",
    auditTitle: "Audit Log",
    auditDesc: "Review all punches with date, time, and office details.",
    tipsTitle: "Tips Report",
    tipsDesc: "Review cash and credit card tips per server by day.",
    salesTitle: "Daily Sales Report",
    salesDesc: "Managers enter food/liquor sales and payment method totals.",
  },
  es: {
    title: "Ejecutar Reportes",
    subtitle: "Genera resúmenes rápidos y precisos para nómina y cumplimiento.",
    dailyTitle: "Reporte Diario de Tiempo",
    dailyDesc: "Horas totales trabajadas por empleado en el rango seleccionado.",
    hoursTitle: "Reporte de Horas Trabajadas",
    hoursDesc: "Seguimiento de horas totales y redondeo por empleado.",
    payrollTitle: "Resumen de Nómina",
    payrollDesc: "Totales semanales con horas extra y ganancias por empleado.",
    auditTitle: "Bitácora de Auditoría",
    auditDesc: "Revisa todas las marcas con fecha, hora y oficina.",
    tipsTitle: "Reporte de Propinas",
    tipsDesc: "Revisa propinas en efectivo y tarjeta por mesero y día.",
    salesTitle: "Reporte Diario de Ventas",
    salesDesc: "Gerentes capturan ventas de comida/licor y totales de pago.",
  },
};

export default function ReportsHome() {
  const lang = useUiLanguage();
  const t = useMemo(() => copy[lang] ?? copy.en, [lang]);

  return (
    <div className="reports-home">
      <div className="reports-hero">
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
      </div>

      <div className="reports-menu">
        <a className="report-tile" href="/reports/daily">
          <div className="report-icon report-icon--daily">
            <i className="fa-solid fa-chart-column" aria-hidden="true" />
          </div>
          <div className="report-copy">
            <h2>{t.dailyTitle}</h2>
            <p>{t.dailyDesc}</p>
          </div>
          <div className="report-action">
            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          </div>
        </a>

        <a className="report-tile" href="/reports/hours">
          <div className="report-icon report-icon--hours">
            <i className="fa-solid fa-clock" aria-hidden="true" />
          </div>
          <div className="report-copy">
            <h2>{t.hoursTitle}</h2>
            <p>{t.hoursDesc}</p>
          </div>
          <div className="report-action">
            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          </div>
        </a>

        <a className="report-tile" href="/reports/payroll">
          <div className="report-icon report-icon--payroll">
            <i className="fa-solid fa-sack-dollar" aria-hidden="true" />
          </div>
          <div className="report-copy">
            <h2>{t.payrollTitle}</h2>
            <p>{t.payrollDesc}</p>
          </div>
          <div className="report-action">
            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          </div>
        </a>

        <a className="report-tile" href="/reports/audit">
          <div className="report-icon report-icon--audit">
            <i className="fa-solid fa-clipboard-check" aria-hidden="true" />
          </div>
          <div className="report-copy">
            <h2>{t.auditTitle}</h2>
            <p>{t.auditDesc}</p>
          </div>
          <div className="report-action">
            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          </div>
        </a>

        <a className="report-tile" href="/reports/tips">
          <div className="report-icon report-icon--payroll">
            <i className="fa-solid fa-hand-holding-dollar" aria-hidden="true" />
          </div>
          <div className="report-copy">
            <h2>{t.tipsTitle}</h2>
            <p>{t.tipsDesc}</p>
          </div>
          <div className="report-action">
            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          </div>
        </a>

        <a className="report-tile" href="/reports/sales">
          <div className="report-icon report-icon--hours">
            <i className="fa-solid fa-cash-register" aria-hidden="true" />
          </div>
          <div className="report-copy">
            <h2>{t.salesTitle}</h2>
            <p>{t.salesDesc}</p>
          </div>
          <div className="report-action">
            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          </div>
        </a>
      </div>
    </div>
  );
}
