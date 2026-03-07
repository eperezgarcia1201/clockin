import {
  buildNotificationPolicy,
  resolveDefaultAdminDeviceNotifications,
} from './notification-policy';

describe('notification-policy', () => {
  it('builds sane defaults when settings are missing', () => {
    const policy = buildNotificationPolicy(null, 'America/Chicago');

    expect(policy.timeZone).toBe('America/Chicago');
    expect(policy.lateClockInReminderMax).toBe(3);
    expect(policy.noBreakReminderMax).toBe(1);
    expect(policy.missedBreakDeductionEnabled).toBe(false);
    expect(policy.missedBreakScheduleHours).toBe(6);
    expect(policy.missedBreakDeductionMinutes).toBe(120);
    expect(policy.defaultNotifyPunchActivity).toBe(true);
    expect(policy.punchActivityNotificationsEnabled).toBe(true);
  });

  it('clamps and orders reminder values safely', () => {
    const policy = buildNotificationPolicy({
      lateClockInGraceMinutes: -3,
      noBreakReminderIntervalMinutes: 9999,
      noBreakReminderMax: 0,
      missedBreakScheduleHours: 99,
      missedBreakDeductionMinutes: -10,
      dailySalesReminderFirstMinutes: 1400,
      dailySalesReminderFinalMinutes: 1390,
    });

    expect(policy.lateClockInGraceMinutes).toBe(0);
    expect(policy.noBreakReminderIntervalMinutes).toBe(720);
    expect(policy.noBreakReminderMax).toBe(1);
    expect(policy.missedBreakScheduleHours).toBe(24);
    expect(policy.missedBreakDeductionMinutes).toBe(1);
    expect(policy.dailySalesReminderFirstMinutes).toBe(1400);
    expect(policy.dailySalesReminderFinalMinutes).toBe(1401);
  });

  it('resolves default device preferences from tenant settings', () => {
    const defaults = resolveDefaultAdminDeviceNotifications({
      defaultNotifyPunchActivity: false,
      defaultNotifyTipSummaries: false,
    });

    expect(defaults).toEqual({
      notifyPunchActivity: false,
      notifyNoBreakAlerts: true,
      notifyLateClockInReminders: true,
      notifyScheduleOverrides: true,
      notifyTipSummaries: false,
      notifyDailySalesReminders: true,
    });
  });
});
