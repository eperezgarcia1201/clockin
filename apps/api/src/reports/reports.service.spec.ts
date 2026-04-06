import { PunchType } from '@prisma/client';
import { buildDailySummary } from './reports.service';

describe('buildDailySummary', () => {
  it('caps open intervals at now when the selected range extends beyond now', () => {
    const result = buildDailySummary({
      punches: [
        {
          id: 'p1',
          occurredAt: new Date('2026-03-27T14:00:00.000Z'),
          type: PunchType.IN,
        },
      ],
      rangeStartUtc: new Date('2026-03-27T00:00:00.000Z').getTime(),
      rangeEndUtc: new Date('2026-03-27T23:59:59.999Z').getTime(),
      offsetMs: 0,
      roundTo: 0,
      nowUtc: new Date('2026-03-27T16:00:00.000Z').getTime(),
    });

    expect(result.totalMinutes).toBe(120);
    expect(result.days).toEqual([
      expect.objectContaining({
        date: '2026-03-27',
        minutes: 120,
        hoursDecimal: 2,
        hoursFormatted: '2:00',
      }),
    ]);
  });

  it('still caps open intervals at the selected range end for past ranges', () => {
    const result = buildDailySummary({
      punches: [
        {
          id: 'p1',
          occurredAt: new Date('2026-03-26T14:00:00.000Z'),
          type: PunchType.IN,
        },
      ],
      rangeStartUtc: new Date('2026-03-26T00:00:00.000Z').getTime(),
      rangeEndUtc: new Date('2026-03-26T23:59:59.999Z').getTime(),
      offsetMs: 0,
      roundTo: 0,
      nowUtc: new Date('2026-03-27T16:00:00.000Z').getTime(),
    });

    expect(result.totalMinutes).toBe(600);
    expect(result.days).toEqual([
      expect.objectContaining({
        date: '2026-03-26',
        minutes: 600,
        hoursDecimal: 10,
        hoursFormatted: '10:00',
      }),
    ]);
  });

  it('flags days that exceed scheduled paid minutes after subtracting breaks', () => {
    const weekday = new Date('2026-03-27T00:00:00.000Z').getUTCDay();
    const result = buildDailySummary({
      punches: [
        {
          id: 'p1',
          occurredAt: new Date('2026-03-27T08:00:00.000Z'),
          type: PunchType.IN,
        },
        {
          id: 'p2',
          occurredAt: new Date('2026-03-27T14:00:00.000Z'),
          type: PunchType.BREAK,
        },
        {
          id: 'p3',
          occurredAt: new Date('2026-03-27T16:00:00.000Z'),
          type: PunchType.IN,
        },
        {
          id: 'p4',
          occurredAt: new Date('2026-03-27T22:00:00.000Z'),
          type: PunchType.OUT,
        },
      ],
      scheduledMinutesByWeekday: new Map([[weekday, 13 * 60]]),
      scheduledPaidMinutesByWeekday: new Map([[weekday, 11 * 60]]),
      rangeStartUtc: new Date('2026-03-27T00:00:00.000Z').getTime(),
      rangeEndUtc: new Date('2026-03-27T23:59:59.999Z').getTime(),
      offsetMs: 0,
      roundTo: 0,
    });

    expect(result.days).toEqual([
      expect.objectContaining({
        date: '2026-03-27',
        minutes: 720,
        scheduledPaidMinutes: 660,
        overScheduleMinutes: 60,
      }),
    ]);
  });
});
