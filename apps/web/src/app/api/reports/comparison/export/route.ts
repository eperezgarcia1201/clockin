import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../../lib/clockin-api";
import { excelResponse } from "../../../../../lib/excel-export";
import {
  companyMetaRows,
  getCompanyExportProfile,
} from "../../../../../lib/company-export";
import {
  scopedQueryFromRequest,
  withQuery,
} from "../../../../../lib/location-scope";

export const runtime = "nodejs";

type ExportFormat = "excel" | "csv" | "pdf";
type ExportSection = "combined" | "employees" | "liquor" | "payroll";
type ComparisonGranularity = "day" | "week" | "month";

type ComparisonResponse = {
  generatedAt: string;
  period: {
    current: { from: string; to: string };
    previous: { from: string; to: string };
  };
  totals: {
    current: {
      laborHours: number;
      estimatedWages: number;
      tips: number;
      sales: number;
      expenses: number;
      net: number;
    };
    previous: {
      laborHours: number;
      estimatedWages: number;
      tips: number;
      sales: number;
      expenses: number;
      net: number;
    };
    delta: {
      laborHours: { delta: number; percent: number | null };
      estimatedWages: { delta: number; percent: number | null };
      tips: { delta: number; percent: number | null };
      sales: { delta: number; percent: number | null };
      expenses: { delta: number; percent: number | null };
      net: { delta: number; percent: number | null };
    };
  };
  employees: {
    currentLeaders: Array<{
      employeeId: string;
      name: string;
      currentHours: number;
      currentWages: number;
      currentTips: number;
      deltaHours: number;
      deltaWages: number;
      deltaTips: number;
    }>;
    previousLeaders: Array<{
      employeeId: string;
      name: string;
      previousHours: number;
      previousWages: number;
      previousTips: number;
    }>;
    changes: Array<{
      employeeId: string;
      name: string;
      deltaHours: number;
      deltaWages: number;
      deltaTips: number;
    }>;
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
    weekly: Array<{
      weekStart: string;
      weekEnd: string;
      laborHours: number;
      wages: number;
      tips: number;
      sales: number;
      expenses: number;
      net: number;
      leader: { name: string } | null;
    }>;
  };
  highlights: string[];
  notes: string[];
};

const sectionTitle: Record<ExportSection, string> = {
  combined: "Combined Comparison Report",
  employees: "Employee Activity Comparison Report",
  liquor: "Liquor Consumption Comparison Report",
  payroll: "Payroll Date Comparison Report",
};

const formatMoney = (value: number) => `$${Number(value || 0).toFixed(2)}`;
const formatHours = (value: number) => `${Number(value || 0).toFixed(2)}h`;
const formatNumber = (value: number, precision = 2) =>
  Number(value || 0).toFixed(precision);

const parseIsoDateOnly = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }
  return parsed;
};

const weekStartFromDate = (dateKey: string, weekStartsOn: 0 | 1) => {
  const parsed = new Date(`${dateKey}T00:00:00.000Z`);
  const day = parsed.getUTCDay();
  const diff = (day - weekStartsOn + 7) % 7;
  parsed.setUTCDate(parsed.getUTCDate() - diff);
  return parsed.toISOString().slice(0, 10);
};

const bucketFromDate = (
  dateKey: string,
  granularity: ComparisonGranularity,
  weekStartsOn: 0 | 1,
) => {
  if (granularity === "day") {
    return dateKey;
  }
  if (granularity === "week") {
    return weekStartFromDate(dateKey, weekStartsOn);
  }
  return dateKey.slice(0, 7);
};

const bucketLabel = (bucket: string, granularity: ComparisonGranularity) => {
  if (granularity === "month") {
    return bucket;
  }
  if (granularity === "week") {
    return `Week of ${bucket}`;
  }
  return bucket;
};

const granularityTitle = (granularity: ComparisonGranularity) => {
  if (granularity === "week") {
    return "Weekly";
  }
  if (granularity === "month") {
    return "Monthly";
  }
  return "Daily";
};

const aggregateRows = <T extends { date: string }>(
  rows: T[],
  granularity: ComparisonGranularity,
  reducer: (acc: T, row: T) => T,
  weekStartsOn: 0 | 1,
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
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
};

const highestBy = <T>(rows: T[], pick: (row: T) => number): T | null => {
  if (!rows.length) {
    return null;
  }
  return rows.reduce((best, row) => (pick(row) > pick(best) ? row : best));
};

const escapeCsvCell = (value: unknown) => {
  const raw = String(value ?? "");
  if (raw.includes(",") || raw.includes('"') || raw.includes("\n")) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
};

const toCsv = (rows: unknown[][]) =>
  rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(",")).join("\n");

const buildBar = (value: number, max: number, width = 24, char = "#") => {
  if (max <= 0 || value <= 0) {
    return "";
  }
  const units = Math.max(1, Math.round((value / max) * width));
  return char.repeat(Math.min(width, units));
};

const formatPercent = (value: number | null) =>
  value === null ? "n/a" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

