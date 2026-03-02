import type { AccessPermissions, EditUserForm, ScheduleDay } from "./types";

export const weekDays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const defaultScheduleDays = (): ScheduleDay[] =>
  weekDays.map((label, weekday) => ({
    weekday,
    label,
    enabled: false,
    startTime: "09:00",
    endTime: "17:00",
  }));

export const emptyEditUserForm = (): EditUserForm => ({
  fullName: "",
  displayName: "",
  email: "",
  pin: "",
  hourlyRate: "",
  officeId: "",
  groupId: "",
  isManager: false,
  isOwnerManager: false,
  isAdmin: false,
  isTimeAdmin: false,
  isReports: false,
  isServer: false,
  isKitchenManager: false,
  disabled: false,
});

export const defaultAccessPermissions = (): AccessPermissions => ({
  dashboard: true,
  users: true,
  locations: true,
  manageMultiLocation: false,
  groups: true,
  statuses: true,
  schedules: true,
  companyOrders: true,
  reports: true,
  tips: true,
  salesCapture: true,
  notifications: true,
  settings: true,
  timeEdits: true,
});

export const permissionsFromFeaturePermissions = (
  featurePermissions?: unknown,
): AccessPermissions | null => {
  if (!Array.isArray(featurePermissions)) {
    return null;
  }
  const normalized = new Set<string>(
    featurePermissions
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean),
  );
  if (normalized.size === 0) {
    return null;
  }
  const base = defaultAccessPermissions();
  (Object.keys(base) as (keyof AccessPermissions)[]).forEach((key) => {
    base[key] = normalized.has(key);
  });
  if (normalized.size > 0 && !base.dashboard) {
    base.dashboard = true;
  }
  return base;
};
