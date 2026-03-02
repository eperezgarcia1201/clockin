import type { TodayScheduleResponse, TodayScheduleRow } from "./types";

const parseTodayScheduleRows = (
  rows: unknown,
  unassignedRole: string,
): TodayScheduleRow[] => {
  if (!Array.isArray(rows)) {
    return [];
  }
  const parsedRows: TodayScheduleRow[] = [];
  rows.forEach((row) => {
    if (!row || typeof row !== "object") {
      return;
    }
    const candidate = row as Partial<TodayScheduleRow>;
    if (
      typeof candidate.employeeId !== "string" ||
      typeof candidate.employeeName !== "string"
    ) {
      return;
    }
    const roleLabel =
      typeof candidate.roleLabel === "string" && candidate.roleLabel.trim()
        ? candidate.roleLabel
        : unassignedRole;
    parsedRows.push({
      employeeId: candidate.employeeId,
      employeeName: candidate.employeeName,
      startTime: typeof candidate.startTime === "string" ? candidate.startTime : "",
      endTime: typeof candidate.endTime === "string" ? candidate.endTime : "",
      roleLabel,
      officeId: typeof candidate.officeId === "string" ? candidate.officeId : null,
      officeName:
        typeof candidate.officeName === "string" ? candidate.officeName : null,
    });
  });
  return parsedRows;
};

export const normalizeTodayScheduleResponse = (
  payload: Partial<TodayScheduleResponse>,
  unassignedRole: string,
  selectedOfficeId: string | null,
  usedOfficeScopeFallback: boolean,
): TodayScheduleResponse => {
  const parsedRows = parseTodayScheduleRows(payload.rows, unassignedRole);
  const rows =
    selectedOfficeId && usedOfficeScopeFallback
      ? parsedRows.filter((row) =>
          row.officeId ? row.officeId === selectedOfficeId : true,
        )
      : parsedRows;

  return {
    date: typeof payload.date === "string" ? payload.date : "",
    weekday: typeof payload.weekday === "number" ? payload.weekday : 0,
    weekdayLabel: typeof payload.weekdayLabel === "string" ? payload.weekdayLabel : "",
    timezone: typeof payload.timezone === "string" ? payload.timezone : "UTC",
    rows,
  };
};
