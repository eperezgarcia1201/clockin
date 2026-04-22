import { useCallback } from "react";
import {
  bytesToBase64,
  fetchAdminApiJson,
} from "./api-runtime";
import { fetchCompanyOrderExportRequest } from "./company-order-actions-runtime";
import { DEFAULT_TENANT } from "./app-config";
import type { Lang } from "./copy";

export const useAdminApiActions = (params: {
  resolvedApiBase: string | null;
  loggedIn: boolean;
  activeTenant: string;
  tenantInput: string;
  activeAdminUsername: string;
  username: string;
  setResolvedApiBase: (value: string | null) => void;
  companyOrdersOfficeId: string;
  language: Lang;
}) => {
  const fetchJson = useCallback(
    (path: string, options?: RequestInit) =>
      fetchAdminApiJson({
        path,
        options,
        resolvedApiBase: params.resolvedApiBase,
        loggedIn: params.loggedIn,
        activeTenant: params.activeTenant,
        tenantInput: params.tenantInput,
        activeAdminUsername: params.activeAdminUsername,
        username: params.username,
        defaultTenant: DEFAULT_TENANT,
        onResolvedApiBase: (apiBase) => {
          if (!params.resolvedApiBase) {
            params.setResolvedApiBase(apiBase);
          }
        },
      }),
    [
      params.activeAdminUsername,
      params.activeTenant,
      params.loggedIn,
      params.resolvedApiBase,
      params.tenantInput,
      params.username,
    ],
  );

  const fetchCompanyOrderExport = useCallback(
    async (
      format: "pdf" | "csv" | "excel",
      weekStartDate: string,
      supplierName?: string | null,
    ) => {
      const result = await fetchCompanyOrderExportRequest({
        format,
        weekStartDate,
        supplierName,
        resolvedApiBase: params.resolvedApiBase,
        loggedIn: params.loggedIn,
        activeTenant: params.activeTenant,
        tenantInput: params.tenantInput,
        activeAdminUsername: params.activeAdminUsername,
        username: params.username,
        companyOrdersOfficeId: params.companyOrdersOfficeId,
        language: params.language,
        bytesToBase64,
        defaultTenant: DEFAULT_TENANT,
      });
      if (result.ok && result.resolvedApiBase && !params.resolvedApiBase) {
        params.setResolvedApiBase(result.resolvedApiBase);
      }
      return result.ok;
    },
    [
      params.activeAdminUsername,
      params.activeTenant,
      params.companyOrdersOfficeId,
      params.language,
      params.loggedIn,
      params.resolvedApiBase,
      params.tenantInput,
      params.username,
    ],
  );

  return { fetchJson, fetchCompanyOrderExport };
};
