import type { CSSProperties } from "react";

type ChartRow = {
  id: string;
  name: string;
  hours: number;
  hoursFormatted: string;
};

export function DashboardHoursInsights({
  tr,
  chartRows,
  maxHours,
  totalHours,
  averageHours,
  topPerformer,
  overFortyCount,
}: {
  tr: (en: string, es: string) => string;
  chartRows: ChartRow[];
  maxHours: number;
  totalHours: number;
  averageHours: number;
  topPerformer: ChartRow | null;
  overFortyCount: number;
}) {
  return (
    <>
      <div className="admin-card chart-card">
        <div className="chart-header">
          <div>
            <h2>{tr("Hours Worked", "Horas Trabajadas")}</h2>
            <p>
              {tr(
                "Last 7 days of total hours per employee.",
                "Últimos 7 días de horas totales por empleado.",
              )}
            </p>
          </div>
          <a className="btn btn-outline-secondary btn-sm" href="/reports/hours">
            {tr("View Report", "Ver Reporte")}
          </a>
        </div>
        {chartRows.length === 0 ? (
          <div className="chart-empty">
            {tr("No hours recorded yet.", "Aún no hay horas registradas.")}
          </div>
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
            <h2>{tr("Hours Insights", "Resumen de Horas")}</h2>
            <p>
              {tr(
                "Quick performance snapshot for the current range.",
                "Resumen rápido de rendimiento para el rango actual.",
              )}
            </p>
          </div>
        </div>
        <div className="insights-grid">
          <div className="insight-tile">
            <span>{tr("Total Hours", "Horas Totales")}</span>
            <strong>{totalHours.toFixed(2)}</strong>
            <em>{tr("Last 7 days", "Últimos 7 días")}</em>
          </div>
          <div className="insight-tile">
            <span>{tr("Average Hours", "Horas Promedio")}</span>
            <strong>{averageHours.toFixed(2)}</strong>
            <em>{tr("Per employee", "Por empleado")}</em>
          </div>
          <div className="insight-tile">
            <span>{tr("Top Performer", "Mejor Rendimiento")}</span>
            <strong>{topPerformer?.name || tr("N/A", "N/D")}</strong>
            <em>
              {topPerformer
                ? topPerformer.hoursFormatted
                : tr("No data", "Sin datos")}
            </em>
          </div>
          <div className="insight-tile">
            <span>{tr("40+ Hours", "40+ Horas")}</span>
            <strong>{overFortyCount}</strong>
            <em>{tr("Potential overtime", "Posible tiempo extra")}</em>
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
          <div className="chart-empty">
            {tr(
              "No employee hour data yet.",
              "Aún no hay datos de horas por empleado.",
            )}
          </div>
        )}
      </div>
    </>
  );
}

