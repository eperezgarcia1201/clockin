import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Dispatch, SetStateAction } from "react";
import { apiBaseCandidates } from "./api-runtime";
import {
  LANGUAGE_STORAGE_KEY,
  OFFICE_STORAGE_PREFIX,
  TENANT_STORAGE_KEY,
} from "./app-config";
import { resolveTenantContext } from "./tenant-context-runtime";
import type { ActiveShift, TenantContext, TenantOffice } from "./types";

type TenantActionText = {
  enterTenantNameOrSlug: string;
  tenantNotFound: string;
  unableToValidateTenant: string;
};

export const useTenantSessionActions = (params: {
  tenant: TenantContext | null;
  tenantInput: string;
  resolvedApiBase: string | null;
  language: "en" | "es";
  activeShift: ActiveShift | null;
  t: TenantActionText;
  setResolvingTenant: Dispatch<SetStateAction<boolean>>;
  setTenantStatus: Dispatch<SetStateAction<string | null>>;
  setTenantOffices: Dispatch<SetStateAction<TenantOffice[]>>;
  setSelectedOfficeId: Dispatch<SetStateAction<string | null>>;
  setTenantCompanyOrdersEnabled: Dispatch<SetStateAction<boolean>>;
  setTenantLiquorInventoryEnabled: Dispatch<SetStateAction<boolean>>;
  setLocationPickerOpen: Dispatch<SetStateAction<boolean>>;
  setLocationStatus: Dispatch<SetStateAction<string | null>>;
  setTenant: Dispatch<SetStateAction<TenantContext | null>>;
  setStatus: Dispatch<SetStateAction<string | null>>;
  setTipsStatus: Dispatch<SetStateAction<string | null>>;
  setResolvedApiBase: Dispatch<SetStateAction<string | null>>;
  setLanguage: Dispatch<SetStateAction<"en" | "es">>;
  setEmployeeName: Dispatch<SetStateAction<string>>;
}) => {
  const configureTenant = async () => {
    const value = params.tenantInput.trim();
    if (!value) {
      params.setTenantStatus(params.t.enterTenantNameOrSlug);
      return;
    }

    params.setResolvingTenant(true);
    params.setTenantStatus(null);
    try {
      const orderedBases = Array.from(
        new Set([params.resolvedApiBase, ...apiBaseCandidates].filter(Boolean)),
      ) as string[];
      const { tenant: resolvedTenant, resolvedBase } = await resolveTenantContext({
        orderedBases,
        tenantInput: value,
        tenantNotFoundMessage: params.t.tenantNotFound,
        unableToValidateTenantMessage: params.t.unableToValidateTenant,
      });

      if (resolvedBase && params.resolvedApiBase !== resolvedBase) {
        params.setResolvedApiBase(resolvedBase);
      }

      params.setTenantOffices([]);
      params.setSelectedOfficeId(null);
      params.setTenantCompanyOrdersEnabled(false);
      params.setTenantLiquorInventoryEnabled(false);
      params.setLocationPickerOpen(false);
      params.setLocationStatus(null);
      params.setTenant(resolvedTenant);
      await AsyncStorage.setItem(TENANT_STORAGE_KEY, JSON.stringify(resolvedTenant));
      params.setTenantStatus(null);
      params.setStatus(null);
      params.setTipsStatus(null);
    } catch (error) {
      params.setTenantStatus(
        error instanceof Error ? error.message : params.t.unableToValidateTenant,
      );
    } finally {
      params.setResolvingTenant(false);
    }
  };

  const toggleLanguage = () => {
    const next = params.language === "en" ? "es" : "en";
    params.setLanguage(next);
    void AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, next);
  };

  const handleSelectLocation = async (officeId: string) => {
    if (!params.tenant) {
      return;
    }

    const officeStorageKey = `${OFFICE_STORAGE_PREFIX}.${params.tenant.authOrgId}`;
    params.setSelectedOfficeId(officeId);
    params.setLocationPickerOpen(false);
    params.setLocationStatus(null);
    params.setStatus(null);
    params.setTipsStatus(null);
    if (!params.activeShift) {
      params.setEmployeeName("");
    }
    try {
      await AsyncStorage.setItem(officeStorageKey, officeId);
    } catch {
      // keep in-memory selection if persistence fails
    }
  };

  return {
    configureTenant,
    toggleLanguage,
    handleSelectLocation,
  };
};
