import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import type { AuthUser } from '../auth/auth.types';
import type { UpdateEmployeeScheduleDto } from './dto/update-employee-schedule.dto';

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

@Injectable()
export class EmployeeSchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  async getSchedule(authUser: AuthUser, employeeId: string) {
    const { tenant } = await this.tenancy.requireFeature(authUser, 'schedules');
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId: tenant.id, deletedAt: null },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const entries = await this.prisma.employeeSchedule.findMany({
      where: { tenantId: tenant.id, employeeId: employee.id },
    });
    const byDay = new Map(entries.map((entry) => [entry.weekday, entry]));

    return {
      employeeId: employee.id,
      employeeName: employee.displayName || employee.fullName,
      days: WEEKDAYS.map((label, weekday) => {
        const entry = byDay.get(weekday);
        return {
          weekday,
          label,
          enabled: Boolean(entry),
          startTime: entry?.startTime || '',
          endTime: entry?.endTime || '',
        };
      }),
    };
  }

  async updateSchedule(
    authUser: AuthUser,
    employeeId: string,
    dto: UpdateEmployeeScheduleDto,
  ) {
    const { tenant } = await this.tenancy.requireFeature(authUser, 'schedules');

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId: tenant.id, deletedAt: null },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const normalized = new Map<number, (typeof dto.days)[number]>();
    dto.days.forEach((day) => {
      normalized.set(day.weekday, day);
    });

    const data = Array.from(normalized.values())
      .filter((day) => day.enabled)
      .map((day) => ({
        tenantId: tenant.id,
        employeeId: employee.id,
        weekday: day.weekday,
        startTime: day.startTime || null,
        endTime: day.endTime || null,
      }));

    await this.prisma.$transaction([
      this.prisma.employeeSchedule.deleteMany({
        where: { tenantId: tenant.id, employeeId: employee.id },
      }),
      ...(data.length
        ? [
            this.prisma.employeeSchedule.createMany({
              data,
            }),
          ]
        : []),
    ]);

    return this.getSchedule(authUser, employee.id);
  }
}
