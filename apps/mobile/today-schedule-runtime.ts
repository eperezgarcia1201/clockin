import { isOfficeScopeUnsupportedError } from "./app-helpers";
import type { TodayScheduleResponse } from "./types";

type FetchJson = (path: string, options?: RequestInit) => Promise<unknown>;

export const fetchTodayScheduleWithFallback = async ({
  fetchJson,
  selectedOfficeId,
}: {
  fetchJson: FetchJson;
  selectedOfficeId: string | null;
}): Promise<{
  payload: Partial<TodayScheduleResponse>;
  usedOfficeScopeFallback: boolean;
}> => {
  let payload: Partial<TodayScheduleResponse> | null = null;
  let usedOfficeScopeFallback = false;

  if (selectedOfficeId) {
    try {
      payload = (await fetchJson(
        `/employee-schedules/today?officeId=${encodeURIComponent(selectedOfficeId)}`,
      )) as Partial<TodayScheduleResponse>;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!isOfficeScopeUnsupportedError(message)) {
        throw error;
      }
      usedOfficeScopeFallback = true;
    }
  }

  if (!payload) {
    payload = (await fetchJson(
      "/employee-schedules/today",
    )) as Partial<TodayScheduleResponse>;
  }

  return {
    payload,
    usedOfficeScopeFallback,
  };
};
