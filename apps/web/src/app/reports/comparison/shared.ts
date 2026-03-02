import { fetchComparisonReportRequest } from "../../../lib/api/reports-core";

export type ComparisonMetricDelta = {
  delta: number;
  percent: number | null;
};

export type ComparisonGranularity = "day" | "week" | "month";
export type ComparisonLang = "en" | "es";

export type ComparisonTotals = {
  laborMinutes: number;
  laborHours: number;
  estimatedWages: number;
  tips: number;
  sales: number;
  expenses: number;
  net: number;
};

export type EmployeeLeader = {
  employeeId: string;
  name: string;
  currentMinutes: number;
  previousMinutes: number;
  currentHours: number;
  previousHours: number;
  currentWages: number;
  previousWages: number;
  currentTips: number;
  previousTips: number;
  deltaMinutes: number;
  deltaHours: number;
  deltaWages: number;
  deltaTips: number;
};

export type WeeklyTrendRow = {
  weekStart: string;
  weekEnd: string;
  laborMinutes: number;
  laborHours: number;
  wages: number;
  tips: number;
  sales: number;
  expenses: number;
  net: number;
  leader:
    | {
        employeeId: string;
        name: string;
        minutes: number;
        hours: number;
        wages: number;
        tips: number;
      }
    | null;
};

export type ComparisonResponse = {
  generatedAt: string;
  period: {
    type: "week" | "month" | "year";
    anchorDate: string;
    current: { from: string; to: string };
    previous: { from: string; to: string };
    isCustomRange?: boolean;
  };
  totals: {
    current: ComparisonTotals;
    previous: ComparisonTotals;
    delta: {
      laborHours: ComparisonMetricDelta;
      estimatedWages: ComparisonMetricDelta;
      tips: ComparisonMetricDelta;
      sales: ComparisonMetricDelta;
      expenses: ComparisonMetricDelta;
      net: ComparisonMetricDelta;
    };
  };
  employees: {
    currentLeaders: EmployeeLeader[];
    previousLeaders: EmployeeLeader[];
    changes: EmployeeLeader[];
  };
  employeeActivity: {
    daily: Array<{
      date: string;
      laborHours: number;
      estimatedWages: number;
      punches: number;
      activeEmployees: number;
    }>;
    topByPunches: Array<{
      employeeId: string;
      name: string;
      punches: number;
      inPunches: number;
      outPunches: number;
      breakPunches: number;
      lunchPunches: number;
      hours: number;
      wages: number;
      tips: number;
    }>;
  };
  payroll: {
    currentDaily: Array<{
      date: string;
      laborHours: number;
      wages: number;
      tips: number;
      totalComp: number;
      employeeCount: number;
    }>;
    previousDaily: Array<{
      date: string;
      laborHours: number;
      wages: number;
      tips: number;
      totalComp: number;
      employeeCount: number;
    }>;
    highestCurrentDate: {
      date: string;
      laborHours: number;
      wages: number;
      tips: number;
      totalComp: number;
      employeeCount: number;
    } | null;
    highestPreviousDate: {
      date: string;
      laborHours: number;
      wages: number;
      tips: number;
      totalComp: number;
      employeeCount: number;
    } | null;
  };
  salesComparison: {
    currentDaily: Array<{
      date: string;
      foodSales: number;
      liquorSales: number;
      totalSales: number;
    }>;
    previousDaily: Array<{
      date: string;
      foodSales: number;
      liquorSales: number;
      totalSales: number;
    }>;
    highestCurrentDate: {
      date: string;
      foodSales: number;
      liquorSales: number;
      totalSales: number;
    } | null;
    highestPreviousDate: {
      date: string;
      foodSales: number;
      liquorSales: number;
      totalSales: number;
    } | null;
  };
  expensesComparison: {
    currentDaily: Array<{
      date: string;
      totalExpenses: number;
      expenseCount: number;
      cashExpenses: number;
      debitCardExpenses: number;
      checkExpenses: number;
    }>;
    previousDaily: Array<{
      date: string;
      totalExpenses: number;
      expenseCount: number;
      cashExpenses: number;
      debitCardExpenses: number;
      checkExpenses: number;
    }>;
    highestCurrentDate: {
      date: string;
      totalExpenses: number;
      expenseCount: number;
      cashExpenses: number;
      debitCardExpenses: number;
      checkExpenses: number;
    } | null;
    highestPreviousDate: {
      date: string;
      totalExpenses: number;
      expenseCount: number;
      cashExpenses: number;
      debitCardExpenses: number;
      checkExpenses: number;
    } | null;
  };
  liquor: {
    enabled: boolean;
    summary: {
      currentQuantity: number;
      previousQuantity: number;
      deltaQuantity: number;
      currentCost: number;
      previousCost: number;
      deltaCost: number;
    };
    topConsumed: Array<{
      itemId: string;
      itemName: string;
      company: string;
      kind: string;
      currentQuantity: number;
      previousQuantity: number;
      deltaQuantity: number;
      currentCost: number;
      previousCost: number;
      deltaCost: number;
    }>;
    byDate: Array<{
      date: string;
      quantity: number;
      cost: number;
    }>;
  };
  trend: {
    weekStartsOn: number;
    weeks: number;
    range: { from: string; to: string };
    weekly: WeeklyTrendRow[];
  };
  highlights: string[];
  notes: string[];
};