const applyExportGranularity = (
  data: ComparisonResponse,
  granularity: ComparisonGranularity,
  weekStartsOn: 0 | 1,
): ComparisonResponse => {
  if (granularity === "day") {
    return data;
  }

  const employeeDaily = aggregateRows(
    data.employeeActivity.daily,
    granularity,
    (acc, row) => ({
      ...acc,
      laborHours: acc.laborHours + row.laborHours,
      estimatedWages: acc.estimatedWages + row.estimatedWages,
      punches: acc.punches + row.punches,
      activeEmployees: Math.max(acc.activeEmployees, row.activeEmployees),
    }),
    weekStartsOn,
  );

  const payrollCurrentDaily = aggregateRows(
    data.payroll.currentDaily,
    granularity,
    (acc, row) => ({
      ...acc,
      laborHours: acc.laborHours + row.laborHours,
      wages: acc.wages + row.wages,
      tips: acc.tips + row.tips,
      totalComp: acc.totalComp + row.totalComp,
      employeeCount: Math.max(acc.employeeCount, row.employeeCount),
    }),
    weekStartsOn,
  );
  const payrollPreviousDaily = aggregateRows(
    data.payroll.previousDaily,
    granularity,
    (acc, row) => ({
      ...acc,
      laborHours: acc.laborHours + row.laborHours,
      wages: acc.wages + row.wages,
      tips: acc.tips + row.tips,
      totalComp: acc.totalComp + row.totalComp,
      employeeCount: Math.max(acc.employeeCount, row.employeeCount),
    }),
    weekStartsOn,
  );

  const salesCurrentDaily = aggregateRows(
    data.salesComparison.currentDaily,
    granularity,
    (acc, row) => ({
      ...acc,
      foodSales: acc.foodSales + row.foodSales,
      liquorSales: acc.liquorSales + row.liquorSales,
      totalSales: acc.totalSales + row.totalSales,
    }),
    weekStartsOn,
  );
  const salesPreviousDaily = aggregateRows(
    data.salesComparison.previousDaily,
    granularity,
    (acc, row) => ({
      ...acc,
      foodSales: acc.foodSales + row.foodSales,
      liquorSales: acc.liquorSales + row.liquorSales,
      totalSales: acc.totalSales + row.totalSales,
    }),
    weekStartsOn,
  );

  const expenseCurrentDaily = aggregateRows(
    data.expensesComparison.currentDaily,
    granularity,
    (acc, row) => ({
      ...acc,
      totalExpenses: acc.totalExpenses + row.totalExpenses,
      expenseCount: acc.expenseCount + row.expenseCount,
      cashExpenses: acc.cashExpenses + row.cashExpenses,
      debitCardExpenses: acc.debitCardExpenses + row.debitCardExpenses,
      checkExpenses: acc.checkExpenses + row.checkExpenses,
    }),
    weekStartsOn,
  );
  const expensePreviousDaily = aggregateRows(
    data.expensesComparison.previousDaily,
    granularity,
    (acc, row) => ({
      ...acc,
      totalExpenses: acc.totalExpenses + row.totalExpenses,
      expenseCount: acc.expenseCount + row.expenseCount,
      cashExpenses: acc.cashExpenses + row.cashExpenses,
      debitCardExpenses: acc.debitCardExpenses + row.debitCardExpenses,
      checkExpenses: acc.checkExpenses + row.checkExpenses,
    }),
    weekStartsOn,
  );

  const liquorByDate = aggregateRows(
    data.liquor.byDate,
    granularity,
    (acc, row) => ({
      ...acc,
      quantity: acc.quantity + row.quantity,
      cost: acc.cost + row.cost,
    }),
    weekStartsOn,
  );

  return {
    ...data,
    employeeActivity: {
      ...data.employeeActivity,
      daily: employeeDaily,
    },
    payroll: {
      ...data.payroll,
      currentDaily: payrollCurrentDaily,
      previousDaily: payrollPreviousDaily,
      highestCurrentDate: highestBy(payrollCurrentDaily, (row) => row.wages),
      highestPreviousDate: highestBy(payrollPreviousDaily, (row) => row.wages),
    },
    salesComparison: {
      ...data.salesComparison,
      currentDaily: salesCurrentDaily,
      previousDaily: salesPreviousDaily,
      highestCurrentDate: highestBy(salesCurrentDaily, (row) => row.totalSales),
      highestPreviousDate: highestBy(salesPreviousDaily, (row) => row.totalSales),
    },
    expensesComparison: {
      ...data.expensesComparison,
      currentDaily: expenseCurrentDaily,
      previousDaily: expensePreviousDaily,
      highestCurrentDate: highestBy(expenseCurrentDaily, (row) => row.totalExpenses),
      highestPreviousDate: highestBy(expensePreviousDaily, (row) => row.totalExpenses),
    },
    liquor: {
      ...data.liquor,
      byDate: liquorByDate,
    },
  };
};

