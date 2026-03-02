import type {
  Employee,
  Group,
  Office,
  ScheduleDay,
  TodayScheduleResponse,
  TodayScheduleRow,
} from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

type BuildLegacyTodayScheduleArgs = {
  employees: Employee[];
  offices: Office[];
  groups: Group[];
  weekDays: string[];
  appendOfficeScope: (path: string) => string;
  fetchJson: FetchJson;
  padDatePart: (value: number) => string;
};

export const sortTodayScheduleRows = (
  rows: TodayScheduleRow[],
): TodayScheduleRow[] =>
  rows.sort((a, b) => {
    const aHasStart = Boolean(a.startTime);
    const bHasStart = Boolean(b.startTime);
    if (aHasStart && bHasStart) {
      const byStart = a.startTime.localeCompare(b.startTime);
      if (byStart !== 0) {
        return byStart;
      }
    } else if (aHasStart !== bHasStart) {
      return aHasStart ? -1 : 1;
    }
    return a.employeeName.localeCompare(b.employeeName);
  });

export const normalizeTodayScheduleResponse = (
  data: Partial<TodayScheduleResponse>,
): TodayScheduleResponse => {
  const rows = Array.isArray(data.rows)
    ? data.rows
        .map((row) => {
          if (!row || typeof row !== "object") {
            return null;
          }
          const candidate = row as Partial<TodayScheduleRow>;
          if (
            typeof candidate.employeeId !== "string" ||
            typeof candidate.employeeName !== "string"
          ) {
            return null;
          }
          return {
            employeeId: candidate.employeeId,
            employeeName: candidate.employeeName,
            startTime:
              typeof candidate.startTime === "string"
                ? candidate.startTime
                : "",
            endTime:
              typeof candidate.endTime === "string" ? candidate.endTime : "",
            isServer: Boolean(candidate.isServer),
            officeName:
              typeof candidate.officeName === "string"
                ? candidate.officeName
                : null,
            groupName:
              typeof candidate.groupName === "string"
                ? candidate.groupName
                : null,
            roleLabel:
              typeof candidate.roleLabel === "string" &&
              candidate.roleLabel.trim()
                ? candidate.roleLabel
                : "Unassigned",
          } satisfies TodayScheduleRow;
        })
        .filter((row): row is TodayScheduleRow => Boolean(row))
    : [];

  return {
    date: typeof data.date === "string" ? data.date : "",
    weekday: typeof data.weekday === "number" ? data.weekday : 0,
    weekdayLabel:
      typeof data.weekdayLabel === "string" ? data.weekdayLabel : "",
    timezone: typeof data.timezone === "string" ? data.timezone : "UTC",
    rows: sortTodayScheduleRows(rows),
  };
};

export const buildLegacyTodaySchedule = async ({
  employees,
  offices,
  groups,
  weekDays,
  appendOfficeScope,
  fetchJson,
  padDatePart,
}: BuildLegacyTodayScheduleArgs): Promise<TodayScheduleResponse> => {
  const today = new Date();
  const weekday = today.getDay();
  const weekdayLabel = weekDays[weekday] || "Unknown";
  const date = `${today.getFullYear()}-${padDatePart(today.getMonth() + 1)}-${padDatePart(today.getDate())}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";

  const scopedEmployees =
    employees.length > 0
      ? employees
      : (
          (await fetchJson(appendOfficeScope("/employees"))) as {
            employees?: Employee[];
          }
        ).employees || [];

  const activeEmployees = scopedEmployees.filter((employee) => employee.active);
  if (activeEmployees.length === 0) {
    return {
      date,
      weekday,
      weekdayLabel,
      timezone,
      rows: [],
    } satisfies TodayScheduleResponse;
  }

  const officeNameById = new Map(
    offices.map((office) => [office.id, office.name]),
  );
  const groupNameById = new Map(groups.map((group) => [group.id, group.name]));

  const dayRows = await Promise.all(
    activeEmployees.map(async (employee) => {
      try {
        const data = (await fetchJson(
          `/employee-schedules/${employee.id}`,
        )) as {
          days?: ScheduleDay[];
        };
        const days = Array.isArray(data.days) ? data.days : [];
        const day = days.find(
          (item) => item.weekday === weekday && item.enabled,
        );
        if (!day) {
          return null;
        }

        const groupName = employee.groupId
          ? groupNameById.get(employee.groupId) || null
          : null;
        const roleLabel = employee.isServer
          ? "Servers"
          : groupName || "Unassigned";
        const officeName = employee.officeId
          ? officeNameById.get(employee.officeId) || null
          : null;

        return {
          employeeId: employee.id,
          employeeName: employee.name,
          startTime: day.startTime || "",
          endTime: day.endTime || "",
          isServer: Boolean(employee.isServer),
          officeName,
          groupName,
          roleLabel,
        } satisfies TodayScheduleRow;
      } catch {
        return null;
      }
    }),
  );

  return {
    date,
    weekday,
    weekdayLabel,
    timezone,
    rows: sortTodayScheduleRows(
      dayRows.filter((row): row is TodayScheduleRow => Boolean(row)),
    ),
  } satisfies TodayScheduleResponse;
};
