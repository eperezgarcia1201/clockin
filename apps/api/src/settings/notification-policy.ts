export type AdminDeviceNotificationDefaults = {
  defaultNotifyPunchActivity: boolean;
  defaultNotifyNoBreakAlerts: boolean;
  defaultNotifyLateClockInReminders: boolean;
  defaultNotifyScheduleOverrides: boolean;
  defaultNotifyTipSummaries: boolean;
  defaultNotifyDailySalesReminders: boolean;
};

export type EmployeeDeviceNotificationDefaults = {
  employeeLateClockInPushEnabled: boolean;
};

export type NotificationPolicy = AdminDeviceNotificationDefaults &
  EmployeeDeviceNotificationDefaults & {
  timeZone: string;
  lateClockInWorkflowEnabled: boolean;
  punchActivityNotificationsEnabled: boolean;
  scheduleOverrideNotificationsEnabled: boolean;
  tipSummaryNotificationsEnabled: boolean;
  lateClockInGraceMinutes: number;
  lateClockInReminderIntervalMinutes: number;
  lateClockInReminderMax: number;
  autoClockInAfterLateReminders: boolean;
  autoClockInOnGeofence: boolean;
  noBreakAlertsEnabled: boolean;
  noBreakAlertHours: number;
  noBreakReminderIntervalMinutes: number;
  noBreakReminderMax: number;
  missedBreakDeductionEnabled: boolean;
  missedBreakScheduleHours: number;
  missedBreakDeductionMinutes: number;
  dailySalesReminderEnabled: boolean;
  dailySalesReminderFirstMinutes: number;
  dailySalesReminderFinalMinutes: number;
  ownerDailyReportEnabled: boolean;
  ownerDailyReportSendMinutes: number;
};

export type NotificationPolicySource =
  | (Partial<Record<keyof NotificationPolicy, unknown>> & {
      timezone?: string | null;
    })
  | null
  | undefined;

const DEFAULT_TENANT_TIME_ZONE = 'UTC';
const DEFAULT_LATE_CLOCK_IN_GRACE_MINUTES = 5;
const DEFAULT_LATE_REMINDER_INTERVAL_MINUTES = 5;
const DEFAULT_LATE_REMINDER_MAX = 3;
const DEFAULT_NO_BREAK_ALERT_HOURS = 6;
const DEFAULT_NO_BREAK_REMINDER_INTERVAL_MINUTES = 60;
const DEFAULT_NO_BREAK_REMINDER_MAX = 1;
const DEFAULT_MISSED_BREAK_SCHEDULE_HOURS = 6;
const DEFAULT_MISSED_BREAK_DEDUCTION_MINUTES = 120;
const DEFAULT_DAILY_SALES_REMINDER_FIRST_MINUTES = 20 * 60 + 50;
const DEFAULT_DAILY_SALES_REMINDER_FINAL_MINUTES = 22 * 60 + 20;
const DEFAULT_OWNER_REPORT_SEND_MINUTES = 22 * 60;

