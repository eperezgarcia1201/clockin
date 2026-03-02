import { useCallback, useEffect, useMemo } from "react";
import { formatApiBaseLabel, formatUsDate } from "./app-helpers";
import { copy, type Lang } from "./copy";
import {
  buildActiveMessageEmployees,
  filterEmployeesBySearch,
  formatActiveLocationLabel,
  selectEmployeeById,
  selectOfficeGeoTarget,
} from "./employee-view-helpers";
import { localizeInlineMessage } from "./inline-message";
import {
  buildPendingScheduleOverrides,
  buildTodayRoleTabs,
  filterTodayScheduleRowsByRole,
  formatTodayScheduleSummaryLabel,
} from "./schedule-state-helpers";
import { buildVisibleTabs } from "./tab-access-helpers";
import type {
  AccessPermissions,
  Employee,
  NotificationRow,
  Office,
  Screen,
  ThemeMode,
  TodayScheduleResponse,
} from "./types";

export const useActiveMessageEmployees = (params: {
  employees: Employee[];
  employeeMessageEmployeeId: string;
  setEmployeeMessageEmployeeId: (employeeId: string) => void;
}) => {
  const activeMessageEmployees = useMemo(
    () => buildActiveMessageEmployees(params.employees),
    [params.employees],
  );

  useEffect(() => {
    if (activeMessageEmployees.length === 0) {
      params.setEmployeeMessageEmployeeId("");
      return;
    }
    const stillValid = activeMessageEmployees.some(
      (employee) => employee.id === params.employeeMessageEmployeeId,
    );
    if (!stillValid) {
      params.setEmployeeMessageEmployeeId(activeMessageEmployees[0].id);
    }
  }, [activeMessageEmployees, params.employeeMessageEmployeeId]);

  return activeMessageEmployees;
};

export const useTodayScheduleViewState = (params: {
  todaySchedule: TodayScheduleResponse | null;
  todayRoleFilter: string;
  notifications: NotificationRow[];
  formatDisplayDate: (value: string) => string;
}) => {
  const todayRoleTabs = useMemo(
    () => buildTodayRoleTabs(params.todaySchedule),
    [params.todaySchedule],
  );
  const activeTodayRoleFilter = todayRoleTabs.includes(params.todayRoleFilter)
    ? params.todayRoleFilter
    : "All";
  const filteredTodayScheduleRows = useMemo(
    () =>
      filterTodayScheduleRowsByRole(
        params.todaySchedule,
        activeTodayRoleFilter,
      ),
    [activeTodayRoleFilter, params.todaySchedule],
  );
  const todayScheduleLabel = useMemo(
    () =>
      formatTodayScheduleSummaryLabel(
        params.todaySchedule,
        params.formatDisplayDate,
      ),
    [params.todaySchedule],
  );
  const pendingScheduleOverrides = useMemo(
    () => buildPendingScheduleOverrides(params.notifications),
    [params.notifications],
  );

  return {
    todayRoleTabs,
    activeTodayRoleFilter,
    filteredTodayScheduleRows,
    todayScheduleLabel,
    pendingScheduleOverrides,
  };
};

export const useAdminShellViewState = (params: {
  language: Lang;
  theme: ThemeMode;
  resolvedApiBase: string | null;
  apiBaseCandidates: string[];
  offices: Office[];
  scopedLocationId: string;
  employees: Employee[];
  employeeMessageEmployeeId: string;
  setEmployeeMessageEmployeeId: (employeeId: string) => void;
  scheduleEmployeeId: string;
  scheduleEmployeeSearch: string;
  todaySchedule: TodayScheduleResponse | null;
  todayRoleFilter: string;
  notifications: NotificationRow[];
  formatDisplayDate: (value: string) => string;
  tabs: Screen[];
  permissions: AccessPermissions;
  liquorInventoryEnabled: boolean;
}) => {
  const text = copy[params.language] ?? copy.en;
  const inline = useCallback(
    (message: string) => localizeInlineMessage(params.language, message),
    [params.language],
  );
  const inlineOrNull = useCallback(
    (message: string | null) => (message ? inline(message) : message),
    [inline],
  );
  const todayExpenseDate = formatUsDate(new Date());
  const activeLocationLabel = useMemo(
    () =>
      formatActiveLocationLabel(params.offices, params.scopedLocationId, {
        allLocations: text.allLocations,
        noLocationAssigned: text.noLocationAssigned,
      }),
    [
      params.offices,
      params.scopedLocationId,
      text.allLocations,
      text.noLocationAssigned,
    ],
  );
  const officeGeoTarget = useMemo(
    () => selectOfficeGeoTarget(params.offices, params.scopedLocationId),
    [params.offices, params.scopedLocationId],
  );
  const selectedScheduleEmployee = useMemo(
    () => selectEmployeeById(params.employees, params.scheduleEmployeeId),
    [params.employees, params.scheduleEmployeeId],
  );
  const activeMessageEmployees = useActiveMessageEmployees({
    employees: params.employees,
    employeeMessageEmployeeId: params.employeeMessageEmployeeId,
    setEmployeeMessageEmployeeId: params.setEmployeeMessageEmployeeId,
  });
  const filteredScheduleEmployees = useMemo(
    () =>
      filterEmployeesBySearch(
        params.employees,
        params.scheduleEmployeeSearch,
      ),
    [params.employees, params.scheduleEmployeeSearch],
  );
  const {
    todayRoleTabs,
    activeTodayRoleFilter,
    filteredTodayScheduleRows,
    todayScheduleLabel,
    pendingScheduleOverrides,
  } = useTodayScheduleViewState({
    todaySchedule: params.todaySchedule,
    todayRoleFilter: params.todayRoleFilter,
    notifications: params.notifications,
    formatDisplayDate: params.formatDisplayDate,
  });
  const visibleTabs = useMemo(
    () =>
      buildVisibleTabs(
        params.tabs,
        params.permissions,
        params.liquorInventoryEnabled,
      ),
    [params.liquorInventoryEnabled, params.permissions, params.tabs],
  );
  const themeColors = useMemo(() => {
    if (params.theme === "light") {
      return ["#eef2f7", "#e6ebf3", "#dde3ee"] as const;
    }
    return ["#0c121d", "#141b2a", "#1c2334"] as const;
  }, [params.theme]);
  const isLight = params.theme === "light";
  const activeApiLabel = useMemo(
    () =>
      formatApiBaseLabel(
        params.resolvedApiBase || params.apiBaseCandidates[0] || "",
      ),
    [params.apiBaseCandidates, params.resolvedApiBase],
  );

  return {
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
  };
};
