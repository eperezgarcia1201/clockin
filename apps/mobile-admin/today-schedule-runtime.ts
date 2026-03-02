import {
  buildLegacyTodaySchedule,
  normalizeTodayScheduleResponse,
} from "./today-schedule-helpers";
import type {
  Employee,
  Group,
  Office,
  TodayScheduleResponse,
} from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const loadTodayScheduleWithFallback = async (params: {
  fetchJson: FetchJson;
  appendOfficeScope: (path: string) => string;
  employees: Employee[];
  offices: Office[];
  groups: Group[];
  weekDays: string[];
  padDatePart: (value: number) => string;
}): Promise<{
  schedule: TodayScheduleResponse | null;
  status: string | null;
}> => {
  try {
    const data = (await params.fetchJson(
      params.appendOfficeScope("/employee-schedules/today"),
    )) as Partial<TodayScheduleResponse>;
    return {
      schedule: normalizeTodayScheduleResponse(data),
      status: null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load today's schedule.";
    const shouldUseLegacyFallback =
      message.toLowerCase().includes("employee not found") ||
      message.includes("(404)");

    if (shouldUseLegacyFallback) {
      try {
        const fallback = await buildLegacyTodaySchedule({
          employees: params.employees,
          offices: params.offices,
          groups: params.groups,
          weekDays: params.weekDays,
          appendOfficeScope: params.appendOfficeScope,
          fetchJson: params.fetchJson,
          padDatePart: params.padDatePart,
        });
        return {
          schedule: fallback,
          status: null,
        };
      } catch {
        // fall through to the original error status below
      }
    }

    return {
      schedule: null,
      status: message,
    };
  }
};
