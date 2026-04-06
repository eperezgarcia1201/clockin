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

  private scopedOfficeFilter(officeId?: string, strictOfficeMatch = false) {
    const scopedOfficeId = officeId?.trim() || undefined;
    if (!scopedOfficeId) {
      return {};
    }
    if (strictOfficeMatch) {
      return { officeId: scopedOfficeId };
    }
    return {
      OR: [{ officeId: scopedOfficeId }, { officeId: null }],
    };
  }

  private getLocalDayInfo(date: Date, timeZone?: string) {
    const fallbackZone = timeZone || 'UTC';
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: fallbackZone,
        weekday: 'short',
      });
      const weekdayToken =
        formatter
          .formatToParts(date)
          .find((part) => part.type === 'weekday')
          ?.value.trim() || 'Sun';
      const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
        weekdayToken,
      );
      return weekday === -1 ? date.getUTCDay() : weekday;
    } catch {
      return date.getUTCDay();
    }
  }

  private toLocalDateKey(date: Date, timeZone?: string) {
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
  }

  private parseScheduleTime(value?: string | null) {
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

  private normalizeScheduleTime(value?: string | null) {
    const totalMinutes = this.parseScheduleTime(value);
    if (totalMinutes === null) {
      return '';
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private normalizeBreakMinutes(value?: number | null) {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.min(24 * 60, Math.round(value || 0)));
  }

  private resolveRoleLabel(options: {
    isServer: boolean;
    groupName?: string | null;
  }) {
    if (options.isServer) {
      return 'Servers';
    }
    const groupName = options.groupName?.trim();
    return groupName || 'Unassigned';
  }

  async getSchedule(authUser: AuthUser, employeeId: string) {
    const access = await this.tenancy.requireFeature(authUser, 'schedules');
    const { tenant } = access;
    const officeScope = this.tenancy.resolveOfficeScope(access);
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        tenantId: tenant.id,
        deletedAt: null,
        ...this.scopedOfficeFilter(
          officeScope.officeId,
          officeScope.restrictedToAllowedOffice,
        ),
      },
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
          startTime: this.normalizeScheduleTime(entry?.startTime),
          endTime: this.normalizeScheduleTime(entry?.endTime),
          breakMinutes: this.normalizeBreakMinutes(entry?.breakMinutes),
        };
      }),
    };
  }

  async getTodaySchedule(authUser: AuthUser, options?: { officeId?: string }) {
    const access = await this.tenancy.requireFeature(authUser, 'schedules');
    const { tenant } = access;
    const officeScope = this.tenancy.resolveOfficeScope(
      access,
      options?.officeId,
    );
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
      select: { timezone: true },
    });

    const now = new Date();
    const weekday = this.getLocalDayInfo(now, settings?.timezone);
    const date = this.toLocalDateKey(now, settings?.timezone);

    const schedules = await this.prisma.employeeSchedule.findMany({
      where: {
        tenantId: tenant.id,
        weekday,
        employee: {
          deletedAt: null,
          disabled: false,
          allowOpenSchedule: false,
          ...this.scopedOfficeFilter(
            officeScope.officeId,
            officeScope.restrictedToAllowedOffice,
          ),
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            displayName: true,
            officeId: true,
            groupId: true,
            isServer: true,
            office: { select: { name: true } },
            group: { select: { name: true } },
          },
        },
      },
    });

    const rows = schedules
      .map((schedule) => {
        const employeeName =
          schedule.employee.displayName || schedule.employee.fullName;
        return {
          employeeId: schedule.employee.id,
          employeeName,
          startTime: this.normalizeScheduleTime(schedule.startTime),
          endTime: this.normalizeScheduleTime(schedule.endTime),
          breakMinutes: this.normalizeBreakMinutes(schedule.breakMinutes),
          isServer: schedule.employee.isServer,
          officeId: schedule.employee.officeId || null,
          officeName: schedule.employee.office?.name || null,
          groupId: schedule.employee.groupId || null,
          groupName: schedule.employee.group?.name || null,
          roleLabel: this.resolveRoleLabel({
            isServer: schedule.employee.isServer,
            groupName: schedule.employee.group?.name || null,
          }),
        };
      })
      .sort((a, b) => {
        const aHasStart = Boolean(a.startTime);
        const bHasStart = Boolean(b.startTime);
        if (aHasStart && bHasStart) {
          const byStart = a.startTime.localeCompare(b.startTime);
          if (byStart !== 0) {
            return byStart;
          }
        } else if (aHasStart !== bHasStart) {
          return aHasStart ? -1 : 1;
        }
        return a.employeeName.localeCompare(b.employeeName);
      });

    return {
      date,
      weekday,
      weekdayLabel: WEEKDAYS[weekday] || 'Unknown',
      timezone: settings?.timezone || 'UTC',
      rows,
    };
  }

  async updateSchedule(
    authUser: AuthUser,
    employeeId: string,
    dto: UpdateEmployeeScheduleDto,
  ) {
    const access = await this.tenancy.requireFeature(authUser, 'schedules');
    const { tenant } = access;
    const officeScope = this.tenancy.resolveOfficeScope(access);

    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        tenantId: tenant.id,
        deletedAt: null,
        ...this.scopedOfficeFilter(
          officeScope.officeId,
          officeScope.restrictedToAllowedOffice,
        ),
      },
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
        startTime: this.normalizeScheduleTime(day.startTime) || null,
        endTime: this.normalizeScheduleTime(day.endTime) || null,
        breakMinutes: this.normalizeBreakMinutes(day.breakMinutes),
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
