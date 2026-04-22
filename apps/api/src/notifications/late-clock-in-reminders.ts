const LATE_CLOCK_IN_REMINDER_KIND = 'LATE_CLOCK_IN_REMINDER';

type ReminderNotice = {
  employeeId: string | null;
  createdAt: Date;
  message: string;
  metadata?: unknown;
};

type LateClockInShiftWindow = {
  employeeId: string;
  startTime: string;
  workDate: string;
  timeZone: string;
  reminderWindowOpenMinutes: number;
  reminderWindowCloseMinutes: number;
};

const toMetadataRecord = (
  metadata: unknown,
): Record<string, unknown> | null => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  return metadata as Record<string, unknown>;
};

const toLocalDateKey = (date: Date, timeZone?: string) => {
  const zone = timeZone || 'UTC';
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    if (!year || !month || !day) {
      return date.toISOString().slice(0, 10);
    }
    return `${year}-${month}-${day}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
};

const getLocalMinutes = (date: Date, timeZone?: string) => {
  const zone = timeZone || 'UTC';
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    let hour = Number(parts.find((part) => part.type === 'hour')?.value || '0');
    const minute = Number(
      parts.find((part) => part.type === 'minute')?.value || '0',
    );
    if (hour === 24) {
      hour = 0;
    }
    return hour * 60 + minute;
  } catch {
    return date.getUTCHours() * 60 + date.getUTCMinutes();
  }
};

export const getLateClockInReminderWindow = (
  startMinutes: number,
  graceMinutes: number,
  intervalMinutes: number,
  reminderMax: number,
) => {
  const openMinutes = startMinutes + graceMinutes;
  const closeMinutes =
    openMinutes + intervalMinutes * Math.max(reminderMax - 1, 0);
  return {
    openMinutes,
    closeMinutes,
  };
};

export const countLateClockInRemindersForShift = (
  notices: ReminderNotice[],
  shift: LateClockInShiftWindow,
) =>
  notices.filter((notice) => {
    if (!notice.employeeId || notice.employeeId !== shift.employeeId) {
      return false;
    }
    if (toLocalDateKey(notice.createdAt, shift.timeZone) !== shift.workDate) {
      return false;
    }

    const metadata = toMetadataRecord(notice.metadata);
    const kind =
      metadata && typeof metadata.kind === 'string' ? metadata.kind : '';
    if (kind && kind !== LATE_CLOCK_IN_REMINDER_KIND) {
      return false;
    }

    if (
      metadata &&
      typeof metadata.workDate === 'string' &&
      metadata.workDate !== shift.workDate
    ) {
      return false;
    }

    if (
      metadata &&
      typeof metadata.startTime === 'string' &&
      metadata.startTime !== shift.startTime
    ) {
      return false;
    }

    if (!kind && !notice.message.toLowerCase().includes('has not clocked in')) {
      return false;
    }

    const createdMinutes = getLocalMinutes(notice.createdAt, shift.timeZone);
    return (
      createdMinutes >= shift.reminderWindowOpenMinutes &&
      createdMinutes <= shift.reminderWindowCloseMinutes
    );
  }).length;