const addOverviewRows = (
  rows: unknown[][],
  data: ComparisonResponse,
  companyRows: Array<[string, string]>,
  title: string,
  granularity: ComparisonGranularity,
) => {
  rows.push([title]);
  rows.push(["Generated", new Date(data.generatedAt).toLocaleString("en-US")]);
  rows.push(["Current Range", `${data.period.current.from} to ${data.period.current.to}`]);
  rows.push(["Previous Range", `${data.period.previous.from} to ${data.period.previous.to}`]);
  rows.push(["Compare by", granularityTitle(granularity)]);
  companyRows.forEach(([label, value]) => rows.push([label, value]));
  rows.push([]);
  rows.push(["Comparison Summary"]);
  rows.push(["Metric", "Current", "Previous", "Delta", "Delta %"]);
  rows.push([
    "Labor Hours",
    formatHours(data.totals.current.laborHours),
    formatHours(data.totals.previous.laborHours),
    formatHours(data.totals.delta.laborHours.delta),
    formatPercent(data.totals.delta.laborHours.percent),
  ]);
  rows.push([
    "Estimated Wages",
    formatMoney(data.totals.current.estimatedWages),
    formatMoney(data.totals.previous.estimatedWages),
    formatMoney(data.totals.delta.estimatedWages.delta),
    formatPercent(data.totals.delta.estimatedWages.percent),
  ]);
  rows.push([
    "Tips",
    formatMoney(data.totals.current.tips),
    formatMoney(data.totals.previous.tips),
    formatMoney(data.totals.delta.tips.delta),
    formatPercent(data.totals.delta.tips.percent),
  ]);
  rows.push([
    "Sales",
    formatMoney(data.totals.current.sales),
    formatMoney(data.totals.previous.sales),
    formatMoney(data.totals.delta.sales.delta),
    formatPercent(data.totals.delta.sales.percent),
  ]);
  rows.push([
    "Expenses",
    formatMoney(data.totals.current.expenses),
    formatMoney(data.totals.previous.expenses),
    formatMoney(data.totals.delta.expenses.delta),
    formatPercent(data.totals.delta.expenses.percent),
  ]);
  rows.push([
    "Net",
    formatMoney(data.totals.current.net),
    formatMoney(data.totals.previous.net),
    formatMoney(data.totals.delta.net.delta),
    formatPercent(data.totals.delta.net.percent),
  ]);
  rows.push([]);
  rows.push(["Highlights"]);
  data.highlights.forEach((highlight) => rows.push([highlight]));
  rows.push([]);
  rows.push(["Notes"]);
  data.notes.forEach((note) => rows.push([note]));
  rows.push([]);
};

const addTrendRows = (rows: unknown[][], data: ComparisonResponse) => {
  const maxSales = Math.max(...data.trend.weekly.map((row) => row.sales), 1);
  rows.push(["Weekly Trend Chart Data"]);
  rows.push([
    "Week Start",
    "Week End",
    "Sales",
    "Expenses",
    "Wages",
    "Tips",
    "Labor Hours",
    "Leader",
    "Sales Bar",
  ]);
  data.trend.weekly.forEach((row) => {
    rows.push([
      row.weekStart,
      row.weekEnd,
      formatMoney(row.sales),
      formatMoney(row.expenses),
      formatMoney(row.wages),
      formatMoney(row.tips),
      formatHours(row.laborHours),
      row.leader?.name || "-",
      buildBar(row.sales, maxSales),
    ]);
  });
  rows.push([]);
  rows.push([
    "Chart explanation",
    "Each week includes totals for labor, wages, tips, sales, and expenses. Use bars to compare magnitude quickly.",
  ]);
  rows.push([]);
};

const addEmployeeRows = (
  rows: unknown[][],
  data: ComparisonResponse,
  granularity: ComparisonGranularity,
) => {
  const maxLabor = Math.max(
    ...data.employeeActivity.daily.map((row) => row.laborHours),
    1,
  );
  rows.push([`Employee Activity - ${granularityTitle(granularity)} Chart Data`]);
  rows.push([
    "Period",
    "Labor Hours",
    "Estimated Wages",
    "Punches",
    "Active Employees",
    "Labor Bar",
  ]);
  data.employeeActivity.daily.forEach((row) => {
    rows.push([
      bucketLabel(row.date, granularity),
      formatHours(row.laborHours),
      formatMoney(row.estimatedWages),
      row.punches,
      row.activeEmployees,
      buildBar(row.laborHours, maxLabor),
    ]);
  });
  rows.push([]);
  rows.push(["Employee Activity - Top by Punches"]);
  rows.push([
    "Employee",
    "Punches",
    "IN",
    "OUT",
    "BREAK",
    "LUNCH",
    "Hours",
    "Wages",
    "Tips",
  ]);
  data.employeeActivity.topByPunches.forEach((row) => {
    rows.push([
      row.name,
      row.punches,
      row.inPunches,
      row.outPunches,
      row.breakPunches,
      row.lunchPunches,
      formatHours(row.hours),
      formatMoney(row.wages),
      formatMoney(row.tips),
    ]);
  });
  rows.push([]);
  rows.push([
    "Chart explanation",
    `${granularityTitle(granularity)} labor bars show the strongest activity periods; punch breakdown highlights operational behavior by employee.`,
  ]);
  rows.push([]);
};

