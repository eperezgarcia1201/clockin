import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Dispatch, SetStateAction } from "react";
import {
  OFFICE_STORAGE_PREFIX,
  TENANT_STORAGE_KEY,
  TIPS_SUBMITTED_STORAGE_KEY,
} from "./app-config";
import type {
  CompanyOrderCatalogSupplier,
  CompanyOrderRow,
  Employee,
  EmployeeViewTab,
  LiquorBottleScanRow,
  LiquorCatalogItem,
  LiquorCountRow,
  LiquorInvoiceExtractedRow,
  LiquorSheetDraft,
  TenantContext,
  TenantOffice,
  TodayScheduleResponse,
  WorkingNowRow,
} from "./types";
import type { CompanyOrderDrafts } from "./company-order-draft-helpers";

export const useTenantLogoutAction = (params: {
  tenantAuthOrgId: string | null;
  clearActiveShiftSession: (clearName?: boolean) => void;
  setTenant: Dispatch<SetStateAction<TenantContext | null>>;
  setTenantInput: Dispatch<SetStateAction<string>>;
  setTenantStatus: Dispatch<SetStateAction<string | null>>;
  setResolvingTenant: Dispatch<SetStateAction<boolean>>;
  setTenantOffices: Dispatch<SetStateAction<TenantOffice[]>>;
  setSelectedOfficeId: Dispatch<SetStateAction<string | null>>;
  setTenantCompanyOrdersEnabled: Dispatch<SetStateAction<boolean>>;
  setTenantLiquorInventoryEnabled: Dispatch<SetStateAction<boolean>>;
  setTenantLiquorPremiumEnabled: Dispatch<SetStateAction<boolean>>;
  setLoadingLocations: Dispatch<SetStateAction<boolean>>;
  setLocationStatus: Dispatch<SetStateAction<string | null>>;
  setLocationPickerOpen: Dispatch<SetStateAction<boolean>>;
  setEmployees: Dispatch<SetStateAction<Employee[]>>;
  setDirectoryEmployees: Dispatch<SetStateAction<Employee[]>>;
  setTodaySchedule: Dispatch<SetStateAction<TodayScheduleResponse | null>>;
  setTodayScheduleStatus: Dispatch<SetStateAction<string | null>>;
  setWorkingNowRows: Dispatch<SetStateAction<WorkingNowRow[]>>;
  setWorkingNowStatus: Dispatch<SetStateAction<string | null>>;
  setCompanyOrderCatalog: Dispatch<SetStateAction<CompanyOrderCatalogSupplier[]>>;
  setCompanyOrderSupplier: Dispatch<SetStateAction<string>>;
  setCompanyOrderSearch: Dispatch<SetStateAction<string>>;
  setCompanyOrderShowOnlyAdded: Dispatch<SetStateAction<boolean>>;
  setCompanyOrderVisibleCount: Dispatch<SetStateAction<number>>;
  setCompanyOrderNotes: Dispatch<SetStateAction<string>>;
  setCompanyOrderDrafts: Dispatch<SetStateAction<CompanyOrderDrafts>>;
  setCompanyOrderRows: Dispatch<SetStateAction<CompanyOrderRow[]>>;
  setCompanyOrderStatus: Dispatch<SetStateAction<string | null>>;
  setLiquorCatalog: Dispatch<SetStateAction<LiquorCatalogItem[]>>;
  setLiquorCounts: Dispatch<SetStateAction<LiquorCountRow[]>>;
  setLiquorBottleScans: Dispatch<SetStateAction<LiquorBottleScanRow[]>>;
  setLiquorSheetDrafts: Dispatch<
    SetStateAction<Record<string, LiquorSheetDraft>>
  >;
  setLiquorStatus: Dispatch<SetStateAction<string | null>>;
  setLiquorInvoiceRows: Dispatch<SetStateAction<LiquorInvoiceExtractedRow[]>>;
  setLiquorInvoiceImageDataUrl: Dispatch<SetStateAction<string>>;
  setLiquorInvoiceImageName: Dispatch<SetStateAction<string>>;
  setTipsSubmittedByDay: Dispatch<SetStateAction<Record<string, boolean>>>;
  setActiveViewTab: Dispatch<SetStateAction<EmployeeViewTab>>;
  setLastPunch: Dispatch<
    SetStateAction<
      | {
          name: string;
          type: string;
          occurredAt: Date;
        }
      | null
    >
  >;
  setStatus: Dispatch<SetStateAction<string | null>>;
  setTipsStatus: Dispatch<SetStateAction<string | null>>;
  setResolvedApiBase: Dispatch<SetStateAction<string | null>>;
}) => {
  const handleLogoutTenant = () => {
    params.clearActiveShiftSession(true);
    params.setTenant(null);
    params.setTenantInput("");
    params.setTenantStatus(null);
    params.setResolvingTenant(false);
    params.setTenantOffices([]);
    params.setSelectedOfficeId(null);
    params.setTenantCompanyOrdersEnabled(false);
    params.setTenantLiquorInventoryEnabled(false);
    params.setTenantLiquorPremiumEnabled(false);
    params.setLoadingLocations(false);
    params.setLocationStatus(null);
    params.setLocationPickerOpen(false);

    params.setEmployees([]);
    params.setDirectoryEmployees([]);
    params.setTodaySchedule(null);
    params.setTodayScheduleStatus(null);
    params.setWorkingNowRows([]);
    params.setWorkingNowStatus(null);
    params.setCompanyOrderCatalog([]);
    params.setCompanyOrderSupplier("");
    params.setCompanyOrderSearch("");
    params.setCompanyOrderShowOnlyAdded(false);
    params.setCompanyOrderVisibleCount(16);
    params.setCompanyOrderNotes("");
    params.setCompanyOrderDrafts({});
    params.setCompanyOrderRows([]);
    params.setCompanyOrderStatus(null);
    params.setLiquorCatalog([]);
    params.setLiquorCounts([]);
    params.setLiquorBottleScans([]);
    params.setLiquorSheetDrafts({});
    params.setLiquorStatus(null);
    params.setLiquorInvoiceRows([]);
    params.setLiquorInvoiceImageDataUrl("");
    params.setLiquorInvoiceImageName("");
    params.setTipsSubmittedByDay({});
    params.setActiveViewTab("clock");
    params.setLastPunch(null);
    params.setStatus(null);
    params.setTipsStatus(null);
    params.setResolvedApiBase(null);

    const storageKeys = [TENANT_STORAGE_KEY, TIPS_SUBMITTED_STORAGE_KEY];
    if (params.tenantAuthOrgId) {
      storageKeys.push(`${OFFICE_STORAGE_PREFIX}.${params.tenantAuthOrgId}`);
    }
    void AsyncStorage.multiRemove(storageKeys);
  };

  return { handleLogoutTenant };
};
