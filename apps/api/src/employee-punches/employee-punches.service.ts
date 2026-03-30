import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
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
import { parsePunchPhotoDataUrl } from './punch-photo';

const ACTIVE_WORK_STATUSES = new Set<PunchType>([
  PunchType.IN,
  PunchType.BREAK,
  PunchType.LUNCH,
]);
const PUNCH_PHOTO_REQUIRED_TYPES = new Set<PunchType>([
  PunchType.IN,
  PunchType.BREAK,
  PunchType.OUT,
]);
const LOCAL_DAY_SCAN_WINDOW_MS = 36 * 60 * 60 * 1000;
const DEFAULT_GEOFENCE_RADIUS_METERS = 120;
const DAY_MS = 24 * 60 * 60 * 1000;
const AUTO_SCHEDULE_OUT_TOKEN = '[AUTO_SCHEDULE_OUT]';
const AUTO_OUT_GRACE_MINUTES = 15;
const AUTO_CLOCK_OUT_KIND = 'AUTO_CLOCK_OUT_15M';
const AUTO_OUT_WEEKLY_STRIKE_THRESHOLD = 3;
const AUTO_OUT_PENALTY_MINUTES = 90;
const AUTO_OUT_TIPS_PENDING_NONE = 'NONE';
const AUTO_OUT_LOOKBACK_DAYS = 14;
const TIP_PENDING_LOOKBACK_DAYS = 7;
const TIPS_PENDING_TOKEN_PREFIX = '[TIPS_PENDING:';
const AUTO_CLOCK_OUT_TICK_MS = 60_000;

type ScheduleViolation = {
  reason: ScheduleOverrideReason;
  message: string;
};