export const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

export const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const number = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const money = (value: number) => currency.format(value || 0);
export const hours = (value: number) => `${number.format(value || 0)}h`;

export const signed = (value: number, withMoney = false) => {
  const base = withMoney ? money(Math.abs(value)) : number.format(Math.abs(value));
  return value > 0 ? `+${base}` : value < 0 ? `-${base}` : base;
};

export const percent = (value: number | null) =>
  value === null ? "n/a" : `${value > 0 ? "+" : ""}${number.format(value)}%`;

export const applyRangePreset = (preset: string) => {
  const end = new Date();
  const start = new Date(end);
  if (preset === "7d") {
    start.setDate(end.getDate() - 6);
  } else if (preset === "30d") {
    start.setDate(end.getDate() - 29);
  } else if (preset === "90d") {
    start.setDate(end.getDate() - 89);
  } else if (preset === "ytd") {
    start.setMonth(0, 1);
  } else {
    start.setDate(end.getDate() - 29);
  }
  return {
    from: formatDateInput(start),
    to: formatDateInput(end),
  };
};

const weekStartFromDate = (dateKey: string, weekStartsOn: 0 | 1) => {
  const parsed = new Date(`${dateKey}T00:00:00.000Z`);
  const day = parsed.getUTCDay();
  const diff = (day - weekStartsOn + 7) % 7;
  parsed.setUTCDate(parsed.getUTCDate() - diff);
  return parsed.toISOString().slice(0, 10);
};

export const bucketFromDate = (
  dateKey: string,
  granularity: ComparisonGranularity,
  weekStartsOn: 0 | 1 = 1,
) => {
  if (granularity === "day") {
    return dateKey;
  }
  if (granularity === "week") {
    return weekStartFromDate(dateKey, weekStartsOn);
  }
  return dateKey.slice(0, 7);
};

export const bucketLabel = (
  bucket: string,
  granularity: ComparisonGranularity,
) => {
  if (granularity === "month") {
    return bucket;
  }
  if (granularity === "week") {
    return `Week of ${bucket}`;
  }
  return bucket;
};

export const aggregateByGranularity = <T extends { date: string }>(
  rows: T[],
  granularity: ComparisonGranularity,
  reducer: (acc: T, row: T) => T,
  weekStartsOn: 0 | 1 = 1,
) => {
  if (granularity === "day") {
    return [...rows];
  }
  const map = new Map<string, T>();
  rows.forEach((row) => {
    const bucket = bucketFromDate(row.date, granularity, weekStartsOn);
    const existing = map.get(bucket);
    if (!existing) {
      map.set(bucket, { ...row, date: bucket });
      return;
    }
    map.set(bucket, reducer(existing, row));
  });
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
};