const addLiquorRows = (
  rows: unknown[][],
  data: ComparisonResponse,
  granularity: ComparisonGranularity,
) => {
  rows.push(["Liquor Consumption Comparison"]);
  if (!data.liquor.enabled) {
    rows.push(["Liquor inventory feature is disabled for this tenant."]);
    rows.push([]);
    return;
  }
  rows.push(["Current Quantity", formatNumber(data.liquor.summary.currentQuantity, 3)]);
  rows.push(["Previous Quantity", formatNumber(data.liquor.summary.previousQuantity, 3)]);
  rows.push(["Quantity Delta", formatNumber(data.liquor.summary.deltaQuantity, 3)]);
  rows.push(["Current Cost", formatMoney(data.liquor.summary.currentCost)]);
  rows.push(["Previous Cost", formatMoney(data.liquor.summary.previousCost)]);
  rows.push(["Cost Delta", formatMoney(data.liquor.summary.deltaCost)]);
  rows.push([]);
  rows.push(["Top Consumed Liquor Items"]);
  rows.push([
    "Company",
    "Liquor Name",
    "Kind",
    "Current Qty",
    "Previous Qty",
    "Qty Delta",
    "Current Cost",
    "Previous Cost",
    "Cost Delta",
  ]);
  data.liquor.topConsumed.forEach((row) => {
    rows.push([
      row.company,
      row.itemName,
      row.kind || "-",
      formatNumber(row.currentQuantity, 3),
      formatNumber(row.previousQuantity, 3),
      formatNumber(row.deltaQuantity, 3),
      formatMoney(row.currentCost),
      formatMoney(row.previousCost),
      formatMoney(row.deltaCost),
    ]);
  });
  const maxQty = Math.max(...data.liquor.byDate.map((row) => row.quantity), 1);
  rows.push([]);
  rows.push([`${granularityTitle(granularity)} Liquor Consumption Chart Data`]);
  rows.push(["Period", "Quantity", "Cost", "Quantity Bar"]);
  data.liquor.byDate.forEach((row) => {
    rows.push([
      bucketLabel(row.date, granularity),
      formatNumber(row.quantity, 3),
      formatMoney(row.cost),
      buildBar(row.quantity, maxQty),
    ]);
  });
  rows.push([]);
  rows.push([
    "Chart explanation",
    `${granularityTitle(granularity)} quantity bars show when consumption spikes; top-item table isolates which products drive cost.`,
  ]);
  rows.push([]);
};

const addPayrollRows = (
  rows: unknown[][],
  data: ComparisonResponse,
  granularity: ComparisonGranularity,
) => {
  rows.push(["Payroll Date Comparison"]);
  rows.push([
    "Highest Current Payroll Date",
    data.payroll.highestCurrentDate
      ? bucketLabel(data.payroll.highestCurrentDate.date, granularity)
      : "-",
    data.payroll.highestCurrentDate
      ? formatMoney(data.payroll.highestCurrentDate.wages)
      : "-",
  ]);
  rows.push([
    "Highest Previous Payroll Date",
    data.payroll.highestPreviousDate
      ? bucketLabel(data.payroll.highestPreviousDate.date, granularity)
      : "-",
    data.payroll.highestPreviousDate
      ? formatMoney(data.payroll.highestPreviousDate.wages)
      : "-",
  ]);
  rows.push([]);
  rows.push([`Current ${granularityTitle(granularity)} Payroll Chart Data`]);
  rows.push(["Period", "Labor Hours", "Wages", "Tips", "Total Comp", "Employees", "Wages Bar"]);
  const maxWagesCurrent = Math.max(
    ...data.payroll.currentDaily.map((row) => row.wages),
    1,
  );
  data.payroll.currentDaily.forEach((row) => {
    rows.push([
      bucketLabel(row.date, granularity),
      formatHours(row.laborHours),
      formatMoney(row.wages),
      formatMoney(row.tips),
      formatMoney(row.totalComp),
      row.employeeCount,
      buildBar(row.wages, maxWagesCurrent),
    ]);
  });
  rows.push([]);
  rows.push([`Previous ${granularityTitle(granularity)} Payroll Data`]);
  rows.push(["Period", "Labor Hours", "Wages", "Tips", "Total Comp", "Employees"]);
  data.payroll.previousDaily.forEach((row) => {
    rows.push([
      bucketLabel(row.date, granularity),
      formatHours(row.laborHours),
      formatMoney(row.wages),
      formatMoney(row.tips),
      formatMoney(row.totalComp),
      row.employeeCount,
    ]);
  });
  rows.push([]);
  rows.push([
    "Chart explanation",
    "Wage bars identify high-payroll dates quickly; compare with previous period to detect drift.",
  ]);
  rows.push([]);
};

const addSalesExpenseRows = (
  rows: unknown[][],
  data: ComparisonResponse,
  granularity: ComparisonGranularity,
) => {
  rows.push([`${granularityTitle(granularity)} Sales Comparison`]);
  rows.push([
    "Highest Current Sales Date",
    data.salesComparison.highestCurrentDate
      ? bucketLabel(data.salesComparison.highestCurrentDate.date, granularity)
      : "-",
    data.salesComparison.highestCurrentDate
      ? formatMoney(data.salesComparison.highestCurrentDate.totalSales)
      : "-",
  ]);
  rows.push([
    "Highest Previous Sales Date",
    data.salesComparison.highestPreviousDate
      ? bucketLabel(data.salesComparison.highestPreviousDate.date, granularity)
      : "-",
    data.salesComparison.highestPreviousDate
      ? formatMoney(data.salesComparison.highestPreviousDate.totalSales)
      : "-",
  ]);
  rows.push([]);
  rows.push(["Period", "Food Sales", "Liquor Sales", "Total Sales"]);
  data.salesComparison.currentDaily.forEach((row) => {
    rows.push([
      bucketLabel(row.date, granularity),
      formatMoney(row.foodSales),
      formatMoney(row.liquorSales),
      formatMoney(row.totalSales),
    ]);
  });
  rows.push([]);
  rows.push([`${granularityTitle(granularity)} Expenses Comparison`]);
  rows.push([
    "Highest Current Expense Date",
    data.expensesComparison.highestCurrentDate
      ? bucketLabel(data.expensesComparison.highestCurrentDate.date, granularity)
      : "-",
    data.expensesComparison.highestCurrentDate
      ? formatMoney(data.expensesComparison.highestCurrentDate.totalExpenses)
      : "-",
  ]);
  rows.push([
    "Highest Previous Expense Date",
    data.expensesComparison.highestPreviousDate
      ? bucketLabel(data.expensesComparison.highestPreviousDate.date, granularity)
      : "-",
    data.expensesComparison.highestPreviousDate
      ? formatMoney(data.expensesComparison.highestPreviousDate.totalExpenses)
      : "-",
  ]);
  rows.push([]);
  rows.push([
    "Period",
    "Total Expenses",
    "Expense Count",
    "Cash",
    "Debit Card",
    "Check",
  ]);
  data.expensesComparison.currentDaily.forEach((row) => {
    rows.push([
      bucketLabel(row.date, granularity),
      formatMoney(row.totalExpenses),
      row.expenseCount,
      formatMoney(row.cashExpenses),
      formatMoney(row.debitCardExpenses),
      formatMoney(row.checkExpenses),
    ]);
  });
  rows.push([]);
  rows.push([
    "Chart explanation",
    `${granularityTitle(granularity)} sales and expenses are broken out by period so you can compare peaks and operational cost pressure.`,
  ]);
  rows.push([]);
};

