const apiBase = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "");

type EmployeeContextInput = {
  tenant: string;
  officeId?: string;
};

type EmployeeTipsInput = {
  cashTips: number;
  creditCardTips: number;
};

type EmployeePunchInput = {
  type: string;
  pin?: string;
};

export function resolveEmployeeContextRequest(
  input: EmployeeContextInput,
): Promise<Response> {
  return fetch("/api/employee/context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function clearEmployeeContextRequest(): Promise<Response> {
  return fetch("/api/employee/context", { method: "DELETE" });
}

export function fetchEmployeesRequest(officeId?: string): Promise<Response> {
  if (officeId) {
    return fetch(`${apiBase}/employees?officeId=${encodeURIComponent(officeId)}`, {
      cache: "no-store",
    });
  }
  return fetch(`${apiBase}/employees`, { cache: "no-store" });
}

export function fetchRecentPunchesRequest(officeId?: string): Promise<Response> {
  if (officeId) {
    return fetch(
      `${apiBase}/employee-punches/recent?officeId=${encodeURIComponent(officeId)}`,
      {
        cache: "no-store",
      },
    );
  }
  return fetch(`${apiBase}/employee-punches/recent`, { cache: "no-store" });
}

export function submitEmployeeTipsRequest(
  employeeId: string,
  input: EmployeeTipsInput,
): Promise<Response> {
  return fetch(`/api/employee-tips/${encodeURIComponent(employeeId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function submitEmployeePunchRequest(
  employeeId: string,
  input: EmployeePunchInput,
): Promise<Response> {
  return fetch(`${apiBase}/employee-punches/${encodeURIComponent(employeeId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
