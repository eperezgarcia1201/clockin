"use client";

import { useEffect, useMemo, useState } from "react";
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
    liquorControlTitle: "Liquor Control Sheet",
    liquorControlDesc:
      "Track opening/closing liquor inventory, sales, and monthly variance by location.",
    liquorSpreadsheetTitle: "Liquor Spreadsheet",
    liquorSpreadsheetDesc:
      "Open the full inventory spreadsheet with Company, Price, Qty/ML, Bar, Bodega, and Total.",
    liquorAiTitle: "AI Bottle Scan",
    liquorAiDesc:
      "Jump directly to photo scan to estimate fill level and spent ML from previous scan.",
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
    liquorControlTitle: "Control Mensual de Licor",
    liquorControlDesc:
      "Controla inventario inicial/final, ventas y variación mensual por ubicación.",
    liquorSpreadsheetTitle: "Hoja de Inventario Licor",
    liquorSpreadsheetDesc:
      "Abre la hoja completa con Compañía, Precio, Cant/ML, Bar, Bodega y Total.",
    liquorAiTitle: "Escaneo AI de Botella",
    liquorAiDesc:
      "Ir directo al escaneo por foto para estimar nivel y ML consumido vs escaneo anterior.",
  },
};

export default function ReportsHome() {
  const lang = useUiLanguage();
  const t = useMemo(() => copy[lang] ?? copy.en, [lang]);
  const [canViewLiquorControl, setCanViewLiquorControl] = useState(false);

  useEffect(() => {
    const loadAccess = async () => {
      try {
        const response = await fetch("/api/access/me", { cache: "no-store" });
        if (!response.ok) {
          setCanViewLiquorControl(false);
          return;
        }
        const data = (await response.json()) as {
          liquorInventoryEnabled?: boolean;
          permissions?: { reports?: boolean };
        };
        setCanViewLiquorControl(
          Boolean(data.permissions?.reports) &&
            Boolean(data.liquorInventoryEnabled),
        );
      } catch {
        setCanViewLiquorControl(false);
      }
    };
    void loadAccess();
  }, []);

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

        {canViewLiquorControl && (
          <a className="report-tile" href="/reports/liquor-control">
            <div className="report-icon report-icon--audit">
              <i className="fa-solid fa-wine-bottle" aria-hidden="true" />
            </div>
            <div className="report-copy">
              <h2>{t.liquorControlTitle}</h2>
              <p>{t.liquorControlDesc}</p>
            </div>
            <div className="report-action">
              <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            </div>
          </a>
        )}

        {canViewLiquorControl && (
          <a className="report-tile" href="/reports/liquor-control#liquor-spreadsheet">
            <div className="report-icon report-icon--hours">
              <i className="fa-solid fa-table" aria-hidden="true" />
            </div>
            <div className="report-copy">
              <h2>{t.liquorSpreadsheetTitle}</h2>
              <p>{t.liquorSpreadsheetDesc}</p>
            </div>
            <div className="report-action">
              <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            </div>
          </a>
        )}

        {canViewLiquorControl && (
          <a className="report-tile" href="/reports/liquor-control#liquor-ai-scan">
            <div className="report-icon report-icon--daily">
              <i className="fa-solid fa-camera" aria-hidden="true" />
            </div>
            <div className="report-copy">
              <h2>{t.liquorAiTitle}</h2>
              <p>{t.liquorAiDesc}</p>
            </div>
            <div className="report-action">
              <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            </div>
          </a>
        )}
      </div>
    </div>
  );
}
