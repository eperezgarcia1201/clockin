import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, type Dispatch, type SetStateAction } from "react";
import { apiBaseCandidates } from "./api-runtime";
import { normalizeEmployeeRows } from "./app-helpers";
import { OFFICE_STORAGE_PREFIX } from "./app-config";
import {
  fetchTenantEmployeeContext,
  normalizeTenantOffices,
  pickPreferredTenantOfficeId,
} from "./tenant-context-runtime";
import type { Employee, TenantContext, TenantOffice } from "./types";

export const useTenantLocationEffects = (params: {
  tenant: TenantContext | null;
  resolvedApiBase: string | null;
  unableToLoadLocationsMessage: string;
  setTenantOffices: Dispatch<SetStateAction<TenantOffice[]>>;
  setSelectedOfficeId: Dispatch<SetStateAction<string | null>>;
  setTenantCompanyOrdersEnabled: Dispatch<SetStateAction<boolean>>;
  setTenantLiquorInventoryEnabled: Dispatch<SetStateAction<boolean>>;
  setTenantLiquorPremiumEnabled: Dispatch<SetStateAction<boolean>>;
  setDirectoryEmployees: Dispatch<SetStateAction<Employee[]>>;
  setLocationPickerOpen: Dispatch<SetStateAction<boolean>>;
  setLocationStatus: Dispatch<SetStateAction<string | null>>;
  setLoadingLocations: Dispatch<SetStateAction<boolean>>;
  setResolvedApiBase: Dispatch<SetStateAction<string | null>>;
}) => {
  useEffect(() => {
    let active = true;

    const loadTenantLocations = async () => {
      if (!params.tenant) {
        if (active) {
          params.setTenantOffices([]);
          params.setSelectedOfficeId(null);
          params.setTenantCompanyOrdersEnabled(false);
          params.setTenantLiquorInventoryEnabled(false);
          params.setTenantLiquorPremiumEnabled(false);
          params.setDirectoryEmployees([]);
          params.setLocationPickerOpen(false);
          params.setLocationStatus(null);
          params.setLoadingLocations(false);
        }
        return;
      }

      params.setLoadingLocations(true);
      params.setLocationStatus(null);
      try {
        const orderedBases = Array.from(
          new Set([params.resolvedApiBase, ...apiBaseCandidates].filter(Boolean)),
        ) as string[];
        const { payload, resolvedBase } = await fetchTenantEmployeeContext({
          orderedBases,
          tenantLookupValue:
            params.tenant.slug || params.tenant.input || params.tenant.name,
          unableToLoadLocationsMessage: params.unableToLoadLocationsMessage,
        });
        const offices = normalizeTenantOffices(payload);
        const contextEmployees = normalizeEmployeeRows(payload.employees);
        const officeStorageKey = `${OFFICE_STORAGE_PREFIX}.${params.tenant.authOrgId}`;
        const savedOfficeId = (
          await AsyncStorage.getItem(officeStorageKey)
        )?.trim();
        const nextOfficeId = pickPreferredTenantOfficeId(
          offices,
          savedOfficeId || null,
        );

        if (nextOfficeId) {
          await AsyncStorage.setItem(officeStorageKey, nextOfficeId);
        } else {
          await AsyncStorage.removeItem(officeStorageKey);
        }

        if (!active) {
          return;
        }

        if (resolvedBase && params.resolvedApiBase !== resolvedBase) {
          params.setResolvedApiBase(resolvedBase);
        }
        params.setTenantOffices(offices);
        params.setTenantCompanyOrdersEnabled(
          typeof payload.companyOrdersEnabled === "boolean"
            ? payload.companyOrdersEnabled
            : true,
        );
        params.setTenantLiquorInventoryEnabled(
          typeof payload.liquorInventoryEnabled === "boolean"
            ? payload.liquorInventoryEnabled
            : true,
        );
        params.setTenantLiquorPremiumEnabled(
          typeof payload.premiumFeaturesEnabled === "boolean"
            ? payload.premiumFeaturesEnabled
            : false,
        );
        params.setDirectoryEmployees(contextEmployees);
        params.setSelectedOfficeId(nextOfficeId);
        params.setLocationPickerOpen(false);
      } catch (error) {
        if (!active) {
          return;
        }
        params.setTenantOffices((prev) => prev);
        params.setTenantCompanyOrdersEnabled(false);
        params.setTenantLiquorInventoryEnabled(false);
        params.setTenantLiquorPremiumEnabled(false);
        params.setLocationPickerOpen(false);
        params.setLocationStatus(
          error instanceof Error
            ? error.message
            : params.unableToLoadLocationsMessage,
        );
      } finally {
        if (active) {
          params.setLoadingLocations(false);
        }
      }
    };

    void loadTenantLocations();

    return () => {
      active = false;
    };
  }, [
    params.resolvedApiBase,
    params.tenant,
    params.unableToLoadLocationsMessage,
    params.setTenantOffices,
    params.setSelectedOfficeId,
    params.setTenantCompanyOrdersEnabled,
    params.setTenantLiquorInventoryEnabled,
    params.setTenantLiquorPremiumEnabled,
    params.setDirectoryEmployees,
    params.setLocationPickerOpen,
    params.setLocationStatus,
    params.setLoadingLocations,
    params.setResolvedApiBase,
  ]);
};
