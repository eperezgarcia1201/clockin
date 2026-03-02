import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";
import { styles } from "./App.styles";
import { useApiActions } from "./api-action-hooks";
import { i18n } from "./i18n";
import {
  getTipSubmissionKey,
  normalizePinInput,
} from "./app-helpers";
import { BRAND_LOGO } from "./app-config";
import { useCompanyOrderViewState } from "./company-order-view-state";
import { useCompanyOrderActions } from "./company-order-action-hooks";
import { useTenantSessionActions } from "./tenant-session-action-hooks";
import { useViewLoadActions } from "./view-load-action-hooks";
import { useTenantLocationEffects } from "./tenant-location-effects";
import { useSessionHydrationEffects } from "./session-hydration-effects";
import { useActiveShiftEffects } from "./active-shift-effects";
import { useWorkspaceRefreshEffects } from "./workspace-refresh-effects";
import { useWorkspaceDataLoadActions } from "./workspace-data-load-action-hooks";
import { useTodayScheduleViewModel } from "./today-schedule-view-hooks";
import { useKeyboardInsetEffects } from "./keyboard-inset-effects";
import { useActiveShiftSessionActions } from "./active-shift-session-action-hooks";
import { useUiSessionActions } from "./ui-session-action-hooks";
import { useLiquorActions } from "./liquor-action-hooks";
import { usePunchTipActions } from "./punch-tip-action-hooks";
import { useTenantLogoutAction } from "./tenant-logout-action-hooks";
import { useLiquorSheetViewState } from "./liquor-sheet-view-state";
import { useWorkspaceSessionViewState } from "./workspace-session-view-state";
import { useMobileAppState } from "./mobile-app-state";
import { TerminalEntryScreens } from "./components/TerminalEntryScreens";
import { TerminalWorkspace } from "./components/TerminalWorkspace";
import type { EmployeeWeekScheduleResponse } from "./types";

