import {
  ALL_ROLE_FILTER,
  formatDisplayDate,
  formatScheduleTimeLabel,
} from "./app-helpers";
import type { TodayScheduleResponse, TodayScheduleRow } from "./types";

export const formatScheduleShiftLabel = (
  startTime: string,
  endTime: string,
  labels: { startsAt: string; endsAt: string; anyTime: string },
): string => {
  if (startTime && endTime) {
    return `${formatScheduleTimeLabel(startTime)} - ${formatScheduleTimeLabel(endTime)}`;
  }
  if (startTime) {
    return `${labels.startsAt} ${formatScheduleTimeLabel(startTime)}`;
  }
  if (endTime) {
    return `${labels.endsAt} ${formatScheduleTimeLabel(endTime)}`;
  }
  return labels.anyTime;
};

export const buildTodayRoleTabs = (
  todaySchedule: TodayScheduleResponse | null,
  labels: { allRoles: string; unassignedRole: string },
): Array<{ key: string; label: string }> => {
  const uniqueLabels = new Set<string>();
  (todaySchedule?.rows || []).forEach((row) => {
    const label = row.roleLabel.trim() || labels.unassignedRole;
    uniqueLabels.add(label);
  });
  const sortedLabels = Array.from(uniqueLabels).sort((a, b) =>
    a.localeCompare(b),
  );
  return [
    { key: ALL_ROLE_FILTER, label: labels.allRoles },
    ...sortedLabels.map((label) => ({ key: label, label })),
  ];
};

export const selectActiveTodayRoleFilter = (
  tabs: Array<{ key: string; label: string }>,
  currentFilter: string,
): string =>
  tabs.some((tab) => tab.key === currentFilter)
    ? currentFilter
    : ALL_ROLE_FILTER;

export const filterTodayScheduleRowsByRole = (
  todaySchedule: TodayScheduleResponse | null,
  activeRoleFilter: string,
): TodayScheduleRow[] => {
  const rows = todaySchedule?.rows || [];
  if (activeRoleFilter === ALL_ROLE_FILTER) {
    return rows;
  }
  return rows.filter((row) => row.roleLabel === activeRoleFilter);
};

export const formatTodayScheduleSummaryLabel = (
  todaySchedule: TodayScheduleResponse | null,
  fallbackLabel: string,
): string => {
  if (!todaySchedule) {
    return fallbackLabel;
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
