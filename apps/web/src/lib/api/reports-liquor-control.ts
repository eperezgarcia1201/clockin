type QueryInput = URLSearchParams | string;

const withQuery = (path: string, query: QueryInput) => {
  const suffix = typeof query === "string" ? query : query.toString();
  return suffix ? `${path}?${suffix}` : path;
};

type JsonPayload = Record<string, unknown>;

export function fetchLiquorAccessRequest(): Promise<Response> {
  return fetch("/api/access/me", { cache: "no-store" });
}

export function listLiquorBottleScansRequest(
  query: QueryInput,
): Promise<Response> {
  return fetch(withQuery("/api/liquor-inventory/bottle-scans", query), {
    cache: "no-store",
  });
}

export function listLiquorKindsRequest(): Promise<Response> {
  return fetch("/api/liquor-inventory/kinds", { cache: "no-store" });
}

export function listLiquorCatalogRequest(
  query: QueryInput = "includeInactive=1",
): Promise<Response> {
  return fetch(withQuery("/api/liquor-inventory/catalog", query), {
    cache: "no-store",
  });
}

export function listLiquorMovementsRequest(
  query: QueryInput,
): Promise<Response> {
  return fetch(withQuery("/api/liquor-inventory/movements", query), {
    cache: "no-store",
  });
}

export function listLiquorCountsRequest(query: QueryInput): Promise<Response> {
  return fetch(withQuery("/api/liquor-inventory/counts", query), {
    cache: "no-store",
  });
}

export function fetchLiquorMonthlyReportRequest(
  query: QueryInput,
): Promise<Response> {
  return fetch(withQuery("/api/liquor-inventory/report/monthly", query), {
    cache: "no-store",
  });
}

export function fetchLiquorYearlyControlRequest(
  query: QueryInput,
): Promise<Response> {
  return fetch(withQuery("/api/liquor-inventory/control/yearly", query), {
    cache: "no-store",
  });
}

export function fetchOfficesRequest(): Promise<Response> {
  return fetch("/api/offices", { cache: "no-store" });
}

export function createLiquorCatalogItemRequest(
  payload: JsonPayload,
): Promise<Response> {
  return fetch("/api/liquor-inventory/catalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function createLiquorKindRequest(payload: JsonPayload): Promise<Response> {
  return fetch("/api/liquor-inventory/kinds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteLiquorKindRequest(name: string): Promise<Response> {
  return fetch(`/api/liquor-inventory/kinds/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export function createLiquorMovementRequest(
  payload: JsonPayload,
): Promise<Response> {
  return fetch("/api/liquor-inventory/movements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function createLiquorCountRequest(payload: JsonPayload): Promise<Response> {
  return fetch("/api/liquor-inventory/counts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateLiquorCatalogItemRequest(
  itemId: string,
  payload: JsonPayload,
): Promise<Response> {
  return fetch(`/api/liquor-inventory/catalog/${encodeURIComponent(itemId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function lookupLiquorCatalogByUpcRequest(upc: string): Promise<Response> {
  return fetch(`/api/liquor-inventory/catalog/upc/${encodeURIComponent(upc)}`, {
    cache: "no-store",
  });
}

export function analyzeLiquorBottleScanRequest(
  payload: JsonPayload,
): Promise<Response> {
  return fetch("/api/liquor-inventory/bottle-scans/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function analyzeLiquorInvoiceRequest(
  payload: JsonPayload,
): Promise<Response> {
  return fetch("/api/liquor-inventory/invoices/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function applyLiquorInvoiceRequest(payload: JsonPayload): Promise<Response> {
  return fetch("/api/liquor-inventory/invoices/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
