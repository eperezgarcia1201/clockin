import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  NotificationType,
  PunchType,
  ScheduleOverrideReason,
  ScheduleOverrideStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import type { AuthUser } from '../auth/auth.types';
import type { CreateEmployeePunchDto } from './dto/create-employee-punch.dto';
import { compare } from 'bcryptjs';
import type { ManualEmployeePunchDto } from './dto/manual-employee-punch.dto';
import type { UpdateEmployeePunchDto } from './dto/update-employee-punch.dto';
import { NotificationsService } from '../notifications/notifications.service';

const ACTIVE_WORK_STATUSES = new Set<PunchType>([
  PunchType.IN,
  PunchType.BREAK,
  PunchType.LUNCH,
]);
const LOCAL_DAY_SCAN_WINDOW_MS = 36 * 60 * 60 * 1000;
const DEFAULT_GEOFENCE_RADIUS_METERS = 120;
const DAY_MS = 24 * 60 * 60 * 1000;
const AUTO_SCHEDULE_OUT_TOKEN = '[AUTO_SCHEDULE_OUT]';
const AUTO_OUT_GRACE_MINUTES = 30;
const AUTO_OUT_WEEKLY_STRIKE_THRESHOLD = 3;
const AUTO_OUT_PENALTY_MINUTES = 90;
const AUTO_OUT_TIPS_PENDING_NONE = 'NONE';
const AUTO_OUT_LOOKBACK_DAYS = 14;
const TIP_PENDING_LOOKBACK_DAYS = 7;

type ScheduleViolation = {
  reason: ScheduleOverrideReason;
  message: string;
};

