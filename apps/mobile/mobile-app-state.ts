import { useState } from "react";
import { type Language } from "./i18n";
import { ALL_ROLE_FILTER, getCurrentWeekStartDateKey, todayDateKey } from "./app-helpers";
import { actions } from "./app-config";
import type { CompanyOrderDrafts } from "./company-order-draft-helpers";
import type {
  ActiveShift,
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

export function useMobileAppState() {
  const [language, setLanguage] = useState<Language>("en");
  const [tenant, setTenant] = useState<TenantContext | null>(null);
  const [tenantInput, setTenantInput] = useState("");
  const [tenantStatus, setTenantStatus] = useState<string | null>(null);
  const [resolvingTenant, setResolvingTenant] = useState(false);
  const [tenantHydrated, setTenantHydrated] = useState(false);
  const [tenantOffices, setTenantOffices] = useState<TenantOffice[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(null);
  const [tenantCompanyOrdersEnabled, setTenantCompanyOrdersEnabled] =
    useState(false);
  const [tenantLiquorInventoryEnabled, setTenantLiquorInventoryEnabled] =
    useState(false);
  const [tenantLiquorPremiumEnabled, setTenantLiquorPremiumEnabled] =
    useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [directoryEmployees, setDirectoryEmployees] = useState<Employee[]>([]);
  const [employeeName, setEmployeeName] = useState("");
  const [pin, setPin] = useState("");
  const [cashTips, setCashTips] = useState("0");
  const [creditCardTips, setCreditCardTips] = useState("0");
  const [punchType, setPunchType] = useState<(typeof actions)[number]>("IN");
  const [status, setStatus] = useState<string | null>(null);
  const [tipsStatus, setTipsStatus] = useState<string | null>(null);
  const [tipsAlert, setTipsAlert] = useState(false);
  const [serverTipsRequired, setServerTipsRequired] = useState(false);
  const [pendingTipWorkDate, setPendingTipWorkDate] = useState<string | null>(
    null,
  );
  const [tipsSubmittedByDay, setTipsSubmittedByDay] = useState<
    Record<string, boolean>
  >({});
  const [tipsReminderEmployeeId, setTipsReminderEmployeeId] = useState<
    string | null
  >(null);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingTips, setSavingTips] = useState(false);
  const [resolvedApiBase, setResolvedApiBase] = useState<string | null>(null);
  const [lastPunch, setLastPunch] = useState<{
    name: string;
    type: string;
    occurredAt: Date;
  } | null>(null);
  const [todaySchedule, setTodaySchedule] =
    useState<TodayScheduleResponse | null>(null);
  const [todayScheduleStatus, setTodayScheduleStatus] = useState<string | null>(
    null,
  );
  const [todayScheduleLoading, setTodayScheduleLoading] = useState(false);
  const [todayRoleFilter, setTodayRoleFilter] = useState(ALL_ROLE_FILTER);
  const [workingNowRows, setWorkingNowRows] = useState<WorkingNowRow[]>([]);
  const [workingNowStatus, setWorkingNowStatus] = useState<string | null>(null);
  const [workingNowLoading, setWorkingNowLoading] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<EmployeeViewTab>("clock");
  const [companyOrderCatalog, setCompanyOrderCatalog] = useState<
    CompanyOrderCatalogSupplier[]
  >([]);
  const [companyOrderSupplier, setCompanyOrderSupplier] = useState("");
  const [companyOrderSearch, setCompanyOrderSearch] = useState("");
  const [companyOrderShowOnlyAdded, setCompanyOrderShowOnlyAdded] =
    useState(false);
  const [companyOrderVisibleCount, setCompanyOrderVisibleCount] = useState(16);
  const [companyOrderNotes, setCompanyOrderNotes] = useState("");
  const [companyOrderDrafts, setCompanyOrderDrafts] = useState<
    CompanyOrderDrafts
  >({});
  const [companyOrderRows, setCompanyOrderRows] = useState<CompanyOrderRow[]>(
    [],
  );
  const [companyOrderLoading, setCompanyOrderLoading] = useState(false);
  const [companyOrderSaving, setCompanyOrderSaving] = useState(false);
  const [companyOrderExportingFormat, setCompanyOrderExportingFormat] =
    useState<"pdf" | "csv" | "excel" | null>(null);
  const [
    lastSubmittedCompanyOrderWeekStart,
    setLastSubmittedCompanyOrderWeekStart,
  ] = useState(getCurrentWeekStartDateKey());
  const [companyOrderStatus, setCompanyOrderStatus] = useState<string | null>(
    null,
  );
  const [liquorCatalog, setLiquorCatalog] = useState<LiquorCatalogItem[]>([]);
  const [liquorCounts, setLiquorCounts] = useState<LiquorCountRow[]>([]);
  const [liquorBottleScans, setLiquorBottleScans] = useState<
    LiquorBottleScanRow[]
  >([]);
  const [liquorSheetDrafts, setLiquorSheetDrafts] = useState<
    Record<string, LiquorSheetDraft>
  >({});
  const [liquorCountDate, setLiquorCountDate] = useState(todayDateKey());
  const [liquorScanContainerKey, setLiquorScanContainerKey] = useState("");
  const [liquorInvoiceDate, setLiquorInvoiceDate] = useState(todayDateKey());
  const [liquorInvoiceNumber, setLiquorInvoiceNumber] = useState("");
  const [liquorInvoiceSupplier, setLiquorInvoiceSupplier] = useState("");
  const [liquorInvoiceNotes, setLiquorInvoiceNotes] = useState("");
  const [liquorInvoiceIncludePurchases, setLiquorInvoiceIncludePurchases] =
    useState(true);
  const [liquorInvoiceImageDataUrl, setLiquorInvoiceImageDataUrl] =
    useState("");
  const [liquorInvoiceImageName, setLiquorInvoiceImageName] = useState("");
  const [liquorInvoiceRows, setLiquorInvoiceRows] = useState<
    LiquorInvoiceExtractedRow[]
  >([]);
  const [liquorInvoiceAnalyzing, setLiquorInvoiceAnalyzing] = useState(false);
  const [liquorInvoiceApplying, setLiquorInvoiceApplying] = useState(false);
  const [liquorStatus, setLiquorStatus] = useState<string | null>(null);
  const [liquorLoading, setLiquorLoading] = useState(false);
  const [liquorSavingItemId, setLiquorSavingItemId] = useState<string | null>(
    null,
  );
  const [liquorSavingCountItemId, setLiquorSavingCountItemId] = useState<
    string | null
  >(null);
  const [liquorAnalyzingItemId, setLiquorAnalyzingItemId] = useState<
    string | null
  >(null);
  const [keyboardInset, setKeyboardInset] = useState(0);

  return {
    language,
    setLanguage,
    tenant,
    setTenant,
    tenantInput,
    setTenantInput,
    tenantStatus,
    setTenantStatus,
    resolvingTenant,
    setResolvingTenant,
    tenantHydrated,
    setTenantHydrated,
    tenantOffices,
    setTenantOffices,
    selectedOfficeId,
    setSelectedOfficeId,
    tenantCompanyOrdersEnabled,
    setTenantCompanyOrdersEnabled,
    tenantLiquorInventoryEnabled,
    setTenantLiquorInventoryEnabled,
    tenantLiquorPremiumEnabled,
    setTenantLiquorPremiumEnabled,
    loadingLocations,
    setLoadingLocations,
    locationStatus,
    setLocationStatus,
    locationPickerOpen,
    setLocationPickerOpen,
    employees,
    setEmployees,
    directoryEmployees,
    setDirectoryEmployees,
    employeeName,
    setEmployeeName,
    pin,
    setPin,
    cashTips,
    setCashTips,
    creditCardTips,
    setCreditCardTips,
    punchType,
    setPunchType,
    status,
    setStatus,
    tipsStatus,
    setTipsStatus,
    tipsAlert,
    setTipsAlert,
    serverTipsRequired,
    setServerTipsRequired,
    pendingTipWorkDate,
    setPendingTipWorkDate,
    tipsSubmittedByDay,
    setTipsSubmittedByDay,
    tipsReminderEmployeeId,
    setTipsReminderEmployeeId,
    activeShift,
    setActiveShift,
    loading,
    setLoading,
    savingTips,
    setSavingTips,
    resolvedApiBase,
    setResolvedApiBase,
    lastPunch,
    setLastPunch,
    todaySchedule,
    setTodaySchedule,
    todayScheduleStatus,
    setTodayScheduleStatus,
    todayScheduleLoading,
    setTodayScheduleLoading,
    todayRoleFilter,
    setTodayRoleFilter,
    workingNowRows,
    setWorkingNowRows,
    workingNowStatus,
    setWorkingNowStatus,
    workingNowLoading,
    setWorkingNowLoading,
    activeViewTab,
    setActiveViewTab,
    companyOrderCatalog,
    setCompanyOrderCatalog,
    companyOrderSupplier,
    setCompanyOrderSupplier,
    companyOrderSearch,
    setCompanyOrderSearch,
    companyOrderShowOnlyAdded,
    setCompanyOrderShowOnlyAdded,
    companyOrderVisibleCount,
    setCompanyOrderVisibleCount,
    companyOrderNotes,
    setCompanyOrderNotes,
    companyOrderDrafts,
    setCompanyOrderDrafts,
    companyOrderRows,
    setCompanyOrderRows,
    companyOrderLoading,
    setCompanyOrderLoading,
    companyOrderSaving,
    setCompanyOrderSaving,
    companyOrderExportingFormat,
    setCompanyOrderExportingFormat,
    lastSubmittedCompanyOrderWeekStart,
    setLastSubmittedCompanyOrderWeekStart,
    companyOrderStatus,
    setCompanyOrderStatus,
    liquorCatalog,
    setLiquorCatalog,
    liquorCounts,
    setLiquorCounts,
    liquorBottleScans,
    setLiquorBottleScans,
    liquorSheetDrafts,
    setLiquorSheetDrafts,
    liquorCountDate,
    setLiquorCountDate,
    liquorScanContainerKey,
    setLiquorScanContainerKey,
    liquorInvoiceDate,
    setLiquorInvoiceDate,
    liquorInvoiceNumber,
    setLiquorInvoiceNumber,
    liquorInvoiceSupplier,
    setLiquorInvoiceSupplier,
    liquorInvoiceNotes,
    setLiquorInvoiceNotes,
    liquorInvoiceIncludePurchases,
    setLiquorInvoiceIncludePurchases,
    liquorInvoiceImageDataUrl,
    setLiquorInvoiceImageDataUrl,
    liquorInvoiceImageName,
    setLiquorInvoiceImageName,
    liquorInvoiceRows,
    setLiquorInvoiceRows,
    liquorInvoiceAnalyzing,
    setLiquorInvoiceAnalyzing,
    liquorInvoiceApplying,
    setLiquorInvoiceApplying,
    liquorStatus,
    setLiquorStatus,
    liquorLoading,
    setLiquorLoading,
    liquorSavingItemId,
    setLiquorSavingItemId,
    liquorSavingCountItemId,
    setLiquorSavingCountItemId,
    liquorAnalyzingItemId,
    setLiquorAnalyzingItemId,
    keyboardInset,
    setKeyboardInset,
  };
}