export const comparisonCopy: Record<ComparisonLang, Record<string, string>> = {
  en: {
    title: "Comparative Performance Report",
    subtitle:
      "Compare labor, wages, tips, sales, and expenses by custom date range.",
    quickRange: "Quick range",
    last7Days: "Last 7 days",
    last30Days: "Last 30 days",
    last90Days: "Last 90 days",
    yearToDate: "Year to date",
    custom: "Custom",
    from: "From",
    to: "To",
    weekStartsOn: "Week starts on",
    monday: "Monday",
    sunday: "Sunday",
    compareBy: "Compare by",
    day: "Day",
    week: "Week",
    month: "Month",
    trendPoints: "Trend points",
    points: "points",
    generateReport: "Generate report",
    generating: "Generating...",
    exportExcel: "Export Excel",
    exportCsv: "Export CSV",
    downloadPdf: "Download PDF",
    employeeActivity: "Employee activity",
    liquorConsumption: "Liquor consumption",
    payrollDates: "Payroll dates",
    generatePrompt:
      "Generate the report to compare this date range vs the previous matching range.",
    currentRange: "Current range",
    previousMatchingRange: "Previous matching range",
    previous: "Previous",
    change: "Change",
    laborHours: "Labor Hours",
    estimatedWages: "Estimated Wages",
    tips: "Tips",
    sales: "Sales",
    expenses: "Expenses",
    net: "Net",
    trendChart: "trend chart",
    salesExpensesComparison: "sales and expenses comparison",
    highestSalesCurrent: "Highest sales",
    highestExpensesCurrent: "Highest expenses",
    currentRangeSuffix: "(current range)",
    noSalesData: "No sales data",
    noExpenseData: "No expense data",
    noTrendRows: "No trend rows available for this range.",
    period: "Period",
    foodSales: "Food Sales",
    liquorSales: "Liquor Sales",
    totalSales: "Total Sales",
    totalExpenses: "Total Expenses",
    expenseCount: "Expense Count",
    topWorkersCurrent: "Top workers (current range)",
    topWorkersPrevious: "Top workers (previous range)",
    biggestWorkloadChanges: "Biggest workload changes",
    highlights: "Highlights",
    noRows: "No rows in this range.",
    employeeTitle: "Employee Activity Comparison",
    employeeSubtitle:
      "Compare hours, punch activity, wages, and tips by date range.",
    run: "Run",
    loading: "Loading...",
    dailyActivity: "activity",
    noEmployeeRows: "No employee activity rows in this range.",
    topPunchActivity: "Top by punch activity",
    combined: "Combined",
    liquorTitle: "Liquor Consumption Comparison",
    liquorSubtitle:
      "Compare top consumed liquor items, cost impact, and consumption by date range.",
    liquorDisabled:
      "Liquor inventory feature is disabled for this tenant, so liquor comparison is empty.",
    currentConsumedQty: "Current consumed qty",
    previousConsumedQty: "Previous consumed qty",
    qtyDelta: "Qty delta",
    currentCostImpact: "Current cost impact",
    previousCostImpact: "Previous cost impact",
    costDelta: "Cost delta",
    topConsumedLiquor: "Top consumed liquor",
    company: "Company",
    liquorName: "Liquor name",
    kind: "Kind",
    currentQty: "Current qty",
    previousQty: "Previous qty",
    deltaQty: "Delta qty",
    currentCost: "Current cost",
    previousCost: "Previous cost",
    deltaCost: "Delta cost",
    consumptionCurrentRange: "consumption in current range",
    noLiquorRows: "No liquor consumption rows in this range.",
    payrollTitle: "Payroll Date Comparison",
    payrollSubtitle:
      "Track the most expensive payroll periods and wage trend by date range.",
    highestPayrollCurrent: "Highest payroll",
    highestPayrollPrevious: "Highest payroll",
    currentTotalWages: "Current total wages",
    payrollCurrentRange: "payroll",
    noPayrollRows: "No payroll rows in this range.",
    wages: "Wages",
    totalComp: "Total comp",
    employees: "Employees",
  },
  es: {
    title: "Reporte Comparativo de Rendimiento",
    subtitle:
      "Compara horas, salarios, propinas, ventas y gastos por rango de fechas.",
    quickRange: "Rango rápido",
    last7Days: "Últimos 7 días",
    last30Days: "Últimos 30 días",
    last90Days: "Últimos 90 días",
    yearToDate: "Año en curso",
    custom: "Personalizado",
    from: "Desde",
    to: "Hasta",
    weekStartsOn: "Inicio de semana",
    monday: "Lunes",
    sunday: "Domingo",
    compareBy: "Comparar por",
    day: "Día",
    week: "Semana",
    month: "Mes",
    trendPoints: "Puntos de tendencia",
    points: "puntos",
    generateReport: "Generar reporte",
    generating: "Generando...",
    exportExcel: "Exportar Excel",
    exportCsv: "Exportar CSV",
    downloadPdf: "Descargar PDF",
    employeeActivity: "Actividad de empleados",
    liquorConsumption: "Consumo de licor",
    payrollDates: "Fechas de nómina",
    generatePrompt:
      "Genera el reporte para comparar este rango contra el rango anterior equivalente.",
    currentRange: "Rango actual",
    previousMatchingRange: "Rango anterior equivalente",
    previous: "Anterior",
    change: "Cambio",
    laborHours: "Horas laboradas",
    estimatedWages: "Salarios estimados",
    tips: "Propinas",
    sales: "Ventas",
    expenses: "Gastos",
    net: "Neto",
    trendChart: "gráfico de tendencia",
    salesExpensesComparison: "comparación de ventas y gastos",
    highestSalesCurrent: "Mayor venta",
    highestExpensesCurrent: "Mayor gasto",
    currentRangeSuffix: "(rango actual)",
    noSalesData: "Sin datos de ventas",
    noExpenseData: "Sin datos de gastos",
    noTrendRows: "No hay filas de tendencia para este rango.",
    period: "Periodo",
    foodSales: "Ventas de comida",
    liquorSales: "Ventas de licor",
    totalSales: "Ventas totales",
    totalExpenses: "Gastos totales",
    expenseCount: "Cantidad de gastos",
    topWorkersCurrent: "Top empleados (rango actual)",
    topWorkersPrevious: "Top empleados (rango anterior)",
    biggestWorkloadChanges: "Mayores cambios de carga",
    highlights: "Destacados",
    noRows: "No hay datos en este rango.",
    employeeTitle: "Comparación de Actividad de Empleados",
    employeeSubtitle:
      "Compara horas, marcaciones, salarios y propinas por rango de fechas.",
    run: "Ejecutar",
    loading: "Cargando...",
    dailyActivity: "actividad",
    noEmployeeRows: "No hay actividad de empleados en este rango.",
    topPunchActivity: "Top por marcaciones",
    combined: "Combinado",
    liquorTitle: "Comparación de Consumo de Licor",
    liquorSubtitle:
      "Compara licores más consumidos, impacto de costo y consumo por fechas.",
    liquorDisabled:
      "La función de inventario de licor está desactivada para este tenant.",
    currentConsumedQty: "Cantidad consumida actual",
    previousConsumedQty: "Cantidad consumida anterior",
    qtyDelta: "Cambio de cantidad",
    currentCostImpact: "Impacto de costo actual",
    previousCostImpact: "Impacto de costo anterior",
    costDelta: "Cambio de costo",
    topConsumedLiquor: "Licores más consumidos",
    company: "Compañía",
    liquorName: "Nombre de licor",
    kind: "Tipo",
    currentQty: "Cant. actual",
    previousQty: "Cant. anterior",
    deltaQty: "Cambio cant.",
    currentCost: "Costo actual",
    previousCost: "Costo anterior",
    deltaCost: "Cambio costo",
    consumptionCurrentRange: "consumo en rango actual",
    noLiquorRows: "No hay consumo de licor en este rango.",
    payrollTitle: "Comparación de Fechas de Nómina",
    payrollSubtitle:
      "Revisa periodos de nómina más altos y tendencia salarial por fechas.",
    highestPayrollCurrent: "Nómina más alta",
    highestPayrollPrevious: "Nómina más alta",
    currentTotalWages: "Salarios totales actuales",
    payrollCurrentRange: "nómina",
    noPayrollRows: "No hay filas de nómina en este rango.",
    wages: "Salarios",
    totalComp: "Compensación total",
    employees: "Empleados",
  },
};

export const granularityLabel = (
  granularity: ComparisonGranularity,
  lang: ComparisonLang,
) => {
  if (lang === "es") {
    if (granularity === "week") {
      return "Semanal";
    }
    if (granularity === "month") {
      return "Mensual";
    }
    return "Diario";
  }
  if (granularity === "week") {
    return "Weekly";
  }
  if (granularity === "month") {
    return "Monthly";
  }
  return "Daily";
};

export async function fetchComparisonReport(params: {
  from: string;
  to: string;
  weekStartsOn: "0" | "1";
  trendWeeks: string;
}) {
  const query = new URLSearchParams();
  query.set("from", params.from);
  query.set("to", params.to);
  query.set("weekStartsOn", params.weekStartsOn);
  query.set("trendWeeks", params.trendWeeks);
  query.set("tzOffset", String(-new Date().getTimezoneOffset()));
  const response = await fetchComparisonReportRequest(query);
  const payload = (await response.json()) as ComparisonResponse & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error || "Unable to load comparison report.");
  }
  return payload;
}
