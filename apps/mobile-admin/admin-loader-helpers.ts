import type { Employee, NotificationRow, Office } from "./types";

export type EmployeeLoadReconciliation = {
  nextScheduleEmployeeId: string | null;
  clearReportEmployeeId: boolean;
  clearEditingUser: boolean;
};

export const reconcileEmployeeLoadState = ({
  employees,
  scheduleEmployeeId,
  reportEmployeeId,
  editingUserId,
}: {
  employees: Employee[];
  scheduleEmployeeId: string;
  reportEmployeeId: string;
  editingUserId: string | null;
}): EmployeeLoadReconciliation => {
  const hasScheduleEmployee = employees.some(
    (employee) => employee.id === scheduleEmployeeId,
  );
  let nextScheduleEmployeeId: string | null = null;

  if (!scheduleEmployeeId && employees[0]) {
    nextScheduleEmployeeId = employees[0].id;
  } else if (scheduleEmployeeId && !hasScheduleEmployee) {
    nextScheduleEmployeeId = employees[0]?.id || "";
  }

  return {
    nextScheduleEmployeeId,
    clearReportEmployeeId:
      Boolean(reportEmployeeId) &&
      !employees.some((employee) => employee.id === reportEmployeeId),
    clearEditingUser:
      Boolean(editingUserId) &&
      !employees.some((employee) => employee.id === editingUserId),
  };
};

export const resolveActiveLocationAfterOfficesLoad = ({
  offices,
  canManageMultiLocation,
  activeLocationId,
}: {
  offices: Office[];
  canManageMultiLocation: boolean;
  activeLocationId: string;
}): string | null => {
  if (offices.length === 0) {
    return "";
  }
  if (canManageMultiLocation) {
    if (!activeLocationId) {
      return null;
    }
    if (!offices.some((office) => office.id === activeLocationId)) {
      return "";
    }
  }
  return null;
};

export const normalizeNotifications = (
  payload: { notifications?: NotificationRow[] } | null | undefined,
): NotificationRow[] => payload?.notifications || [];