const buildCsvRows = (
  data: ComparisonResponse,
  companyRows: Array<[string, string]>,
  section: ExportSection,
  granularity: ComparisonGranularity,
) => {
  const rows: unknown[][] = [];
  addOverviewRows(rows, data, companyRows, sectionTitle[section], granularity);

  if (section === "combined") {
    addTrendRows(rows, data);
    addSalesExpenseRows(rows, data, granularity);
    addEmployeeRows(rows, data, granularity);
    addLiquorRows(rows, data, granularity);
    addPayrollRows(rows, data, granularity);
  } else if (section === "employees") {
    addEmployeeRows(rows, data, granularity);
  } else if (section === "liquor") {
    addLiquorRows(rows, data, granularity);
  } else {
    addPayrollRows(rows, data, granularity);
  }
  return rows;
};

const buildExcel = async (
  filename: string,
  data: ComparisonResponse,
  companyRows: Array<[string, string]>,
  section: ExportSection,
  granularity: ComparisonGranularity,
) =>
  excelResponse(filename, async (workbook) => {
    const overviewRows = buildCsvRows(data, companyRows, section, granularity);
    const overview = workbook.addWorksheet("Report");
    overviewRows.forEach((row) => overview.addRow(row));
    overview.columns = [
      { width: 24 },
      { width: 26 },
      { width: 24 },
      { width: 20 },
      { width: 18 },
      { width: 16 },
      { width: 16 },
      { width: 18 },
      { width: 30 },
    ];
  });

const escapePdfText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const buildPdfDocument = (pages: string[]): ArrayBuffer => {
  const pageCount = pages.length;
  const pageObjectStart = 5;
  const objectCount = 4 + pageCount * 2;
  const pageRefs = pages
    .map((_, index) => `${pageObjectStart + index * 2} 0 R`)
    .join(" ");

  const objects: string[] = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    `2 0 obj\n<< /Type /Pages /Kids [${pageRefs}] /Count ${pageCount} >>\nendobj\n`,
    "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
  ];

  pages.forEach((content, index) => {
    const pageId = pageObjectStart + index * 2;
    const contentId = pageId + 1;
    const length = Buffer.byteLength(content, "utf8");
    objects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
    );
    objects.push(
      `${contentId} 0 obj\n<< /Length ${length} >>\nstream\n${content}\nendstream\nendobj\n`,
    );
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objectCount + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objectCount; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  const bytes = Buffer.from(pdf, "utf8");
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
};

