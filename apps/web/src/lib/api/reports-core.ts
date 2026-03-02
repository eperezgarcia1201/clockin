type QueryInput = URLSearchParams | string;

const withQuery = (path: string, query: QueryInput) => {
  const suffix = typeof query === "string" ? query : query.toString();
  return suffix ? `${path}?${suffix}` : path;
};

export function fetchAccessMeRequest(): Promise<Response> {
  return fetch("/api/access/me", { cache: "no-store" });
}

export function fetchEmployeesRequest(): Promise<Response> {
  return fetch("/api/employees", { cache: "no-store" });
}

export function fetchAuditReportRequest(query: QueryInput): Promise<Response> {
  return fetch(withQuery("/api/reports/audit", query), { cache: "no-store" });
}

export function fetchDailyReportRequest(query: QueryInput): Promise<Response> {
  return fetch(withQuery("/api/reports/daily", query), { cache: "no-store" });
}

export function fetchHoursReportRequest(query: QueryInput): Promise<Response> {
  return fetch(withQuery("/api/reports/hours", query), { cache: "no-store" });
}

export function fetchPayrollReportRequest(query: QueryInput): Promise<Response> {
  return fetch(withQuery("/api/reports/payroll", query), { cache: "no-store" });
}

export function fetchTipsReportRequest(query: QueryInput): Promise<Response> {
  return fetch(withQuery("/api/reports/tips", query), { cache: "no-store" });
}

export function fetchComparisonReportRequest(
  query: QueryInput,
): Promise<Response> {
  return fetch(withQuery("/api/reports/comparison", query), {
    cache: "no-store",
  });
}