@Injectable()
export class EmployeePunchesService implements OnModuleInit, OnModuleDestroy {
  private autoClockOutTimer: ReturnType<typeof setInterval> | null = null;
  private autoClockOutTickRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    if (!this.autoClockOutTimer) {
      this.autoClockOutTimer = setInterval(() => {
        void this.runAutoClockOutTick();
      }, AUTO_CLOCK_OUT_TICK_MS);
    }
    void this.runAutoClockOutTick();
  }

  onModuleDestroy() {
    if (this.autoClockOutTimer) {
      clearInterval(this.autoClockOutTimer);
      this.autoClockOutTimer = null;
    }
  }

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
    let pendingTipReminderWorkDate: string | null = null;
    let missedTipsWorkDate: string | null = null;

    if (requirePin && employee.pinHash) {
      if (!dto.pin) {
        throw new UnauthorizedException('PIN required.');
      }
      const valid = await compare(dto.pin, employee.pinHash);
      if (!valid) {
        throw new UnauthorizedException('Invalid PIN.');
      }
    }

    const punchPhoto = parsePunchPhotoDataUrl(dto.photoDataUrl);
    if (
      employee.requiresPunchPhoto &&
      PUNCH_PHOTO_REQUIRED_TYPES.has(dto.type) &&
      !punchPhoto
    ) {
      throw new BadRequestException('A face photo is required for this punch.');
    }

    if (dto.type === PunchType.IN) {
      await this.enforceNoActiveShift(tenant.id, employee.id);
      await this.enforceClockInGeofence(tenant.id, employee.officeId, dto);
      pendingTipReminderWorkDate = await this.findPendingTipsReminderWorkDate(
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
      if (!ownerClockExempt && !employee.allowOpenSchedule) {
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
      missedTipsWorkDate = await this.enforceServerTipBeforeClockOut(
        tenant.id,
        {
          id: employee.id,
          isServer: employee.isServer,
        },
        occurredAt,
        settings?.timezone,
        dto.allowMissingTips === true,
      );
    }

    const punch = await this.prisma.employeePunch.create({
      data: {
        tenantId: tenant.id,
        employeeId: employee.id,
        type: dto.type,
        occurredAt,
        notes: this.appendTipsPendingNote(dto.notes, missedTipsWorkDate),
        ipAddress: dto.ipAddress,
        latitude: dto.latitude,
        longitude: dto.longitude,
        photoData: punchPhoto?.buffer,
        photoMimeType: punchPhoto?.mimeType,
        photoCapturedAt: punchPhoto ? new Date() : null,
      },
      select: {
        id: true,
        employeeId: true,
        type: true,
        occurredAt: true,
        notes: true,
        ipAddress: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        photoMimeType: true,
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
      id: punch.id,
      employeeId: punch.employeeId,
      type: punch.type,
      occurredAt: punch.occurredAt,
      notes: punch.notes,
      ipAddress: punch.ipAddress,
      latitude: punch.latitude,
      longitude: punch.longitude,
      createdAt: punch.createdAt,
      hasPhoto: Boolean(punch.photoMimeType),
      managerMessage,
      pendingTipReminderWorkDate,
    };
  }

  async getRecent(authUser: AuthUser, options?: { officeId?: string }) {
    const access = await this.tenancy.requireFeature(authUser, 'dashboard');
    const { tenant } = access;
    const officeScope = this.tenancy.resolveOfficeScope(
      access,
      options?.officeId,
    );
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
        ...this.scopedOfficeFilter(
          officeScope.officeId,
          officeScope.restrictedToAllowedOffice,
        ),
      },
      orderBy: { fullName: 'asc' },
      include: {
        office: { select: { name: true } },
        group: { select: { name: true } },
        punches: {
          orderBy: { occurredAt: 'desc' },
          take: 1,
          select: {
            type: true,
            occurredAt: true,
          },
        },
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

  private async runAutoClockOutTick() {
    if (this.autoClockOutTickRunning) {
      return;
    }
    this.autoClockOutTickRunning = true;
    try {
      const tenants = await this.prisma.tenant.findMany({
        where: { isActive: true },
        select: {
          id: true,
          settings: {
            select: {
              timezone: true,
            },
          },
        },
      });

      for (const tenant of tenants) {
        try {
          await this.autoClockOutAfterSchedule(
            tenant.id,
            tenant.settings?.timezone || undefined,
          );
        } catch {
          // Keep processing other tenants even if one tenant fails.
        }
      }
    } catch {
      // Ignore scheduler-level failures; recent-punch requests still trigger on demand.
    } finally {
      this.autoClockOutTickRunning = false;
    }
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
    const access = await this.tenancy.requireFeature(authUser, 'timeEdits');
    const { tenant } = access;
    const officeScope = this.tenancy.resolveOfficeScope(
      access,
      options.officeId,
    );

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
        employee: officeScope.officeId
          ? this.scopedOfficeFilter(
              officeScope.officeId,
              officeScope.restrictedToAllowedOffice,
            )
          : undefined,
      },
      orderBy: { occurredAt: 'desc' },
      take: limit,
      select: {
        id: true,
        employeeId: true,
        type: true,
        occurredAt: true,
        notes: true,
        latitude: true,
        longitude: true,
        photoMimeType: true,
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
        hasPhoto: Boolean(punch.photoMimeType),
      })),
    };
  }

  async getPunchPhoto(authUser: AuthUser, recordId: string) {
    const access = await this.tenancy.requireAnyFeature(authUser, [
      'reports',
      'timeEdits',
    ]);
    const { tenant } = access;
    const officeScope = this.tenancy.resolveOfficeScope(access);

    const punch = await this.prisma.employeePunch.findFirst({
      where: {
        id: recordId,
        tenantId: tenant.id,
        employee: this.scopedOfficeFilter(
          officeScope.officeId,
          officeScope.restrictedToAllowedOffice,
        ),
      },
      select: {
        id: true,
        type: true,
        occurredAt: true,
        photoData: true,
        photoMimeType: true,
        photoCapturedAt: true,
        employee: {
          select: {
            fullName: true,
            displayName: true,
          },
        },
      },
    });

    if (!punch) {
      throw new NotFoundException('Punch record not found.');
    }

    if (!punch.photoData || !punch.photoMimeType || !punch.photoCapturedAt) {
      throw new NotFoundException('Punch photo not found for this record.');
    }

    const employeeName =
      punch.employee.displayName || punch.employee.fullName || 'employee';
    const occurredAtKey = punch.occurredAt.toISOString().replace(/[:.]/g, '-');

    return {
      mimeType: punch.photoMimeType,
      fileName: buildPunchPhotoFileName(
        `${employeeName}-${punch.type}-${occurredAtKey}`,
        punch.photoMimeType,
      ),
      data: punch.photoData,
    };
  }

  async createManual(authUser: AuthUser, dto: ManualEmployeePunchDto) {
    const access = await this.tenancy.requireFeature(authUser, 'timeEdits');
    const { tenant } = access;
    const officeScope = this.tenancy.resolveOfficeScope(access);
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
    });
    if (settings && settings.allowManualTimeEdits === false) {
      throw new UnauthorizedException('Manual time edits disabled.');
    }

    const employee = await this.prisma.employee.findFirst({
      where: {
        id: dto.employeeId,
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
    const access = await this.tenancy.requireFeature(authUser, 'timeEdits');
    const { tenant } = access;
    const officeScope = this.tenancy.resolveOfficeScope(access);
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
    });
    if (settings && settings.allowManualTimeEdits === false) {
      throw new UnauthorizedException('Manual time edits disabled.');
    }

    const existing = await this.prisma.employeePunch.findFirst({
      where: {
        id: recordId,
        tenantId: tenant.id,
        employee: this.scopedOfficeFilter(
          officeScope.officeId,
          officeScope.restrictedToAllowedOffice,
        ),
      },
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
    const access = await this.tenancy.requireFeature(authUser, 'timeEdits');
    const { tenant } = access;
    const officeScope = this.tenancy.resolveOfficeScope(access);
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
    });
    if (settings && settings.allowManualTimeEdits === false) {
      throw new UnauthorizedException('Manual time edits disabled.');
    }

    const existing = await this.prisma.employeePunch.findFirst({
      where: {
        id: recordId,
        tenantId: tenant.id,
        employee: this.scopedOfficeFilter(
          officeScope.officeId,
          officeScope.restrictedToAllowedOffice,
        ),
      },
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
    const access = await this.tenancy.requireFeature(authUser, 'schedules');
    const { tenant, user } = access;
    const officeScope = this.tenancy.resolveOfficeScope(access);

    const existing = await this.prisma.scheduleOverrideRequest.findFirst({
      where: {
        id: requestId,
        tenantId: tenant.id,
        employee: this.scopedOfficeFilter(
          officeScope.officeId,
          officeScope.restrictedToAllowedOffice,
        ),
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
    const raw = value?.trim();
    if (!raw) return null;

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

  private localDateTimeToUtc(
    dateKey: string,
    minutes: number,
    timeZone?: string,
  ) {
    const [year, month, day] = dateKey.split('-').map((value) => Number(value));
    if (
      [year, month, day, minutes].some((value) => Number.isNaN(value)) ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return this.dateKeyToUtc(dateKey);
    }

    let candidate = new Date(
      Date.UTC(year, month - 1, day, Math.floor(minutes / 60), minutes % 60),
    );
    const targetDateUtc = this.dateKeyToUtc(dateKey).getTime();

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const actualDateKey = this.toLocalDateKey(candidate, timeZone);
      const actualInfo = this.getLocalDayInfo(candidate, timeZone);
      const dayDelta =
        (this.dateKeyToUtc(actualDateKey).getTime() - targetDateUtc) / DAY_MS;
      const minuteDelta = dayDelta * 24 * 60 + (actualInfo.minutes - minutes);
      if (minuteDelta === 0) {
        return candidate;
      }
      candidate = new Date(candidate.getTime() - minuteDelta * 60_000);
    }

    return candidate;
  }

  private async enforceServerTipBeforeClockOut(
    tenantId: string,
    employee: { id: string; isServer: boolean },
    occurredAt: Date,
    timeZone?: string,
    allowMissingTips = false,
  ): Promise<string | null> {
    if (!employee.isServer) {
      return null;
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
      if (allowMissingTips) {
        return workDate;
      }
      throw new UnauthorizedException(
        'Server users must submit cash and credit card tips before clocking out.',
      );
    }

    return null;
  }

  private async autoClockOutAfterSchedule(tenantId: string, timeZone?: string) {
    const now = new Date();
    const current = this.getLocalDayInfo(now, timeZone);
    const workDate = this.toLocalDateKey(now, timeZone);
    const lookbackStart = new Date(
      now.getTime() - AUTO_OUT_LOOKBACK_DAYS * DAY_MS,
    );

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
            officeId: true,
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

    const officeIds = Array.from(
      new Set(
        filteredCandidates
          .map((punch) => punch.employee?.officeId || null)
          .filter((officeId): officeId is string => Boolean(officeId)),
      ),
    );
    const offices = officeIds.length
      ? await this.prisma.office.findMany({
          where: {
            tenantId,
            id: { in: officeIds },
          },
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            geofenceRadiusMeters: true,
          },
        })
      : [];
    const officeById = new Map(offices.map((office) => [office.id, office]));

    const schedules = await this.prisma.employeeSchedule.findMany({
      where: {
        tenantId,
        employeeId: { in: filteredCandidates.map((punch) => punch.employeeId) },
      },
      select: {
        employeeId: true,
        weekday: true,
        endTime: true,
      },
    });
    const scheduleByEmployee = new Map(
      schedules.map((schedule) => [
        `${schedule.employeeId}:${schedule.weekday}`,
        schedule,
      ]),
    );

    for (const punch of filteredCandidates) {
      const punchWorkDate = this.toLocalDateKey(punch.occurredAt, timeZone);
      const staleFromPreviousDay = punchWorkDate < workDate;
      const scheduleDay = staleFromPreviousDay
        ? this.getLocalDayInfo(punch.occurredAt, timeZone)
        : current;
      const autoOutWorkDate = staleFromPreviousDay ? punchWorkDate : workDate;
      const schedule = scheduleByEmployee.get(
        `${punch.employeeId}:${scheduleDay.weekday}`,
      );
      const endMinutes = schedule
        ? this.parseTime(schedule.endTime)
        : staleFromPreviousDay
          ? 24 * 60 - 1 + AUTO_OUT_GRACE_MINUTES
          : null;
      if (endMinutes === null) {
        continue;
      }

      const scheduledCutoffAt = this.localDateTimeToUtc(
        autoOutWorkDate,
        endMinutes + AUTO_OUT_GRACE_MINUTES,
        timeZone,
      );
      if (scheduledCutoffAt.getTime() > now.getTime()) {
        continue;
      }

      const assignedOfficeId = punch.employee?.officeId || null;
      const assignedOffice = assignedOfficeId
        ? officeById.get(assignedOfficeId) || null
        : null;
      let awayFromAssignedOffice = false;
      if (
        assignedOffice &&
        assignedOffice.latitude !== null &&
        assignedOffice.longitude !== null &&
        punch.latitude !== null &&
        punch.longitude !== null
      ) {
        const allowedRadius =
          assignedOffice.geofenceRadiusMeters || DEFAULT_GEOFENCE_RADIUS_METERS;
        const distance = this.distanceMeters(
          assignedOffice.latitude,
          assignedOffice.longitude,
          punch.latitude,
          punch.longitude,
        );
        awayFromAssignedOffice = distance > allowedRadius;
        if (!staleFromPreviousDay && !awayFromAssignedOffice) {
          continue;
        }
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
            lte: scheduledCutoffAt,
          },
          notes: {
            contains: AUTO_SCHEDULE_OUT_TOKEN,
          },
        },
        select: {
          occurredAt: true,
        },
      });
      const weekStartDate = this.getWeekStartDateKey(autoOutWorkDate, 1);
      const weekEndDate = this.shiftDateKey(weekStartDate, 6);
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
              workDate: this.dateKeyToUtc(autoOutWorkDate),
            },
          },
          select: { id: true },
        });
        if (!tip) {
          tipsPendingWorkDate = autoOutWorkDate;
        }
      }

      const autoOutReason = schedule
        ? `schedule ended +${AUTO_OUT_GRACE_MINUTES}m.`
        : `no schedule on file; closed at end of day +${AUTO_OUT_GRACE_MINUTES}m.`;
      const autoOutNotes = [
        `Auto clock-out: ${autoOutReason}`,
        AUTO_SCHEDULE_OUT_TOKEN,
        `[WORK_DATE:${autoOutWorkDate}]`,
        `[AUTO_OUT_WEEKLY_COUNT:${weeklyStrikeCount}]`,
        `[PENALTY_MINUTES:${penaltyMinutes}]`,
        `[AWAY_FROM_LOCATION:${awayFromAssignedOffice ? 'YES' : 'UNKNOWN'}]`,
        `[TIPS_PENDING:${tipsPendingWorkDate || AUTO_OUT_TIPS_PENDING_NONE}]`,
      ].join(' ');

      const autoOutAt = new Date(
        Math.max(scheduledCutoffAt.getTime(), punch.occurredAt.getTime()),
      );
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
      const locationClause =
        awayFromAssignedOffice && assignedOffice
          ? ` while outside ${assignedOffice.name} geofence`
          : '';
      const strikeMessage =
        `${employeeName} was auto clocked out ${AUTO_OUT_GRACE_MINUTES} ` +
        `minutes after schedule end${locationClause} ` +
        `(strike ${weeklyStrikeCount} this week).`;
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
            kind: AUTO_CLOCK_OUT_KIND,
            workDate: autoOutWorkDate,
            weeklyAutoClockOutCount: weeklyStrikeCount,
            penaltyMinutes,
            tipsPendingWorkDate,
          },
        },
      );
    }
  }

  private async findPendingTipsReminderWorkDate(
    tenantId: string,
    employee: { id: string; isServer: boolean },
    occurredAt: Date,
    timeZone?: string,
  ): Promise<string | null> {
    if (!employee.isServer) {
      return null;
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
          contains: TIPS_PENDING_TOKEN_PREFIX,
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
      return null;
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
      return null;
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

    return missing || null;
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

  private appendTipsPendingNote(
    notes: string | undefined,
    workDate: string | null,
  ) {
    const base = (notes || '').trim();
    if (!workDate) {
      return base || undefined;
    }
    if (this.parsePendingTipsWorkDate(base) === workDate) {
      return base;
    }
    const suffix = `[TIPS_PENDING:${workDate}]`;
    return base ? `${base} ${suffix}` : suffix;
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
    const scheduleDay = this.getLocalDayInfo(occurredAt, timeZone);
    const scheduleForDay = await this.prisma.employeeSchedule.findFirst({
      where: {
        tenantId,
        employeeId,
        weekday: scheduleDay.weekday,
      },
    });

    if (!scheduleForDay) {
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

function buildPunchPhotoFileName(baseName: string, mimeType: string) {
  const safeBase = baseName
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return `${safeBase || 'punch-photo'}.${punchPhotoExtension(mimeType)}`;
}

function punchPhotoExtension(mimeType: string) {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    default:
      return 'bin';
  }
}