const buildPdf = (
  data: ComparisonResponse,
  companyRows: Array<[string, string]>,
  section: ExportSection,
  granularity: ComparisonGranularity,
) => {
  const theme = {
    ink: [0.09, 0.14, 0.27] as [number, number, number],
    muted: [0.33, 0.4, 0.58] as [number, number, number],
    cardBg: [0.97, 0.98, 1] as [number, number, number],
    cardBorder: [0.84, 0.88, 0.95] as [number, number, number],
    stripe: [0.93, 0.95, 0.99] as [number, number, number],
    sales: [0.14, 0.47, 0.92] as [number, number, number],
    expenses: [0.87, 0.37, 0.31] as [number, number, number],
    wages: [0.49, 0.37, 0.87] as [number, number, number],
    tips: [0.09, 0.64, 0.46] as [number, number, number],
    hours: [0.24, 0.44, 0.72] as [number, number, number],
    punches: [0.94, 0.66, 0.2] as [number, number, number],
    totalComp: [0.12, 0.56, 0.7] as [number, number, number],
  };

  const pages: string[] = [];
  let commands: string[] = [];
  let y = 756;

  const toRgb = (color: [number, number, number]) =>
    `${color[0]} ${color[1]} ${color[2]}`;

  const drawText = (
    text: string,
    x: number,
    baselineY: number,
    options?: {
      bold?: boolean;
      size?: number;
      color?: [number, number, number];
    },
  ) => {
    const size = options?.size ?? 10;
    const color = options?.color ?? theme.ink;
    commands.push(
      `${toRgb(color)} rg BT /${options?.bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x} ${baselineY} Tm (${escapePdfText(
        text,
      )}) Tj ET`,
    );
  };

  const drawRect = (
    x: number,
    rectY: number,
    width: number,
    height: number,
    options?: {
      fill?: [number, number, number];
      stroke?: [number, number, number];
      lineWidth?: number;
    },
  ) => {
    if (options?.fill) {
      commands.push(`${toRgb(options.fill)} rg ${x} ${rectY} ${width} ${height} re f`);
    }
    if (options?.stroke) {
      commands.push(
        `${toRgb(options.stroke)} RG ${(options.lineWidth ?? 0.8).toFixed(2)} w ${x} ${rectY} ${width} ${height} re S`,
      );
    }
  };

  const drawLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: [number, number, number] = theme.cardBorder,
    lineWidth = 0.7,
  ) => {
    commands.push(
      `${toRgb(color)} RG ${lineWidth.toFixed(2)} w ${x1} ${y1} m ${x2} ${y2} l S`,
    );
  };

  const pushPage = () => {
    if (commands.length) {
      pages.push(commands.join("\n"));
    }
  };

  const addPage = () => {
    pushPage();
    commands = [];
    y = 756;
    drawText(sectionTitle[section], 36, 760, {
      bold: true,
      size: 16,
      color: theme.ink,
    });
    y -= 24;
  };

  const ensureSpace = (height = 14) => {
    if (y - height < 40) {
      addPage();
    }
  };

  const line = (
    text: string,
    bold = false,
    size = 10,
    color: [number, number, number] = theme.ink,
  ) => {
    ensureSpace(size + 6);
    drawText(text, 36, y, { bold, size, color });
    y -= size + 4;
  };

  type PdfChartSeries = {
    key: string;
    label: string;
    color: [number, number, number];
  };
  type PdfChartRow = {
    label: string;
    values: Record<string, number>;
    summary: string;
  };

  const drawChartCard = (
    title: string,
    subtitle: string,
    rows: PdfChartRow[],
    series: PdfChartSeries[],
    normalizePerSeries = true,
  ) => {
    if (!rows.length || !series.length) {
      return;
    }
    const x = 36;
    const cardWidth = 540;
    const rowHeight = Math.max(16, series.length * 4 + 8);
    const legendRows = Math.ceil(series.length / 3);
    const legendHeight = legendRows * 15;
    const chartHeight = rows.length * rowHeight + 18;
    const cardHeight = 58 + legendHeight + chartHeight;
    ensureSpace(cardHeight + 14);

    const top = y;
    const bottom = top - cardHeight;
    drawRect(x, bottom, cardWidth, cardHeight, {
      fill: theme.cardBg,
      stroke: theme.cardBorder,
    });
    drawText(title, x + 12, top - 18, { bold: true, size: 11, color: theme.ink });
    drawText(subtitle, x + 12, top - 32, { size: 8, color: theme.muted });

    let legendX = x + 12;
    let legendY = top - 46;
    series.forEach((item, index) => {
      if (index > 0 && index % 3 === 0) {
        legendX = x + 12;
        legendY -= 14;
      }
      drawRect(legendX, legendY - 7, 7, 7, { fill: item.color, stroke: item.color });
      drawText(item.label, legendX + 11, legendY - 1, { size: 7.5, color: theme.ink });
      legendX += 170;
    });

    const labelX = x + 12;
    const barsX = x + 148;
    const barsWidth = 312;
    const valueX = x + cardWidth - 72;
    const chartTop = top - 58 - legendHeight + 2;

    const globalMax = Math.max(
      ...rows.flatMap((row) => series.map((item) => Math.abs(row.values[item.key] || 0))),
      1,
    );
    const maxBySeries = new Map<string, number>();
    series.forEach((item) => {
      maxBySeries.set(
        item.key,
        Math.max(...rows.map((row) => Math.abs(row.values[item.key] || 0)), 1),
      );
    });

    rows.forEach((row, rowIndex) => {
      const rowTop = chartTop - rowIndex * rowHeight;
      const rowBottom = rowTop - rowHeight + 2;
      if (rowIndex % 2 === 1) {
        drawRect(x + 8, rowBottom, cardWidth - 16, rowHeight - 2, {
          fill: theme.stripe,
        });
      }
      drawText(row.label, labelX, rowTop - 9, { size: 7.5, color: theme.ink });
      series.forEach((item, seriesIndex) => {
        const value = Math.max(0, row.values[item.key] || 0);
        const denominator = normalizePerSeries
          ? maxBySeries.get(item.key) || 1
          : globalMax;
        const width = Math.max(0, Math.min(barsWidth, (value / denominator) * barsWidth));
        const barY = rowTop - 10 - seriesIndex * 3.1;
        drawRect(barsX, barY, width, 2.2, {
          fill: item.color,
        });
      });
      drawLine(barsX, rowBottom + 1, barsX + barsWidth, rowBottom + 1, theme.cardBorder, 0.4);
      drawText(row.summary, valueX, rowTop - 9, { size: 7.3, color: theme.muted });
    });

    y = bottom - 12;
  };

  addPage();
  line(companyRows[0]?.[1] || "WEBSYS WORKFORCE", true, 14, theme.ink);
  companyRows.slice(1).forEach(([label, value]) => {
    if (value) {
      line(`${label}: ${value}`, false, 9, theme.muted);
    }
  });
  y -= 6;
  line(
    `Current range: ${data.period.current.from} to ${data.period.current.to}`,
    false,
    10,
  );
  line(
    `Previous range: ${data.period.previous.from} to ${data.period.previous.to}`,
    false,
    10,
    theme.muted,
  );
  line(
    `Generated: ${new Date(data.generatedAt).toLocaleString("en-US")}`,
    false,
    10,
    theme.muted,
  );
  line(`Compare by: ${granularityTitle(granularity)}`, false, 10, theme.muted);
  y -= 6;
  line("Summary (well explained comparison):", true, 11, theme.ink);
  line(
    `Labor ${formatHours(data.totals.current.laborHours)} vs ${formatHours(data.totals.previous.laborHours)} (${formatPercent(
      data.totals.delta.laborHours.percent,
    )}).`,
  );
  line(
    `Wages ${formatMoney(data.totals.current.estimatedWages)} vs ${formatMoney(data.totals.previous.estimatedWages)} (${formatPercent(
      data.totals.delta.estimatedWages.percent,
    )}).`,
  );
  line(
    `Tips ${formatMoney(data.totals.current.tips)} vs ${formatMoney(data.totals.previous.tips)} (${formatPercent(
      data.totals.delta.tips.percent,
    )}).`,
  );
  line(
    `Sales ${formatMoney(data.totals.current.sales)} vs ${formatMoney(data.totals.previous.sales)} (${formatPercent(
      data.totals.delta.sales.percent,
    )}).`,
  );
  line(
    `Expenses ${formatMoney(data.totals.current.expenses)} vs ${formatMoney(data.totals.previous.expenses)} (${formatPercent(
      data.totals.delta.expenses.percent,
    )}).`,
  );
  line(
    `Net ${formatMoney(data.totals.current.net)} vs ${formatMoney(data.totals.previous.net)} (${formatPercent(
      data.totals.delta.net.percent,
    )}).`,
  );
  y -= 4;
  line("Highlights:", true, 11, theme.ink);
  data.highlights
    .slice(0, 6)
    .forEach((item) => line(`- ${item}`, false, 9, theme.muted));
  y -= 6;

  if (section === "combined") {
    drawChartCard(
      "Weekly Trend Chart",
      "Styled bars for sales, expenses, wages, tips, and labor hours.",
      data.trend.weekly.slice(-8).map((row) => ({
        label: `${row.weekStart.slice(5)} - ${row.weekEnd.slice(5)}`,
        values: {
          sales: row.sales,
          expenses: row.expenses,
          wages: row.wages,
          tips: row.tips,
          hours: row.laborHours,
        },
        summary: formatMoney(row.sales),
      })),
      [
        { key: "sales", label: "Sales", color: theme.sales },
        { key: "expenses", label: "Expenses", color: theme.expenses },
        { key: "wages", label: "Wages", color: theme.wages },
        { key: "tips", label: "Tips", color: theme.tips },
        { key: "hours", label: "Labor Hours", color: theme.hours },
      ],
    );
    drawChartCard(
      `${granularityTitle(granularity)} Sales vs Expenses Chart`,
      `${granularityTitle(granularity)} totals for food sales, liquor sales, total sales, and expenses.`,
      data.salesComparison.currentDaily.slice(-10).map((salesRow) => {
        const expenseRow = data.expensesComparison.currentDaily.find(
          (row) => row.date === salesRow.date,
        );
        return {
          label: bucketLabel(salesRow.date, granularity),
          values: {
            foodSales: salesRow.foodSales,
            liquorSales: salesRow.liquorSales,
            totalSales: salesRow.totalSales,
            expenses: expenseRow?.totalExpenses || 0,
          },
          summary: `${formatMoney(salesRow.totalSales)} vs ${formatMoney(
            expenseRow?.totalExpenses || 0,
          )}`,
        };
      }),
      [
        { key: "foodSales", label: "Food Sales", color: theme.sales },
        { key: "liquorSales", label: "Liquor Sales", color: theme.totalComp },
        { key: "totalSales", label: "Total Sales", color: theme.hours },
        { key: "expenses", label: "Expenses", color: theme.expenses },
      ],
    );
    drawChartCard(
      "Employee Activity Chart",
      `${granularityTitle(granularity)} comparison for labor hours, punches, and estimated wages.`,
      data.employeeActivity.daily.slice(-8).map((row) => ({
        label: bucketLabel(row.date, granularity),
        values: {
          hours: row.laborHours,
          punches: row.punches,
          wages: row.estimatedWages,
        },
        summary: `${formatHours(row.laborHours)} / ${row.punches} punches`,
      })),
      [
        { key: "hours", label: "Hours", color: theme.hours },
        { key: "punches", label: "Punches", color: theme.punches },
        { key: "wages", label: "Wages", color: theme.wages },
      ],
    );
  } else if (section === "employees") {
    drawChartCard(
      `Employee ${granularityTitle(granularity)} Activity Chart`,
      "Hours, punch count, and wages with on-screen style color palette.",
      data.employeeActivity.daily.slice(-10).map((row) => ({
        label: bucketLabel(row.date, granularity),
        values: {
          hours: row.laborHours,
          punches: row.punches,
          wages: row.estimatedWages,
        },
        summary: `${row.activeEmployees} active`,
      })),
      [
        { key: "hours", label: "Hours", color: theme.hours },
        { key: "punches", label: "Punches", color: theme.punches },
        { key: "wages", label: "Wages", color: theme.wages },
      ],
    );
    line("Top Employee Activities:", true, 11, theme.ink);
    data.employeeActivity.topByPunches.slice(0, 12).forEach((row) => {
      line(
        `${row.name} | punches ${row.punches} | ${formatHours(row.hours)} | wages ${formatMoney(row.wages)}`,
        false,
        9,
        theme.muted,
      );
    });
  } else if (section === "liquor") {
    if (!data.liquor.enabled) {
      line(
        "Liquor inventory feature is disabled for this tenant.",
        false,
        10,
        theme.muted,
      );
    } else {
      drawChartCard(
        `Liquor ${granularityTitle(granularity)} Consumption Chart`,
        `${granularityTitle(granularity)} quantity and cost rendered with styled chart bars.`,
        data.liquor.byDate.slice(-10).map((row) => ({
          label: bucketLabel(row.date, granularity),
          values: {
            quantity: row.quantity,
            cost: row.cost,
          },
          summary: `${formatNumber(row.quantity, 3)} | ${formatMoney(row.cost)}`,
        })),
        [
          { key: "quantity", label: "Quantity", color: theme.tips },
          { key: "cost", label: "Cost", color: theme.wages },
        ],
      );
      line("Top Consumed Liquor Items:", true, 11, theme.ink);
      data.liquor.topConsumed.slice(0, 12).forEach((row) => {
        line(
          `${row.company} | ${row.itemName} | qty ${formatNumber(row.currentQuantity, 3)} | cost ${formatMoney(
            row.currentCost,
          )}`,
          false,
          9,
          theme.muted,
        );
      });
    }
  } else {
    drawChartCard(
      `${granularityTitle(granularity)} Payroll Chart`,
      "Wages, tips, and total compensation with styled comparison bars.",
      data.payroll.currentDaily.slice(-10).map((row) => ({
        label: bucketLabel(row.date, granularity),
        values: {
          wages: row.wages,
          tips: row.tips,
          totalComp: row.totalComp,
        },
        summary: `${formatMoney(row.wages)} wages`,
      })),
      [
        { key: "wages", label: "Wages", color: theme.wages },
        { key: "tips", label: "Tips", color: theme.tips },
        { key: "totalComp", label: "Total Comp", color: theme.totalComp },
      ],
    );
    line("Highest Payroll Dates:", true, 11, theme.ink);
    line(
      `Current: ${data.payroll.highestCurrentDate ? bucketLabel(data.payroll.highestCurrentDate.date, granularity) : "-"} ${data.payroll.highestCurrentDate ? formatMoney(data.payroll.highestCurrentDate.wages) : ""}`,
      false,
      9,
      theme.muted,
    );
    line(
      `Previous: ${data.payroll.highestPreviousDate ? bucketLabel(data.payroll.highestPreviousDate.date, granularity) : "-"} ${data.payroll.highestPreviousDate ? formatMoney(data.payroll.highestPreviousDate.wages) : ""}`,
      false,
      9,
      theme.muted,
    );
  }

  line("Notes:", true, 11, theme.ink);
  data.notes.forEach((note) => line(`- ${note}`, false, 9, theme.muted));

  pushPage();
  return buildPdfDocument(pages);
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const formatRaw = (url.searchParams.get("format") || "excel")
    .trim()
    .toLowerCase();
  const sectionRaw = (url.searchParams.get("section") || "combined")
    .trim()
    .toLowerCase();
  const granularityRaw = (url.searchParams.get("granularity") || "day")
    .trim()
    .toLowerCase();
  const format: ExportFormat =
    formatRaw === "csv" || formatRaw === "pdf" || formatRaw === "excel"
      ? formatRaw
      : "excel";
  const section: ExportSection =
    sectionRaw === "employees" ||
    sectionRaw === "liquor" ||
    sectionRaw === "payroll" ||
    sectionRaw === "combined"
      ? sectionRaw
      : "combined";
  const granularity: ComparisonGranularity =
    granularityRaw === "week" || granularityRaw === "month" || granularityRaw === "day"
      ? granularityRaw
      : "day";

  const from = (url.searchParams.get("from") || "").trim();
  const to = (url.searchParams.get("to") || "").trim();
  if (!from || !to) {
    return NextResponse.json(
      { error: "from and to are required (YYYY-MM-DD)." },
      { status: 400 },
    );
  }
  if (!parseIsoDateOnly(from) || !parseIsoDateOnly(to)) {
    return NextResponse.json(
      { error: "from and to must be valid dates in YYYY-MM-DD format." },
      { status: 400 },
    );
  }
  if (from > to) {
    return NextResponse.json(
      { error: '"from" must be before or equal to "to".' },
      { status: 400 },
    );
  }

  const query = await scopedQueryFromRequest(request);
  query.set("from", from);
  query.set("to", to);
  if (!query.get("weekStartsOn")) {
    query.set("weekStartsOn", "1");
  }
  if (!query.get("trendWeeks")) {
    query.set("trendWeeks", "8");
  }
  if (!query.get("tzOffset")) {
    query.set("tzOffset", String(-new Date().getTimezoneOffset()));
  }
  const exportWeekStartsOn: 0 | 1 = query.get("weekStartsOn") === "0" ? 0 : 1;

  const response = await clockinFetch(withQuery("/reports/comparison", query));
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return new NextResponse(JSON.stringify(error), { status: response.status });
  }
  const rawData = (await response.json()) as ComparisonResponse;
  const data = applyExportGranularity(rawData, granularity, exportWeekStartsOn);
  const company = await getCompanyExportProfile();
  const companyRows = companyMetaRows(company);
  const stamp = `${from}_${to}`.replace(/[^0-9_]/g, "");
  const baseName = `comparison_${section}_${stamp}`;

  if (format === "csv") {
    const csv = toCsv(buildCsvRows(data, companyRows, section, granularity));
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}.csv"`,
      },
    });
  }

  if (format === "pdf") {
    const pdf = buildPdf(data, companyRows, section, granularity);
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${baseName}.pdf"`,
      },
    });
  }

  return buildExcel(`${baseName}.xlsx`, data, companyRows, section, granularity);
}
