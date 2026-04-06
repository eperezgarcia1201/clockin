import { ScheduleOverrideReason, type PrismaClient } from '@prisma/client';
import { EmployeePunchesService } from './employee-punches.service';

describe('EmployeePunchesService schedule rules', () => {
  const buildService = (
    schedule: {
      startTime?: string | null;
      endTime?: string | null;
    } | null,
  ) => {
    const prisma = {
      employeeSchedule: {
        findFirst: jest.fn().mockResolvedValue(schedule),
      },
    } as unknown as PrismaClient;

    return {
      prisma,
      service: new EmployeePunchesService(
        prisma as never,
        {} as never,
        {} as never,
      ),
    };
  };

  it('allows early clock-ins before the scheduled start time', async () => {
    const { service } = buildService({
      startTime: '09:00',
      endTime: '22:00',
    });

    const violation = await (
      service as unknown as {
        getScheduleViolation: (
          tenantId: string,
          employeeId: string,
          occurredAt: Date,
          timeZone?: string,
        ) => Promise<unknown>;
      }
    ).getScheduleViolation(
      'tenant-1',
      'employee-1',
      new Date('2026-03-27T08:00:00.000Z'),
      'UTC',
    );

    expect(violation).toBeNull();
  });

  it('still blocks clock-ins after the scheduled end time', async () => {
    const { service } = buildService({
      startTime: '09:00',
      endTime: '22:00',
    });

    const violation = await (
      service as unknown as {
        getScheduleViolation: (
          tenantId: string,
          employeeId: string,
          occurredAt: Date,
          timeZone?: string,
        ) => Promise<{
          reason: ScheduleOverrideReason;
          message: string;
        } | null>;
      }
    ).getScheduleViolation(
      'tenant-1',
      'employee-1',
      new Date('2026-03-27T22:15:00.000Z'),
      'UTC',
    );

    expect(violation).toEqual({
      reason: ScheduleOverrideReason.OUTSIDE_SCHEDULE_HOURS,
      message: 'You are outside your scheduled hours.',
    });
  });

  it('still blocks clock-ins on days with no schedule', async () => {
    const { service } = buildService(null);

    const violation = await (
      service as unknown as {
        getScheduleViolation: (
          tenantId: string,
          employeeId: string,
          occurredAt: Date,
          timeZone?: string,
        ) => Promise<{
          reason: ScheduleOverrideReason;
          message: string;
        } | null>;
      }
    ).getScheduleViolation(
      'tenant-1',
      'employee-1',
      new Date('2026-03-27T08:00:00.000Z'),
      'UTC',
    );

    expect(violation).toEqual({
      reason: ScheduleOverrideReason.NOT_SCHEDULED_TODAY,
      message: 'You are not scheduled to work today.',
    });
  });
});
