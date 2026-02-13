import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PunchType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TenancyService } from "../tenancy/tenancy.service";
import type { AuthUser } from "../auth/auth.types";
import type { CreateEmployeePunchDto } from "./dto/create-employee-punch.dto";
import { compare } from "bcryptjs";
import type { ManualEmployeePunchDto } from "./dto/manual-employee-punch.dto";
import type { UpdateEmployeePunchDto } from "./dto/update-employee-punch.dto";
import { NotificationsService } from "../notifications/notifications.service";

const ACTIVE_WORK_STATUSES = new Set<PunchType>([
  PunchType.IN,
  PunchType.BREAK,
  PunchType.LUNCH,
]);

@Injectable()
export class EmployeePunchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly notifications: NotificationsService,
  ) {}

  async createPunch(
    authUser: AuthUser,
    employeeId: string,
    dto: CreateEmployeePunchDto,
  ) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
    });

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId: tenant.id },
    });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    const requirePin = settings?.requirePin ?? true;
    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();

    if (dto.type === "IN") {
      await this.enforceSchedule(tenant.id, employee.id, occurredAt, settings?.timezone);
    }

    if (requirePin && employee.pinHash) {
      if (!dto.pin) {
        throw new UnauthorizedException("PIN required.");
      }
      const valid = await compare(dto.pin, employee.pinHash);
      if (!valid) {
        throw new UnauthorizedException("Invalid PIN.");
      }
    }

    if (dto.type === PunchType.OUT) {
      await this.enforceServerTipBeforeClockOut(
        tenant.id,
        {
          id: employee.id,
          isServer: employee.isServer,
        },
        occurredAt,
        settings?.timezone,
      );
    }

    const punch = await this.prisma.employeePunch.create({
      data: {
        tenantId: tenant.id,
        employeeId: employee.id,
        type: dto.type,
        occurredAt,
        notes: dto.notes,
        ipAddress: dto.ipAddress,
      },
    });

    await this.notifications.notifyPunch(tenant.id, employee, dto.type, occurredAt);

    return punch;
  }

  async getRecent(authUser: AuthUser) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
      select: { timezone: true },
    });
    await this.autoClockOutAfterSchedule(tenant.id, settings?.timezone);

    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId: tenant.id,
        disabled: false,
      },
      orderBy: { fullName: "asc" },
      include: {
        office: { select: { name: true } },
        group: { select: { name: true } },
        punches: { orderBy: { occurredAt: "desc" }, take: 1 },
      },
    });

    return {
      rows: employees.map((employee) => {
        const latest = employee.punches[0];
        return {
          id: employee.id,
          name: employee.displayName || employee.fullName,
          status: latest?.type ?? null,
          occurredAt: latest?.occurredAt
            ? latest.occurredAt.toISOString()
            : null,
          office: employee.office?.name ?? null,
          group: employee.group?.name ?? null,
        };
      }),
    };
  }

  async listRecords(
    authUser: AuthUser,
    options: {
      employeeId?: string;
      limit?: number;
      from?: string;
      to?: string;
      tzOffset?: number;
    },
  ) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);

    const limit = options.limit && options.limit > 0 ? options.limit : 50;
    const offsetMs = (options.tzOffset || 0) * 60 * 1000;

    const occurredAt: { gte?: Date; lte?: Date } = {};
    if (options.from) {
      const startUtc =
        new Date(`${options.from}T00:00:00.000Z`).getTime() - offsetMs;
      occurredAt.gte = new Date(startUtc);
    }
    if (options.to) {
      const endUtc =
        new Date(`${options.to}T23:59:59.999Z`).getTime() - offsetMs;
      occurredAt.lte = new Date(endUtc);
    }

    const punches = await this.prisma.employeePunch.findMany({
      where: {
        tenantId: tenant.id,
        employeeId: options.employeeId || undefined,
        occurredAt: Object.keys(occurredAt).length ? occurredAt : undefined,
      },
      orderBy: { occurredAt: "desc" },
      take: limit,
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            displayName: true,
            office: { select: { name: true } },
            group: { select: { name: true } },
          },
        },
      },
    });

    return {
      records: punches.map((punch) => ({
        id: punch.id,
        employeeId: punch.employeeId,
        employeeName:
          punch.employee.displayName || punch.employee.fullName,
        office: punch.employee.office?.name ?? null,
        group: punch.employee.group?.name ?? null,
        type: punch.type,
        occurredAt: punch.occurredAt.toISOString(),
        notes: punch.notes ?? "",
      })),
    };
  }

  async createManual(authUser: AuthUser, dto: ManualEmployeePunchDto) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
    });
    if (settings && settings.allowManualTimeEdits === false) {
      throw new UnauthorizedException("Manual time edits disabled.");
    }

    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId: tenant.id },
    });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    const punch = await this.prisma.employeePunch.create({
      data: {
        tenantId: tenant.id,
        employeeId: employee.id,
        type: dto.type,
        occurredAt: new Date(dto.occurredAt),
        notes: dto.notes,
      },
    });

    await this.notifications.notifyPunch(
      tenant.id,
      employee,
      dto.type,
      new Date(dto.occurredAt),
    );

    return punch;
  }

  async updateRecord(
    authUser: AuthUser,
    recordId: string,
    dto: UpdateEmployeePunchDto,
  ) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
    });
    if (settings && settings.allowManualTimeEdits === false) {
      throw new UnauthorizedException("Manual time edits disabled.");
    }

    const existing = await this.prisma.employeePunch.findFirst({
      where: { id: recordId, tenantId: tenant.id },
    });

    if (!existing) {
      throw new NotFoundException("Record not found");
    }

    return this.prisma.employeePunch.update({
      where: { id: existing.id },
      data: {
        type: dto.type ?? undefined,
        occurredAt: dto.occurredAt
          ? new Date(dto.occurredAt)
          : undefined,
        notes: dto.notes ?? undefined,
      },
    });
  }

  async deleteRecord(authUser: AuthUser, recordId: string) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
    });
    if (settings && settings.allowManualTimeEdits === false) {
      throw new UnauthorizedException("Manual time edits disabled.");
    }

    const existing = await this.prisma.employeePunch.findFirst({
      where: { id: recordId, tenantId: tenant.id },
    });

    if (!existing) {
      throw new NotFoundException("Record not found");
    }

    await this.prisma.employeePunch.delete({ where: { id: existing.id } });
    return { ok: true };
  }

  private getLocalDayInfo(date: Date, timeZone?: string) {
    const fallbackZone = timeZone || "UTC";
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: fallbackZone,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const parts = formatter.formatToParts(date);
      const weekday = parts.find((part) => part.type === "weekday")?.value || "Sun";
      const hour = Number(parts.find((part) => part.type === "hour")?.value || "0");
      const minute = Number(parts.find((part) => part.type === "minute")?.value || "0");
      const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
        weekday,
      );
      return {
        weekday: dayIndex === -1 ? date.getUTCDay() : dayIndex,
        minutes: hour * 60 + minute,
      };
    } catch {
      return { weekday: date.getUTCDay(), minutes: date.getUTCHours() * 60 + date.getUTCMinutes() };
    }
  }

  private parseTime(value?: string | null) {
    if (!value) return null;
    const [hours, minutes] = value.split(":").map((part) => Number(part));
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  }

  private toLocalDateKey(date: Date, timeZone?: string) {
    const zone = timeZone || "UTC";
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const parts = formatter.formatToParts(date);
      const year = parts.find((part) => part.type === "year")?.value;
      const month = parts.find((part) => part.type === "month")?.value;
      const day = parts.find((part) => part.type === "day")?.value;
      if (!year || !month || !day) {
        return date.toISOString().slice(0, 10);
      }
      return `${year}-${month}-${day}`;
    } catch {
      return date.toISOString().slice(0, 10);
    }
  }

  private async enforceServerTipBeforeClockOut(
    tenantId: string,
    employee: { id: string; isServer: boolean },
    occurredAt: Date,
    timeZone?: string,
  ) {
    if (!employee.isServer) {
      return;
    }

    const workDate = this.toLocalDateKey(occurredAt, timeZone);
    const workDateUtc = new Date(`${workDate}T00:00:00.000Z`);

    const tip = await this.prisma.employeeTip.findUnique({
      where: {
        tenantId_employeeId_workDate: {
          tenantId,
          employeeId: employee.id,
          workDate: workDateUtc,
        },
      },
      select: { id: true },
    });

    if (!tip) {
      throw new UnauthorizedException(
        "Server users must submit cash and credit card tips before clocking out.",
      );
    }
  }

  private async autoClockOutAfterSchedule(tenantId: string, timeZone?: string) {
    const now = new Date();
    const current = this.getLocalDayInfo(now, timeZone);

    const latestPunches = await this.prisma.employeePunch.findMany({
      where: { tenantId },
      orderBy: { occurredAt: "desc" },
      distinct: ["employeeId"],
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            displayName: true,
            disabled: true,
          },
        },
      },
    });

    const candidates = latestPunches.filter(
      (punch) =>
        punch.employee &&
        !punch.employee.disabled &&
        ACTIVE_WORK_STATUSES.has(punch.type),
    );

    if (!candidates.length) {
      return;
    }

    const schedules = await this.prisma.employeeSchedule.findMany({
      where: {
        tenantId,
        weekday: current.weekday,
        employeeId: { in: candidates.map((punch) => punch.employeeId) },
      },
      select: {
        employeeId: true,
        endTime: true,
      },
    });
    const scheduleByEmployee = new Map(
      schedules.map((schedule) => [schedule.employeeId, schedule]),
    );

    for (const punch of candidates) {
      const schedule = scheduleByEmployee.get(punch.employeeId);
      if (!schedule) {
        continue;
      }

      const endMinutes = this.parseTime(schedule.endTime);
      if (endMinutes === null || current.minutes < endMinutes) {
        continue;
      }

      const latest = await this.prisma.employeePunch.findFirst({
        where: { tenantId, employeeId: punch.employeeId },
        orderBy: { occurredAt: "desc" },
        select: { type: true },
      });
      if (!latest || !ACTIVE_WORK_STATUSES.has(latest.type)) {
        continue;
      }

      const autoOutAt = new Date();
      await this.prisma.employeePunch.create({
        data: {
          tenantId,
          employeeId: punch.employeeId,
          type: PunchType.OUT,
          occurredAt: autoOutAt,
          notes: "Auto clock-out: schedule ended.",
        },
      });
      await this.notifications.notifyPunch(
        tenantId,
        punch.employee,
        PunchType.OUT,
        autoOutAt,
      );
    }
  }

  private async enforceSchedule(
    tenantId: string,
    employeeId: string,
    occurredAt: Date,
    timeZone?: string,
  ) {
    const scheduleDay = this.getLocalDayInfo(occurredAt, timeZone);
    const scheduleForDay = await this.prisma.employeeSchedule.findFirst({
      where: {
        tenantId,
        employeeId,
        weekday: scheduleDay.weekday,
      },
    });

    if (!scheduleForDay) {
      const hasAnySchedule = await this.prisma.employeeSchedule.findFirst({
        where: { tenantId, employeeId },
        select: { id: true },
      });
      if (hasAnySchedule) {
        throw new UnauthorizedException(
          "You are not scheduled to work today.",
        );
      }
      return;
    }

    const startMinutes = this.parseTime(scheduleForDay.startTime);
    const endMinutes = this.parseTime(scheduleForDay.endTime);
    if (startMinutes === null || endMinutes === null) {
      return;
    }
    if (endMinutes <= startMinutes) {
      return;
    }
    if (scheduleDay.minutes < startMinutes || scheduleDay.minutes > endMinutes) {
      throw new UnauthorizedException(
        "You are outside your scheduled hours.",
      );
    }
  }
}
