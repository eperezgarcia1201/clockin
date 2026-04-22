import type {
  ExpensePaymentMethod,
  LiquorMovementType,
  Meridiem,
  NotificationRow,
} from "./types";

const parseTwentyFourHourTime = (value: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return { hours, minutes };
};

export const normalizeTime = (value: unknown) => {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) return "";
  const twentyFourHour = parseTwentyFourHourTime(trimmed);
  if (twentyFourHour) {
    return `${String(twentyFourHour.hours).padStart(2, "0")}:${String(
      twentyFourHour.minutes,
    ).padStart(2, "0")}`;
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (!match) return trimmed;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toLowerCase();
  if (
    !Number.isInteger(hours) ||
    hours < 1 ||
    hours > 12 ||
    !Number.isInteger(minutes) ||
    minutes < 0 ||
    minutes > 59
  ) {
    return trimmed;
  }
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export const sanitizeTime = (value: unknown) => {
  const normalized = normalizeTime(value);
  const parsed = parseTwentyFourHourTime(normalized);
  if (!parsed) {
    return "";
  }
  return `${String(parsed.hours).padStart(2, "0")}:${String(parsed.minutes).padStart(2, "0")}`;
};

export const parseScheduleTimeParts = (value: unknown) => {
  const fallback = "09:00";
  const normalized = sanitizeTime(value || "") || fallback;
  const [rawHours, rawMinutes] = normalized.split(":");
  const safeHours = Number(rawHours);
  const safeMinutes = Number(rawMinutes);
  const hours24 = Number.isFinite(safeHours) ? safeHours : 9;
  const minutes = Number.isFinite(safeMinutes) ? safeMinutes : 0;
  const meridiem: Meridiem = hours24 >= 12 ? "PM" : "AM";
  const hour12 = ((hours24 + 11) % 12) + 1;
  return {
    hour: hour12,
    minute: minutes,
    meridiem,
  };
};

export const toTwentyFourHourTime = (parts: {
  hour: number;
  minute: number;
  meridiem: Meridiem;
}) => {
  const safeHour = Math.min(12, Math.max(1, Math.trunc(parts.hour)));
  const safeMinute = Math.min(59, Math.max(0, Math.trunc(parts.minute)));
  const hourBase = safeHour % 12;
  const hours24 = parts.meridiem === "PM" ? hourBase + 12 : hourBase;
  return `${String(hours24).padStart(2, "0")}:${String(safeMinute).padStart(2, "0")}`;
};

export const formatScheduleTimeLabel = (value: unknown) => {
  const parts = parseScheduleTimeParts(value);
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")} ${parts.meridiem}`;
};

export const padDatePart = (value: number) => `${value}`.padStart(2, "0");

export const formatUsDate = (value: Date) =>
  `${padDatePart(value.getMonth() + 1)}/${padDatePart(
    value.getDate(),
  )}/${value.getFullYear()}`;

export const parseDateInputToIso = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let year = 0;
  let month = 0;
  let day = 0;

  const usMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (usMatch) {
    month = Number(usMatch[1]);
    day = Number(usMatch[2]);
    year = Number(usMatch[3]);
  } else {
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (!isoMatch) return null;
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  }

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
};

export const formatDisplayDate = (value: string | null | undefined) => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    return "";
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) return normalized;
  return `${match[2]}/${match[3]}/${match[1]}`;
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

