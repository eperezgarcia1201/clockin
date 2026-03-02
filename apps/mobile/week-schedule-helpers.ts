import type {
  EmployeeWeekScheduleDay,
  EmployeeWeekScheduleResponse,
} from "./types";

const parseWeekScheduleDay = (value: unknown): EmployeeWeekScheduleDay | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<EmployeeWeekScheduleDay>;
  const weekday =
    typeof candidate.weekday === "number" && Number.isInteger(candidate.weekday)
      ? candidate.weekday
      : -1;
  if (weekday < 0 || weekday > 6) {
    return null;
  }

  return {
    weekday,
    label:
      typeof candidate.label === "string" && candidate.label.trim().length > 0
        ? candidate.label
        : `Day ${weekday}`,
    enabled: Boolean(candidate.enabled),
    startTime: typeof candidate.startTime === "string" ? candidate.startTime : "",
    endTime: typeof candidate.endTime === "string" ? candidate.endTime : "",
  };
};

export const normalizeEmployeeWeekScheduleResponse = (
  payload: unknown,
): EmployeeWeekScheduleResponse | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Partial<EmployeeWeekScheduleResponse>;
  if (typeof candidate.employeeId !== "string") {
    return null;
  }

  const days = Array.isArray(candidate.days)
    ? candidate.days
        .map((entry) => parseWeekScheduleDay(entry))
        .filter((entry): entry is EmployeeWeekScheduleDay => Boolean(entry))
        .sort((left, right) => left.weekday - right.weekday)
    : [];

  return {
    employeeId: candidate.employeeId,
    employeeName:
      typeof candidate.employeeName === "string" ? candidate.employeeName : "",
    days,
  };
};
