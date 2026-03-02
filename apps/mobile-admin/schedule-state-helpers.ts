import {
  parseScheduleOverrideNotification,
  parseScheduleTimeParts,
  sanitizeTime,
  toTwentyFourHourTime,
} from "./app-helpers";
import type {
  Meridiem,
  NotificationRow,
  ScheduleDay,
  ScheduleTimeKey,
  TodayScheduleResponse,
  TodayScheduleRow,
} from "./types";

export const withUpdatedScheduleDay = (
  prev: ScheduleDay[],
  weekday: number,
  key: keyof ScheduleDay,
  value: string | boolean,
): ScheduleDay[] =>
  prev.map((day) => {
    if (day.weekday !== weekday) return day;
    if (key === "enabled") {
      const enabled = Boolean(value);
      if (!enabled) {
        return { ...day, enabled, startTime: "", endTime: "" };
      }
      return {
        ...day,
        enabled,
        startTime: day.startTime || "09:00",
        endTime: day.endTime || "17:00",
      };
    }
    return { ...day, [key]: value };
  });

export const withAdjustedScheduleTime = (
  prev: ScheduleDay[],
  weekday: number,
  key: ScheduleTimeKey,
  part: "hour" | "minute" | "meridiem",
  direction: 1 | -1 = 1,
): ScheduleDay[] =>
  prev.map((day) => {
    if (day.weekday !== weekday) {
      return day;
    }
    const current = parseScheduleTimeParts(day[key] || "");
    if (part === "hour") {
      const nextHour = current.hour + direction;
      current.hour = nextHour > 12 ? 1 : nextHour < 1 ? 12 : nextHour;
    } else if (part === "minute") {
      const nextMinute = current.minute + direction * 5;
      if (nextMinute >= 60) {
        current.minute = 0;
      } else if (nextMinute < 0) {
        current.minute = 55;
      } else {
        current.minute = nextMinute;
      }
    } else {
      current.meridiem = current.meridiem === "AM" ? "PM" : "AM";
    }

    return { ...day, [key]: toTwentyFourHourTime(current) };
  });

export const withScheduleMeridiem = (
  prev: ScheduleDay[],
  weekday: number,
  key: ScheduleTimeKey,
  meridiem: Meridiem,
): ScheduleDay[] =>
  prev.map((day) => {
    if (day.weekday !== weekday) {
      return day;
    }
    const current = parseScheduleTimeParts(day[key] || "");
    if (current.meridiem === meridiem) {
      return day;
    }
    return {
      ...day,
      [key]: toTwentyFourHourTime({ ...current, meridiem }),
    };
  });

export const normalizeEnabledScheduleDays = (
  scheduleDays: ScheduleDay[],
): Array<{
  weekday: number;
  enabled: true;
  startTime?: string;
  endTime?: string;
}> =>
  scheduleDays
    .filter((day) => day.enabled)
    .map((day) => ({
      weekday: day.weekday,
      enabled: true,
      ...(sanitizeTime(day.startTime)
        ? { startTime: sanitizeTime(day.startTime) }
        : {}),
      ...(sanitizeTime(day.endTime)
        ? { endTime: sanitizeTime(day.endTime) }
        : {}),
    }));

export const buildTodayRoleTabs = (
  todaySchedule: TodayScheduleResponse | null,
): string[] => {
  const labels = new Set<string>();
  (todaySchedule?.rows || []).forEach((row) => {
    const label = row.roleLabel.trim() || "Unassigned";
    labels.add(label);
  });
  return ["All", ...Array.from(labels).sort((a, b) => a.localeCompare(b))];
};

export const filterTodayScheduleRowsByRole = (
  todaySchedule: TodayScheduleResponse | null,
  activeRoleFilter: string,
): TodayScheduleRow[] => {
  const rows = todaySchedule?.rows || [];
  if (activeRoleFilter === "All") {
    return rows;
  }
  return rows.filter((row) => row.roleLabel === activeRoleFilter);
};

export const formatTodayScheduleSummaryLabel = (
  todaySchedule: TodayScheduleResponse | null,
  formatDisplayDate: (value: string) => string,
): string => {
  if (!todaySchedule) {
    return "Who should work today, filtered by role.";
  }
  const weekdayLabel = todaySchedule.weekdayLabel || "Today";
  const dateLabel = todaySchedule.date
    ? formatDisplayDate(todaySchedule.date)
    : "Today";
  const timezoneLabel = todaySchedule.timezone
    ? ` (${todaySchedule.timezone})`
    : "";
  return `${weekdayLabel}, ${dateLabel}${timezoneLabel}`;
};

export type PendingScheduleOverride = {
  requestId: string;
  employeeName: string;
  message: string;
  reasonMessage: string;
  attemptedAt: string;
  workDate: string;
};

export const buildPendingScheduleOverrides = (
  notifications: NotificationRow[],
): PendingScheduleOverride[] =>
  notifications
    .map((notice) => {
      const parsed = parseScheduleOverrideNotification(notice);
      if (!parsed || parsed.status !== "PENDING") {
        return null;
      }
      return {
        requestId: parsed.requestId,
        employeeName: parsed.employeeName || notice.employeeName || "Employee",
        message: notice.message,
        reasonMessage: parsed.reasonMessage,
        attemptedAt: parsed.attemptedAt,
        workDate: parsed.workDate,
      };
    })
    .filter((row): row is PendingScheduleOverride => Boolean(row));