export const shiftWeekStartDateKey = (weekStartDate: string, deltaWeeks: number) => {
  const base = parseDateInputToIso(weekStartDate) || getCurrentWeekStartDateKey();
  const parsed = new Date(`${base}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return getCurrentWeekStartDateKey();
  }
  parsed.setUTCDate(parsed.getUTCDate() + deltaWeeks * 7);
  return parsed.toISOString().slice(0, 10);
};
export const todayDateKey = () => new Date().toISOString().slice(0, 10);
export const nowDateTimeLocal = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};
export const previousMonthKey = (monthKey: string) => {
  const normalized = monthKey.trim();
  if (!/^\d{4}-\d{2}$/.test(normalized)) {
    return new Date().toISOString().slice(0, 7);
  }
  const monthDate = new Date(`${normalized}-01T00:00:00.000Z`);
  if (Number.isNaN(monthDate.getTime())) {
    return new Date().toISOString().slice(0, 7);
  }
  monthDate.setUTCMonth(monthDate.getUTCMonth() - 1);
  return monthDate.toISOString().slice(0, 7);
};
export const liquorMovementTypes: LiquorMovementType[] = [
  "PURCHASE",
  "SALE",
  "WASTE",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "TRANSFER_IN",
  "TRANSFER_OUT",
];

export const formatScheduleShiftLabel = (startTime: string, endTime: string) => {
  if (startTime && endTime) {
    return `${formatScheduleTimeLabel(startTime)} - ${formatScheduleTimeLabel(endTime)}`;
  }
  if (startTime) {
    return `Starts ${formatScheduleTimeLabel(startTime)}`;
  }
  if (endTime) {
    return `Ends ${formatScheduleTimeLabel(endTime)}`;
  }
  return "Any time";
};

export const parseMoneyInput = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Number(parsed.toFixed(2));
};

export const normalizeExpenseAmountInput = (value: string) => {
  const sanitized = value.replace(/,/g, ".").replace(/[^\d.]/g, "");
  if (!sanitized) {
    return "";
  }
  const parts = sanitized.split(".");
  const hasDecimal = sanitized.includes(".");
  const integerDigits = (parts[0] || "")
    .replace(/^0+(?=\d)/, "")
    .slice(0, 4);
  const decimalDigits = parts.slice(1).join("").slice(0, 2);
  const integerPart = integerDigits || (hasDecimal ? "0" : "");
  if (!integerPart && !decimalDigits) {
    return "";
  }
  if (hasDecimal) {
    return `${integerPart || "0"}.${decimalDigits}`;
  }
  return integerPart;
};

export const applyExpenseAmountCents = (value: string, cents: string) => {
  const normalized = normalizeExpenseAmountInput(value);
  const integerPart = (normalized.split(".")[0] || "0").slice(0, 4);
  return `${integerPart || "0"}.${cents.slice(0, 2).padEnd(2, "0")}`;
};

export const normalizeExpenseCheckNumberInput = (value: string) =>
  value.replace(/\D/g, "").slice(0, 4);

const normalizeCompanyOrderNamePart = (value: string | null | undefined) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

export const normalizeCompanyOrderItemNames = (
  nameEs: string | null | undefined,
  nameEn: string | null | undefined,
) => {
  const normalizedEs = normalizeCompanyOrderNamePart(nameEs);
  const normalizedEn = normalizeCompanyOrderNamePart(nameEn);
  return {
    nameEs: normalizedEs || normalizedEn || "-",
    nameEn: normalizedEn || normalizedEs || "-",
  };
};

export const companyOrderItemKey = (
  nameEs: string | null | undefined,
  nameEn: string | null | undefined,
) => {
  const normalized = normalizeCompanyOrderItemNames(nameEs, nameEn);
  return `${normalized.nameEs.toLowerCase()}|${normalized.nameEn.toLowerCase()}`;
};

export const normalizeCompanyOrderQuantityInput = (value: string) => {
  const trimmed = value.replace(/,/g, ".").replace(/[^\d.]/g, "");
  if (!trimmed) {
    return "";
  }
  const parts = trimmed.split(".");
  const integerPart = parts[0] || "0";
  const decimalPart = parts.slice(1).join("").slice(0, 2);
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
};

export const parseOptionalCoordinate = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return Number.NaN;
  return parsed;
};

export const parseOptionalRadius = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return Number.NaN;
  return Math.round(parsed);
};

export const formatMoney = (value: number) => `$${Number(value || 0).toFixed(2)}`;

export const expensePaymentMethodLabel = (value: ExpensePaymentMethod) => {
  if (value === "CHECK") return "Check";
  if (value === "DEBIT_CARD") return "Debit Card";
  return "Cash";
};

export const parseScheduleOverrideNotification = (notice: NotificationRow) => {
  if (notice.type !== "SCHEDULE_OVERRIDE_REQUEST") {
    return null;
  }
  if (
    !notice.metadata ||
    typeof notice.metadata !== "object" ||
    Array.isArray(notice.metadata)
  ) {
    return null;
  }
  const requestId = notice.metadata.scheduleOverrideRequestId;
  if (typeof requestId !== "string" || !requestId.trim()) {
    return null;
  }
  const status = notice.metadata.status;
  const reasonMessage = notice.metadata.reasonMessage;
  const workDate = notice.metadata.workDate;
  const attemptedAt = notice.metadata.attemptedAt;
  const metadataEmployeeName = notice.metadata.employeeName;
  return {
    requestId,
    status: typeof status === "string" ? status.toUpperCase() : "PENDING",
    reasonMessage: typeof reasonMessage === "string" ? reasonMessage : "",
    workDate: typeof workDate === "string" ? workDate : "",
    attemptedAt: typeof attemptedAt === "string" ? attemptedAt : "",
    employeeName:
      typeof metadataEmployeeName === "string"
        ? metadataEmployeeName
        : notice.employeeName || "",
  };
};

export const formatApiBaseLabel = (value: string) => {
  if (!value) {
    return "n/a";
  }
  try {
    const parsed = new URL(value);
    return `${parsed.host}${parsed.pathname}`.replace(/\/$/, "");
  } catch {
    return value;
  }
};
