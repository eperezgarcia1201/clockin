import { requestJson } from "./client";
import { listEmployees } from "./users-admin";

export type EmployeeOption = {
  id: string;
  name: string;
};

export type ScheduleDay = {
  weekday: number;
  label: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

export type TodayScheduleRow = {
  employeeId: string;
  employeeName: string;
  startTime: string;
  endTime: string;
  isServer: boolean;
  officeId?: string | null;
  officeName?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  roleLabel: string;
};

export type TodayScheduleResponse = {
  date: string;
  weekday: number;
  weekdayLabel: string;
  timezone: string;
  rows: TodayScheduleRow[];
};

type ScheduleDaysResponse = {
  days?: ScheduleDay[];
};

type SaveSchedulePayload = {
  days: Array<{
    weekday: number;
    enabled: boolean;
    startTime?: string;
    endTime?: string;
  }>;
};

export async function listScheduleEmployees(): Promise<EmployeeOption[]> {
  const employees = await listEmployees();
  return employees.map((employee) => ({
    id: employee.id,
    name: employee.name,
  }));
}

export async function getTodaySchedule(): Promise<
  Partial<TodayScheduleResponse>
> {
  return requestJson<Partial<TodayScheduleResponse>>(
    "/api/employee-schedules/today",
  );
}

export async function getEmployeeSchedule(
  employeeId: string,
): Promise<ScheduleDay[]> {
  const payload = await requestJson<ScheduleDaysResponse>(
    `/api/employee-schedules?employeeId=${encodeURIComponent(employeeId)}`,
  );
  return payload.days ?? [];
}

export async function updateEmployeeSchedule(
  employeeId: string,
  payload: SaveSchedulePayload,
): Promise<void> {
  await requestJson<unknown>(
    `/api/employee-schedules/${encodeURIComponent(employeeId)}`,
    {
      method: "PUT",
      body: payload,
    },
  );
}
