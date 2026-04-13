import {
  getScheduledPaidDurationMinutes,
  getScheduledShiftDurationMinutes,
  resolveMissedBreakDeductionMinutes,
} from './missed-break-deduction';

describe('missed-break-deduction', () => {
  it('returns the configured deduction after a long straight stretch without a break punch', () => {
    expect(
      resolveMissedBreakDeductionMinutes({
        policy: {
          enabled: true,
          triggerHours: 6,
          deductionMinutes: 120,
        },
        workedMinutes: 8 * 60,
        longestStraightMinutes: 8 * 60,
        hasBreakPunch: false,
      }),
    ).toBe(120);
  });

  it('skips the deduction when there was a break punch', () => {
    expect(
      resolveMissedBreakDeductionMinutes({
        policy: {
          enabled: true,
          triggerHours: 6,
          deductionMinutes: 120,
        },
        workedMinutes: 8 * 60,
        longestStraightMinutes: 8 * 60,
        hasBreakPunch: true,
      }),
    ).toBe(0);
  });

  it('still deducts when there was only a lunch punch and no break punch', () => {
    expect(
      resolveMissedBreakDeductionMinutes({
        policy: {
          enabled: true,
          triggerHours: 6,
          deductionMinutes: 120,
        },
        workedMinutes: 8 * 60,
        longestStraightMinutes: 8 * 60,
        hasBreakPunch: false,
      }),
    ).toBe(120);
  });

  it('skips the deduction when no straight stretch reaches the trigger', () => {
    expect(
      resolveMissedBreakDeductionMinutes({
        policy: {
          enabled: true,
          triggerHours: 6,
          deductionMinutes: 120,
        },
        workedMinutes: 8 * 60,
        longestStraightMinutes: 5 * 60 + 59,
        hasBreakPunch: false,
      }),
    ).toBe(0);
  });

  it('caps the deduction to the remaining worked minutes after other penalties', () => {
    expect(
      resolveMissedBreakDeductionMinutes({
        policy: {
          enabled: true,
          triggerHours: 6,
          deductionMinutes: 120,
        },
        workedMinutes: 90,
        longestStraightMinutes: 8 * 60,
        existingPenaltyMinutes: 60,
        hasBreakPunch: false,
      }),
    ).toBe(30);
  });

  it('parses scheduled shift durations safely', () => {
    expect(getScheduledShiftDurationMinutes('08:00', '16:30')).toBe(510);
    expect(getScheduledShiftDurationMinutes('8:00 AM', '4:00 PM')).toBe(480);
    expect(getScheduledShiftDurationMinutes('16:00', '08:00')).toBe(0);
  });

  it('subtracts scheduled break minutes from paid schedule duration', () => {
    expect(getScheduledPaidDurationMinutes('09:00', '22:00', 120)).toBe(660);
    expect(getScheduledPaidDurationMinutes('9:00 AM', '5:00 PM', 30)).toBe(450);
    expect(getScheduledPaidDurationMinutes('09:00', '10:00', 120)).toBe(0);
  });
});
