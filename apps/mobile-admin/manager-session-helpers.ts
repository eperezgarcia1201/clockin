import type { Employee } from "./types";

type ActiveNowRow = { id: string; name: string; status: string };
type RecentPunchRow = { id: string; name: string; status: string };

export const buildEmployeePunchStatusMap = (
  activeNow: ActiveNowRow[],
): Map<string, string> => {
  const statusById = new Map<string, string>();
  activeNow.forEach((row) => {
    statusById.set(row.id, row.status.toUpperCase());
  });
  return statusById;
};

export const selectManagerProfile = (
  employees: Employee[],
  sessionManagerEmployeeId: string | null,
): Employee | null => {
  if (!sessionManagerEmployeeId) {
    return null;
  }
  return (
    employees.find((employee) => employee.id === sessionManagerEmployeeId) || null
  );
};

export const selectManagerPunchRow = (
  recentPunchRows: RecentPunchRow[],
  sessionManagerEmployeeId: string | null,
): RecentPunchRow | null => {
  if (!sessionManagerEmployeeId) {
    return null;
  }
  return (
    recentPunchRows.find((row) => row.id === sessionManagerEmployeeId) || null
  );
};

export const deriveManagerPunchAction = (
  currentPunchStatus: string,
): {
  managerCanClockOut: boolean;
  managerNextPunchType: "IN" | "OUT";
  managerActionLabel: "Clock In" | "Clock Out";
} => {
  const managerCanClockOut = ["IN", "BREAK", "LUNCH"].includes(
    currentPunchStatus,
  );
  return {
    managerCanClockOut,
    managerNextPunchType: managerCanClockOut ? "OUT" : "IN",
    managerActionLabel: managerCanClockOut ? "Clock Out" : "Clock In",
  };
};
