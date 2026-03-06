import { useCallback } from "react";
import { emptyEditUserForm, weekDays } from "./app-state-helpers";
import { padDatePart } from "./app-helpers";
import { loadActiveNowRows } from "./active-now-runtime";
import {
  loadEmployeesData,
  loadGroupsData,
  loadNotificationsData,
  loadOfficesData,
  loadSummaryData,
} from "./admin-data-runtime";
import {
  loadCompanyOrderCatalogData,
  loadCompanyOrdersData,
} from "./company-order-runtime";
import { loadTodayScheduleWithFallback } from "./today-schedule-runtime";
import type {
  CompanyOrderCatalogSupplier,
  CompanyOrderRow,
  EditUserForm,
  Employee,
  Group,
  NotificationRow,
  Office,
  Summary,
  TodayScheduleResponse,
} from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const useAdminLoadActions = (params: {
  fetchJson: FetchJson;
  appendOfficeScope: (path: string) => string;
  scheduleEmployeeId: string;
  reportEmployeeId: string;
  editingUserId: string | null;
  canManageMultiLocation: boolean;
  activeLocationId: string;
  companyOrdersOfficeId: string;
  companyOrderSupplier: string;
  employees: Employee[];
  offices: Office[];
  groups: Group[];
  setDataSyncError: (value: string | null) => void;
  setSummary: (value: Summary) => void;
  setEmployees: (value: Employee[]) => void;
  setScheduleEmployeeId: (value: string) => void;
  setReportEmployeeId: (value: string) => void;
  setEditingUserId: (value: string | null) => void;
  setEditUserForm: (value: EditUserForm) => void;
  setOffices: (value: Office[]) => void;
  setActiveLocationId: (value: string) => void;
  setGroups: (value: Group[]) => void;
  setNotifications: (value: NotificationRow[]) => void;
  setAlertsStatus: (value: string | null) => void;
  setRecentPunchRows: (
    value: { id: string; name: string; status: string }[],
  ) => void;
  setActiveNow: (value: { id: string; name: string; status: string }[]) => void;
  setTodayScheduleLoading: (value: boolean) => void;
  setTodayScheduleStatus: (value: string | null) => void;
  setTodaySchedule: (value: TodayScheduleResponse | null) => void;
  setCompanyOrderLoading: (value: boolean) => void;
  setCompanyOrderStatus: (value: string | null) => void;
  setCompanyOrderCatalog: (value: CompanyOrderCatalogSupplier[]) => void;
  setCompanyOrderSupplier: (value: string) => void;
  setCompanyOrderRows: (value: CompanyOrderRow[]) => void;
  setLastSubmittedCompanyOrderWeekStart: (value: string) => void;
}) => {
  const loadSummary = useCallback(async () => {
    const result = await loadSummaryData({
      fetchJson: params.fetchJson,
      appendOfficeScope: params.appendOfficeScope,
    });
    if (result.ok === false) {
      params.setDataSyncError(result.error);
      return;
    }
    params.setSummary(result.summary);
    params.setDataSyncError(null);
  }, [params.appendOfficeScope, params.fetchJson]);

  const loadEmployees = useCallback(async () => {
    const result = await loadEmployeesData({
      fetchJson: params.fetchJson,
      appendOfficeScope: params.appendOfficeScope,
      scheduleEmployeeId: params.scheduleEmployeeId,
      reportEmployeeId: params.reportEmployeeId,
      editingUserId: params.editingUserId,
    });
    if (result.ok === false) {
      params.setDataSyncError(result.error);
      return;
    }
    params.setEmployees(result.employees);
    if (result.reconciliation.nextScheduleEmployeeId !== null) {
      params.setScheduleEmployeeId(result.reconciliation.nextScheduleEmployeeId);
    }
    if (result.reconciliation.clearReportEmployeeId) {
      params.setReportEmployeeId("");
    }
    if (result.reconciliation.clearEditingUser) {
      params.setEditingUserId(null);
      params.setEditUserForm(emptyEditUserForm());
    }
    params.setDataSyncError(null);
  }, [
    params.appendOfficeScope,
    params.editingUserId,
    params.fetchJson,
    params.reportEmployeeId,
    params.scheduleEmployeeId,
  ]);

  const loadOffices = useCallback(async () => {
    const result = await loadOfficesData({
      fetchJson: params.fetchJson,
      canManageMultiLocation: params.canManageMultiLocation,
      activeLocationId: params.activeLocationId,
    });
    if (result.ok === false) {
      return;
    }
    params.setOffices(result.offices);
    if (result.nextActiveLocationId !== null) {
      params.setActiveLocationId(result.nextActiveLocationId);
    }
  }, [
    params.activeLocationId,
    params.canManageMultiLocation,
    params.fetchJson,
  ]);

  const loadGroups = useCallback(async () => {
    const result = await loadGroupsData({
      fetchJson: params.fetchJson,
      appendOfficeScope: params.appendOfficeScope,
    });
    if (result.ok === false) {
      return;
    }
    params.setGroups(result.groups);
  }, [params.appendOfficeScope, params.fetchJson]);

  const loadNotifications = useCallback(async () => {
    const result = await loadNotificationsData({
      fetchJson: params.fetchJson,
      appendOfficeScope: params.appendOfficeScope,
    });
    if (result.ok === false) {
      params.setDataSyncError(result.error);
      params.setAlertsStatus(result.error);
      return;
    }
    params.setNotifications(result.notifications);
    params.setDataSyncError(null);
  }, [params.appendOfficeScope, params.fetchJson]);

  const loadActiveNow = useCallback(async () => {
    const result = await loadActiveNowRows({
      fetchJson: params.fetchJson,
      appendOfficeScope: params.appendOfficeScope,
    });
    if (result.ok === false) {
      params.setDataSyncError(result.error);
      return;
    }
    params.setRecentPunchRows(result.recentPunchRows);
    params.setActiveNow(result.activeNowRows);
    params.setDataSyncError(null);
  }, [params.appendOfficeScope, params.fetchJson]);

  const loadTodaySchedule = useCallback(async () => {
    params.setTodayScheduleLoading(true);
    params.setTodayScheduleStatus(null);
    const result = await loadTodayScheduleWithFallback({
      fetchJson: params.fetchJson,
      appendOfficeScope: params.appendOfficeScope,
      employees: params.employees,
      offices: params.offices,
      groups: params.groups,
      weekDays,
      padDatePart,
    });
    params.setTodaySchedule(result.schedule);
    params.setTodayScheduleStatus(result.status);
    params.setTodayScheduleLoading(false);
  }, [
    params.appendOfficeScope,
    params.employees,
    params.fetchJson,
    params.groups,
    params.offices,
  ]);

  const loadCompanyOrderCatalog = useCallback(async () => {
    params.setCompanyOrderLoading(true);
    params.setCompanyOrderStatus(null);
    try {
      const result = await loadCompanyOrderCatalogData({
        fetchJson: params.fetchJson,
        previousSupplierName: params.companyOrderSupplier,
      });
      if (result.ok === false) {
        params.setCompanyOrderStatus(result.error);
        return;
      }
      params.setCompanyOrderCatalog(result.suppliers);
      params.setCompanyOrderSupplier(result.selectedSupplierName);
    } finally {
      params.setCompanyOrderLoading(false);
    }
  }, [params.companyOrderSupplier, params.fetchJson]);

  const loadCompanyOrders = useCallback(async () => {
    params.setCompanyOrderLoading(true);
    params.setCompanyOrderStatus(null);
    try {
      const result = await loadCompanyOrdersData({
        fetchJson: params.fetchJson,
        officeId: params.companyOrdersOfficeId,
        limit: 40,
      });
      if (result.ok === false) {
        params.setCompanyOrderRows([]);
        params.setCompanyOrderStatus(result.error);
        return;
      }
      params.setCompanyOrderRows(result.orders);
      if (result.lastSubmittedWeekStart) {
        params.setLastSubmittedCompanyOrderWeekStart(
          result.lastSubmittedWeekStart,
        );
      }
    } finally {
      params.setCompanyOrderLoading(false);
    }
  }, [params.companyOrdersOfficeId, params.fetchJson]);

  return {
    loadSummary,
    loadEmployees,
    loadOffices,
    loadGroups,
    loadNotifications,
    loadActiveNow,
    loadTodaySchedule,
    loadCompanyOrderCatalog,
    loadCompanyOrders,
  };
};
