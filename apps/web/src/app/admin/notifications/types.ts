import type {
  AdminNotificationPreferenceKey,
  AdminNotificationPreferences,
  AdminPushDevice,
} from "../../../lib/api/admin-devices";
import type { NotificationRow } from "../../../lib/api/notifications-admin";
import type { EmployeeRow } from "../../../lib/api/users-admin";

export type AdminNotificationsTranslate = (en: string, es: string) => string;

export type StatusKind = "success" | "danger" | "info";

export type NotificationPolicySettings = {
  timezone: string;
  lateClockInWorkflowEnabled: boolean;
  punchActivityNotificationsEnabled: boolean;
  scheduleOverrideNotificationsEnabled: boolean;
  tipSummaryNotificationsEnabled: boolean;
  lateClockInGraceMinutes: number;
  lateClockInReminderIntervalMinutes: number;
  lateClockInReminderMax: number;
  autoClockInAfterLateReminders: boolean;
  autoClockInOnGeofence: boolean;
  employeeLateClockInPushEnabled: boolean;
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
  defaultNotifyPunchActivity: boolean;
  defaultNotifyNoBreakAlerts: boolean;
  defaultNotifyLateClockInReminders: boolean;
  defaultNotifyScheduleOverrides: boolean;
  defaultNotifyTipSummaries: boolean;
  defaultNotifyDailySalesReminders: boolean;
};

export type NotificationPolicyUpdater = <Key extends keyof NotificationPolicySettings>(
  key: Key,
  value: NotificationPolicySettings[Key],
) => void;

export type PreferenceDefinition = {
  key: AdminNotificationPreferenceKey;
  title: string;
  description: string;
};

export type PreferenceCount = PreferenceDefinition & {
  enabledCount: number;
};

export type SourceToggleKey =
  | "lateClockInWorkflowEnabled"
  | "punchActivityNotificationsEnabled"
  | "noBreakAlertsEnabled"
  | "scheduleOverrideNotificationsEnabled"
  | "tipSummaryNotificationsEnabled"
  | "dailySalesReminderEnabled"
  | "ownerDailyReportEnabled";

export type SourceToggleDefinition = {
  key: SourceToggleKey;
  title: string;
  description: string;
};

export type DefaultDeviceKey =
  | "defaultNotifyPunchActivity"
  | "defaultNotifyNoBreakAlerts"
  | "defaultNotifyLateClockInReminders"
  | "defaultNotifyScheduleOverrides"
  | "defaultNotifyTipSummaries"
  | "defaultNotifyDailySalesReminders";

export type DeviceDefaultDefinition = {
  key: DefaultDeviceKey;
  preferenceKey: AdminNotificationPreferenceKey;
  title: string;
  description: string;
};

export type NotificationPolicyPayload = Record<
  keyof NotificationPolicySettings,
  string | number | boolean
>;

export type PreferencePayload = AdminNotificationPreferences;

export type AdminNotificationsFeedState = {
  employeeId: string;
  employees: EmployeeRow[];
  feedStatus: string | null;
  loading: boolean;
  message: string;
  messageStatus: string | null;
  notifications: NotificationRow[];
  sendingMessage: boolean;
  subject: string;
  unreadCount: number;
  unreadOnly: boolean;
};

export type AdminNotificationsSettingsState = {
  availableTimeZones: string[];
  browserTimeZone: string;
  devices: AdminPushDevice[];
  notificationPolicy: NotificationPolicySettings;
  notificationPolicyDraft: NotificationPolicySettings;
  policyDirty: boolean;
  settingsBusy: boolean;
  settingsLoading: boolean;
  settingsStatus: string | null;
  settingsStatusKind: StatusKind;
};
