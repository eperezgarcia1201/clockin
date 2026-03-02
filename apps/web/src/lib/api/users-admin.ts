import { requestJson } from "./client";

export type EmployeeRow = {
  id: string;
  name: string;
  active: boolean;
  email?: string;
  officeId?: string | null;
  groupId?: string | null;
  isManager?: boolean;
  managerPermissions?: string[];
  isOwnerManager?: boolean;
  isAdmin?: boolean;
  isTimeAdmin?: boolean;
  isReports?: boolean;
  isServer?: boolean;
  isKitchenManager?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  hoursRecordCount?: number;
  tipRecordCount?: number;
  scheduleRecordCount?: number;
  notificationRecordCount?: number;
};

export type EmployeePayload = {
  fullName: string;
  displayName?: string;
  email?: string;
  pin?: string;
  hourlyRate?: number;
  officeId?: string;
  groupId?: string;
  isManager: boolean;
  isOwnerManager: boolean;
  managerPermissions: string[];
  isAdmin: boolean;
  isTimeAdmin: boolean;
  isReports: boolean;
  isServer: boolean;
  isKitchenManager: boolean;
  disabled: boolean;
};

type EmployeesResponse = {
  employees?: EmployeeRow[];
};

export type EmployeeDetail = {
  id: string;
  fullName: string;
  displayName: string | null;
  email: string | null;
  hourlyRate?: number | null;
  officeId: string | null;
  groupId: string | null;
  isManager: boolean;
  managerPermissions: string[];
  isOwnerManager?: boolean;
  isAdmin: boolean;
  isTimeAdmin: boolean;
  isReports: boolean;
  isServer: boolean;
  isKitchenManager: boolean;
  disabled: boolean;
};

type ListEmployeesOptions = {
  scope?: "deleted";
};

function withEmployeesQuery(options?: ListEmployeesOptions): string {
  const query = new URLSearchParams();
  if (options?.scope === "deleted") {
    query.set("scope", "deleted");
  }
  const suffix = query.toString();
  return suffix ? `/api/employees?${suffix}` : "/api/employees";
}

export async function listEmployees(
  options?: ListEmployeesOptions,
): Promise<EmployeeRow[]> {
  const payload = await requestJson<EmployeesResponse>(
    withEmployeesQuery(options),
  );
  return payload.employees ?? [];
}

export async function createEmployee(payload: EmployeePayload): Promise<void> {
  await requestJson<unknown>("/api/employees", {
    method: "POST",
    body: payload,
  });
}

export async function getEmployeeById(
  employeeId: string,
): Promise<EmployeeDetail> {
  return requestJson<EmployeeDetail>(`/api/employees/${employeeId}`);
}

export async function updateEmployee(
  employeeId: string,
  payload: Partial<EmployeePayload> & { disabled?: boolean },
): Promise<void> {
  await requestJson<unknown>(`/api/employees/${employeeId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function archiveEmployee(employeeId: string): Promise<void> {
  await requestJson<unknown>(`/api/employees/${employeeId}`, {
    method: "DELETE",
  });
}

export async function restoreEmployee(employeeId: string): Promise<void> {
  await requestJson<unknown>(`/api/employees/${employeeId}/restore`, {
    method: "PATCH",
  });
}

export async function deleteEmployeePermanent(
  employeeId: string,
): Promise<void> {
  await requestJson<unknown>(`/api/employees/${employeeId}/permanent`, {
    method: "DELETE",
  });
}
