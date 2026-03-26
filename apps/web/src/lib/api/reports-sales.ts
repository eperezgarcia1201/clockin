type QueryInput = URLSearchParams | string;

const withQuery = (path: string, query: QueryInput) => {
  const suffix = typeof query === "string" ? query : query.toString();
  return suffix ? `${path}?${suffix}` : path;
};

export function fetchSalesSettingsRequest(): Promise<Response> {
  return fetch("/api/settings", { cache: "no-store" });
}

export function fetchSalesAccessRequest(): Promise<Response> {
  return fetch("/api/access/me", { cache: "no-store" });
}

export function fetchSalesReportRequest(query: QueryInput): Promise<Response> {
  return fetch(withQuery("/api/reports/sales", query), { cache: "no-store" });
}

type SalesReportPayload = Record<string, unknown>;

export function createSalesReportRequest(
  payload: SalesReportPayload,
): Promise<Response> {
  return fetch("/api/reports/sales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

type SalesExpensePayload = Record<string, unknown>;

export function createSalesExpenseRequest(
  payload: SalesExpensePayload,
): Promise<Response> {
  return fetch("/api/reports/sales/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateSalesExpenseRequest(
  expenseId: string,
  payload: SalesExpensePayload,
): Promise<Response> {
  return fetch(`/api/reports/sales/expenses/${encodeURIComponent(expenseId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteSalesExpenseRequest(expenseId: string): Promise<Response> {
  return fetch(`/api/reports/sales/expenses/${encodeURIComponent(expenseId)}`, {
    method: "DELETE",
  });
}

export function uploadSalesExpenseReceiptRequest(
  expenseId: string,
  formData: FormData,
): Promise<Response> {
  return fetch(
    `/api/reports/sales/expenses/${encodeURIComponent(expenseId)}/receipt`,
    {
      method: "POST",
      body: formData,
    },
  );
}
