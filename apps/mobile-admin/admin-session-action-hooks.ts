import { useCallback } from "react";
import { getCurrentWeekStartDateKey, todayDateKey } from "./app-helpers";
import { defaultAccessPermissions } from "./app-state-helpers";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ADMIN_BIOMETRIC_ENABLED_STORAGE_KEY,
  ADMIN_LOGIN_CONTEXT_STORAGE_KEY,
  ADMIN_SESSION_STORAGE_KEY,
  ADMIN_TENANT_STORAGE_KEY,
} from "./app-config";

export const useAdminSessionActions = (params: {
  scopedLocationId: string;
  setLoggedIn: (value: boolean) => void;
  setPermissions: (value: ReturnType<typeof defaultAccessPermissions>) => void;
  setMultiLocationEnabled: (value: boolean) => void;
  setActiveLocationId: (value: string) => void;
  setSessionManagerEmployeeId: (value: string | null) => void;
  setSessionManagerOfficeId: (value: string | null) => void;
  setManagerClockExempt: (value: boolean) => void;
  setManagerPin: (value: string) => void;
  setManagerPunchLoading: (value: boolean) => void;
  setManagerPunchStatus: (value: string | null) => void;
  setManagerPendingTipWorkDate: (value: string | null) => void;
  setManagerCashTips: (value: string) => void;
  setManagerCreditCardTips: (value: string) => void;
  setManagerTipSaving: (value: boolean) => void;
  setPushRegisteredTenant: (value: string) => void;
  setActiveTenant: (value: string) => void;
  setActiveTenantLabel: (value: string) => void;
  setActiveAdminUsername: (value: string) => void;
  setTenantInput: (value: string) => void;
  setUsername: (value: string) => void;
  setPassword: (value: string) => void;
  setScreen: (value: any) => void;
  setTodaySchedule: (value: any) => void;
  setTodayScheduleStatus: (value: any) => void;
  setTodayRoleFilter: (value: string) => void;
  setCompanyOrderCatalog: (value: any) => void;
  setCompanyOrderSupplier: (value: string) => void;
  setCompanyOrderSearch: (value: string) => void;
  setCompanyOrderNotes: (value: string) => void;
  setCompanyOrderDrafts: (value: any) => void;
  setCompanyOrderRows: (value: any) => void;
  setCompanyOrderExportingFormat: (value: "pdf" | "csv" | "excel" | null) => void;
  setLastSubmittedCompanyOrderWeekStart: (value: string) => void;
  setCompanyOrderStatus: (value: any) => void;
  setLiquorInventoryEnabled: (value: boolean) => void;
  setLiquorPremiumEnabled: (value: boolean) => void;
  setLiquorCatalog: (value: any) => void;
  setLiquorCounts: (value: any) => void;
  setLiquorBottleScans: (value: any) => void;
  setLiquorSheetDrafts: (value: any) => void;
  setLiquorCountDate: (value: string) => void;
  setLiquorScanContainerKey: (value: string) => void;
  setLiquorInvoiceDate: (value: string) => void;
  setLiquorInvoiceNumber: (value: string) => void;
  setLiquorInvoiceSupplier: (value: string) => void;
  setLiquorInvoiceNotes: (value: string) => void;
  setLiquorInvoiceIncludePurchases: (value: boolean) => void;
  setLiquorInvoiceImageDataUrl: (value: string) => void;
  setLiquorInvoiceImageName: (value: string) => void;
  setLiquorInvoiceRows: (value: any) => void;
  setLiquorInvoiceAnalyzing: (value: boolean) => void;
  setLiquorInvoiceApplying: (value: boolean) => void;
  setLiquorStatus: (value: any) => void;
  setLiquorLoading: (value: boolean) => void;
  setLiquorSavingItemId: (value: string | null) => void;
  setLiquorSavingCountItemId: (value: string | null) => void;
  setLiquorAnalyzingItemId: (value: string | null) => void;
  setRecentPunchRows: (value: any) => void;
  setAdminNotificationStatus: (value: string | null) => void;
  setAdminNotificationSaving: (value: boolean) => void;
  setCurrentAdminPushDevice: (value: any) => void;
  setTenantTimeZone: (value: string) => void;
  setEmployeeMessageEmployeeId: (value: string) => void;
  setEmployeeMessageSubject: (value: string) => void;
  setEmployeeMessageBody: (value: string) => void;
  setEmployeeMessageStatus: (value: any) => void;
  setResolvedApiBase: (value: string | null) => void;
}) => {
  const appendOfficeScope = useCallback(
    (path: string) => {
      if (!params.scopedLocationId) {
        return path;
      }
      const joiner = path.includes("?") ? "&" : "?";
      return `${path}${joiner}officeId=${encodeURIComponent(params.scopedLocationId)}`;
    },
    [params.scopedLocationId],
  );

  const clearAdminSession = useCallback(() => {
    params.setLoggedIn(false);
    params.setPermissions(defaultAccessPermissions());
    params.setMultiLocationEnabled(false);
    params.setSessionManagerEmployeeId(null);
    params.setSessionManagerOfficeId(null);
    params.setManagerClockExempt(false);
    params.setManagerPin("");
    params.setManagerPunchLoading(false);
    params.setManagerPunchStatus(null);
    params.setManagerPendingTipWorkDate(null);
    params.setManagerCashTips("0");
    params.setManagerCreditCardTips("0");
    params.setManagerTipSaving(false);
    params.setPushRegisteredTenant("");
    params.setActiveTenant("");
    params.setActiveTenantLabel("");
    params.setActiveAdminUsername("");
    params.setPassword("");
    params.setScreen("dashboard");
    params.setTodaySchedule(null);
    params.setTodayScheduleStatus(null);
    params.setTodayRoleFilter("All");
    params.setCompanyOrderCatalog([]);
    params.setCompanyOrderSupplier("");
    params.setCompanyOrderSearch("");
    params.setCompanyOrderNotes("");
    params.setCompanyOrderDrafts({});
    params.setCompanyOrderRows([]);
    params.setCompanyOrderExportingFormat(null);
    params.setLastSubmittedCompanyOrderWeekStart(getCurrentWeekStartDateKey());
    params.setCompanyOrderStatus(null);
    params.setLiquorInventoryEnabled(false);
    params.setLiquorPremiumEnabled(false);
    params.setLiquorCatalog([]);
    params.setLiquorCounts([]);
    params.setLiquorBottleScans([]);
    params.setLiquorSheetDrafts({});
    params.setLiquorCountDate(todayDateKey());
    params.setLiquorScanContainerKey("");
    params.setLiquorInvoiceDate(todayDateKey());
    params.setLiquorInvoiceNumber("");
    params.setLiquorInvoiceSupplier("");
    params.setLiquorInvoiceNotes("");
    params.setLiquorInvoiceIncludePurchases(true);
    params.setLiquorInvoiceImageDataUrl("");
    params.setLiquorInvoiceImageName("");
    params.setLiquorInvoiceRows([]);
    params.setLiquorInvoiceAnalyzing(false);
    params.setLiquorInvoiceApplying(false);
    params.setLiquorStatus(null);
    params.setLiquorLoading(false);
    params.setLiquorSavingItemId(null);
    params.setLiquorSavingCountItemId(null);
    params.setLiquorAnalyzingItemId(null);
    params.setRecentPunchRows([]);
    params.setAdminNotificationStatus(null);
    params.setAdminNotificationSaving(false);
    params.setCurrentAdminPushDevice(null);
    params.setTenantTimeZone("");
    params.setEmployeeMessageEmployeeId("");
    params.setEmployeeMessageSubject("");
    params.setEmployeeMessageBody("");
    params.setEmployeeMessageStatus(null);
    params.setResolvedApiBase(null);
  }, []);

  const forgetSavedAdmin = useCallback(() => {
    params.setTenantInput("");
    params.setUsername("");
    params.setPassword("");
    params.setActiveLocationId("");
    params.setActiveTenant("");
    params.setActiveTenantLabel("");
    params.setActiveAdminUsername("");
    void AsyncStorage.multiRemove([
      ADMIN_BIOMETRIC_ENABLED_STORAGE_KEY,
      ADMIN_TENANT_STORAGE_KEY,
      ADMIN_LOGIN_CONTEXT_STORAGE_KEY,
      ADMIN_SESSION_STORAGE_KEY,
    ]);
  }, []);

  return { appendOfficeScope, clearAdminSession, forgetSavedAdmin };
};
