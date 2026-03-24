import type {
  NotificationPolicyPayload,
  NotificationPolicySettings,
} from "./types";

export const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "UTC",
];

export const defaultTimeZone = "America/New_York";

export const defaultNotificationPolicy: NotificationPolicySettings = {
  timezone: defaultTimeZone,
  lateClockInWorkflowEnabled: true,
  punchActivityNotificationsEnabled: true,
  scheduleOverrideNotificationsEnabled: true,
  tipSummaryNotificationsEnabled: true,
  lateClockInGraceMinutes: 5,
  lateClockInReminderIntervalMinutes: 5,
  lateClockInReminderMax: 3,
  autoClockInAfterLateReminders: true,
  autoClockInOnGeofence: true,
  employeeLateClockInPushEnabled: true,
  noBreakAlertsEnabled: true,
  noBreakAlertHours: 6,
  noBreakReminderIntervalMinutes: 60,
  noBreakReminderMax: 1,
  missedBreakDeductionEnabled: false,
  missedBreakScheduleHours: 6,
  missedBreakDeductionMinutes: 120,
  dailySalesReminderEnabled: true,
  dailySalesReminderFirstMinutes: 20 * 60 + 50,
  dailySalesReminderFinalMinutes: 22 * 60 + 20,
  ownerDailyReportEnabled: true,
  ownerDailyReportSendMinutes: 22 * 60,
  defaultNotifyPunchActivity: true,
  defaultNotifyNoBreakAlerts: true,
  defaultNotifyLateClockInReminders: true,
  defaultNotifyScheduleOverrides: true,
  defaultNotifyTipSummaries: true,
  defaultNotifyDailySalesReminders: true,
};

export const resolveBrowserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

export const resolveTenantTimeZone = (value: unknown) => {
  if (
    value &&
    typeof value === "object" &&
    "timezone" in value &&
    typeof value.timezone === "string" &&
    value.timezone.trim()
  ) {
    return value.timezone;
  }
  return defaultTimeZone;
};

export const clampInteger = (
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  const rounded = Math.round(value);
  if (rounded < minimum) {
    return minimum;
  }
  if (rounded > maximum) {
    return maximum;
  }
  return rounded;
};

export const pickNotificationPolicy = (
  value: unknown,
): NotificationPolicySettings => {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : ({} as Record<string, unknown>);

  const dailySalesReminderFirstMinutes = clampInteger(
    source.dailySalesReminderFirstMinutes,
    defaultNotificationPolicy.dailySalesReminderFirstMinutes,
    0,
    1438,
  );
  const dailySalesReminderFinalMinutes = Math.max(
    dailySalesReminderFirstMinutes + 1,
    clampInteger(
      source.dailySalesReminderFinalMinutes,
      defaultNotificationPolicy.dailySalesReminderFinalMinutes,
      1,
      1439,
    ),
  );

  return {
    timezone: resolveTenantTimeZone(source),
    lateClockInWorkflowEnabled:
      typeof source.lateClockInWorkflowEnabled === "boolean"
        ? source.lateClockInWorkflowEnabled
        : defaultNotificationPolicy.lateClockInWorkflowEnabled,
    punchActivityNotificationsEnabled:
      typeof source.punchActivityNotificationsEnabled === "boolean"
        ? source.punchActivityNotificationsEnabled
        : defaultNotificationPolicy.punchActivityNotificationsEnabled,
    scheduleOverrideNotificationsEnabled:
      typeof source.scheduleOverrideNotificationsEnabled === "boolean"
        ? source.scheduleOverrideNotificationsEnabled
        : defaultNotificationPolicy.scheduleOverrideNotificationsEnabled,
    tipSummaryNotificationsEnabled:
      typeof source.tipSummaryNotificationsEnabled === "boolean"
        ? source.tipSummaryNotificationsEnabled
        : defaultNotificationPolicy.tipSummaryNotificationsEnabled,
    lateClockInGraceMinutes: clampInteger(
      source.lateClockInGraceMinutes,
      defaultNotificationPolicy.lateClockInGraceMinutes,
      0,
      180,
    ),
    lateClockInReminderIntervalMinutes: clampInteger(
      source.lateClockInReminderIntervalMinutes,
      defaultNotificationPolicy.lateClockInReminderIntervalMinutes,
      1,
      180,
    ),
    lateClockInReminderMax: clampInteger(
      source.lateClockInReminderMax,
      defaultNotificationPolicy.lateClockInReminderMax,
      1,
      12,
    ),
    autoClockInAfterLateReminders:
      typeof source.autoClockInAfterLateReminders === "boolean"
        ? source.autoClockInAfterLateReminders
        : defaultNotificationPolicy.autoClockInAfterLateReminders,
    autoClockInOnGeofence:
      typeof source.autoClockInOnGeofence === "boolean"
        ? source.autoClockInOnGeofence
        : defaultNotificationPolicy.autoClockInOnGeofence,
    employeeLateClockInPushEnabled:
      typeof source.employeeLateClockInPushEnabled === "boolean"
        ? source.employeeLateClockInPushEnabled
        : defaultNotificationPolicy.employeeLateClockInPushEnabled,
    noBreakAlertsEnabled:
      typeof source.noBreakAlertsEnabled === "boolean"
        ? source.noBreakAlertsEnabled
        : defaultNotificationPolicy.noBreakAlertsEnabled,
    noBreakAlertHours: clampInteger(
      source.noBreakAlertHours,
      defaultNotificationPolicy.noBreakAlertHours,
      1,
      24,
    ),
    noBreakReminderIntervalMinutes: clampInteger(
      source.noBreakReminderIntervalMinutes,
      defaultNotificationPolicy.noBreakReminderIntervalMinutes,
      1,
      720,
    ),
    noBreakReminderMax: clampInteger(
      source.noBreakReminderMax,
      defaultNotificationPolicy.noBreakReminderMax,
      1,
      12,
    ),
    missedBreakDeductionEnabled:
      typeof source.missedBreakDeductionEnabled === "boolean"
        ? source.missedBreakDeductionEnabled
        : defaultNotificationPolicy.missedBreakDeductionEnabled,
    missedBreakScheduleHours: clampInteger(
      source.missedBreakScheduleHours,
      defaultNotificationPolicy.missedBreakScheduleHours,
      1,
      24,
    ),
    missedBreakDeductionMinutes: clampInteger(
      source.missedBreakDeductionMinutes,
      defaultNotificationPolicy.missedBreakDeductionMinutes,
      1,
      720,
    ),
    dailySalesReminderEnabled:
      typeof source.dailySalesReminderEnabled === "boolean"
        ? source.dailySalesReminderEnabled
        : defaultNotificationPolicy.dailySalesReminderEnabled,
    dailySalesReminderFirstMinutes,
    dailySalesReminderFinalMinutes,
    ownerDailyReportEnabled:
      typeof source.ownerDailyReportEnabled === "boolean"
        ? source.ownerDailyReportEnabled
        : defaultNotificationPolicy.ownerDailyReportEnabled,
    ownerDailyReportSendMinutes: clampInteger(
      source.ownerDailyReportSendMinutes,
      defaultNotificationPolicy.ownerDailyReportSendMinutes,
      0,
      1439,
    ),
    defaultNotifyPunchActivity:
      typeof source.defaultNotifyPunchActivity === "boolean"
        ? source.defaultNotifyPunchActivity
        : defaultNotificationPolicy.defaultNotifyPunchActivity,
    defaultNotifyNoBreakAlerts:
      typeof source.defaultNotifyNoBreakAlerts === "boolean"
        ? source.defaultNotifyNoBreakAlerts
        : defaultNotificationPolicy.defaultNotifyNoBreakAlerts,
    defaultNotifyLateClockInReminders:
      typeof source.defaultNotifyLateClockInReminders === "boolean"
        ? source.defaultNotifyLateClockInReminders
        : defaultNotificationPolicy.defaultNotifyLateClockInReminders,
    defaultNotifyScheduleOverrides:
      typeof source.defaultNotifyScheduleOverrides === "boolean"
        ? source.defaultNotifyScheduleOverrides
        : defaultNotificationPolicy.defaultNotifyScheduleOverrides,
    defaultNotifyTipSummaries:
      typeof source.defaultNotifyTipSummaries === "boolean"
        ? source.defaultNotifyTipSummaries
        : defaultNotificationPolicy.defaultNotifyTipSummaries,
    defaultNotifyDailySalesReminders:
      typeof source.defaultNotifyDailySalesReminders === "boolean"
        ? source.defaultNotifyDailySalesReminders
        : defaultNotificationPolicy.defaultNotifyDailySalesReminders,
  };
};

