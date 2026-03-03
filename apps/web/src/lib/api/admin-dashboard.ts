import { requestJson } from "./client";

export type AdminSummary = {
  total: number;
  admins: number;
  timeAdmins: number;
  reports: number;
};

export type HoursReport = {
  range: { from: string; to: string };
  employees: {
    id: string;
    name: string;
    totalHoursDecimal: number;
    totalHoursFormatted: string;
  }[];
};

export type SalesExpenseReport = {
  range: { from: string; to: string };
  totals: {
    totalSales: number;
    balance: number;
  };
  expenseTotals: {
    totalExpenses: number;
  };
  reports: {
    date: string;
    totalSales: number;
  }[];
  expenses: {
    date: string;
    amount: number;
  }[];
};

type HoursReportQuery = {
  from: string;
  to: string;
  round: number;
  tzOffset: number;
};

function buildHoursReportQuery(query: HoursReportQuery): string {
  const params = new URLSearchParams();
  params.set("from", query.from);
  params.set("to", query.to);
  params.set("round", String(query.round));
  params.set("tzOffset", String(query.tzOffset));
  return params.toString();
}

export async function getEmployeeSummary(): Promise<AdminSummary> {
  return requestJson<AdminSummary>("/api/employees/summary");
}

export async function getHoursReport(
  query: HoursReportQuery,
): Promise<HoursReport> {
  const queryString = buildHoursReportQuery(query);
  return requestJson<HoursReport>(`/api/reports/hours?${queryString}`);
}

export async function getSalesExpenseReport(query: {
  from: string;
  to: string;
}): Promise<SalesExpenseReport> {
  const params = new URLSearchParams();
  params.set("from", query.from);
  params.set("to", query.to);
  return requestJson<SalesExpenseReport>(`/api/reports/sales?${params.toString()}`);
}
