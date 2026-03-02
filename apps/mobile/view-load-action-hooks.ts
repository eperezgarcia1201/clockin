import { useCallback, type Dispatch, type SetStateAction } from "react";
import { isOfficeScopeUnsupportedError } from "./app-helpers";
import { fetchEmployeesWithOfficeFallback } from "./employee-load-runtime";
import { normalizeTodayScheduleResponse } from "./today-schedule-helpers";
import { fetchTodayScheduleWithFallback } from "./today-schedule-runtime";
import { normalizeEmployeeWeekScheduleResponse } from "./week-schedule-helpers";
import {
  buildWorkingNowQuerySuffix,
  normalizeWorkingNowRows,
} from "./working-now-helpers";
import type {
  Employee,
  EmployeeWeekScheduleResponse,
  TenantContext,
  TodayScheduleResponse,
  WorkingNowRow,
} from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

type ViewLoadText = {
  unableToLoadTodayTeam: string;
  unableToLoadWorkingNow: string;
  unableToLoadWeekSchedule: string;
  unassignedRole: string;
};

export const useViewLoadActions = (params: {
  tenant: TenantContext | null;
  loadingLocations: boolean;
  canUseClockScreen: boolean;
  selectedOfficeId: string | null;
  fetchJson: FetchJson;
  t: ViewLoadText;
  setEmployees: Dispatch<SetStateAction<Employee[]>>;
  setDirectoryEmployees: Dispatch<SetStateAction<Employee[]>>;
  setStatus: Dispatch<SetStateAction<string | null>>;
  setTodaySchedule: Dispatch<SetStateAction<TodayScheduleResponse | null>>;
  setTodayScheduleStatus: Dispatch<SetStateAction<string | null>>;
  setTodayScheduleLoading: Dispatch<SetStateAction<boolean>>;
  setWorkingNowRows: Dispatch<SetStateAction<WorkingNowRow[]>>;
  setWorkingNowStatus: Dispatch<SetStateAction<string | null>>;
  setWorkingNowLoading: Dispatch<SetStateAction<boolean>>;
  setEmployeeWeekSchedule: Dispatch<
    SetStateAction<EmployeeWeekScheduleResponse | null>
  >;
  setEmployeeWeekScheduleStatus: Dispatch<SetStateAction<string | null>>;
  setEmployeeWeekScheduleLoading: Dispatch<SetStateAction<boolean>>;
}) => {
  const loadEmployees = useCallback(async () => {
    if (!params.tenant) {
      params.setEmployees([]);
      params.setDirectoryEmployees([]);
      return;
    }
    if (params.loadingLocations) {
      return;
    }
    if (!params.canUseClockScreen) {
      params.setEmployees([]);
      return;
    }

    try {
      const { employees, usedOfficeScopeFallback } =
        await fetchEmployeesWithOfficeFallback({
          fetchJson: params.fetchJson,
          selectedOfficeId: params.selectedOfficeId,
        });
      params.setEmployees(employees);

      if (usedOfficeScopeFallback) {
        params.setStatus((previous) =>
          previous && isOfficeScopeUnsupportedError(previous) ? null : previous,
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        params.setStatus(error.message);
      }
    }
  }, [
    params.canUseClockScreen,
    params.fetchJson,
    params.loadingLocations,
    params.selectedOfficeId,
    params.tenant,
    params.setDirectoryEmployees,
    params.setEmployees,
    params.setStatus,
  ]);

  const loadTodaySchedule = useCallback(async () => {
    if (!params.tenant || params.loadingLocations || !params.canUseClockScreen) {
      params.setTodaySchedule(null);
      params.setTodayScheduleStatus(null);
      return;
    }

    params.setTodayScheduleLoading(true);
    params.setTodayScheduleStatus(null);
    try {
      const { payload, usedOfficeScopeFallback } =
        await fetchTodayScheduleWithFallback({
          fetchJson: params.fetchJson,
          selectedOfficeId: params.selectedOfficeId,
        });

      params.setTodaySchedule(
        normalizeTodayScheduleResponse(
          payload,
          params.t.unassignedRole,
          params.selectedOfficeId,
          usedOfficeScopeFallback,
        ),
      );
    } catch (error) {
      params.setTodaySchedule(null);
      params.setTodayScheduleStatus(
        error instanceof Error ? error.message : params.t.unableToLoadTodayTeam,
      );
    } finally {
      params.setTodayScheduleLoading(false);
    }
  }, [
    params.canUseClockScreen,
    params.fetchJson,
    params.loadingLocations,
    params.selectedOfficeId,
    params.t.unableToLoadTodayTeam,
    params.t.unassignedRole,
    params.tenant,
    params.setTodaySchedule,
    params.setTodayScheduleLoading,
    params.setTodayScheduleStatus,
  ]);

  const loadWorkingNow = useCallback(async () => {
    if (!params.tenant || params.loadingLocations || !params.canUseClockScreen) {
      params.setWorkingNowRows([]);
      params.setWorkingNowStatus(null);
      return;
    }

    params.setWorkingNowLoading(true);
    params.setWorkingNowStatus(null);
    try {
      const suffix = buildWorkingNowQuerySuffix(params.selectedOfficeId);
      const data = (await params.fetchJson(
        `/employee-punches/recent${suffix}`,
      )) as {
        rows?: Array<{
          id?: string;
          name?: string;
          status?: string | null;
          office?: string | null;
          group?: string | null;
        }>;
      };
      const normalized = normalizeWorkingNowRows(data.rows);
      params.setWorkingNowRows(normalized);
    } catch (error) {
      params.setWorkingNowRows([]);
      params.setWorkingNowStatus(
        error instanceof Error ? error.message : params.t.unableToLoadWorkingNow,
      );
    } finally {
      params.setWorkingNowLoading(false);
    }
  }, [
    params.canUseClockScreen,
    params.fetchJson,
    params.loadingLocations,
    params.selectedOfficeId,
    params.t.unableToLoadWorkingNow,
    params.tenant,
    params.setWorkingNowLoading,
    params.setWorkingNowRows,
    params.setWorkingNowStatus,
  ]);

  const loadEmployeeWeekSchedule = useCallback(
    async (employeeId: string) => {
      if (
        !params.tenant ||
        params.loadingLocations ||
        !params.canUseClockScreen ||
        employeeId.trim().length === 0
      ) {
        params.setEmployeeWeekSchedule(null);
        params.setEmployeeWeekScheduleStatus(null);
        params.setEmployeeWeekScheduleLoading(false);
        return;
      }

      params.setEmployeeWeekScheduleLoading(true);
      params.setEmployeeWeekScheduleStatus(null);
      try {
        const payload = await params.fetchJson(
          `/employee-schedules/${encodeURIComponent(employeeId)}`,
        );
        const schedule = normalizeEmployeeWeekScheduleResponse(payload);
        if (!schedule) {
          throw new Error(params.t.unableToLoadWeekSchedule);
        }
        params.setEmployeeWeekSchedule(schedule);
      } catch (error) {
        params.setEmployeeWeekSchedule(null);
        params.setEmployeeWeekScheduleStatus(
          error instanceof Error ? error.message : params.t.unableToLoadWeekSchedule,
        );
      } finally {
        params.setEmployeeWeekScheduleLoading(false);
      }
    },
    [
      params.canUseClockScreen,
      params.fetchJson,
      params.loadingLocations,
      params.t.unableToLoadWeekSchedule,
      params.tenant,
      params.setEmployeeWeekSchedule,
      params.setEmployeeWeekScheduleLoading,
      params.setEmployeeWeekScheduleStatus,
    ],
  );

  return {
    loadEmployees,
    loadTodaySchedule,
    loadWorkingNow,
    loadEmployeeWeekSchedule,
  };
};
