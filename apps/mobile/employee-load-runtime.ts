import {
  isOfficeScopeUnsupportedError,
  normalizeEmployeeRows,
} from "./app-helpers";
import type { Employee } from "./types";

type FetchJson = (path: string, options?: RequestInit) => Promise<unknown>;

const filterEmployeesByOffice = (
  employees: Employee[],
  selectedOfficeId: string | null,
): Employee[] => {
  if (!selectedOfficeId) {
    return employees;
  }
  const scopedFromUnfiltered = employees.filter((employee) => {
    if (typeof employee.officeId === "string") {
      return employee.officeId === selectedOfficeId;
    }
    return true;
  });
  return scopedFromUnfiltered.length > 0 ? scopedFromUnfiltered : employees;
};

export const fetchEmployeesWithOfficeFallback = async ({
  fetchJson,
  selectedOfficeId,
}: {
  fetchJson: FetchJson;
  selectedOfficeId: string | null;
}): Promise<{
  employees: Employee[];
  usedOfficeScopeFallback: boolean;
}> => {
  let usedOfficeScopeFallback = false;

  if (selectedOfficeId) {
    try {
      const scopedData = (await fetchJson(
        `/employees?officeId=${encodeURIComponent(selectedOfficeId)}`,
      )) as { employees?: unknown };
      const scopedEmployees = normalizeEmployeeRows(scopedData.employees);
      if (scopedEmployees.length > 0) {
        return { employees: scopedEmployees, usedOfficeScopeFallback };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!isOfficeScopeUnsupportedError(message)) {
        throw error;
      }
      usedOfficeScopeFallback = true;
    }
  }

  const unscopedData = (await fetchJson("/employees")) as {
    employees?: unknown;
  };
  const unscopedEmployees = normalizeEmployeeRows(unscopedData.employees);

  return {
    employees: filterEmployeesByOffice(unscopedEmployees, selectedOfficeId),
    usedOfficeScopeFallback,
  };
};
