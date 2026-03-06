import type {
  AdminNotificationPreferenceKey,
  AdminNotificationPreferences,
  AdminPushDevice,
} from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const defaultAdminNotificationPreferences =
  (): AdminNotificationPreferences => ({
    notifyPunchActivity: true,
    notifyNoBreakAlerts: true,
    notifyLateClockInReminders: true,
    notifyScheduleOverrides: true,
    notifyTipSummaries: true,
    notifyDailySalesReminders: true,
  });

const asRecord = (
  value: unknown,
): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const coerceBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

export const normalizeAdminNotificationPreferences = (
  value: unknown,
): AdminNotificationPreferences => {
  const record = asRecord(value);
  const defaults = defaultAdminNotificationPreferences();
  return {
    notifyPunchActivity: coerceBoolean(
      record?.notifyPunchActivity,
      defaults.notifyPunchActivity,
    ),
    notifyNoBreakAlerts: coerceBoolean(
      record?.notifyNoBreakAlerts,
      defaults.notifyNoBreakAlerts,
    ),
    notifyLateClockInReminders: coerceBoolean(
      record?.notifyLateClockInReminders,
      defaults.notifyLateClockInReminders,
    ),
    notifyScheduleOverrides: coerceBoolean(
      record?.notifyScheduleOverrides,
      defaults.notifyScheduleOverrides,
    ),
    notifyTipSummaries: coerceBoolean(
      record?.notifyTipSummaries,
      defaults.notifyTipSummaries,
    ),
    notifyDailySalesReminders: coerceBoolean(
      record?.notifyDailySalesReminders,
      defaults.notifyDailySalesReminders,
    ),
  };
};

export const normalizeAdminPushDevice = (
  value: unknown,
): AdminPushDevice | null => {
  const record = asRecord(value);
  if (!record || typeof record.id !== "string") {
    return null;
  }
  return {
    id: record.id,
    label:
      typeof record.label === "string" || record.label === null
        ? (record.label as string | null)
        : null,
    platform:
      typeof record.platform === "string" || record.platform === null
        ? (record.platform as string | null)
        : null,
    timeZone:
      typeof record.timeZone === "string" || record.timeZone === null
        ? (record.timeZone as string | null)
        : null,
    tokenPreview:
      typeof record.tokenPreview === "string" || record.tokenPreview === null
        ? (record.tokenPreview as string | null)
        : null,
    createdAt:
      typeof record.createdAt === "string"
        ? record.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof record.updatedAt === "string"
        ? record.updatedAt
        : new Date().toISOString(),
    notifications: normalizeAdminNotificationPreferences(record.notifications),
  };
};

export const resolveDeviceTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

export const loadAdminTenantTimeZone = async (params: {
  fetchJson: FetchJson;
}): Promise<string> => {
  const data = (await params.fetchJson("/settings")) as { timezone?: unknown };
  return typeof data?.timezone === "string" && data.timezone.trim()
    ? data.timezone
    : "America/New_York";
};

export const updateAdminPushDeviceRequest = async (params: {
  fetchJson: FetchJson;
  deviceId: string;
  payload: Partial<AdminNotificationPreferences> & { timeZone?: string };
}): Promise<AdminPushDevice> => {
  const data = (await params.fetchJson(`/admin-devices/${params.deviceId}`, {
    method: "PATCH",
    body: JSON.stringify(params.payload),
  })) as { device?: unknown };
  const device = normalizeAdminPushDevice(data?.device);
  if (!device) {
    throw new Error("Unable to save push notification preferences.");
  }
  return device;
};

export const updateTenantTimeZoneRequest = async (params: {
  fetchJson: FetchJson;
  timeZone: string;
}): Promise<string> => {
  const data = (await params.fetchJson("/settings", {
    method: "PUT",
    body: JSON.stringify({ timezone: params.timeZone }),
  })) as { timezone?: unknown };
  return typeof data?.timezone === "string" && data.timezone.trim()
    ? data.timezone
    : params.timeZone;
};

export const toggleAdminNotificationPreference = (params: {
  preferences: AdminNotificationPreferences;
  key: AdminNotificationPreferenceKey;
}) => ({
  ...params.preferences,
  [params.key]: !params.preferences[params.key],
});
