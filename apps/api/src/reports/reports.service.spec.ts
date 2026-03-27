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
});
