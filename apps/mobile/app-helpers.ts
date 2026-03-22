import type { Employee } from "./types";

export const normalizePinInput = (value: string) =>
  value.replace(/[^\d]/g, "").slice(0, 4);
export const normalizeOrderQuantityInput = (value: string) => {
  const trimmed = value.replace(/,/g, ".").replace(/[^\d.]/g, "");
  if (!trimmed) {
    return "";
  }
  const parts = trimmed.split(".");
  const integerPart = parts[0] || "0";
  const decimalPart = parts.slice(1).join("").slice(0, 2);
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
};
export const isOfficeScopeUnsupportedError = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("officeid") && normalized.includes("should not exist")
  );
};
export const ACTIVE_SHIFT_STATUSES = new Set(["IN", "BREAK", "LUNCH"]);
export const ALL_ROLE_FILTER = "__all__";
export const formatDisplayDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return value;
  return `${match[2]}/${match[3]}/${match[1]}`;
};
export const formatScheduleTimeLabel = (value: string) => {
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours24 = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours24) || !Number.isFinite(minutes)) {
    return value;
  }
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hour12 = ((hours24 + 11) % 12) + 1;
  return `${String(hour12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${meridiem}`;
};
export const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
export const getCurrentWeekStartDateKey = () => {
  const now = new Date();
  const utcDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const day = utcDate.getUTCDay();
  const distanceToMonday = (day + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - distanceToMonday);
  return utcDate.toISOString().slice(0, 10);
};
export const todayDateKey = () => localDateKey();
export const getTipSubmissionKey = (employeeId: string, workDate?: string) => {
  const normalizedDate = workDate || localDateKey();
  return `${employeeId}:${normalizedDate}`;
};
export const isFeatureAccessDeniedError = (message: string) =>
  message.toLowerCase().includes("does not have access to this feature");

export const normalizeEmployeeRows = (rows: unknown): Employee[] => {
  if (!Array.isArray(rows)) {
    return [];
  }

  const normalized: Employee[] = [];
  rows.forEach((row) => {
    if (!row || typeof row !== "object") {
      return;
    }
    const candidate = row as Record<string, unknown>;
    const rawId =
      typeof candidate.id === "string"
        ? candidate.id
        : typeof candidate.employeeId === "string"
          ? candidate.employeeId
          : "";
    const id = rawId.trim();
    const rawName =
      typeof candidate.name === "string"
        ? candidate.name
        : typeof candidate.displayName === "string"
          ? candidate.displayName
          : typeof candidate.fullName === "string"
            ? candidate.fullName
            : "";
    const name = rawName.trim();
    if (!id || !name) {
      return;
    }

    const active =
      typeof candidate.active === "boolean"
        ? candidate.active
        : candidate.disabled === true
          ? false
          : true;
    normalized.push({
      id,
      name,
      active,
      isManager: Boolean(candidate.isManager),
      isServer: Boolean(candidate.isServer),
      isKitchenManager: Boolean(candidate.isKitchenManager),
      allowOpenSchedule: candidate.allowOpenSchedule === true,
      requiresPunchPhoto: candidate.requiresPunchPhoto === true,
      officeId:
        typeof candidate.officeId === "string" ? candidate.officeId : null,
    });
  });

  return normalized;
};

export const companyOrderItemKey = (nameEs: string, nameEn: string) =>
  `${nameEs.trim().toLowerCase()}|${nameEn.trim().toLowerCase()}`;
