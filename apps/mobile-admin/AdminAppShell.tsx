import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import * as FileSystem from "expo-file-system/legacy";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
} from "react-native";
import { styles } from "./App.styles";
import {
  apiBaseCandidates,
  bytesToBase64,
} from "./api-runtime";
import {
  formatDisplayDate,
  parseScheduleOverrideNotification,
} from "./app-helpers";
import { useCompanyOrderViewState } from "./company-order-view-state";
import { useCompanyOrderActions } from "./company-order-action-hooks";
import { useAdminApiActions } from "./admin-api-action-hooks";
import { useAdminShellViewState } from "./app-view-state-hooks";
import { useAdminAppState } from "./admin-app-state";
import { useAdminAuthActions } from "./admin-auth-action-hooks";
import { useAdminBiometricSession } from "./admin-biometric-hooks";
import { useAdminLoadActions } from "./admin-load-action-hooks";
import { useAdminSessionActions } from "./admin-session-action-hooks";
import { useAdminViewEffects } from "./admin-view-effects";
import { useAdminPushEffects } from "./admin-push-effects";
import { useAdminNotificationSettingsActions } from "./admin-notification-settings-hooks";
import { useAdminShellDerivedState } from "./admin-shell-derived-hooks";
import { useManagerPunchActions } from "./manager-punch-action-hooks";
import { useUserManagementActions } from "./user-management-action-hooks";
import { useOfficeGroupActions } from "./office-group-action-hooks";
import { useReportCaptureActions } from "./report-capture-action-hooks";
import { useAlertsActions } from "./alerts-action-hooks";
import { useScheduleActions } from "./schedule-action-hooks";
import { reportTypeOrder, tabLabels, tabs } from "./app-navigation";
import { useLiquorControlActions } from "./liquor-control-action-hooks";
import {
  useAdminDataLoadEffects,
  useApiHealthProbeEffect,
  useVisibleTabSyncEffect,
} from "./data-load-effects";
import {
  useAdminLiquorBootstrapEffects,
  useAdminNotificationRefreshEffect,
  useAdminSessionPersistenceEffect,
  useAdminTenantEffects,
} from "./admin-shell-effects";
import { AdminShellHeader } from "./components/AdminShellHeader";
import { AdminBiometricLockCard } from "./components/AdminBiometricLockCard";
import { AdminContentRouter } from "./components/AdminContentRouter";
import { useKeyboardInsetEffects } from "./keyboard-inset-effects";
export default function App() {
  const adminState = useAdminAppState();
  const { loggedIn, setLoggedIn, tenantInput, setTenantInput, activeTenant, setActiveTenant, activeTenantLabel, setActiveTenantLabel, activeAdminUsername, setActiveAdminUsername, language, setLanguage, username, setUsername, password, setPassword, loginStatus, setLoginStatus, loginLoading, setLoginLoading, screen, setScreen, permissions, setPermissions, multiLocationEnabled, setMultiLocationEnabled, activeLocationId, setActiveLocationId, summary, setSummary, employees, setEmployees, offices, setOffices, groups, setGroups, notifications, setNotifications, alertsStatus, setAlertsStatus, employeeMessageEmployeeId, setEmployeeMessageEmployeeId, employeeMessageSubject, setEmployeeMessageSubject, employeeMessageBody, setEmployeeMessageBody, employeeMessageSending, setEmployeeMessageSending, employeeMessageStatus, setEmployeeMessageStatus, scheduleOverrideLoadingId, setScheduleOverrideLoadingId, sessionManagerEmployeeId, setSessionManagerEmployeeId, sessionManagerOfficeId, setSessionManagerOfficeId, managerClockExempt, setManagerClockExempt, activeNow, setActiveNow, recentPunchRows, setRecentPunchRows, punchStatus, setPunchStatus, punchLoadingId, setPunchLoadingId, managerPin, setManagerPin, managerPunchLoading, setManagerPunchLoading, managerPunchStatus, setManagerPunchStatus, managerPendingTipWorkDate, setManagerPendingTipWorkDate, managerCashTips, setManagerCashTips, managerCreditCardTips, setManagerCreditCardTips, managerTipSaving, setManagerTipSaving, newUserName, setNewUserName, newUserEmail, setNewUserEmail, newUserPin, setNewUserPin, newUserIsManager, setNewUserIsManager, newUserIsOwnerManager, setNewUserIsOwnerManager, newUserIsAdmin, setNewUserIsAdmin, newUserIsTimeAdmin, setNewUserIsTimeAdmin, newUserIsReports, setNewUserIsReports, newUserIsServer, setNewUserIsServer, newUserIsKitchenManager, setNewUserIsKitchenManager, userStatus, setUserStatus, editingUserId, setEditingUserId, editUserForm, setEditUserForm, editUserStatus, setEditUserStatus, editUserLoading, setEditUserLoading, editUserSaving, setEditUserSaving, newOfficeName, setNewOfficeName, newOfficeLatitude, setNewOfficeLatitude, newOfficeLongitude, setNewOfficeLongitude, newOfficeRadius, setNewOfficeRadius, officeStatus, setOfficeStatus, officeGeoLatitude, setOfficeGeoLatitude, officeGeoLongitude, setOfficeGeoLongitude, officeGeoRadius, setOfficeGeoRadius, officeGeoStatus, setOfficeGeoStatus, officeGeoSaving, setOfficeGeoSaving, newGroupName, setNewGroupName, groupStatus, setGroupStatus, scheduleEmployeeId, setScheduleEmployeeId, scheduleEmployeePickerOpen, setScheduleEmployeePickerOpen, scheduleEmployeeSearch, setScheduleEmployeeSearch, scheduleDays, setScheduleDays, scheduleStatus, setScheduleStatus, todaySchedule, setTodaySchedule, todayScheduleStatus, setTodayScheduleStatus, todayScheduleLoading, setTodayScheduleLoading, todayRoleFilter, setTodayRoleFilter, companyOrderCatalog, setCompanyOrderCatalog, companyOrderSupplier, setCompanyOrderSupplier, companyOrderSearch, setCompanyOrderSearch, companyOrderShowOnlyAdded, setCompanyOrderShowOnlyAdded, companyOrderVisibleCount, setCompanyOrderVisibleCount, companyOrderNotes, setCompanyOrderNotes, companyOrderDrafts, setCompanyOrderDrafts, companyOrderRows, setCompanyOrderRows, companyOrderLoading, setCompanyOrderLoading, companyOrderSaving, setCompanyOrderSaving, companyOrderExportingFormat, setCompanyOrderExportingFormat, lastSubmittedCompanyOrderWeekStart, setLastSubmittedCompanyOrderWeekStart, companyOrderStatus, setCompanyOrderStatus, liquorInventoryEnabled, setLiquorInventoryEnabled, liquorPremiumEnabled, setLiquorPremiumEnabled, liquorWorkspace, setLiquorWorkspace, liquorMonth, setLiquorMonth, liquorYear, setLiquorYear, liquorTargetCostPct, setLiquorTargetCostPct, liquorCatalog, setLiquorCatalog, liquorCounts, setLiquorCounts, liquorMovements, setLiquorMovements, liquorMonthly, setLiquorMonthly, liquorMonthlyPrevious, setLiquorMonthlyPrevious, liquorYearly, setLiquorYearly, liquorCatalogForm, setLiquorCatalogForm, liquorKinds, setLiquorKinds, liquorKindForm, setLiquorKindForm, liquorInventorySearch, setLiquorInventorySearch, liquorInventoryVisibleCount, setLiquorInventoryVisibleCount, liquorCatalogSearch, setLiquorCatalogSearch, liquorCatalogVisibleCount, setLiquorCatalogVisibleCount, liquorCatalogAiQuery, setLiquorCatalogAiQuery, liquorCatalogAiLoading, setLiquorCatalogAiLoading, liquorCatalogAiResult, setLiquorCatalogAiResult, liquorLookupUpc, setLiquorLookupUpc, liquorLookupLoading, setLiquorLookupLoading, liquorLookupResult, setLiquorLookupResult, liquorMovementForm, setLiquorMovementForm, liquorQuickCountForm, setLiquorQuickCountForm, liquorScanItemId, setLiquorScanItemId, liquorBottleScans, setLiquorBottleScans, liquorSheetDrafts, setLiquorSheetDrafts, liquorCountDate, setLiquorCountDate, liquorScanContainerKey, setLiquorScanContainerKey, liquorInvoiceDate, setLiquorInvoiceDate, liquorInvoiceNumber, setLiquorInvoiceNumber, liquorInvoiceSupplier, setLiquorInvoiceSupplier, liquorInvoiceNotes, setLiquorInvoiceNotes, liquorInvoiceIncludePurchases, setLiquorInvoiceIncludePurchases, liquorInvoiceImageDataUrl, setLiquorInvoiceImageDataUrl, liquorInvoiceImageName, setLiquorInvoiceImageName, liquorInvoiceRows, setLiquorInvoiceRows, liquorInvoiceAnalyzing, setLiquorInvoiceAnalyzing, liquorInvoiceApplying, setLiquorInvoiceApplying, liquorLoading, setLiquorLoading, liquorExportingFormat, setLiquorExportingFormat, liquorStatus, setLiquorStatus, liquorActionLoading, setLiquorActionLoading, liquorSavingItemId, setLiquorSavingItemId, liquorSavingCountItemId, setLiquorSavingCountItemId, liquorAnalyzingItemId, setLiquorAnalyzingItemId, reportType, setReportType, reportEmployeeId, setReportEmployeeId, fromDate, setFromDate, toDate, setToDate, reportRows, setReportRows, reportStatus, setReportStatus, reportLoading, setReportLoading, reportExportingFormat, setReportExportingFormat, salesDate, setSalesDate, salesFood, setSalesFood, salesLiquor, setSalesLiquor, salesCash, setSalesCash, salesBatch, setSalesBatch, salesNotes, setSalesNotes, salesSaveLoading, setSalesSaveLoading, salesExpenseCompany, setSalesExpenseCompany, salesExpenseInvoice, setSalesExpenseInvoice, salesExpenseMethod, setSalesExpenseMethod, salesExpenseAmount, setSalesExpenseAmount, salesExpenseCheckNumber, setSalesExpenseCheckNumber, salesExpensePayToCompany, setSalesExpensePayToCompany, salesExpenseNotes, setSalesExpenseNotes, salesExpenseReceipt, setSalesExpenseReceipt, salesExpenseReceiptLoading, setSalesExpenseReceiptLoading, salesExpenseSaveLoading, setSalesExpenseSaveLoading, salesActionStatus, setSalesActionStatus, captureMode, setCaptureMode, theme, setTheme, resolvedApiBase, setResolvedApiBase, dataSyncError, setDataSyncError, keyboardInset, setKeyboardInset, pushRegisteredTenant, setPushRegisteredTenant, } = adminState;
  const canCreateLocations = permissions.locations;
  const {
    canManageMultiLocation,
    scopedLocationId,
    companyOrdersOfficeId,
    hasLiquorManagerAccess,
    hasLiquorPremiumAccess,
    liquorSheetRows,
    employeePunchStatus,
    managerProfile,
    managerCurrentPunchStatus,
    managerCanClockOut,
    managerNextPunchType,
    managerActionLabel,
  } = useAdminShellDerivedState({
    permissions,
    multiLocationEnabled,
    activeLocationId,
    offices,
    sessionManagerEmployeeId,
    sessionManagerOfficeId,
    employees,
    activeNow,
    recentPunchRows,
    liquorInventoryEnabled,
    liquorPremiumEnabled,
    liquorCatalog,
    liquorCounts,
  });
  useAdminLiquorBootstrapEffects({ hasLiquorPremiumAccess, liquorWorkspace, setLiquorWorkspace, liquorCatalog, companyOrdersOfficeId, setLiquorMovementForm, setLiquorQuickCountForm, setLiquorScanItemId, });
  useAdminTenantEffects({
    tenantInput,
    username,
    setTenantInput,
    setUsername,
  });
  useAdminSessionPersistenceEffect({
    loggedIn,
    activeTenant,
    activeTenantLabel,
    activeAdminUsername,
    tenantInput,
    username,
    activeLocationId,
    sessionManagerEmployeeId,
    sessionManagerOfficeId,
    managerClockExempt,
    multiLocationEnabled,
    liquorInventoryEnabled,
    liquorPremiumEnabled,
    screen,
    permissions,
    setLoggedIn,
    setActiveTenant,
    setActiveTenantLabel,
    setActiveAdminUsername,
    setTenantInput,
    setUsername,
    setActiveLocationId,
    setSessionManagerEmployeeId,
    setSessionManagerOfficeId,
    setManagerClockExempt,
    setMultiLocationEnabled,
    setLiquorInventoryEnabled,
    setLiquorPremiumEnabled,
    setScreen,
    setPermissions,
  });
  useKeyboardInsetEffects({ setKeyboardInset });
  const { appendOfficeScope, clearAdminSession, forgetSavedAdmin } = useAdminSessionActions({ scopedLocationId, setLoggedIn, setPermissions, setMultiLocationEnabled, setActiveLocationId, setSessionManagerEmployeeId, setSessionManagerOfficeId, setManagerClockExempt, setManagerPin, setManagerPunchLoading, setManagerPunchStatus, setManagerPendingTipWorkDate, setManagerCashTips, setManagerCreditCardTips, setManagerTipSaving, setPushRegisteredTenant, setActiveTenant, setActiveTenantLabel, setActiveAdminUsername, setTenantInput, setUsername, setPassword, setScreen, setTodaySchedule, setTodayScheduleStatus, setTodayRoleFilter, setCompanyOrderCatalog, setCompanyOrderSupplier, setCompanyOrderSearch, setCompanyOrderNotes, setCompanyOrderDrafts, setCompanyOrderRows, setCompanyOrderExportingFormat, setLastSubmittedCompanyOrderWeekStart, setCompanyOrderStatus, setLiquorInventoryEnabled, setLiquorPremiumEnabled, setLiquorCatalog, setLiquorCounts, setLiquorBottleScans, setLiquorSheetDrafts, setLiquorCountDate, setLiquorScanContainerKey, setLiquorInvoiceDate, setLiquorInvoiceNumber, setLiquorInvoiceSupplier, setLiquorInvoiceNotes, setLiquorInvoiceIncludePurchases, setLiquorInvoiceImageDataUrl, setLiquorInvoiceImageName, setLiquorInvoiceRows, setLiquorInvoiceAnalyzing, setLiquorInvoiceApplying, setLiquorStatus, setLiquorLoading, setLiquorSavingItemId, setLiquorSavingCountItemId, setLiquorAnalyzingItemId, setRecentPunchRows, setAdminNotificationStatus: adminState.setAdminNotificationStatus, setAdminNotificationSaving: adminState.setAdminNotificationSaving, setCurrentAdminPushDevice: adminState.setCurrentAdminPushDevice, setTenantTimeZone: adminState.setTenantTimeZone, setEmployeeMessageEmployeeId, setEmployeeMessageSubject, setEmployeeMessageBody, setEmployeeMessageStatus, setResolvedApiBase, });
  const {
    biometricAvailable,
    biometricEnabled,
    biometricLocked,
    biometricPrompting,
    biometricStatus,
    clearBiometricPreference,
    markSessionAuthenticated,
    retryBiometricUnlock,
    toggleBiometricPreference,
  } = useAdminBiometricSession({ loggedIn, language });
  const handleForgetSavedAdmin = () => {
    clearBiometricPreference();
    forgetSavedAdmin();
  };
  const { fetchJson, fetchCompanyOrderExport } = useAdminApiActions({ resolvedApiBase, loggedIn, activeTenant, tenantInput, activeAdminUsername, username, setResolvedApiBase, companyOrdersOfficeId, language, });
  useApiHealthProbeEffect({ fetchJson, setDataSyncError, });
  useAdminPushEffects({ loggedIn, activeTenant, pushRegisteredTenant, fetchJson, setPushRegisteredTenant, setCurrentAdminPushDevice: adminState.setCurrentAdminPushDevice, setDataSyncError, });
  const { handleLogin, loadAccessProfile } = useAdminAuthActions({ tenantInput, username, password, resolvedApiBase, fetchJson, setLoginLoading, setLoginStatus, setResolvedApiBase, setPermissions, setLiquorInventoryEnabled, setLiquorPremiumEnabled, setMultiLocationEnabled, setActiveLocationId, setActiveTenant, setSessionManagerEmployeeId, setSessionManagerOfficeId, setManagerClockExempt, setManagerPin, setManagerPunchStatus, setManagerPendingTipWorkDate, setManagerCashTips, setManagerCreditCardTips, setTenantInput, setActiveTenantLabel, setActiveAdminUsername, setLoggedIn, setScreen, setDataSyncError, onLoginSuccess: markSessionAuthenticated, });
  const {
    loadSummary,
    loadEmployees,
    loadOffices,
    loadGroups,
    loadNotifications,
    loadActiveNow,
    loadTodaySchedule,
    loadCompanyOrderCatalog,
    loadCompanyOrders,
  } = useAdminLoadActions({ fetchJson, appendOfficeScope, scheduleEmployeeId, reportEmployeeId, editingUserId, canManageMultiLocation, activeLocationId, companyOrdersOfficeId, companyOrderSupplier, employees, offices, groups, setDataSyncError, setSummary, setEmployees, setScheduleEmployeeId, setReportEmployeeId, setEditingUserId, setEditUserForm, setOffices, setActiveLocationId, setGroups, setNotifications, setAlertsStatus, setRecentPunchRows, setActiveNow, setTodayScheduleLoading, setTodayScheduleStatus, setTodaySchedule, setCompanyOrderLoading, setCompanyOrderStatus, setCompanyOrderCatalog, setCompanyOrderSupplier, setCompanyOrderRows, setLastSubmittedCompanyOrderWeekStart, });
  const { sendEmployeeMessage, handleScheduleOverrideDecision } =
    useAlertsActions({ fetchJson, employeeMessageEmployeeId, employeeMessageSubject, employeeMessageBody, setEmployeeMessageStatus, setEmployeeMessageSending, setEmployeeMessageSubject, setEmployeeMessageBody, loadNotifications, loadActiveNow, setAlertsStatus, setScheduleOverrideLoadingId, });
  useAdminNotificationRefreshEffect({ loggedIn, loadNotifications, setDataSyncError, });
  const {
    loadLiquorControlData,
    updateLiquorSheetDraft,
    saveLiquorCatalogRow,
    saveLiquorCountRow,
    createLiquorCatalogItem,
    createLiquorKind,
    deleteLiquorKind,
    lookupLiquorByUpc,
    assistLiquorCatalog,
    createLiquorMovement,
    saveLiquorQuickCount,
    analyzeLiquorBottleForItem,
    pickLiquorInvoicePhoto,
    analyzeLiquorInvoicePhoto,
    applyLiquorInvoiceRows,
    handleLiquorAnalyticsExport,
  } = useLiquorControlActions({ fetchJson, language, bytesToBase64, loggedIn, hasLiquorManagerAccess, hasLiquorPremiumAccess, companyOrdersOfficeId, liquorMonth, liquorYear, liquorTargetCostPct, liquorCatalog, liquorCounts, liquorMovements, liquorBottleScans, liquorMonthly, liquorMonthlyPrevious, liquorYearly, liquorCatalogForm, liquorKindForm, liquorLookupUpc, liquorCatalogAiQuery, liquorMovementForm, liquorQuickCountForm, liquorSheetDrafts, liquorCountDate, liquorScanContainerKey, liquorInvoiceDate, liquorInvoiceNumber, liquorInvoiceSupplier, liquorInvoiceNotes, liquorInvoiceIncludePurchases, liquorInvoiceImageDataUrl, liquorInvoiceRows, setLiquorKinds, setLiquorCatalog, setLiquorCounts, setLiquorMovements, setLiquorMonthly, setLiquorMonthlyPrevious, setLiquorYearly, setLiquorBottleScans, setLiquorSheetDrafts, setLiquorInvoiceRows, setLiquorInvoiceImageDataUrl, setLiquorInvoiceImageName, setLiquorStatus, setLiquorLoading, setLiquorSavingItemId, setLiquorSavingCountItemId, setLiquorCatalogForm, setLiquorLookupResult, setLiquorActionLoading, setLiquorKindForm, setLiquorLookupLoading, setLiquorCatalogAiLoading, setLiquorCatalogAiResult, setLiquorCatalogSearch, setLiquorMovementForm, setLiquorQuickCountForm, setLiquorAnalyzingItemId, setLiquorInvoiceAnalyzing, setLiquorInvoiceApplying, setLiquorExportingFormat, });
  const {
    loadSchedule,
    updateScheduleDay,
    adjustScheduleTime,
    setScheduleMeridiem,
    saveSchedule,
  } = useScheduleActions({ fetchJson, scheduleEmployeeId, scheduleDays, setScheduleDays, setScheduleStatus, loadTodaySchedule, });
  const {
    handleSubmitManagerPendingTips,
    handleManagerSelfPunch,
    handleForcePunch,
  } = useManagerPunchActions({ fetchJson, sessionManagerEmployeeId, managerPendingTipWorkDate, managerCashTips, managerCreditCardTips, setManagerPunchStatus, setManagerTipSaving, setManagerPendingTipWorkDate, setManagerCashTips, setManagerCreditCardTips, managerClockExempt, managerNextPunchType, managerPin, setManagerPunchLoading, setManagerPin, loadActiveNow, loadNotifications, setPunchStatus, setPunchLoadingId, });
  useAdminDataLoadEffects({ loggedIn, screen, scopedLocationId, scheduleEmployeeId, loadAccessProfile, loadSummary, loadEmployees, loadOffices, loadGroups, loadActiveNow, loadNotifications, loadTodaySchedule, loadSchedule, });
  const {
    text,
    inline,
    inlineOrNull,
    todayExpenseDate,
    activeLocationLabel,
    officeGeoTarget,
    selectedScheduleEmployee,
    activeMessageEmployees,
    filteredScheduleEmployees,
    todayRoleTabs,
    activeTodayRoleFilter,
    filteredTodayScheduleRows,
    todayScheduleLabel,
    pendingScheduleOverrides,
    visibleTabs,
    themeColors,
    isLight,
    activeApiLabel,
  } = useAdminShellViewState({ language, theme, resolvedApiBase, apiBaseCandidates, offices, scopedLocationId, employees, employeeMessageEmployeeId, setEmployeeMessageEmployeeId, scheduleEmployeeId, scheduleEmployeeSearch, todaySchedule, todayRoleFilter, notifications, formatDisplayDate, tabs, permissions, liquorInventoryEnabled, });
  const {
    handleCreateUser,
    handleSetUserDisabled,
    loadUserForEdit,
    cancelEditUser,
    saveUserEdits,
  } = useUserManagementActions({ fetchJson, newUserName, newUserEmail, newUserPin, scopedLocationId, newUserIsManager, newUserIsOwnerManager, newUserIsAdmin, newUserIsTimeAdmin, newUserIsReports, newUserIsServer, newUserIsKitchenManager, setUserStatus, setNewUserName, setNewUserEmail, setNewUserPin, setNewUserIsManager, setNewUserIsOwnerManager, setNewUserIsAdmin, setNewUserIsTimeAdmin, setNewUserIsReports, setNewUserIsServer, setNewUserIsKitchenManager, editingUserId, editUserForm, setEditUserForm, setEditingUserId, setEditUserStatus, setEditUserLoading, setEditUserSaving, loadEmployees, loadSummary, loadActiveNow, });
  const {
    handleCreateOffice,
    handleSaveOfficeGeofence,
    handleCreateGroup,
  } = useOfficeGroupActions({ fetchJson, newOfficeName, newOfficeLatitude, newOfficeLongitude, newOfficeRadius, setOfficeStatus, setNewOfficeName, setNewOfficeLatitude, setNewOfficeLongitude, setNewOfficeRadius, setActiveLocationId, setScreen, loadOffices, loadSummary, loadEmployees, loadGroups, loadActiveNow, officeGeoTargetId: officeGeoTarget?.id || null, officeGeoLatitude, officeGeoLongitude, officeGeoRadius, setOfficeGeoStatus, setOfficeGeoSaving, newGroupName, scopedLocationId, setGroupStatus, setNewGroupName, });
  const {
    runReport,
    exportReport,
    saveSalesReport,
    captureSalesExpenseReceipt,
    saveSalesExpense,
  } = useReportCaptureActions({ fetchJson, reportType, fromDate, toDate, reportEmployeeId, reportRows, language, bytesToBase64, setReportStatus, setReportLoading, setReportRows, setReportExportingFormat, salesDate, salesFood, salesLiquor, salesCash, salesBatch, salesNotes, setSalesActionStatus, setSalesSaveLoading, todayExpenseDate, salesExpenseCompany, salesExpenseInvoice, salesExpenseMethod, salesExpenseAmount, salesExpenseCheckNumber, salesExpensePayToCompany, salesExpenseNotes, salesExpenseReceipt, setSalesExpenseReceipt, setSalesExpenseReceiptLoading, setSalesExpenseSaveLoading, setSalesExpenseCompany, setSalesExpenseInvoice, setSalesExpenseAmount, setSalesExpenseCheckNumber, setSalesExpensePayToCompany, setSalesExpenseNotes, setSalesExpenseMethod, });
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
  const {
    handleCompanyOrderAddItem,
    handleCompanyOrderStepItem,
    handleCompanyOrderRemoveItem,
    submitCompanyOrder,
    handleCompanyOrderExport,
  } = useCompanyOrderActions({ setCompanyOrderDrafts, setCompanyOrderStatus, setCompanyOrderSaving, setLastSubmittedCompanyOrderWeekStart, setCompanyOrderNotes, setCompanyOrderSearch, setCompanyOrderExportingFormat, selectedCompanyOrderSupplier, selectedCompanySupplierDraft, companyOrderCartItems, fetchJson, companyOrdersOfficeId, companyOrderNotes, lastSubmittedCompanyOrderWeekStart, loadCompanyOrders, fetchCompanyOrderExport, });
  useAdminViewEffects({ loggedIn, screen, loadCompanyOrderCatalog, loadCompanyOrders, hasLiquorManagerAccess, loadLiquorControlData, setLiquorCatalog, setLiquorCounts, setLiquorMovements, setLiquorMonthly, setLiquorMonthlyPrevious, setLiquorYearly, setLiquorBottleScans, setLiquorSheetDrafts, setLiquorInvoiceRows, setLiquorInvoiceImageDataUrl, setLiquorInvoiceImageName, setLiquorStatus, companyOrdersOfficeId, liquorMonth, liquorTargetCostPct, liquorYear, scopedLocationId, salesExpenseMethod, setSalesExpenseCheckNumber, setSalesExpensePayToCompany, officeGeoTarget, setOfficeGeoLatitude, setOfficeGeoLongitude, setOfficeGeoRadius, setOfficeGeoStatus, liquorInventorySearch, setLiquorInventoryVisibleCount, liquorCatalogSearch, setLiquorCatalogVisibleCount, liquorSheetRows, });
  useVisibleTabSyncEffect({ loggedIn, screen, visibleTabs, setScreen, });
  const {
    deviceTimeZone,
    handleToggleAdminNotificationPreference,
    handleSyncTenantTimeZone,
    refreshAlertsPanel,
  } = useAdminNotificationSettingsActions({
    loggedIn,
    fetchJson,
    currentAdminPushDevice: adminState.currentAdminPushDevice,
    loadNotifications,
    setCurrentAdminPushDevice: adminState.setCurrentAdminPushDevice,
    setTenantTimeZone: adminState.setTenantTimeZone,
    setAdminNotificationStatus: adminState.setAdminNotificationStatus,
    setAdminNotificationSaving: adminState.setAdminNotificationSaving,
  });
  const adminContentProps = { ...adminState, isLight, text, inlineOrNull, handleLogin, forgetSavedAdmin: handleForgetSavedAdmin, dataSyncError, managerProfile, managerCurrentPunchStatus, managerCanClockOut, handleManagerSelfPunch, inline, managerActionLabel, handleSubmitManagerPendingTips, handleForcePunch, pendingScheduleOverrides, handleScheduleOverrideDecision, formatDisplayDate, loadEmployees, loadActiveNow, loadSummary, handleCreateUser, cancelEditUser, saveUserEdits, employeePunchStatus, loadUserForEdit, handleSetUserDisabled, activeLocationLabel, canManageMultiLocation, scopedLocationId, canCreateLocations, handleCreateOffice, officeGeoTarget, handleSaveOfficeGeofence, handleCreateGroup, saveSalesReport, todayExpenseDate, captureSalesExpenseReceipt, saveSalesExpense, reportTypeOrder, runReport, exportReport, activeMessageEmployees, sendEmployeeMessage, loadNotifications: refreshAlertsPanel, parseScheduleOverrideNotification, selectedScheduleEmployee, todayScheduleLabel, loadTodaySchedule, todayRoleTabs, activeTodayRoleFilter, filteredTodayScheduleRows, filteredScheduleEmployees, updateScheduleDay, adjustScheduleTime, setScheduleMeridiem, saveSchedule, handleCompanyOrderExport, selectedCompanyOrderSupplier, visibleCompanyOrderItems, selectedCompanySupplierDraft, handleCompanyOrderAddItem, hasMoreCompanyOrderItems, selectedCompanyOrderCount, selectedCompanyOrderTotalUnits, companyOrderCartItems, handleCompanyOrderStepItem, handleCompanyOrderRemoveItem, submitCompanyOrder, selectedCompanyOrderSupplierCount, loadCompanyOrders, hasLiquorManagerAccess, hasLiquorPremiumAccess, companyOrdersOfficeId, loadLiquorControlData, liquorSheetRows, updateLiquorSheetDraft, saveLiquorCatalogRow, saveLiquorCountRow, createLiquorKind, deleteLiquorKind, assistLiquorCatalog, lookupLiquorByUpc, createLiquorCatalogItem, createLiquorMovement, saveLiquorQuickCount, analyzeLiquorBottleForItem, pickLiquorInvoicePhoto, analyzeLiquorInvoicePhoto, applyLiquorInvoiceRows, handleLiquorAnalyticsExport, deviceTimeZone, handleToggleAdminNotificationPreference, handleSyncTenantTimeZone, };
  const isBiometricGateActive =
    loggedIn && biometricEnabled && biometricLocked;
  return (
    <LinearGradient colors={themeColors} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.keyboardWrap}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <ScrollView
            contentContainerStyle={[
              styles.container,
              keyboardInset > 0
                ? {
                    paddingBottom: Math.max(40, keyboardInset + 24),
                  }
                : null,
            ]}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            automaticallyAdjustKeyboardInsets
          >
            {isBiometricGateActive ? (
              <AdminBiometricLockCard
                isLight={isLight}
                text={text}
                biometricPrompting={biometricPrompting}
                biometricStatus={biometricStatus}
                onUnlock={retryBiometricUnlock}
                onLogout={clearAdminSession}
              />
            ) : (
              <>
                <AdminShellHeader
                  isLight={isLight}
                  subtitle={text.subtitle}
                  languageLabel={text.language}
                  lightLabel={text.light}
                  darkLabel={text.dark}
                  logoutLabel={text.logout}
                  biometricToggleLabel={
                    loggedIn && biometricAvailable
                      ? biometricEnabled
                        ? text.biometricDisable
                        : text.biometricEnable
                      : null
                  }
                  tenantLabel={text.tenant}
                  activeLocationLabelText={text.activeLocation}
                  switchLocationLabel={text.switchLocation}
                  language={language}
                  onLanguageChange={setLanguage}
                  theme={theme}
                  onBiometricToggle={() => {
                    void toggleBiometricPreference();
                  }}
                  onToggleTheme={() =>
                    setTheme((previous) =>
                      previous === "dark" ? "light" : "dark",
                    )
                  }
                  loggedIn={loggedIn}
                  onLogout={clearAdminSession}
                  activeTenantLabel={activeTenantLabel}
                  activeTenant={activeTenant}
                  activeApiLabel={activeApiLabel}
                  canManageMultiLocation={canManageMultiLocation}
                  activeLocationLabel={activeLocationLabel}
                  allLocationsLabel={text.allLocations}
                  offices={offices}
                  scopedLocationId={scopedLocationId}
                  onLocationScopeChange={setActiveLocationId}
                  visibleTabs={visibleTabs}
                  screen={screen}
                  onScreenChange={setScreen}
                  getTabLabel={(tab) => tabLabels[language][tab]}
                  onSwitchLocation={() => setScreen("offices")}
                />
                {loggedIn && biometricStatus ? (
                  <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
                    {biometricStatus}
                  </Text>
                ) : null}
                <AdminContentRouter {...adminContentProps} />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
      </SafeAreaView>
    </LinearGradient>
  );
}
