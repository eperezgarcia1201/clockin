import { normalizeEnabledScheduleDays } from "./schedule-state-helpers";
import { sanitizeTime } from "./app-helpers";
import type { ScheduleDay } from "./types";
type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

const normalizeLoadedScheduleDays = (
  rawDays: unknown,
  defaults: ScheduleDay[],
): ScheduleDay[] => {
  if (!Array.isArray(rawDays)) {
    return defaults;
  }
  const byWeekday = new Map<number, Partial<ScheduleDay>>();
  rawDays.forEach((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return;
    }
    const weekday = Number((entry as { weekday?: unknown }).weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      return;
    }
    byWeekday.set(weekday, entry as Partial<ScheduleDay>);
  });

  return defaults.map((fallback) => {
    const raw = byWeekday.get(fallback.weekday);
    if (!raw) {
      return fallback;
    }
    const label =
      typeof raw.label === "string" && raw.label.trim()
        ? raw.label.trim()
        : fallback.label;
    return {
      ...fallback,
      label,
      enabled: Boolean(raw.enabled),
      startTime: sanitizeTime(raw.startTime) || fallback.startTime,
      endTime: sanitizeTime(raw.endTime) || fallback.endTime,
    };
  });
};

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
  const defaults = params.defaultScheduleDays();
  try {
    const data = (await params.fetchJson(
      `/employee-schedules/${params.employeeId}`,
    )) as {
      days?: unknown;
    };
    return normalizeLoadedScheduleDays(data.days, defaults);
  } catch {
    return defaults;
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
