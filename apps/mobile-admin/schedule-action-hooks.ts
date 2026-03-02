import type { Dispatch, SetStateAction } from "react";
import { defaultScheduleDays } from "./app-state-helpers";
import {
  loadEmployeeScheduleDays,
  saveEmployeeScheduleRequest,
  validateScheduleEmployeeId,
} from "./schedule-runtime";
import {
  withAdjustedScheduleTime,
  withScheduleMeridiem,
  withUpdatedScheduleDay,
} from "./schedule-state-helpers";
import type { Meridiem, ScheduleDay, ScheduleTimeKey } from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const useScheduleActions = (params: {
  fetchJson: FetchJson;
  scheduleEmployeeId: string;
  scheduleDays: ScheduleDay[];
  setScheduleDays: Dispatch<SetStateAction<ScheduleDay[]>>;
  setScheduleStatus: Dispatch<SetStateAction<string | null>>;
  loadTodaySchedule: () => Promise<void>;
}) => {
  const loadSchedule = async (employeeId: string) => {
    const days = await loadEmployeeScheduleDays({
      fetchJson: params.fetchJson,
      employeeId,
      defaultScheduleDays,
    });
    params.setScheduleDays(days);
  };

  const updateScheduleDay = (
    weekday: number,
    key: keyof ScheduleDay,
    value: string | boolean,
  ) => {
    params.setScheduleDays((previous) =>
      withUpdatedScheduleDay(previous, weekday, key, value),
    );
  };

  const adjustScheduleTime = (
    weekday: number,
    key: ScheduleTimeKey,
    part: "hour" | "minute" | "meridiem",
    direction: 1 | -1 = 1,
  ) => {
    params.setScheduleDays((previous) =>
      withAdjustedScheduleTime(previous, weekday, key, part, direction),
    );
  };

  const setScheduleMeridiem = (
    weekday: number,
    key: ScheduleTimeKey,
    meridiem: Meridiem,
  ) => {
    params.setScheduleDays((previous) =>
      withScheduleMeridiem(previous, weekday, key, meridiem),
    );
  };

  const saveSchedule = async () => {
    const validation = validateScheduleEmployeeId(params.scheduleEmployeeId);
    if (validation.ok === false) {
      params.setScheduleStatus(validation.error);
      return;
    }
    params.setScheduleStatus(null);
    const result = await saveEmployeeScheduleRequest({
      fetchJson: params.fetchJson,
      employeeId: params.scheduleEmployeeId,
      scheduleDays: params.scheduleDays,
    });
    if (result.ok === false) {
      params.setScheduleStatus(result.error);
      return;
    }
    params.setScheduleStatus("Schedule saved.");
    void params.loadTodaySchedule();
  };

  return {
    loadSchedule,
    updateScheduleDay,
    adjustScheduleTime,
    setScheduleMeridiem,
    saveSchedule,
  };
};
