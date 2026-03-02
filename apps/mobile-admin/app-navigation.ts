import type { Lang } from "./copy";
import type { ReportType, Screen } from "./types";

export const reportTypeOrder: ReportType[] = [
  "daily",
  "hours",
  "payroll",
  "audit",
  "tips",
];

export const tabs: Screen[] = [
  "dashboard",
  "users",
  "offices",
  "groups",
  "schedules",
  "companyOrders",
  "liquorControl",
  "capture",
  "reports",
  "alerts",
];

export const tabLabels: Record<Lang, Record<Screen, string>> = {
  en: {
    dashboard: "Dashboard",
    users: "Users",
    offices: "Locations",
    groups: "Groups",
    schedules: "Schedules",
    companyOrders: "Company Orders",
    liquorControl: "Liquor Control",
    capture: "Daily Input",
    reports: "Reports",
    alerts: "Alerts",
  },
  es: {
    dashboard: "Tablero",
    users: "Usuarios",
    offices: "Ubicaciones",
    groups: "Grupos",
    schedules: "Horarios",
    companyOrders: "Ordenes Empresa",
    liquorControl: "Control Licor",
    capture: "Carga Diaria",
    reports: "Reportes",
    alerts: "Alertas",
  },
};
