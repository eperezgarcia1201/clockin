import { useCallback, useMemo } from "react";
import {
  buildTodayRoleTabs,
  filterTodayScheduleRowsByRole,
  formatScheduleShiftLabel,
  formatTodayScheduleSummaryLabel,
  selectActiveTodayRoleFilter,
} from "./schedule-view-helpers";
import type { TodayScheduleResponse } from "./types";

type TodayScheduleText = {
  startsAt: string;
  endsAt: string;
  anyTime: string;
  allRoles: string;
  unassignedRole: string;
  todayTeamDefaultLabel: string;
};

export const useTodayScheduleViewModel = (params: {
  t: TodayScheduleText;
  todaySchedule: TodayScheduleResponse | null;
  todayRoleFilter: string;
}) => {
  const scheduleShiftLabel = useCallback(
    (startTime: string, endTime: string) =>
      formatScheduleShiftLabel(startTime, endTime, {
        startsAt: params.t.startsAt,
        endsAt: params.t.endsAt,
        anyTime: params.t.anyTime,
      }),
    [params.t.anyTime, params.t.endsAt, params.t.startsAt],
  );

  const todayRoleTabs = useMemo(
    () =>
      buildTodayRoleTabs(params.todaySchedule, {
        allRoles: params.t.allRoles,
        unassignedRole: params.t.unassignedRole,
      }),
    [params.t.allRoles, params.t.unassignedRole, params.todaySchedule],
  );

  const activeTodayRoleFilter = useMemo(
    () => selectActiveTodayRoleFilter(todayRoleTabs, params.todayRoleFilter),
    [params.todayRoleFilter, todayRoleTabs],
  );

  const filteredTodayScheduleRows = useMemo(
    () => filterTodayScheduleRowsByRole(params.todaySchedule, activeTodayRoleFilter),
    [activeTodayRoleFilter, params.todaySchedule],
  );

  const todayScheduleLabel = useMemo(
    () =>
      formatTodayScheduleSummaryLabel(
        params.todaySchedule,
        params.t.todayTeamDefaultLabel,
      ),
    [params.t.todayTeamDefaultLabel, params.todaySchedule],
  );

  return {
    scheduleShiftLabel,
    todayRoleTabs,
    activeTodayRoleFilter,
    filteredTodayScheduleRows,
    todayScheduleLabel,
  };
};
