type TenantPayload = Record<string, unknown>;

type DeleteTenantOptions = {
  force?: boolean;
};

export type TenantExportFormat = "summary" | "excel" | "sql";

export function fetchTenantAccountsRequest(): Promise<Response> {
  return fetch("/api/tenant-accounts", { cache: "no-store" });
}

export function createTenantAccountRequest(
  payload: TenantPayload,
): Promise<Response> {
  return fetch("/api/tenant-accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateTenantAccountRequest(
  tenantId: string,
  payload: TenantPayload,
): Promise<Response> {
  return fetch(`/api/tenant-accounts/${encodeURIComponent(tenantId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteTenantAccountRequest(
  tenantId: string,
  options?: DeleteTenantOptions,
): Promise<Response> {
  const query = options?.force ? "?force=true" : "";
  return fetch(`/api/tenant-accounts/${encodeURIComponent(tenantId)}${query}`, {
    method: "DELETE",
  });
}

export function fetchTenantDeletionReportRequest(
  tenantId: string,
): Promise<Response> {
  return fetch(
    `/api/tenant-accounts/${encodeURIComponent(tenantId)}/deletion-report`,
    { cache: "no-store" },
  );
}

export function fetchTenantDeletionExportRequest(
  tenantId: string,
  format: TenantExportFormat,
): Promise<Response> {
  return fetch(
    `/api/tenant-accounts/${encodeURIComponent(tenantId)}/deletion-export?format=${encodeURIComponent(format)}`,
  );
}
