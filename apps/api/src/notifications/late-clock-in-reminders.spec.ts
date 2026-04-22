import {
  countLateClockInRemindersForShift,
  getLateClockInReminderWindow,
} from './late-clock-in-reminders';

describe('late-clock-in-reminders', () => {
  it('closes the reminder window at the final reminder time', () => {
    expect(getLateClockInReminderWindow(9 * 60, 30, 15, 2)).toEqual({
      openMinutes: 570,
      closeMinutes: 585,
    });
  });

  it('ignores reminders created outside the current shift reminder window', () => {
    const notices = [
      {
        employeeId: 'emp-1',
        createdAt: new Date('2026-03-24T05:02:05.000Z'),
        message:
          'nana has not clocked in. Reminder 3/3 (scheduled 13:00 America/Chicago).',
        metadata: {
          kind: 'LATE_CLOCK_IN_REMINDER',
          employeeName: 'nana',
          workDate: '2026-03-24',
          startTime: '13:00',
          graceMinutes: 5,
          reminderNumber: 3,
          reminderMax: 3,
          intervalMinutes: 5,
        },
      },
      {
        employeeId: 'emp-1',
        createdAt: new Date('2026-03-24T18:30:00.000Z'),
        message:
          'nana has not clocked in. Reminder 1/2 (scheduled 13:00 America/Chicago).',
        metadata: {
          kind: 'LATE_CLOCK_IN_REMINDER',
          employeeName: 'nana',
          workDate: '2026-03-24',
          startTime: '13:00',
          graceMinutes: 30,
          reminderNumber: 1,
          reminderMax: 2,
          intervalMinutes: 15,
        },
      },
    ];

    expect(
      countLateClockInRemindersForShift(notices, {
        employeeId: 'emp-1',
        startTime: '13:00',
        workDate: '2026-03-24',
        timeZone: 'America/Chicago',
        reminderWindowOpenMinutes: 13 * 60 + 30,
        reminderWindowCloseMinutes: 13 * 60 + 45,
      }),
    ).toBe(1);
  });

  it('ignores reminders for the same employee but a different scheduled start time', () => {
    const notices = [
      {
        employeeId: 'emp-1',
        createdAt: new Date('2026-03-24T14:30:00.000Z'),
        message:
          'A solis has not clocked in. Reminder 1/2 (scheduled 09:00 America/Chicago).',
        metadata: {
          kind: 'LATE_CLOCK_IN_REMINDER',
          employeeName: 'A solis',
          workDate: '2026-03-24',
          startTime: '09:00',
          reminderNumber: 1,
        },
      },
      {
        employeeId: 'emp-1',
        createdAt: new Date('2026-03-24T19:30:00.000Z'),
        message:
          'A solis has not clocked in. Reminder 1/2 (scheduled 14:00 America/Chicago).',
        metadata: {
          kind: 'LATE_CLOCK_IN_REMINDER',
          employeeName: 'A solis',
          workDate: '2026-03-24',
          startTime: '14:00',
          reminderNumber: 1,
        },
      },
    ];

    expect(
      countLateClockInRemindersForShift(notices, {
        employeeId: 'emp-1',
        startTime: '14:00',
        workDate: '2026-03-24',
        timeZone: 'America/Chicago',
        reminderWindowOpenMinutes: 14 * 60 + 30,
        reminderWindowCloseMinutes: 14 * 60 + 45,
      }),
    ).toBe(1);
  });
});