export const buildNotificationPolicyPayload = (
  policy: NotificationPolicySettings,
): NotificationPolicyPayload => ({
  timezone: policy.timezone,
  lateClockInWorkflowEnabled: policy.lateClockInWorkflowEnabled,
  punchActivityNotificationsEnabled: policy.punchActivityNotificationsEnabled,
  scheduleOverrideNotificationsEnabled:
    policy.scheduleOverrideNotificationsEnabled,
  tipSummaryNotificationsEnabled: policy.tipSummaryNotificationsEnabled,
  lateClockInGraceMinutes: policy.lateClockInGraceMinutes,
  lateClockInReminderIntervalMinutes: policy.lateClockInReminderIntervalMinutes,
  lateClockInReminderMax: policy.lateClockInReminderMax,
  autoClockInAfterLateReminders: policy.autoClockInAfterLateReminders,
  autoClockInOnGeofence: policy.autoClockInOnGeofence,
  employeeLateClockInPushEnabled: policy.employeeLateClockInPushEnabled,
  noBreakAlertsEnabled: policy.noBreakAlertsEnabled,
  noBreakAlertHours: policy.noBreakAlertHours,
  noBreakReminderIntervalMinutes: policy.noBreakReminderIntervalMinutes,
  noBreakReminderMax: policy.noBreakReminderMax,
  missedBreakDeductionEnabled: policy.missedBreakDeductionEnabled,
  missedBreakScheduleHours: policy.missedBreakScheduleHours,
  missedBreakDeductionMinutes: policy.missedBreakDeductionMinutes,
  dailySalesReminderEnabled: policy.dailySalesReminderEnabled,
  dailySalesReminderFirstMinutes: policy.dailySalesReminderFirstMinutes,
  dailySalesReminderFinalMinutes: policy.dailySalesReminderFinalMinutes,
  ownerDailyReportEnabled: policy.ownerDailyReportEnabled,
  ownerDailyReportSendMinutes: policy.ownerDailyReportSendMinutes,
  defaultNotifyPunchActivity: policy.defaultNotifyPunchActivity,
  defaultNotifyNoBreakAlerts: policy.defaultNotifyNoBreakAlerts,
  defaultNotifyLateClockInReminders: policy.defaultNotifyLateClockInReminders,
  defaultNotifyScheduleOverrides: policy.defaultNotifyScheduleOverrides,
  defaultNotifyTipSummaries: policy.defaultNotifyTipSummaries,
  defaultNotifyDailySalesReminders: policy.defaultNotifyDailySalesReminders,
});

export const formatMinutesAsTimeInput = (value: number) => {
  const normalized = ((Math.round(value) % 1440) + 1440) % 1440;
  const hours = String(Math.floor(normalized / 60)).padStart(2, "0");
  const minutes = String(normalized % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
};

export const parseTimeInputToMinutes = (value: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
};