const normalizeIntegerSetting = (
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
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

export const buildNotificationPolicy = (
  settings: NotificationPolicySource,
  fallbackTimeZone?: string,
): NotificationPolicy => {
  const timeZone =
    settings?.timezone?.trim() || fallbackTimeZone || DEFAULT_TENANT_TIME_ZONE;
  const dailySalesReminderFirstMinutes = normalizeIntegerSetting(
    settings?.dailySalesReminderFirstMinutes,
    DEFAULT_DAILY_SALES_REMINDER_FIRST_MINUTES,
    0,
    1438,
  );
  const dailySalesReminderFinalMinutes = Math.max(
    dailySalesReminderFirstMinutes + 1,
    normalizeIntegerSetting(
      settings?.dailySalesReminderFinalMinutes,
      DEFAULT_DAILY_SALES_REMINDER_FINAL_MINUTES,
      1,
      1439,
    ),
  );

  return {
    timeZone,
    lateClockInWorkflowEnabled:
      typeof settings?.lateClockInWorkflowEnabled === 'boolean'
        ? settings.lateClockInWorkflowEnabled
        : true,
    punchActivityNotificationsEnabled:
      typeof settings?.punchActivityNotificationsEnabled === 'boolean'
        ? settings.punchActivityNotificationsEnabled
        : true,
    scheduleOverrideNotificationsEnabled:
      typeof settings?.scheduleOverrideNotificationsEnabled === 'boolean'
        ? settings.scheduleOverrideNotificationsEnabled
        : true,
    tipSummaryNotificationsEnabled:
      typeof settings?.tipSummaryNotificationsEnabled === 'boolean'
        ? settings.tipSummaryNotificationsEnabled
        : true,
    lateClockInGraceMinutes: normalizeIntegerSetting(
      settings?.lateClockInGraceMinutes,
      DEFAULT_LATE_CLOCK_IN_GRACE_MINUTES,
      0,
      180,
    ),
    lateClockInReminderIntervalMinutes: normalizeIntegerSetting(
      settings?.lateClockInReminderIntervalMinutes,
      DEFAULT_LATE_REMINDER_INTERVAL_MINUTES,
      1,
      180,
    ),
    lateClockInReminderMax: normalizeIntegerSetting(
      settings?.lateClockInReminderMax,
      DEFAULT_LATE_REMINDER_MAX,
      1,
      12,
    ),
    autoClockInAfterLateReminders:
      typeof settings?.autoClockInAfterLateReminders === 'boolean'
        ? settings.autoClockInAfterLateReminders
        : true,
    autoClockInOnGeofence:
      typeof settings?.autoClockInOnGeofence === 'boolean'
        ? settings.autoClockInOnGeofence
        : true,
    noBreakAlertsEnabled:
      typeof settings?.noBreakAlertsEnabled === 'boolean'
        ? settings.noBreakAlertsEnabled
        : true,
    noBreakAlertHours: normalizeIntegerSetting(
      settings?.noBreakAlertHours,
      DEFAULT_NO_BREAK_ALERT_HOURS,
      1,
      24,
    ),
    noBreakReminderIntervalMinutes: normalizeIntegerSetting(
      settings?.noBreakReminderIntervalMinutes,
      DEFAULT_NO_BREAK_REMINDER_INTERVAL_MINUTES,
      1,
      720,
    ),
    noBreakReminderMax: normalizeIntegerSetting(
      settings?.noBreakReminderMax,
      DEFAULT_NO_BREAK_REMINDER_MAX,
      1,
      12,
    ),
    missedBreakDeductionEnabled:
      typeof settings?.missedBreakDeductionEnabled === 'boolean'
        ? settings.missedBreakDeductionEnabled
        : false,
    missedBreakScheduleHours: normalizeIntegerSetting(
      settings?.missedBreakScheduleHours,
      DEFAULT_MISSED_BREAK_SCHEDULE_HOURS,
      1,
      24,
    ),
    missedBreakDeductionMinutes: normalizeIntegerSetting(
      settings?.missedBreakDeductionMinutes,
      DEFAULT_MISSED_BREAK_DEDUCTION_MINUTES,
      1,
      720,
    ),
    dailySalesReminderEnabled:
      typeof settings?.dailySalesReminderEnabled === 'boolean'
        ? settings.dailySalesReminderEnabled
        : true,
    dailySalesReminderFirstMinutes,
    dailySalesReminderFinalMinutes,
    ownerDailyReportEnabled:
      typeof settings?.ownerDailyReportEnabled === 'boolean'
        ? settings.ownerDailyReportEnabled
        : true,
    ownerDailyReportSendMinutes: normalizeIntegerSetting(
      settings?.ownerDailyReportSendMinutes,
      DEFAULT_OWNER_REPORT_SEND_MINUTES,
      0,
      1439,
    ),
    defaultNotifyPunchActivity:
      typeof settings?.defaultNotifyPunchActivity === 'boolean'
        ? settings.defaultNotifyPunchActivity
        : true,
    defaultNotifyNoBreakAlerts:
      typeof settings?.defaultNotifyNoBreakAlerts === 'boolean'
        ? settings.defaultNotifyNoBreakAlerts
        : true,
    defaultNotifyLateClockInReminders:
      typeof settings?.defaultNotifyLateClockInReminders === 'boolean'
        ? settings.defaultNotifyLateClockInReminders
        : true,
    employeeLateClockInPushEnabled:
      typeof settings?.employeeLateClockInPushEnabled === 'boolean'
        ? settings.employeeLateClockInPushEnabled
        : true,
    defaultNotifyScheduleOverrides:
      typeof settings?.defaultNotifyScheduleOverrides === 'boolean'
        ? settings.defaultNotifyScheduleOverrides
        : true,
    defaultNotifyTipSummaries:
      typeof settings?.defaultNotifyTipSummaries === 'boolean'
        ? settings.defaultNotifyTipSummaries
        : true,
    defaultNotifyDailySalesReminders:
      typeof settings?.defaultNotifyDailySalesReminders === 'boolean'
        ? settings.defaultNotifyDailySalesReminders
        : true,
  };
};

export const resolveDefaultAdminDeviceNotifications = (
  settings: NotificationPolicySource,
) => ({
  notifyPunchActivity:
    typeof settings?.defaultNotifyPunchActivity === 'boolean'
      ? settings.defaultNotifyPunchActivity
      : true,
  notifyNoBreakAlerts:
    typeof settings?.defaultNotifyNoBreakAlerts === 'boolean'
      ? settings.defaultNotifyNoBreakAlerts
      : true,
  notifyLateClockInReminders:
    typeof settings?.defaultNotifyLateClockInReminders === 'boolean'
      ? settings.defaultNotifyLateClockInReminders
      : true,
  notifyScheduleOverrides:
    typeof settings?.defaultNotifyScheduleOverrides === 'boolean'
      ? settings.defaultNotifyScheduleOverrides
      : true,
  notifyTipSummaries:
    typeof settings?.defaultNotifyTipSummaries === 'boolean'
      ? settings.defaultNotifyTipSummaries
      : true,
  notifyDailySalesReminders:
    typeof settings?.defaultNotifyDailySalesReminders === 'boolean'
      ? settings.defaultNotifyDailySalesReminders
      : true,
});

export const resolveDefaultEmployeeDeviceNotifications = (
  settings: NotificationPolicySource,
) => ({
  notifyLateClockInReminders:
    typeof settings?.employeeLateClockInPushEnabled === 'boolean'
      ? settings.employeeLateClockInPushEnabled
      : true,
});