@Injectable()
export class EmployeePunchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly notifications: NotificationsService,
  ) {}

  private scopedOfficeFilter(officeId?: string) {
    const scopedOfficeId = officeId?.trim() || undefined;
    if (!scopedOfficeId) {
      return {};
    }
    return {
      OR: [{ officeId: scopedOfficeId }, { officeId: null }],
    };
  }

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
      where: {
        id: employeeId,
        tenantId: tenant.id,
        deletedAt: null,
        disabled: false,
      },
      include: {
        group: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const requirePin = settings?.requirePin ?? true;
    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    let scheduleOverrideRequestId: string | null = null;

    if (requirePin && employee.pinHash) {
      if (!dto.pin) {
        throw new UnauthorizedException('PIN required.');
      }
      const valid = await compare(dto.pin, employee.pinHash);
      if (!valid) {
        throw new UnauthorizedException('Invalid PIN.');
      }
    }

    if (dto.type === PunchType.IN) {
      await this.enforceClockInGeofence(tenant.id, employee.officeId, dto);
      await this.enforcePendingAutoClockOutTipsBeforeClockIn(
        tenant.id,
        {
          id: employee.id,
          isServer: employee.isServer,
        },
        occurredAt,
        settings?.timezone,
      );
      const ownerClockExempt = await this.tenancy.isOwnerManagerEmployee(
        tenant.id,
        employee.id,
      );
      if (ownerClockExempt || this.shouldBypassScheduleOverrideForEmployee(employee)) {
        await this.enforceNoActiveShift(tenant.id, employee.id);
      } else {
        scheduleOverrideRequestId = await this.enforceScheduleWithOverride(
          tenant.id,
          {
            id: employee.id,
            fullName: employee.fullName,
            displayName: employee.displayName,
          },
          occurredAt,
          settings?.timezone,
        );
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
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    if (scheduleOverrideRequestId) {
      await this.prisma.scheduleOverrideRequest.updateMany({
        where: {
          id: scheduleOverrideRequestId,
          tenantId: tenant.id,
          status: ScheduleOverrideStatus.APPROVED,
          consumedAt: null,
        },
        data: {
          consumedAt: occurredAt,
        },
      });
    }

    await this.notifications.notifyPunch(
      tenant.id,
      employee,
      dto.type,
      occurredAt,
    );

    const managerMessage =
      dto.type === PunchType.IN
        ? await this.notifications.consumeManagerMessageForEmployee(
            tenant.id,
            employee.id,
          )
        : null;

    return {
      ...punch,
      managerMessage,
    };
  }

  async getRecent(authUser: AuthUser, options?: { officeId?: string }) {
    const { tenant } = await this.tenancy.requireFeature(authUser, 'dashboard');
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
      select: { timezone: true },
    });
    await this.notifications.ensureOperationalAlerts(
      tenant.id,
      settings?.timezone,
    );
    await this.autoClockOutAfterSchedule(tenant.id, settings?.timezone);

    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId: tenant.id,
        disabled: false,
        deletedAt: null,
        ...this.scopedOfficeFilter(options?.officeId),
      },
      orderBy: { fullName: 'asc' },
      include: {
        office: { select: { name: true } },
        group: { select: { name: true } },
        punches: { orderBy: { occurredAt: 'desc' }, take: 1 },
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
      officeId?: string;
    },
  ) {
    const { tenant } = await this.tenancy.requireFeature(authUser, 'timeEdits');
    const scopedOfficeId = options.officeId?.trim() || undefined;

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
        employee: scopedOfficeId
          ? {
              OR: [{ officeId: scopedOfficeId }, { officeId: null }],
            }
          : undefined,
      },
      orderBy: { occurredAt: 'desc' },
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
        employeeName: punch.employee.displayName || punch.employee.fullName,
        office: punch.employee.office?.name ?? null,
        group: punch.employee.group?.name ?? null,
        type: punch.type,
        occurredAt: punch.occurredAt.toISOString(),
        notes: punch.notes ?? '',
        latitude: punch.latitude ?? null,
        longitude: punch.longitude ?? null,
      })),
    };
  }

  async createManual(authUser: AuthUser, dto: ManualEmployeePunchDto) {
    const { tenant } = await this.tenancy.requireFeature(authUser, 'timeEdits');
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
    });
    if (settings && settings.allowManualTimeEdits === false) {
      throw new UnauthorizedException('Manual time edits disabled.');
    }

    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId: tenant.id, deletedAt: null },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const punch = await this.prisma.employeePunch.create({
      data: {
        tenantId: tenant.id,
        employeeId: employee.id,
        type: dto.type,
        occurredAt: new Date(dto.occurredAt),
        notes: dto.notes,
        latitude: null,
        longitude: null,
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
    const { tenant } = await this.tenancy.requireFeature(authUser, 'timeEdits');
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
    });
    if (settings && settings.allowManualTimeEdits === false) {
      throw new UnauthorizedException('Manual time edits disabled.');
    }

    const existing = await this.prisma.employeePunch.findFirst({
      where: { id: recordId, tenantId: tenant.id },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }

    return this.prisma.employeePunch.update({
      where: { id: existing.id },
      data: {
        type: dto.type ?? undefined,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
        notes: dto.notes ?? undefined,
      },
    });
  }

  async deleteRecord(authUser: AuthUser, recordId: string) {
    const { tenant } = await this.tenancy.requireFeature(authUser, 'timeEdits');
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
    });
    if (settings && settings.allowManualTimeEdits === false) {
      throw new UnauthorizedException('Manual time edits disabled.');
    }

    const existing = await this.prisma.employeePunch.findFirst({
      where: { id: recordId, tenantId: tenant.id },
    });

    if (!existing) {
      throw new NotFoundException('Record not found');
    }

    await this.prisma.employeePunch.delete({ where: { id: existing.id } });
    return { ok: true };
  }

  async approveScheduleOverride(authUser: AuthUser, requestId: string) {
    return this.resolveScheduleOverride(authUser, requestId, true);
  }

  async rejectScheduleOverride(authUser: AuthUser, requestId: string) {
    return this.resolveScheduleOverride(authUser, requestId, false);
  }

  private async resolveScheduleOverride(
    authUser: AuthUser,
    requestId: string,
    approve: boolean,
  ) {
    const { tenant, user } = await this.tenancy.requireFeature(
      authUser,
      'schedules',
    );

    const existing = await this.prisma.scheduleOverrideRequest.findFirst({
      where: { id: requestId, tenantId: tenant.id },
      include: {
        employee: {
          select: {
            fullName: true,
            displayName: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Schedule override request not found.');
    }

    if (existing.status !== ScheduleOverrideStatus.PENDING) {
      return { request: this.serializeScheduleOverride(existing) };
    }

    const resolvedAt = new Date();
    const updated = await this.prisma.scheduleOverrideRequest.update({
      where: { id: existing.id },
      data: approve
        ? {
            status: ScheduleOverrideStatus.APPROVED,
            approvedAt: resolvedAt,
            approvedByUserId: user.id,
            rejectedAt: null,
            rejectedByUserId: null,
          }
        : {
            status: ScheduleOverrideStatus.REJECTED,
            rejectedAt: resolvedAt,
            rejectedByUserId: user.id,
            approvedAt: null,
            approvedByUserId: null,
          },
      include: {
        employee: {
          select: {
            fullName: true,
            displayName: true,
          },
        },
      },
    });

    const autoClockIn = approve
      ? await this.autoClockInApprovedOverride(
          tenant.id,
          {
            id: updated.employeeId,
            fullName: updated.employee?.fullName || 'Employee',
            displayName: updated.employee?.displayName || null,
          },
          updated.id,
          resolvedAt,
        )
      : null;

    await this.updateScheduleOverrideNotificationState(
      tenant.id,
      updated.id,
      updated.status,
      resolvedAt,
      user.name || user.email || 'Admin',
    );

    return {
      request: this.serializeScheduleOverride(updated),
      autoClockIn,
    };
  }

  private async autoClockInApprovedOverride(
    tenantId: string,
    employee: { id: string; fullName: string; displayName?: string | null },
    requestId: string,
    resolvedAt: Date,
  ) {
    const latest = await this.prisma.employeePunch.findFirst({
      where: { tenantId, employeeId: employee.id },
      orderBy: { occurredAt: 'desc' },
      select: { type: true },
    });

    if (latest && ACTIVE_WORK_STATUSES.has(latest.type)) {
      await this.prisma.scheduleOverrideRequest.updateMany({
        where: {
          id: requestId,
          tenantId,
          consumedAt: null,
        },
        data: { consumedAt: resolvedAt },
      });
      return {
        clockedIn: false,
        alreadyActive: true,
        occurredAt: resolvedAt.toISOString(),
      };
    }

    const punch = await this.prisma.employeePunch.create({
      data: {
        tenantId,
        employeeId: employee.id,
        type: PunchType.IN,
        occurredAt: resolvedAt,
        notes: 'Auto clock-in: admin approved schedule override.',
      },
      select: { id: true, occurredAt: true },
    });

    await this.prisma.scheduleOverrideRequest.updateMany({
      where: {
        id: requestId,
        tenantId,
        consumedAt: null,
      },
      data: { consumedAt: resolvedAt },
    });

    await this.notifications.notifyPunch(
      tenantId,
      employee,
      PunchType.IN,
      resolvedAt,
    );

    return {
      clockedIn: true,
      alreadyActive: false,
      punchId: punch.id,
      occurredAt: punch.occurredAt.toISOString(),
    };
  }

  private serializeScheduleOverride(request: {
    id: string;
    employeeId: string;
    employee?: { fullName: string; displayName: string | null };
    workDate: Date;
    attemptedAt: Date;
    reason: ScheduleOverrideReason;
    reasonMessage: string | null;
    status: ScheduleOverrideStatus;
    approvedAt: Date | null;
    rejectedAt: Date | null;
    consumedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: request.id,
      employeeId: request.employeeId,
      employeeName: request.employee
        ? request.employee.displayName || request.employee.fullName
        : null,
      workDate: request.workDate.toISOString().slice(0, 10),
      attemptedAt: request.attemptedAt.toISOString(),
      reason: request.reason,
      reasonMessage: request.reasonMessage,
      status: request.status,
      approvedAt: request.approvedAt ? request.approvedAt.toISOString() : null,
      rejectedAt: request.rejectedAt ? request.rejectedAt.toISOString() : null,
      consumedAt: request.consumedAt ? request.consumedAt.toISOString() : null,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    };
  }

  private async updateScheduleOverrideNotificationState(
    tenantId: string,
    requestId: string,
    status: ScheduleOverrideStatus,
    resolvedAt: Date,
    resolvedBy: string,
  ) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        tenantId,
        type: NotificationType.SCHEDULE_OVERRIDE_REQUEST,
      },
      select: {
        id: true,
        metadata: true,
      },
    });

    const updates = notifications
      .map((notice) => ({
        id: notice.id,
        metadata:
          notice.metadata &&
          typeof notice.metadata === 'object' &&
          !Array.isArray(notice.metadata)
            ? (notice.metadata as Record<string, unknown>)
            : {},
      }))
      .filter(
        (notice) => notice.metadata.scheduleOverrideRequestId === requestId,
      )
      .map((notice) =>
        this.prisma.notification.update({
          where: { id: notice.id },
          data: {
            readAt: resolvedAt,
            metadata: {
              ...notice.metadata,
              status,
              resolvedAt: resolvedAt.toISOString(),
              resolvedBy,
            },
          },
        }),
      );

    if (!updates.length) {
      return;
    }

    await this.prisma.$transaction(updates);
  }

  private getLocalDayInfo(date: Date, timeZone?: string) {
    const fallbackZone = timeZone || 'UTC';
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: fallbackZone,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const parts = formatter.formatToParts(date);
      const weekday =
        parts.find((part) => part.type === 'weekday')?.value || 'Sun';
      const hour = Number(
        parts.find((part) => part.type === 'hour')?.value || '0',
      );
      const minute = Number(
        parts.find((part) => part.type === 'minute')?.value || '0',
      );
      const dayIndex = [
        'Sun',
        'Mon',
        'Tue',
        'Wed',
        'Thu',
        'Fri',
        'Sat',
      ].indexOf(weekday);
      return {
        weekday: dayIndex === -1 ? date.getUTCDay() : dayIndex,
        minutes: hour * 60 + minute,
      };
    } catch {
      return {
        weekday: date.getUTCDay(),
        minutes: date.getUTCHours() * 60 + date.getUTCMinutes(),
      };
    }
  }

  private parseTime(value?: string | null) {
    if (!value) return null;
    const [hours, minutes] = value.split(':').map((part) => Number(part));
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
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
        'Server users must submit cash and credit card tips before clocking out.',
      );
    }
  }

  private async autoClockOutAfterSchedule(tenantId: string, timeZone?: string) {
    const now = new Date();
    const current = this.getLocalDayInfo(now, timeZone);
    const workDate = this.toLocalDateKey(now, timeZone);
    const weekStartDate = this.getWeekStartDateKey(workDate, 1);
    const weekEndDate = this.shiftDateKey(weekStartDate, 6);
    const lookbackStart = new Date(now.getTime() - AUTO_OUT_LOOKBACK_DAYS * DAY_MS);

    const latestPunches = await this.prisma.employeePunch.findMany({
      where: { tenantId },
      orderBy: { occurredAt: 'desc' },
      distinct: ['employeeId'],
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            displayName: true,
            disabled: true,
            isServer: true,
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
    const ownerManagerIds = await this.tenancy.getOwnerManagerEmployeeIds(
      tenantId,
      candidates.map((punch) => punch.employeeId),
    );
    const filteredCandidates = candidates.filter(
      (punch) => !ownerManagerIds.has(punch.employeeId),
    );

    if (!filteredCandidates.length) {
      return;
    }

    const schedules = await this.prisma.employeeSchedule.findMany({
      where: {
        tenantId,
        weekday: current.weekday,
        employeeId: { in: filteredCandidates.map((punch) => punch.employeeId) },
      },
      select: {
        employeeId: true,
        endTime: true,
      },
    });
    const scheduleByEmployee = new Map(
      schedules.map((schedule) => [schedule.employeeId, schedule]),
    );

    for (const punch of filteredCandidates) {
      const schedule = scheduleByEmployee.get(punch.employeeId);
      if (!schedule) {
        continue;
      }

      const endMinutes = this.parseTime(schedule.endTime);
      if (
        endMinutes === null ||
        current.minutes < endMinutes + AUTO_OUT_GRACE_MINUTES
      ) {
        continue;
      }

      const latest = await this.prisma.employeePunch.findFirst({
        where: { tenantId, employeeId: punch.employeeId },
        orderBy: { occurredAt: 'desc' },
        select: { type: true },
      });
      if (!latest || !ACTIVE_WORK_STATUSES.has(latest.type)) {
        continue;
      }

      const priorAutoOutPunches = await this.prisma.employeePunch.findMany({
        where: {
          tenantId,
          employeeId: punch.employeeId,
          type: PunchType.OUT,
          occurredAt: {
            gte: lookbackStart,
            lte: now,
          },
          notes: {
            contains: AUTO_SCHEDULE_OUT_TOKEN,
          },
        },
        select: {
          occurredAt: true,
        },
      });
      const priorWeekStrikeCount = priorAutoOutPunches.filter((entry) => {
        const key = this.toLocalDateKey(entry.occurredAt, timeZone);
        return key >= weekStartDate && key <= weekEndDate;
      }).length;
      const weeklyStrikeCount = priorWeekStrikeCount + 1;
      const penaltyMinutes =
        weeklyStrikeCount > AUTO_OUT_WEEKLY_STRIKE_THRESHOLD
          ? AUTO_OUT_PENALTY_MINUTES
          : 0;

      let tipsPendingWorkDate: string | null = null;
      if (punch.employee?.isServer) {
        const tip = await this.prisma.employeeTip.findUnique({
          where: {
            tenantId_employeeId_workDate: {
              tenantId,
              employeeId: punch.employeeId,
              workDate: this.dateKeyToUtc(workDate),
            },
          },
          select: { id: true },
        });
        if (!tip) {
          tipsPendingWorkDate = workDate;
        }
      }

      const autoOutNotes = [
        `Auto clock-out: schedule ended +${AUTO_OUT_GRACE_MINUTES}m.`,
        AUTO_SCHEDULE_OUT_TOKEN,
        `[WORK_DATE:${workDate}]`,
        `[AUTO_OUT_WEEKLY_COUNT:${weeklyStrikeCount}]`,
        `[PENALTY_MINUTES:${penaltyMinutes}]`,
        `[TIPS_PENDING:${tipsPendingWorkDate || AUTO_OUT_TIPS_PENDING_NONE}]`,
      ].join(' ');

      const autoOutAt = new Date();
      await this.prisma.employeePunch.create({
        data: {
          tenantId,
          employeeId: punch.employeeId,
          type: PunchType.OUT,
          occurredAt: autoOutAt,
          notes: autoOutNotes,
        },
      });

      const employeeName =
        punch.employee.displayName || punch.employee.fullName || 'Employee';
      const strikeMessage = `${employeeName} was auto clocked out ${AUTO_OUT_GRACE_MINUTES} minutes after schedule end (strike ${weeklyStrikeCount} this week).`;
      const policyMessage =
        penaltyMinutes > 0
          ? `${strikeMessage} Policy alert: 1h 30m deduction applies.`
          : strikeMessage;

      await this.notifications.notifyPunch(
        tenantId,
        punch.employee,
        PunchType.OUT,
        autoOutAt,
        {
          message: policyMessage,
          metadata: {
            kind: 'AUTO_CLOCK_OUT_30M',
            workDate,
            weeklyAutoClockOutCount: weeklyStrikeCount,
            penaltyMinutes,
            tipsPendingWorkDate,
          },
        },
      );
    }
  }

  private async enforcePendingAutoClockOutTipsBeforeClockIn(
    tenantId: string,
    employee: { id: string; isServer: boolean },
    occurredAt: Date,
    timeZone?: string,
  ) {
    if (!employee.isServer) {
      return;
    }

    const lookbackStart = new Date(
      occurredAt.getTime() - TIP_PENDING_LOOKBACK_DAYS * DAY_MS,
    );
    const autoOutPunches = await this.prisma.employeePunch.findMany({
      where: {
        tenantId,
        employeeId: employee.id,
        type: PunchType.OUT,
        occurredAt: {
          gte: lookbackStart,
          lte: occurredAt,
        },
        notes: {
          contains: AUTO_SCHEDULE_OUT_TOKEN,
        },
      },
      orderBy: {
        occurredAt: 'desc',
      },
      select: {
        notes: true,
      },
    });

    if (!autoOutPunches.length) {
      return;
    }

    const pendingWorkDates: string[] = [];
    const seen = new Set<string>();
    autoOutPunches.forEach((punch) => {
      const parsed = this.parsePendingTipsWorkDate(punch.notes || '');
      if (!parsed || seen.has(parsed)) {
        return;
      }
      seen.add(parsed);
      pendingWorkDates.push(parsed);
    });

    if (!pendingWorkDates.length) {
      return;
    }

    const submittedTips = await this.prisma.employeeTip.findMany({
      where: {
        tenantId,
        employeeId: employee.id,
        workDate: {
          in: pendingWorkDates.map((dateKey) => this.dateKeyToUtc(dateKey)),
        },
      },
      select: {
        workDate: true,
      },
    });
    const submitted = new Set(
      submittedTips.map((tip) => tip.workDate.toISOString().slice(0, 10)),
    );
    const currentDate = this.toLocalDateKey(occurredAt, timeZone);
    const missing = pendingWorkDates
      .filter((dateKey) => dateKey <= currentDate && !submitted.has(dateKey))
      .sort()[0];

    if (!missing) {
      return;
    }

    throw new UnauthorizedException(
      `Pending tips required for work date ${missing} before clocking in.`,
    );
  }

  private async enforceScheduleWithOverride(
    tenantId: string,
    employee: { id: string; fullName: string; displayName?: string | null },
    occurredAt: Date,
    timeZone?: string,
  ) {
    const violation = await this.getScheduleViolation(
      tenantId,
      employee.id,
      occurredAt,
      timeZone,
    );
    if (!violation) {
      return null;
    }

    const workDate = this.toLocalDateKey(occurredAt, timeZone);
    const workDateUtc = new Date(`${workDate}T00:00:00.000Z`);

    const approved = await this.prisma.scheduleOverrideRequest.findFirst({
      where: {
        tenantId,
        employeeId: employee.id,
        workDate: workDateUtc,
        status: ScheduleOverrideStatus.APPROVED,
        consumedAt: null,
      },
      orderBy: { approvedAt: 'desc' },
      select: { id: true },
    });
    if (approved) {
      return approved.id;
    }

    const pending = await this.prisma.scheduleOverrideRequest.findFirst({
      where: {
        tenantId,
        employeeId: employee.id,
        workDate: workDateUtc,
        status: ScheduleOverrideStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (pending) {
      await this.prisma.scheduleOverrideRequest.update({
        where: { id: pending.id },
        data: { attemptedAt: occurredAt },
      });
      throw new UnauthorizedException(
        'Clock-in override request pending admin approval.',
      );
    }

    const request = await this.prisma.scheduleOverrideRequest.create({
      data: {
        tenantId,
        employeeId: employee.id,
        workDate: workDateUtc,
        attemptedAt: occurredAt,
        reason: violation.reason,
        reasonMessage: violation.message,
      },
      select: { id: true },
    });

    await this.notifications.notifyScheduleOverrideRequested(
      tenantId,
      employee,
      {
        id: request.id,
        workDate,
        attemptedAt: occurredAt.toISOString(),
        reason: violation.reason,
        reasonMessage: violation.message,
      },
    );

    throw new UnauthorizedException(
      'You are not scheduled right now. Admin approval request sent.',
    );
  }

  private shouldBypassScheduleOverrideForEmployee(employee: {
    group?: { name: string | null } | null;
    isKitchenManager?: boolean;
  }) {
    if (employee.isKitchenManager) {
      return true;
    }
    const groupName = employee.group?.name?.trim().toLowerCase() || '';
    if (!groupName) {
      return false;
    }
    return (
      groupName.includes('cook') ||
      groupName.includes('kitchen') ||
      groupName.includes('cocina')
    );
  }

  private async enforceNoActiveShift(tenantId: string, employeeId: string) {
    const latestPunch = await this.prisma.employeePunch.findFirst({
      where: { tenantId, employeeId },
      orderBy: { occurredAt: 'desc' },
      select: { type: true },
    });
    if (latestPunch && ACTIVE_WORK_STATUSES.has(latestPunch.type)) {
      throw new UnauthorizedException(
        'Employee already has an active shift. Clock out before clocking in again.',
      );
    }
  }

  private async enforceSingleClockInForScheduledDay(
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
      select: { id: true },
    });

    if (!scheduleForDay) {
      return;
    }

    const workDate = this.toLocalDateKey(occurredAt, timeZone);
    const punches = await this.prisma.employeePunch.findMany({
      where: {
        tenantId,
        employeeId,
        type: PunchType.IN,
        occurredAt: {
          gte: new Date(occurredAt.getTime() - LOCAL_DAY_SCAN_WINDOW_MS),
          lte: new Date(occurredAt.getTime() + LOCAL_DAY_SCAN_WINDOW_MS),
        },
      },
      select: { occurredAt: true },
    });

    const alreadyClockedIn = punches.some(
      (punch) => this.toLocalDateKey(punch.occurredAt, timeZone) === workDate,
    );
    if (alreadyClockedIn) {
      throw new UnauthorizedException(
        'Scheduled employees can only clock in once per day.',
      );
    }
  }

  private async enforceClockInGeofence(
    tenantId: string,
    employeeOfficeId: string | null,
    dto: CreateEmployeePunchDto,
  ) {
    const fallbackOfficeId = dto.officeId?.trim() || undefined;
    const officeId = employeeOfficeId || fallbackOfficeId;
    if (!officeId) {
      return;
    }

    const office = await this.prisma.office.findFirst({
      where: {
        id: officeId,
        tenantId,
      },
      select: {
        name: true,
        latitude: true,
        longitude: true,
        geofenceRadiusMeters: true,
      },
    });

    if (!office || office.latitude === null || office.longitude === null) {
      return;
    }

    if (dto.latitude === undefined || dto.longitude === undefined) {
      throw new UnauthorizedException(
        `Location is required to clock in at ${office.name}.`,
      );
    }

    const distanceMeters = this.distanceMeters(
      office.latitude,
      office.longitude,
      dto.latitude,
      dto.longitude,
    );
    const allowedRadius =
      office.geofenceRadiusMeters || DEFAULT_GEOFENCE_RADIUS_METERS;
    if (distanceMeters > allowedRadius) {
      throw new UnauthorizedException(
        `You are outside the allowed radius for ${office.name} (${Math.round(distanceMeters)}m / ${allowedRadius}m).`,
      );
    }
  }

  private distanceMeters(
    latitudeA: number,
    longitudeA: number,
    latitudeB: number,
    longitudeB: number,
  ) {
    const earthRadius = 6371000;
    const toRadians = (value: number) => (value * Math.PI) / 180;

    const dLatitude = toRadians(latitudeB - latitudeA);
    const dLongitude = toRadians(longitudeB - longitudeA);
    const lat1 = toRadians(latitudeA);
    const lat2 = toRadians(latitudeB);

    const a =
      Math.sin(dLatitude / 2) * Math.sin(dLatitude / 2) +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(dLongitude / 2) *
        Math.sin(dLongitude / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  }

  private parsePendingTipsWorkDate(notes: string): string | null {
    const match = /\[TIPS_PENDING:(\d{4}-\d{2}-\d{2}|NONE)\]/i.exec(notes);
    if (!match) {
      return null;
    }
    const value = (match[1] || '').trim().toUpperCase();
    if (value === AUTO_OUT_TIPS_PENDING_NONE) {
      return null;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }
    return value;
  }

  private dateKeyToUtc(dateKey: string) {
    return new Date(`${dateKey}T00:00:00.000Z`);
  }

  private shiftDateKey(dateKey: string, deltaDays: number) {
    const shifted = this.dateKeyToUtc(dateKey);
    shifted.setUTCDate(shifted.getUTCDate() + deltaDays);
    return shifted.toISOString().slice(0, 10);
  }

  private getWeekStartDateKey(dateKey: string, weekStartsOn: number) {
    const date = this.dateKeyToUtc(dateKey);
    const day = date.getUTCDay();
    const diff = (day - weekStartsOn + 7) % 7;
    date.setUTCDate(date.getUTCDate() - diff);
    return date.toISOString().slice(0, 10);
  }

  private async getScheduleViolation(
    tenantId: string,
    employeeId: string,
    occurredAt: Date,
    timeZone?: string,
  ): Promise<ScheduleViolation | null> {
    const latestPunch = await this.prisma.employeePunch.findFirst({
      where: { tenantId, employeeId },
      orderBy: { occurredAt: 'desc' },
      select: { type: true },
    });

    if (latestPunch && ACTIVE_WORK_STATUSES.has(latestPunch.type)) {
      return {
        reason: ScheduleOverrideReason.OUTSIDE_SCHEDULE_HOURS,
        message:
          'Employee already has an active shift. Admin approval required to allow another clock-in.',
      };
    }

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
      if (!hasAnySchedule) {
        return null;
      }
      return {
        reason: ScheduleOverrideReason.NOT_SCHEDULED_TODAY,
        message: 'You are not scheduled to work today.',
      };
    }

    const startMinutes = this.parseTime(scheduleForDay.startTime);
    const endMinutes = this.parseTime(scheduleForDay.endTime);
    if (startMinutes === null || endMinutes === null) {
      return null;
    }
    if (endMinutes <= startMinutes) {
      return null;
    }
    if (
      scheduleDay.minutes < startMinutes ||
      scheduleDay.minutes > endMinutes
    ) {
      return {
        reason: ScheduleOverrideReason.OUTSIDE_SCHEDULE_HOURS,
        message: 'You are outside your scheduled hours.',
      };
    }
    return null;
  }
}
