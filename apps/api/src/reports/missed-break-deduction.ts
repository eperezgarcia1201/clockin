export type MissedBreakDeductionPolicy = {
  enabled: boolean;
  triggerHours: number;
  deductionMinutes: number;
};

export function parseScheduleTimeToMinutes(value?: string | null) {
  const raw = value?.trim();
  if (!raw) {
    return null;
  }

  const militaryMatch = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (militaryMatch) {
    const hours = Number(militaryMatch[1]);
    const minutes = Number(militaryMatch[2]);
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
  }

  const meridiemMatch = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/.exec(raw);
  if (!meridiemMatch) {
    return null;
  }

  const hour12 = Number(meridiemMatch[1]);
  const minutes = Number(meridiemMatch[2]);
  const meridiem = meridiemMatch[3].toUpperCase();
  if (
    Number.isNaN(hour12) ||
    Number.isNaN(minutes) ||
    hour12 < 1 ||
    hour12 > 12 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const hourBase = hour12 % 12;
  const hour24 = meridiem === 'PM' ? hourBase + 12 : hourBase;
  return hour24 * 60 + minutes;
}

export function getScheduledShiftDurationMinutes(
  startTime?: string | null,
  endTime?: string | null,
) {
  const startMinutes = parseScheduleTimeToMinutes(startTime);
  const endMinutes = parseScheduleTimeToMinutes(endTime);
  if (
    startMinutes === null ||
    endMinutes === null ||
    endMinutes <= startMinutes
  ) {
    return 0;
  }
  return endMinutes - startMinutes;
}

export function getScheduledPaidDurationMinutes(
  startTime?: string | null,
  endTime?: string | null,
  breakMinutes?: number | null,
) {
  const shiftMinutes = getScheduledShiftDurationMinutes(startTime, endTime);
  if (shiftMinutes <= 0) {
    return 0;
  }
  const safeBreakMinutes =
    typeof breakMinutes === 'number' && Number.isFinite(breakMinutes)
      ? Math.max(0, Math.round(breakMinutes))
      : 0;
  return Math.max(0, shiftMinutes - safeBreakMinutes);
}

export function getWeekdayFromDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
}

export function resolveMissedBreakDeductionMinutes(input: {
  policy: MissedBreakDeductionPolicy | null | undefined;
  workedMinutes: number;
  longestStraightMinutes: number;
  existingPenaltyMinutes?: number;
  hasBreakPunch: boolean;
}) {
  const { policy } = input;
  if (!policy?.enabled) {
    return 0;
  }

  const triggerMinutes = policy.triggerHours * 60;
  if (input.longestStraightMinutes < triggerMinutes || input.hasBreakPunch) {
    return 0;
  }

  const remainingMinutes = Math.max(
    0,
    input.workedMinutes - (input.existingPenaltyMinutes || 0),
  );
  if (remainingMinutes <= 0) {
    return 0;
  }

  return Math.min(policy.deductionMinutes, remainingMinutes);
}
