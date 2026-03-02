import { normalizeEnabledScheduleDays } from "./schedule-state-helpers";
import type { ScheduleDay } from "./types";
type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const validateScheduleEmployeeId = (
  employeeId: string,
): { ok: true } | { ok: false; error: string } => {
  if (!employeeId) {
    return { ok: false, error: "Select an employee first." };
  }
  return { ok: true };
};

export const buildScheduleSavePayload = (scheduleDays: ScheduleDay[]) => ({
  days: normalizeEnabledScheduleDays(scheduleDays),
});

export const loadEmployeeScheduleDays = async (params: {
  fetchJson: FetchJson;
  employeeId: string;
  defaultScheduleDays: () => ScheduleDay[];
}): Promise<ScheduleDay[]> => {
  try {
    const data = (await params.fetchJson(
      `/employee-schedules/${params.employeeId}`,
    )) as {
      days?: ScheduleDay[];
    };
    if (data.days && data.days.length === 7) {
      return data.days;
    }
    return params.defaultScheduleDays();
  } catch {
    return params.defaultScheduleDays();
  }
};

export const saveEmployeeScheduleRequest = async (params: {
  fetchJson: FetchJson;
  employeeId: string;
  scheduleDays: ScheduleDay[];
}): Promise<{ ok: true } | { ok: false; error: string }> => {
  try {
    await params.fetchJson(`/employee-schedules/${params.employeeId}`, {
      method: "PUT",
      body: JSON.stringify(buildScheduleSavePayload(params.scheduleDays)),
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save schedule.",
    };
  }
};
