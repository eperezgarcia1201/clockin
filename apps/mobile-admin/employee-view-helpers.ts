import type { Employee, Office } from "./types";

export const formatActiveLocationLabel = (
  offices: Office[],
  scopedLocationId: string,
  labels: { allLocations: string; noLocationAssigned: string },
): string => {
  if (!scopedLocationId) {
    return labels.allLocations;
  }
  const office = offices.find((item) => item.id === scopedLocationId);
  return office?.name || labels.noLocationAssigned;
};

export const selectOfficeGeoTarget = (
  offices: Office[],
  scopedLocationId: string,
): Office | null => {
  if (!offices.length) {
    return null;
  }
  if (scopedLocationId) {
    return offices.find((item) => item.id === scopedLocationId) || null;
  }
  return offices[0] || null;
};

export const selectEmployeeById = (
  employees: Employee[],
  employeeId: string,
): Employee | null =>
  employees.find((employee) => employee.id === employeeId) || null;

export const buildActiveMessageEmployees = (
  employees: Employee[],
): Employee[] =>
  employees
    .filter((employee) => employee.active !== false)
    .map((employee) => ({
      ...employee,
      name:
        (employee.name && employee.name.trim()) ||
        (employee.email && employee.email.trim()) ||
        employee.id,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

export const filterEmployeesBySearch = (
  employees: Employee[],
  search: string,
): Employee[] => {
  const lookup = search.trim().toLowerCase();
  if (!lookup) {
    return employees;
  }
  return employees.filter((employee) =>
    employee.name.toLowerCase().includes(lookup),
  );
};
