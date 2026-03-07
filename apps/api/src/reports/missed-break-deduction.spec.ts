import {
  getScheduledShiftDurationMinutes,
  resolveMissedBreakDeductionMinutes,
} from './missed-break-deduction';

describe('missed-break-deduction', () => {
  it('returns the configured deduction for a full long shift without a break punch', () => {
    expect(
      resolveMissedBreakDeductionMinutes({
        policy: {
          enabled: true,
          scheduleHours: 6,
          deductionMinutes: 120,
        },
        scheduledMinutes: 8 * 60,
        workedMinutes: 8 * 60,
        hasBreakPunch: false,
      }),
    ).toBe(120);
  });

  it('skips the deduction when there was a break punch', () => {
    expect(
      resolveMissedBreakDeductionMinutes({
        policy: {
          enabled: true,
          scheduleHours: 6,
          deductionMinutes: 120,
        },
        scheduledMinutes: 8 * 60,
        workedMinutes: 8 * 60,
        hasBreakPunch: true,
      }),
    ).toBe(0);
  });

  it('still deducts when there was only a lunch punch and no break punch', () => {
    expect(
      resolveMissedBreakDeductionMinutes({
        policy: {
          enabled: true,
          scheduleHours: 6,
          deductionMinutes: 120,
        },
        scheduledMinutes: 8 * 60,
        workedMinutes: 8 * 60,
        hasBreakPunch: false,
      }),
    ).toBe(120);
  });

  it('skips the deduction when the employee did not reach the full scheduled shift', () => {
    expect(
      resolveMissedBreakDeductionMinutes({
        policy: {
          enabled: true,
          scheduleHours: 6,
          deductionMinutes: 120,
        },
        scheduledMinutes: 8 * 60,
        workedMinutes: 7 * 60,
        hasBreakPunch: false,
      }),
    ).toBe(0);
  });

  it('parses scheduled shift durations safely', () => {
    expect(getScheduledShiftDurationMinutes('08:00', '16:30')).toBe(510);
    expect(getScheduledShiftDurationMinutes('8:00 AM', '4:00 PM')).toBe(480);
    expect(getScheduledShiftDurationMinutes('16:00', '08:00')).toBe(0);
  });
});