export default function App() {
  const scrollRef = useRef<ScrollView | null>(null);
  const previousSessionEmployeeIdRef = useRef<string | null>(null);
  const { language, setLanguage, tenant, setTenant, tenantInput, setTenantInput, tenantStatus, setTenantStatus, resolvingTenant, setResolvingTenant, tenantHydrated, setTenantHydrated, tenantOffices, setTenantOffices, selectedOfficeId, setSelectedOfficeId, tenantCompanyOrdersEnabled, setTenantCompanyOrdersEnabled, tenantLiquorInventoryEnabled, setTenantLiquorInventoryEnabled, tenantLiquorPremiumEnabled, setTenantLiquorPremiumEnabled, loadingLocations, setLoadingLocations, locationStatus, setLocationStatus, locationPickerOpen, setLocationPickerOpen, employees, setEmployees, directoryEmployees, setDirectoryEmployees, employeeName, setEmployeeName, pin, setPin, cashTips, setCashTips, creditCardTips, setCreditCardTips, punchType, setPunchType, status, setStatus, tipsStatus, setTipsStatus, tipsAlert, setTipsAlert, serverTipsRequired, setServerTipsRequired, pendingTipWorkDate, setPendingTipWorkDate, tipsSubmittedByDay, setTipsSubmittedByDay, tipsReminderEmployeeId, setTipsReminderEmployeeId, activeShift, setActiveShift, loading, setLoading, savingTips, setSavingTips, resolvedApiBase, setResolvedApiBase, lastPunch, setLastPunch, todaySchedule, setTodaySchedule, todayScheduleStatus, setTodayScheduleStatus, todayScheduleLoading, setTodayScheduleLoading, todayRoleFilter, setTodayRoleFilter, workingNowRows, setWorkingNowRows, workingNowStatus, setWorkingNowStatus, workingNowLoading, setWorkingNowLoading, activeViewTab, setActiveViewTab, companyOrderCatalog, setCompanyOrderCatalog, companyOrderSupplier, setCompanyOrderSupplier, companyOrderSearch, setCompanyOrderSearch, companyOrderShowOnlyAdded, setCompanyOrderShowOnlyAdded, companyOrderVisibleCount, setCompanyOrderVisibleCount, companyOrderNotes, setCompanyOrderNotes, companyOrderDrafts, setCompanyOrderDrafts, companyOrderRows, setCompanyOrderRows, companyOrderLoading, setCompanyOrderLoading, companyOrderSaving, setCompanyOrderSaving, companyOrderExportingFormat, setCompanyOrderExportingFormat, lastSubmittedCompanyOrderWeekStart, setLastSubmittedCompanyOrderWeekStart, companyOrderStatus, setCompanyOrderStatus, liquorCatalog, setLiquorCatalog, liquorCounts, setLiquorCounts, liquorBottleScans, setLiquorBottleScans, liquorSheetDrafts, setLiquorSheetDrafts, liquorCountDate, setLiquorCountDate, liquorScanContainerKey, setLiquorScanContainerKey, liquorInvoiceDate, setLiquorInvoiceDate, liquorInvoiceNumber, setLiquorInvoiceNumber, liquorInvoiceSupplier, setLiquorInvoiceSupplier, liquorInvoiceNotes, setLiquorInvoiceNotes, liquorInvoiceIncludePurchases, setLiquorInvoiceIncludePurchases, liquorInvoiceImageDataUrl, setLiquorInvoiceImageDataUrl, liquorInvoiceImageName, setLiquorInvoiceImageName, liquorInvoiceRows, setLiquorInvoiceRows, liquorInvoiceAnalyzing, setLiquorInvoiceAnalyzing, liquorInvoiceApplying, setLiquorInvoiceApplying, liquorStatus, setLiquorStatus, liquorLoading, setLiquorLoading, liquorSavingItemId, setLiquorSavingItemId, liquorSavingCountItemId, setLiquorSavingCountItemId, liquorAnalyzingItemId, setLiquorAnalyzingItemId, keyboardInset, setKeyboardInset, } = useMobileAppState();
  const [employeeWeekSchedule, setEmployeeWeekSchedule] =
    useState<EmployeeWeekScheduleResponse | null>(null);
  const [employeeWeekScheduleStatus, setEmployeeWeekScheduleStatus] =
    useState<string | null>(null);
  const [employeeWeekScheduleLoading, setEmployeeWeekScheduleLoading] =
    useState(false);

  const {
    sessionEmployee,
    selectedEmployee,
    companyOrdersActor,
    hasCompanyOrdersAccess,
    liquorManagerActor,
    pendingTipDate,
    requiresTipsForOut,
    hasSubmittedTips,
    showTipInputs,
    showTipReminderTag,
    needsManualPinForSession,
    selectedOffice,
    companyOrderHeaders,
    liquorHeaders,
    requiresLocationSelection,
    canUseClockScreen,
    hasLiquorAccess,
    hasLiquorPremiumAccess,
  } = useWorkspaceSessionViewState({ employees, directoryEmployees, selectedOfficeId, employeeName, tenant, activeShift, tenantCompanyOrdersEnabled, tenantOffices, tenantLiquorInventoryEnabled, tenantLiquorPremiumEnabled, pendingTipWorkDate, serverTipsRequired, punchType, tipsSubmittedByDay, tipsReminderEmployeeId, });

  const t = i18n[language];
  const { scrollToBottom, scrollToBottomSoon, markTipsSubmitted } =
    useUiSessionActions({ scrollRef, setTipsSubmittedByDay, });
  const {
    selectedCompanyOrderSupplier,
    visibleCompanyOrderItems,
    hasMoreCompanyOrderItems,
    selectedCompanySupplierDraft,
    companyOrderCartItems,
    selectedCompanyOrderCount,
    selectedCompanyOrderTotalUnits,
    selectedCompanyOrderSupplierCount,
  } = useCompanyOrderViewState({ companyOrderCatalog, companyOrderSupplier, companyOrderSearch, companyOrderShowOnlyAdded, companyOrderDrafts, companyOrderVisibleCount, onResetVisibleCount: (count) => { setCompanyOrderVisibleCount(count); }, });
  const { liquorSheetRows } = useLiquorSheetViewState({ liquorCatalog, liquorCounts, setLiquorSheetDrafts, });
  const {
    scheduleShiftLabel,
    todayRoleTabs,
    activeTodayRoleFilter,
    filteredTodayScheduleRows,
    todayScheduleLabel,
  } = useTodayScheduleViewModel({ t, todaySchedule, todayRoleFilter, });

  const { persistActiveShift, clearActiveShiftSession } =
    useActiveShiftSessionActions({ tenantAuthOrgId: tenant?.authOrgId || null, setTipsReminderEmployeeId, setTipsStatus, setServerTipsRequired, setActiveShift, setTipsAlert, setPunchType, setPin, setEmployeeName, });

  const { fetchJson, fetchCompanyOrderExport } = useApiActions({ tenant, resolvedApiBase, selectedOfficeId, t, setResolvedApiBase, });

  const { loadEmployees, loadTodaySchedule, loadWorkingNow, loadEmployeeWeekSchedule } =
    useViewLoadActions({ tenant, loadingLocations, canUseClockScreen, selectedOfficeId, fetchJson, t, setEmployees, setDirectoryEmployees, setStatus, setTodaySchedule, setTodayScheduleStatus, setTodayScheduleLoading, setWorkingNowRows, setWorkingNowStatus, setWorkingNowLoading, setEmployeeWeekSchedule, setEmployeeWeekScheduleStatus, setEmployeeWeekScheduleLoading, });

  const { loadCompanyOrderCatalog, loadCompanyOrders, loadLiquorControlData } =
    useWorkspaceDataLoadActions({ tenant, canUseClockScreen, hasCompanyOrdersAccess, hasLiquorAccess, hasLiquorPremiumAccess, selectedOfficeId, companyOrderHeaders, liquorHeaders, fetchJson, t, setCompanyOrderCatalog, setCompanyOrderSupplier, setCompanyOrderStatus, setCompanyOrderRows, setCompanyOrderLoading, setLastSubmittedCompanyOrderWeekStart, setLiquorCatalog, setLiquorCounts, setLiquorBottleScans, setLiquorInvoiceRows, setLiquorInvoiceImageDataUrl, setLiquorInvoiceImageName, setLiquorLoading, setLiquorStatus, });

  useTenantLocationEffects({ tenant, resolvedApiBase, unableToLoadLocationsMessage: t.unableToLoadLocations, setTenantOffices, setSelectedOfficeId, setTenantCompanyOrdersEnabled, setTenantLiquorInventoryEnabled, setTenantLiquorPremiumEnabled, setDirectoryEmployees, setLocationPickerOpen, setLocationStatus, setLoadingLocations, setResolvedApiBase, });

  useKeyboardInsetEffects({ setKeyboardInset, });

  useSessionHydrationEffects({ setTenant, setTenantInput, setTenantHydrated, setTipsSubmittedByDay, setLanguage, });

  useWorkspaceRefreshEffects({ tenantHydrated, hasCompanyOrdersAccess, hasLiquorAccess, loadEmployees, loadTodaySchedule, loadWorkingNow, loadCompanyOrderCatalog, loadCompanyOrders, loadLiquorControlData, setActiveViewTab, setCompanyOrderCatalog, setCompanyOrderSupplier, setCompanyOrderSearch, setCompanyOrderNotes, setCompanyOrderDrafts, setCompanyOrderRows, setCompanyOrderStatus, setLiquorCatalog, setLiquorCounts, setLiquorBottleScans, setLiquorSheetDrafts, setLiquorInvoiceRows, setLiquorInvoiceImageDataUrl, setLiquorInvoiceImageName, setLiquorStatus, });

  useActiveShiftEffects({ tenant, activeShift, employeeName, persistActiveShift, setActiveShift, setEmployeeName, setTipsReminderEmployeeId, setPunchType, });

  useEffect(() => {
    const currentSessionEmployeeId = sessionEmployee?.id || null;
    const previousSessionEmployeeId = previousSessionEmployeeIdRef.current;
    if (!currentSessionEmployeeId) {
      previousSessionEmployeeIdRef.current = null;
      setEmployeeWeekSchedule(null);
      setEmployeeWeekScheduleStatus(null);
      setEmployeeWeekScheduleLoading(false);
      setActiveViewTab((currentTab) =>
        currentTab === "weekSchedule" ? "clock" : currentTab,
      );
      return;
    }
    if (previousSessionEmployeeId !== currentSessionEmployeeId) {
      setActiveViewTab("weekSchedule");
      void loadEmployeeWeekSchedule(currentSessionEmployeeId);
    } else if (
      canUseClockScreen &&
      !employeeWeekSchedule &&
      !employeeWeekScheduleLoading &&
      !employeeWeekScheduleStatus
    ) {
      void loadEmployeeWeekSchedule(currentSessionEmployeeId);
    }
    previousSessionEmployeeIdRef.current = currentSessionEmployeeId;
  }, [
    canUseClockScreen,
    employeeWeekSchedule,
    employeeWeekScheduleLoading,
    employeeWeekScheduleStatus,
    sessionEmployee?.id,
    loadEmployeeWeekSchedule,
    setActiveViewTab,
  ]);

  const { configureTenant, toggleLanguage, handleSelectLocation } =
    useTenantSessionActions({ tenant, tenantInput, resolvedApiBase, language, activeShift, t, setResolvingTenant, setTenantStatus, setTenantOffices, setSelectedOfficeId, setTenantCompanyOrdersEnabled, setTenantLiquorInventoryEnabled, setLocationPickerOpen, setLocationStatus, setTenant, setStatus, setTipsStatus, setResolvedApiBase, setLanguage, setEmployeeName, });

  const {
    handleCompanyOrderAddItem,
    handleCompanyOrderStepItem,
    handleCompanyOrderRemoveItem,
    submitCompanyOrder,
    handleCompanyOrderExport,
  } = useCompanyOrderActions({ hasCompanyOrdersAccess, companyOrdersActor, requiresLocationSelection, selectedOfficeId, selectedCompanyOrderSupplier, selectedCompanySupplierDraft, companyOrderCartItems, companyOrderHeaders, companyOrderNotes, lastSubmittedCompanyOrderWeekStart, t, fetchJson, fetchCompanyOrderExport, loadCompanyOrders, setCompanyOrderDrafts, setCompanyOrderStatus, setCompanyOrderSaving, setLastSubmittedCompanyOrderWeekStart, setCompanyOrderNotes, setCompanyOrderSearch, setCompanyOrderExportingFormat, });

  const {
    updateLiquorSheetDraft,
    saveLiquorCatalogRow,
    saveLiquorCountRow,
    analyzeLiquorBottleForItem,
    pickLiquorInvoicePhoto,
    analyzeLiquorInvoicePhoto,
    applyLiquorInvoiceRows,
  } = useLiquorActions({ hasLiquorAccess, hasLiquorPremiumAccess, selectedOfficeId, liquorHeaders, liquorSheetDrafts, liquorCountDate, liquorScanContainerKey, liquorInvoiceDate, liquorInvoiceNumber, liquorInvoiceSupplier, liquorInvoiceNotes, liquorInvoiceIncludePurchases, liquorInvoiceImageDataUrl, liquorInvoiceRows, t, fetchJson, loadLiquorControlData, setLiquorStatus, setLiquorSheetDrafts, setLiquorSavingItemId, setLiquorSavingCountItemId, setLiquorAnalyzingItemId, setLiquorInvoiceImageDataUrl, setLiquorInvoiceImageName, setLiquorInvoiceRows, setLiquorInvoiceAnalyzing, setLiquorInvoiceApplying, });

  const { handlePunch, handleSubmitTips } = usePunchTipActions({ t, tenant, selectedEmployee, selectedOffice, punchType, requiresTipsForOut, hasSubmittedTips, pendingTipDate, employeeName, pin, activeShift, fetchJson, loadWorkingNow, persistActiveShift, clearActiveShiftSession, scrollToBottom, setStatus, setTipsStatus, setTipsAlert, setLoading, setServerTipsRequired, setLastPunch, setActiveShift, setEmployeeName, setPendingTipWorkDate, setTipsReminderEmployeeId, setPin, setCashTips, setCreditCardTips, cashTips, creditCardTips, tipsSubmittedByDay, getTipSubmissionKey, markTipsSubmitted, setSavingTips, });

  const { handleLogoutTenant } = useTenantLogoutAction({ tenantAuthOrgId: tenant?.authOrgId || null, clearActiveShiftSession, setTenant, setTenantInput, setTenantStatus, setResolvingTenant, setTenantOffices, setSelectedOfficeId, setTenantCompanyOrdersEnabled, setTenantLiquorInventoryEnabled, setTenantLiquorPremiumEnabled, setLoadingLocations, setLocationStatus, setLocationPickerOpen, setEmployees, setDirectoryEmployees, setTodaySchedule, setTodayScheduleStatus, setWorkingNowRows, setWorkingNowStatus, setCompanyOrderCatalog, setCompanyOrderSupplier, setCompanyOrderSearch, setCompanyOrderShowOnlyAdded, setCompanyOrderVisibleCount, setCompanyOrderNotes, setCompanyOrderDrafts, setCompanyOrderRows, setCompanyOrderStatus, setLiquorCatalog, setLiquorCounts, setLiquorBottleScans, setLiquorSheetDrafts, setLiquorStatus, setLiquorInvoiceRows, setLiquorInvoiceImageDataUrl, setLiquorInvoiceImageName, setTipsSubmittedByDay, setActiveViewTab, setLastPunch, setStatus, setTipsStatus, setResolvedApiBase, });

  const handleLogoutTenantAndWeekSchedule = () => {
    setEmployeeWeekSchedule(null);
    setEmployeeWeekScheduleStatus(null);
    setEmployeeWeekScheduleLoading(false);
    handleLogoutTenant();
  };

  const showWorkspace =
    tenantHydrated &&
    Boolean(tenant) &&
    !loadingLocations &&
    (!requiresLocationSelection || Boolean(selectedOfficeId));

  return (
    <LinearGradient
      colors={["#0b101a", "#111c2b", "#151f30"]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.keyboardWrap}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[
              styles.container,
              keyboardInset > 0
                ? {
                    paddingBottom: Math.max(48, keyboardInset + 24),
                  }
                : null,
            ]}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
          >
            <View style={styles.brandRow}>
              <Image
                source={BRAND_LOGO}
                style={styles.brandLogo}
                resizeMode="contain"
              />
              <View>
                <Text style={styles.title}>ClockIn</Text>
                <Text style={styles.subtitle}>{t.appSubtitle}</Text>
              </View>
            </View>

            {!showWorkspace ? (
              <TerminalEntryScreens t={t} tenantHydrated={tenantHydrated} tenant={tenant} tenantInput={tenantInput} onTenantInputChange={setTenantInput} tenantStatus={tenantStatus} resolvingTenant={resolvingTenant} onConfigureTenant={configureTenant} loadingLocations={loadingLocations} language={language} onToggleLanguage={toggleLanguage} requiresLocationSelection={requiresLocationSelection} selectedOfficeId={selectedOfficeId} tenantOffices={tenantOffices} onSelectLocation={(officeId) => { void handleSelectLocation(officeId); }} locationStatus={locationStatus} />
	            ) : (
	              <TerminalWorkspace t={t} language={language} onToggleLanguage={toggleLanguage} onLogoutTenant={handleLogoutTenantAndWeekSchedule} tenantName={tenant?.name || ""} tenantOffices={tenantOffices} selectedOffice={selectedOffice} selectedOfficeId={selectedOfficeId} locationPickerOpen={locationPickerOpen} onToggleLocationPicker={() => setLocationPickerOpen((open) => !open) } onSelectOffice={(officeId) => { void handleSelectLocation(officeId); }} locationStatus={locationStatus} hasCompanyOrdersAccess={hasCompanyOrdersAccess} hasWeekScheduleAccess={Boolean(sessionEmployee)} activeViewTab={activeViewTab} onViewTabChange={setActiveViewTab} clockStationProps={{ t, showTipReminderTag: Boolean(showTipReminderTag), sessionEmployeeName: sessionEmployee?.name || null, employeeName, onEmployeeNameChange: setEmployeeName, showEmployeeVerification: !sessionEmployee && employeeName.trim().length > 0, hasSelectedEmployee: Boolean(selectedEmployee), verificationText: selectedEmployee ? `${selectedEmployee.name} (${t.verified})` : t.noExactMatchYet, pinPlaceholder: punchType === "IN" || needsManualPinForSession || pin.length > 0 ? "••••" : t.autoPin, pin, onPinChange: (value) => setPin(normalizePinInput(value)), punchType, onPunchTypeChange: setPunchType, showTipInputs, tipsAlert, pendingTipMessage: pendingTipDate ? `Pending tips required for ${pendingTipDate}.` : null, cashTips, onCashTipsChange: setCashTips, creditCardTips, onCreditCardTipsChange: setCreditCardTips, tipsStatus, onSubmitTips: handleSubmitTips, savingTips, status, onConfirmPunch: handlePunch, loading, }} weekScheduleProps={{ t, weekSchedule: employeeWeekSchedule, weekScheduleLoading: employeeWeekScheduleLoading, weekScheduleStatus: employeeWeekScheduleStatus, onRefreshWeekSchedule: () => { if (sessionEmployee?.id) { void loadEmployeeWeekSchedule(sessionEmployee.id); } }, formatScheduleShiftLabel: scheduleShiftLabel, }} companyOrdersProps={{ t, companyOrderExportingFormat, onExport: (format) => { void handleCompanyOrderExport(format); }, companyOrderCatalog, companyOrderSupplier, companyOrderDrafts, onSupplierChange: setCompanyOrderSupplier, companyOrderSearch, onCompanyOrderSearchChange: setCompanyOrderSearch, onCompanyOrderSearchFocus: scrollToBottomSoon, companyOrderShowOnlyAdded, onCompanyOrderShowOnlyAddedChange: setCompanyOrderShowOnlyAdded, selectedCompanyOrderSupplier, visibleCompanyOrderItems, selectedCompanySupplierDraft, onAddCompanyOrderItem: handleCompanyOrderAddItem, hasMoreCompanyOrderItems, onShowMoreItems: () => setCompanyOrderVisibleCount((current) => current + 16), selectedCompanyOrderCount, selectedCompanyOrderTotalUnits, companyOrderCartItems, onStepCompanyOrderItem: handleCompanyOrderStepItem, onRemoveCompanyOrderItem: handleCompanyOrderRemoveItem, companyOrderNotes, onCompanyOrderNotesChange: setCompanyOrderNotes, onCompanyOrderNotesFocus: scrollToBottomSoon, companyOrderStatus, onSubmitCompanyOrder: submitCompanyOrder, companyOrderSaving, selectedCompanyOrderSupplierCount, companyOrderLoading, onRefreshCompanyOrders: () => { void loadCompanyOrders(); }, companyOrderRows, }} liquorControlProps={{ t, tenantLiquorInventoryEnabled, sessionEmployeeIsManager: Boolean(sessionEmployee?.isManager), liquorLoading, onRefreshLiquorControlData: () => { void loadLiquorControlData(); }, liquorCountDate, onLiquorCountDateChange: setLiquorCountDate, liquorScanContainerKey, onLiquorScanContainerKeyChange: setLiquorScanContainerKey, hasLiquorPremiumAccess, liquorInvoiceDate, onLiquorInvoiceDateChange: setLiquorInvoiceDate, liquorInvoiceNumber, onLiquorInvoiceNumberChange: setLiquorInvoiceNumber, liquorInvoiceSupplier, onLiquorInvoiceSupplierChange: setLiquorInvoiceSupplier, liquorInvoiceNotes, onLiquorInvoiceNotesChange: setLiquorInvoiceNotes, liquorInvoiceIncludePurchases, onToggleLiquorInvoiceIncludePurchases: () => setLiquorInvoiceIncludePurchases((previous) => !previous), onPickLiquorInvoicePhoto: () => { void pickLiquorInvoicePhoto(); }, liquorInvoiceAnalyzing, onAnalyzeLiquorInvoicePhoto: () => { void analyzeLiquorInvoicePhoto(); }, liquorInvoiceApplying, onApplyLiquorInvoiceRows: () => { void applyLiquorInvoiceRows(); }, liquorInvoiceImageName, liquorInvoiceRows, liquorStatus, liquorSheetRows, liquorSheetDrafts, liquorSavingItemId, liquorSavingCountItemId, liquorAnalyzingItemId, onUpdateLiquorSheetDraft: updateLiquorSheetDraft, onSaveLiquorCatalogRow: (itemId) => { void saveLiquorCatalogRow(itemId); }, onSaveLiquorCountRow: (itemId) => { void saveLiquorCountRow(itemId); }, onAnalyzeLiquorBottleForItem: (itemId) => { void analyzeLiquorBottleForItem(itemId); }, liquorBottleScans, }} workingNowProps={{ t, selectedOfficeName: selectedOffice?.name || null, workingNowLoading, onRefreshWorkingNow: () => { void loadWorkingNow(); }, workingNowStatus, workingNowRows, }} todayTeamProps={{ t, todayScheduleLabel, todayScheduleLoading, onRefreshTodaySchedule: () => { void loadTodaySchedule(); }, todayScheduleStatus, todayRoleTabs, activeTodayRoleFilter, onTodayRoleFilterChange: setTodayRoleFilter, filteredTodayScheduleRows, todaySchedule, formatScheduleShiftLabel: scheduleShiftLabel, }} lastPunchProps={lastPunch ? { t, lastPunch } : null} />
	            )}
          </ScrollView>
        </KeyboardAvoidingView>
        <StatusBar style="light" />
      </SafeAreaView>
    </LinearGradient>
  );
}
