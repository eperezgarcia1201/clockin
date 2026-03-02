import { requestJson } from "./client";

export type Employee = {
  id: string;
  name: string;
};

export type PunchRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  office: string | null;
  group: string | null;
  type: string;
  occurredAt: string;
  notes: string;
};

export type PunchUpsertInput = {
  employeeId: string;
  type: string;
  occurredAt: string;
  notes?: string;
};

type EmployeesResponse = {
  employees?: Employee[];
};

type SettingsResponse = {
  allowManualTimeEdits?: boolean;
};

type PunchRecordsResponse = {
  records?: PunchRecord[];
};

type PunchRecordsQuery = {
  employeeId?: string;
  from?: string;
  to?: string;
  tzOffset?: number;
  limit?: number;
};

function buildRecordsQuery(query: PunchRecordsQuery): string {
  const params = new URLSearchParams();
  params.set("limit", String(query.limit ?? 50));
  if (typeof query.tzOffset === "number") {
    params.set("tzOffset", String(query.tzOffset));
  }
  if (query.employeeId) params.set("employeeId", query.employeeId);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  return params.toString();
}

export async function listEmployees(): Promise<Employee[]> {
  const payload = await requestJson<EmployeesResponse>("/api/employees");
  return payload.employees ?? [];
}

export async function getTimeAdminSettings(): Promise<SettingsResponse> {
  return requestJson<SettingsResponse>("/api/settings");
}

export async function listPunchRecords(
  query: PunchRecordsQuery,
): Promise<PunchRecord[]> {
  const queryString = buildRecordsQuery(query);
  const payload = await requestJson<PunchRecordsResponse>(
    `/api/employee-punches/records?${queryString}`,
  );
  return payload.records ?? [];
}

export async function createPunchRecord(
  payload: PunchUpsertInput,
): Promise<void> {
  await requestJson<unknown>("/api/employee-punches/records", {
    method: "POST",
    body: payload,
  });
}

export async function updatePunchRecord(
  id: string,
  payload: PunchUpsertInput,
): Promise<void> {
  await requestJson<unknown>(`/api/employee-punches/records/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deletePunchRecord(id: string): Promise<void> {
  await requestJson<unknown>(`/api/employee-punches/records/${id}`, {
    method: "DELETE",
  });
}
