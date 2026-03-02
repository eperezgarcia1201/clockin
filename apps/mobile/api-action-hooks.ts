import { useCallback, type Dispatch, type SetStateAction } from "react";
import { apiBaseCandidates } from "./api-runtime";
import { downloadCompanyOrderExport } from "./company-order-export";
import type { TenantContext } from "./types";

type ApiActionText = {
  tenantNotConfigured: string;
  unableLocalDownloadStorage: string;
  downloadReady: string;
};

export const useApiActions = (params: {
  tenant: TenantContext | null;
  resolvedApiBase: string | null;
  selectedOfficeId: string | null;
  t: ApiActionText;
  setResolvedApiBase: Dispatch<SetStateAction<string | null>>;
}) => {
  const fetchJson = useCallback(
    async (path: string, options?: RequestInit) => {
      if (!params.tenant) {
        throw new Error(params.t.tenantNotConfigured);
      }

      const orderedBases = params.resolvedApiBase
        ? [params.resolvedApiBase]
        : (Array.from(new Set(apiBaseCandidates.filter(Boolean))) as string[]);
      let lastError: Error | null = null;

      for (const apiBase of orderedBases) {
        try {
          const response = await fetch(`${apiBase}${path}`, {
            ...options,
            headers: {
              "Content-Type": "application/json",
              "x-dev-user-id": "dev-user",
              "x-dev-tenant-id": params.tenant.authOrgId,
              "x-dev-email": "dev@clockin.local",
              "x-dev-name": "Employee App",
              ...(options?.headers || {}),
            },
          });

          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            const responseError = new Error(
              data?.message || data?.error || "Request failed",
            );
            if (!params.resolvedApiBase) {
              params.setResolvedApiBase(apiBase);
            }
            if (response.status >= 500 || response.status === 429) {
              lastError = responseError;
              continue;
            }
            throw responseError;
          }

          if (!params.resolvedApiBase) {
            params.setResolvedApiBase(apiBase);
          }
          return response.json();
        } catch (error) {
          if (error instanceof Error) {
            lastError = error;
            if (
              /network request failed|fetch failed|load failed/i.test(error.message)
            ) {
              continue;
            }
            throw error;
          }
          lastError = new Error("Request failed");
          throw lastError;
        }
      }

      const tried = orderedBases.join(", ");
      const message = lastError?.message || "Unable to reach ClockIn API.";
      throw new Error(tried ? `${message} Tried: ${tried}` : message);
    },
    [
      params.resolvedApiBase,
      params.t.tenantNotConfigured,
      params.tenant,
      params.setResolvedApiBase,
    ],
  );

  const fetchCompanyOrderExport = useCallback(
    async (
      format: "pdf" | "csv" | "excel",
      weekStartDate: string,
      extraHeaders?: Record<string, string>,
    ) => {
      if (!params.tenant) {
        return false;
      }
      const orderedBases = params.resolvedApiBase
        ? [params.resolvedApiBase]
        : (Array.from(new Set(apiBaseCandidates.filter(Boolean))) as string[]);
      const result = await downloadCompanyOrderExport({
        format,
        weekStartDate,
        orderedBases,
        selectedOfficeId: params.selectedOfficeId,
        tenantAuthOrgId: params.tenant.authOrgId,
        extraHeaders,
        unableLocalDownloadStorageMessage: params.t.unableLocalDownloadStorage,
        downloadReadyMessage: params.t.downloadReady,
      });
      if (result.ok && result.resolvedApiBase && !params.resolvedApiBase) {
        params.setResolvedApiBase(result.resolvedApiBase);
      }
      return result.ok;
    },
    [
      params.resolvedApiBase,
      params.selectedOfficeId,
      params.t.downloadReady,
      params.t.unableLocalDownloadStorage,
      params.tenant,
      params.setResolvedApiBase,
    ],
  );

  return {
    fetchJson,
    fetchCompanyOrderExport,
  };
};
