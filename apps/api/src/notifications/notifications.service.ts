import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import type { AuthUser } from '../auth/auth.types';
import {
  MembershipStatus,
  NotificationType,
  PunchType,
  Role,
  ScheduleOverrideReason,
} from '@prisma/client';
import type { CreateEmployeeMessageDto } from './dto/create-employee-message.dto';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const LOCAL_DAY_SCAN_WINDOW_MS = 36 * 60 * 60 * 1000;
const LATE_CLOCK_IN_GRACE_MINUTES = 5;
const LATE_REMINDER_INTERVAL_MINUTES = 5;
const LATE_REMINDER_MAX = 3;
const MANAGER_MESSAGE_KIND = 'MANAGER_MESSAGE';
const LATE_CLOCK_IN_REMINDER_KIND = 'LATE_CLOCK_IN_REMINDER';
const AUTO_CLOCK_IN_KIND = 'AUTO_CLOCK_IN_AFTER_REMINDERS';
const OWNER_DAILY_REPORT_KIND = 'OWNER_DAILY_REPORT_EMAIL';
const COMPANY_ORDER_META_PREFIX = '__company_order_meta__';
const OWNER_REPORT_SEND_MINUTES = 22 * 60;
const SUPPLIER_ORDER_WEEKDAY_START = 0;
const SUPPLIER_ORDER_START_HOUR = 9;
const ACTIVE_WORK_STATUSES = new Set<PunchType>([
  PunchType.IN,
  PunchType.BREAK,
  PunchType.LUNCH,
]);
const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

type OwnerReportSummary = {
  tenantName: string;
  timeZone: string;
  workDate: string;
  officeId: string | null;
  officeName: string;
  sales: {
    foodSales: number;
    liquorSales: number;
    totalSales: number;
    totalPayments: number;
    balance: number;
  };
  expenses: {
    count: number;
    totalExpenses: number;
    cashExpenses: number;
    debitCardExpenses: number;
    checkExpenses: number;
  };
  supplierOrders: {
    weekStartDate: string;
    windowStartAt: string;
    windowEndAt: string;
    supplierNames: string[];
    contributors: string[];
    orderRecordCount: number;
    itemCount: number;
    totalQuantity: number;
    createdAt: string | null;
    updatedAt: string | null;
  };
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly config: ConfigService,
  ) {}

  async ensureOperationalAlerts(tenantId: string, timeZone?: string) {
    const resolvedTimeZone =
      timeZone ||
      (
        await this.prisma.tenantSettings.findUnique({
          where: { tenantId },
          select: { timezone: true },
        })
      )?.timezone;

    await this.ensureBreakAlerts(tenantId);
    await this.ensureLateClockInReminders(tenantId, resolvedTimeZone);
    await this.ensureOwnerDailyReportEmails(tenantId, resolvedTimeZone);
  }

  async list(
    authUser: AuthUser,
    options: { limit?: number; unreadOnly?: boolean },
  ) {
    const { tenant } = await this.tenancy.requireFeature(authUser, 'dashboard');
    await this.ensureOperationalAlerts(tenant.id);

    const limit = options.limit && options.limit > 0 ? options.limit : 50;
    const notifications = await this.prisma.notification.findMany({
      where: {
        tenantId: tenant.id,
        readAt: options.unreadOnly ? null : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        employee: {
          select: { id: true, fullName: true, displayName: true },
        },
      },
    });

    return {
      notifications: notifications.map((notice) => ({
        id: notice.id,
        type: notice.type,
        message: notice.message,
        createdAt: notice.createdAt.toISOString(),
        readAt: notice.readAt ? notice.readAt.toISOString() : null,
        employeeId: notice.employeeId,
        employeeName: notice.employee
          ? notice.employee.displayName || notice.employee.fullName
          : null,
        metadata: notice.metadata ?? null,
      })),
    };
  }

  async markRead(authUser: AuthUser, id: string) {
    const { tenant } = await this.tenancy.requireFeature(
      authUser,
      'notifications',
    );

    await this.prisma.notification.updateMany({
      where: { id, tenantId: tenant.id },
      data: { readAt: new Date() },
    });

    return { ok: true };
  }

  async markAllRead(authUser: AuthUser) {
    const { tenant } = await this.tenancy.requireFeature(
      authUser,
      'notifications',
    );

    await this.prisma.notification.updateMany({
      where: { tenantId: tenant.id, readAt: null },
      data: { readAt: new Date() },
    });

    return { ok: true };
  }

  async createEmployeeMessage(
    authUser: AuthUser,
    dto: CreateEmployeeMessageDto,
  ) {
    const access = await this.tenancy.requireFeature(authUser, 'notifications');
    const employeeId = dto.employeeId.trim();
    const subject = dto.subject.trim();
    const body = dto.message.trim();

    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        tenantId: access.tenant.id,
        deletedAt: null,
        disabled: false,
      },
      select: {
        id: true,
        fullName: true,
        displayName: true,
      },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const senderName =
      access.displayName ||
      authUser.name ||
      authUser.email ||
      authUser.authUserId;
    const employeeName = employee.displayName || employee.fullName;

    const notification = await this.prisma.notification.create({
      data: {
        tenantId: access.tenant.id,
        employeeId: employee.id,
        // Reuse an existing enum type and distinguish by metadata.kind.
        type: NotificationType.LATE_CLOCK_IN_5M,
        message: `Manager message for ${employeeName}: ${subject}`,
        metadata: {
          kind: MANAGER_MESSAGE_KIND,
          subject,
          body,
          fromName: senderName,
          employeeName,
        },
      },
    });

    return {
      id: notification.id,
      employeeId: employee.id,
      employeeName,
      subject,
      message: body,
      fromName: senderName,
      createdAt: notification.createdAt.toISOString(),
    };
  }

  async consumeManagerMessageForEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<{
    id: string;
    subject: string;
    message: string;
    fromName: string | null;
    createdAt: string;
  } | null> {
    const pending = await this.prisma.notification.findFirst({
      where: {
        tenantId,
        employeeId,
        readAt: null,
        metadata: {
          path: ['kind'],
          equals: MANAGER_MESSAGE_KIND,
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!pending) {
      return null;
    }

    const metadata =
      pending.metadata && typeof pending.metadata === 'object'
        ? (pending.metadata as Record<string, unknown>)
        : {};
    const subject =
      typeof metadata.subject === 'string' && metadata.subject.trim()
        ? metadata.subject
        : 'Message from manager';
    const message =
      typeof metadata.body === 'string' && metadata.body.trim()
        ? metadata.body
        : pending.message;
    const fromName =
      typeof metadata.fromName === 'string' && metadata.fromName.trim()
        ? metadata.fromName
        : null;

    await this.prisma.notification.update({
      where: { id: pending.id },
      data: { readAt: new Date() },
    });

    return {
      id: pending.id,
      subject,
      message,
      fromName,
      createdAt: pending.createdAt.toISOString(),
    };
  }

  async notifyPunch(
    tenantId: string,
    employee: { id: string; fullName: string; displayName?: string | null },
    type: PunchType,
    occurredAt: Date,
    options?: {
      message?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const employeeName = employee.displayName || employee.fullName;
    const typeLabel = type.toLowerCase();
    const notificationType = this.mapPunchType(type);

    const notification = await this.prisma.notification.create({
      data: {
        tenantId,
        employeeId: employee.id,
        type: notificationType,
        message: options?.message || `${employeeName} clocked ${typeLabel}.`,
        metadata: {
          employeeName,
          punchType: type,
          occurredAt: occurredAt.toISOString(),
          ...(options?.metadata || {}),
        },
      },
    });

    await this.sendPush(tenantId, notification.message, notification.type);
  }

  async notifyTipSummary(
    tenantId: string,
    employee: { id: string; fullName: string; displayName?: string | null },
    summary: {
      workDate: string;
      fromDate: string;
      toDate: string;
      cashTips: number;
      creditCardTips: number;
      totalTips: number;
    },
  ) {
    const employeeName = employee.displayName || employee.fullName;
    const message =
      `${employeeName} submitted tips for ${summary.workDate}. ` +
      `Last 7 days: ${formatCurrency(summary.totalTips)} ` +
      `(CC ${formatCurrency(summary.creditCardTips)} / Cash ${formatCurrency(summary.cashTips)}).`;

    const notification = await this.prisma.notification.create({
      data: {
        tenantId,
        employeeId: employee.id,
        type: NotificationType.TIPS_7D_SUMMARY,
        message,
        metadata: {
          employeeName,
          workDate: summary.workDate,
          range: {
            from: summary.fromDate,
            to: summary.toDate,
          },
          cashTips: summary.cashTips,
          creditCardTips: summary.creditCardTips,
          totalTips: summary.totalTips,
        },
      },
    });

    await this.sendPush(tenantId, notification.message, notification.type);
  }

  async notifyScheduleOverrideRequested(
    tenantId: string,
    employee: { id: string; fullName: string; displayName?: string | null },
    request: {
      id: string;
      workDate: string;
      attemptedAt: string;
      reason: ScheduleOverrideReason;
      reasonMessage: string;
    },
  ) {
    const employeeName = employee.displayName || employee.fullName;
    const reasonLabel =
      request.reason === ScheduleOverrideReason.NOT_SCHEDULED_TODAY
        ? 'not scheduled today'
        : 'outside scheduled hours';
    const message = `${employeeName} requested schedule override (${reasonLabel}).`;

    const notification = await this.prisma.notification.create({
      data: {
        tenantId,
        employeeId: employee.id,
        type: NotificationType.SCHEDULE_OVERRIDE_REQUEST,
        message,
        metadata: {
          employeeName,
          scheduleOverrideRequestId: request.id,
          status: 'PENDING',
          workDate: request.workDate,
          attemptedAt: request.attemptedAt,
          reason: request.reason,
          reasonMessage: request.reasonMessage,
        },
      },
    });

    await this.sendPush(tenantId, notification.message, notification.type);
  }

  private mapPunchType(type: PunchType): NotificationType {
    switch (type) {
      case PunchType.IN:
        return NotificationType.PUNCH_IN;
      case PunchType.OUT:
        return NotificationType.PUNCH_OUT;
      case PunchType.BREAK:
        return NotificationType.PUNCH_BREAK;
      case PunchType.LUNCH:
        return NotificationType.PUNCH_LUNCH;
      default:
        return NotificationType.PUNCH_IN;
    }
  }

  private async ensureBreakAlerts(tenantId: string) {
    const now = Date.now();
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
            deletedAt: true,
          },
        },
      },
    });

    const overdue = latestPunches.filter((punch) => {
      if (
        !punch.employee ||
        punch.employee.disabled ||
        punch.employee.deletedAt
      ) {
        return false;
      }
      if (punch.type !== PunchType.IN) {
        return false;
      }
      const elapsed = now - punch.occurredAt.getTime();
      return elapsed >= SIX_HOURS_MS;
    });

    if (!overdue.length) {
      return;
    }

    for (const punch of overdue) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          tenantId,
          employeeId: punch.employeeId,
          type: NotificationType.NO_BREAK_6H,
          createdAt: {
            gte: punch.occurredAt,
          },
        },
      });

      if (existing) {
        continue;
      }

      const name = punch.employee?.displayName || punch.employee?.fullName;
      const notification = await this.prisma.notification.create({
        data: {
          tenantId,
          employeeId: punch.employeeId,
          type: NotificationType.NO_BREAK_6H,
          message: `${name} has been working over 6 hours without a break.`,
          metadata: {
            employeeName: name,
            inPunchAt: punch.occurredAt.toISOString(),
            hours: 6,
          },
        },
      });

      await this.sendPush(tenantId, notification.message, notification.type);
    }
  }

  private getLocalDayInfo(date: Date, timeZone?: string) {
    const zone = timeZone || 'UTC';
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const parts = formatter.formatToParts(date);
      const weekdayToken =
        parts.find((part) => part.type === 'weekday')?.value || 'Sun';
      const hour = Number(
        parts.find((part) => part.type === 'hour')?.value || '0',
      );
      const minute = Number(
        parts.find((part) => part.type === 'minute')?.value || '0',
      );
      const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
        weekdayToken,
      );
      return {
        weekday: weekday === -1 ? date.getUTCDay() : weekday,
        minutes: hour * 60 + minute,
      };
    } catch {
      return {
        weekday: date.getUTCDay(),
        minutes: date.getUTCHours() * 60 + date.getUTCMinutes(),
      };
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

  private parseTime(value?: string | null) {
    if (!value) return null;
    const [hours, minutes] = value.split(':').map((part) => Number(part));
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  }

  private toMetadataRecord(
    metadata: unknown,
  ): Record<string, unknown> | null {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }
    return metadata as Record<string, unknown>;
  }

  private async ensureLateClockInReminders(
    tenantId: string,
    timeZone?: string,
  ) {
    const now = new Date();
    const current = this.getLocalDayInfo(now, timeZone);
    const workDate = this.toLocalDateKey(now, timeZone);

    const schedules = await this.prisma.employeeSchedule.findMany({
      where: {
        tenantId,
        weekday: current.weekday,
        employee: {
          disabled: false,
          deletedAt: null,
        },
      },
      select: {
        employeeId: true,
        startTime: true,
        employee: {
          select: {
            fullName: true,
            displayName: true,
          },
        },
      },
    });

    const dueReminders = schedules
      .map((schedule) => {
        const startMinutes = this.parseTime(schedule.startTime);
        return {
          employeeId: schedule.employeeId,
          startTime: schedule.startTime || '',
          startMinutes,
          employeeName:
            schedule.employee.displayName || schedule.employee.fullName,
        };
      })
      .filter(
        (schedule) =>
          schedule.startMinutes !== null &&
          current.minutes >=
            schedule.startMinutes + LATE_CLOCK_IN_GRACE_MINUTES,
      );

    if (!dueReminders.length) {
      return;
    }

    const dueEmployeeIds = Array.from(
      new Set(dueReminders.map((schedule) => schedule.employeeId)),
    );
    const ownerManagerIds = await this.tenancy.getOwnerManagerEmployeeIds(
      tenantId,
      dueEmployeeIds,
    );
    const remindersToSend = dueReminders.filter(
      (schedule) => !ownerManagerIds.has(schedule.employeeId),
    );
    if (!remindersToSend.length) {
      return;
    }

    const employeeIds = Array.from(
      new Set(remindersToSend.map((schedule) => schedule.employeeId)),
    );

    const [clockInPunches, reminders, latestPunches] = await Promise.all([
      this.prisma.employeePunch.findMany({
        where: {
          tenantId,
          employeeId: { in: employeeIds },
          type: PunchType.IN,
          occurredAt: {
            gte: new Date(now.getTime() - LOCAL_DAY_SCAN_WINDOW_MS),
            lte: now,
          },
        },
        select: {
          employeeId: true,
          occurredAt: true,
        },
      }),
      this.prisma.notification.findMany({
        where: {
          tenantId,
          employeeId: { in: employeeIds },
          type: NotificationType.LATE_CLOCK_IN_5M,
          createdAt: {
            gte: new Date(now.getTime() - LOCAL_DAY_SCAN_WINDOW_MS),
            lte: now,
          },
        },
        select: {
          id: true,
          employeeId: true,
          createdAt: true,
          message: true,
          metadata: true,
        },
      }),
      this.prisma.employeePunch.findMany({
        where: {
          tenantId,
          employeeId: { in: employeeIds },
        },
        orderBy: { occurredAt: 'desc' },
        distinct: ['employeeId'],
        select: {
          employeeId: true,
          type: true,
        },
      }),
    ]);

    const clockedInToday = new Set(
      clockInPunches
        .filter(
          (punch) =>
            this.toLocalDateKey(punch.occurredAt, timeZone) === workDate,
        )
        .map((punch) => punch.employeeId),
    );
    const latestPunchByEmployee = new Map(
      latestPunches.map((punch) => [punch.employeeId, punch]),
    );
    const reminderCountByEmployee = new Map<string, number>();
    reminders.forEach((notice) => {
      if (!notice.employeeId) {
        return;
      }
      if (this.toLocalDateKey(notice.createdAt, timeZone) !== workDate) {
        return;
      }

      const metadata = this.toMetadataRecord(notice.metadata);
      const kind =
        metadata && typeof metadata.kind === 'string'
          ? metadata.kind
          : '';

      if (kind === MANAGER_MESSAGE_KIND || kind === AUTO_CLOCK_IN_KIND) {
        return;
      }

      if (kind && kind !== LATE_CLOCK_IN_REMINDER_KIND) {
        return;
      }

      if (!kind) {
        const message = notice.message.toLowerCase();
        if (!message.includes('has not clocked in')) {
          return;
        }
      }

      reminderCountByEmployee.set(
        notice.employeeId,
        (reminderCountByEmployee.get(notice.employeeId) || 0) + 1,
      );
    });

    for (const reminder of remindersToSend) {
      if (clockedInToday.has(reminder.employeeId)) {
        continue;
      }
      const reminderCount = reminderCountByEmployee.get(reminder.employeeId) || 0;
      const latestPunch = latestPunchByEmployee.get(reminder.employeeId);
      const isAlreadyActive = latestPunch
        ? ACTIVE_WORK_STATUSES.has(latestPunch.type)
        : false;

      if (isAlreadyActive) {
        continue;
      }

      const autoClockIn = async () => {
        if (
          clockedInToday.has(reminder.employeeId) ||
          isAlreadyActive
        ) {
          return false;
        }

        const occurredAt = new Date();
        await this.prisma.employeePunch.create({
          data: {
            tenantId,
            employeeId: reminder.employeeId,
            type: PunchType.IN,
            occurredAt,
            notes: 'Auto clock-in: missed scheduled start after late reminders.',
          },
        });

        await this.notifyPunch(
          tenantId,
          {
            id: reminder.employeeId,
            fullName: reminder.employeeName,
            displayName: reminder.employeeName,
          },
          PunchType.IN,
          occurredAt,
          {
            message:
              `${reminder.employeeName} was auto clocked in after ` +
              `${LATE_REMINDER_MAX} late reminders.`,
            metadata: {
              kind: AUTO_CLOCK_IN_KIND,
              workDate,
              startTime: reminder.startTime,
              reminderCount: LATE_REMINDER_MAX,
            },
          },
        );

        clockedInToday.add(reminder.employeeId);
        latestPunchByEmployee.set(reminder.employeeId, {
          employeeId: reminder.employeeId,
          type: PunchType.IN,
        });
        return true;
      };

      if (reminderCount >= LATE_REMINDER_MAX) {
        await autoClockIn();
        continue;
      }

      const nextReminderMinute =
        (reminder.startMinutes || 0) +
        LATE_CLOCK_IN_GRACE_MINUTES +
        reminderCount * LATE_REMINDER_INTERVAL_MINUTES;

      if (current.minutes < nextReminderMinute) {
        continue;
      }

      const reminderNumber = reminderCount + 1;
      const notification = await this.prisma.notification.create({
        data: {
          tenantId,
          employeeId: reminder.employeeId,
          type: NotificationType.LATE_CLOCK_IN_5M,
          message:
            `${reminder.employeeName} has not clocked in. ` +
            `Reminder ${reminderNumber}/${LATE_REMINDER_MAX} ` +
            `(scheduled ${reminder.startTime || 'N/A'}).`,
          metadata: {
            kind: LATE_CLOCK_IN_REMINDER_KIND,
            employeeName: reminder.employeeName,
            workDate,
            startTime: reminder.startTime,
            graceMinutes: LATE_CLOCK_IN_GRACE_MINUTES,
            reminderNumber,
            reminderMax: LATE_REMINDER_MAX,
            intervalMinutes: LATE_REMINDER_INTERVAL_MINUTES,
          },
        },
      });

      await this.sendPush(tenantId, notification.message, notification.type);
      reminderCountByEmployee.set(reminder.employeeId, reminderNumber);

      if (reminderNumber >= LATE_REMINDER_MAX) {
        await autoClockIn();
      }
    }
  }

  private async ensureOwnerDailyReportEmails(
    tenantId: string,
    timeZone?: string,
  ) {
    const now = new Date();
    const current = this.getLocalDayInfo(now, timeZone);
    if (current.minutes < OWNER_REPORT_SEND_MINUTES) {
      return;
    }

    const workDate = this.toLocalDateKey(now, timeZone);
    const ownerEmails = await this.getTenantOwnerEmails(tenantId);
    if (!ownerEmails.length) {
      return;
    }

    const [tenant, settings, offices] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      }),
      this.prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: { timezone: true },
      }),
      this.prisma.office.findMany({
        where: { tenantId },
        select: { id: true, name: true },
        orderBy: [{ name: 'asc' }],
      }),
    ]);
    const reportTimeZone = settings?.timezone || timeZone || 'UTC';
    const officeScopes = offices.length
      ? offices.map((office) => ({
          officeId: office.id,
          officeName: office.name,
          officeScopeKey: office.id,
        }))
      : [
          {
            officeId: null,
            officeName: 'All locations',
            officeScopeKey: '__all__',
          },
        ];

    for (const officeScope of officeScopes) {
      const alreadyGenerated = await this.prisma.notification.findFirst({
        where: {
          tenantId,
          type: NotificationType.LATE_CLOCK_IN_5M,
          metadata: {
            path: ['kind'],
            equals: OWNER_DAILY_REPORT_KIND,
          },
          AND: [
            {
              metadata: {
                path: ['workDate'],
                equals: workDate,
              },
            },
            {
              metadata: {
                path: ['officeScopeKey'],
                equals: officeScope.officeScopeKey,
              },
            },
          ],
        },
        select: { id: true },
      });
      if (alreadyGenerated) {
        continue;
      }

      const summary = await this.buildOwnerReportSummary({
        tenantId,
        tenantName: tenant?.name || 'ClockIn Tenant',
        workDate,
        now,
        timeZone: reportTimeZone,
        officeId: officeScope.officeId,
        officeName: officeScope.officeName,
      });
      const subject =
        `${summary.tenantName} • ${summary.officeName} Daily Report ` +
        `(${this.formatDateKeyUs(workDate)})`;
      const emailBody = this.buildOwnerReportEmailBody(summary);
      const delivery = await this.sendOwnerReportEmail({
        recipients: ownerEmails,
        subject,
        text: emailBody.text,
        html: emailBody.html,
        tenantId,
        workDate,
        officeId: officeScope.officeId,
      });
      const message = delivery.delivered
        ? `Owner report emailed for ${summary.officeName} (${workDate}).`
        : `Owner report generated for ${summary.officeName} (${workDate}) but email was not delivered.`;

      await this.prisma.notification.create({
        data: {
          tenantId,
          type: NotificationType.LATE_CLOCK_IN_5M,
          message,
          metadata: {
            kind: OWNER_DAILY_REPORT_KIND,
            workDate,
            officeId: officeScope.officeId,
            officeScopeKey: officeScope.officeScopeKey,
            officeName: summary.officeName,
            recipients: ownerEmails,
            delivered: delivery.delivered,
            provider: delivery.provider,
            error: delivery.error || null,
            salesTotal: summary.sales.totalSales,
            expensesTotal: summary.expenses.totalExpenses,
            supplierNames: summary.supplierOrders.supplierNames,
            supplierContributors: summary.supplierOrders.contributors,
            supplierOrderRecordCount: summary.supplierOrders.orderRecordCount,
            supplierItemCount: summary.supplierOrders.itemCount,
            supplierTotalQuantity: summary.supplierOrders.totalQuantity,
            supplierWeekStartDate: summary.supplierOrders.weekStartDate,
            generatedAt: new Date().toISOString(),
          },
        },
      });
    }
  }

  private async buildOwnerReportSummary(input: {
    tenantId: string;
    tenantName: string;
    workDate: string;
    now: Date;
    timeZone: string;
    officeId: string | null;
    officeName: string;
  }): Promise<OwnerReportSummary> {
    const reportDateUtc = new Date(`${input.workDate}T00:00:00.000Z`);
    const supplierWeekStartDate = this.getWeekStartDateKey(
      input.workDate,
      SUPPLIER_ORDER_WEEKDAY_START,
    );
    const supplierWindowStartAt = new Date(
      `${supplierWeekStartDate}T${String(SUPPLIER_ORDER_START_HOUR).padStart(2, '0')}:00:00.000Z`,
    );

    const [sales, expenses, orders] = await Promise.all([
      this.prisma.dailySalesReport.findUnique({
        where: {
          tenantId_reportDate: {
            tenantId: input.tenantId,
            reportDate: reportDateUtc,
          },
        },
        select: {
          foodSales: true,
          liquorSales: true,
          cashPayments: true,
          checkPayments: true,
          creditCardPayments: true,
          otherPayments: true,
        },
      }),
      this.prisma.dailyExpense.findMany({
        where: {
          tenantId: input.tenantId,
          expenseDate: reportDateUtc,
        },
        select: {
          amount: true,
          paymentMethod: true,
        },
      }),
      this.prisma.companyOrder.findMany({
        where: {
          tenantId: input.tenantId,
          orderDate: {
            gte: supplierWindowStartAt,
            lte: input.now,
          },
          ...(input.officeId
            ? {
                OR: [{ officeId: input.officeId }, { officeId: null }],
              }
            : {}),
        },
        select: {
          supplierName: true,
          createdAt: true,
          updatedAt: true,
          notes: true,
          createdByEmployee: {
            select: {
              fullName: true,
              displayName: true,
            },
          },
          items: {
            select: {
              quantity: true,
            },
          },
        },
      }),
    ]);

    const supplierNames = new Set<string>();
    const contributors = new Set<string>();
    let orderItemCount = 0;
    let totalOrderQuantity = 0;
    let orderCreatedAtMs: number | null = null;
    let orderUpdatedAtMs: number | null = null;
    orders.forEach((order) => {
      const normalizedSupplier = order.supplierName.trim();
      if (normalizedSupplier) {
        supplierNames.add(normalizedSupplier);
      }
      this.extractContributorsFromOrderNotes(order.notes).forEach((name) =>
        contributors.add(name),
      );
      const byEmployee =
        order.createdByEmployee?.displayName || order.createdByEmployee?.fullName;
      if (typeof byEmployee === 'string' && byEmployee.trim()) {
        contributors.add(byEmployee.trim());
      }
      const createdAtMs = order.createdAt.getTime();
      const updatedAtMs = order.updatedAt.getTime();
      orderCreatedAtMs =
        orderCreatedAtMs === null
          ? createdAtMs
          : Math.min(orderCreatedAtMs, createdAtMs);
      orderUpdatedAtMs =
        orderUpdatedAtMs === null
          ? updatedAtMs
          : Math.max(orderUpdatedAtMs, updatedAtMs);
      orderItemCount += order.items.length;
      totalOrderQuantity += order.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
    });

    const foodSales = Number((sales?.foodSales || 0).toFixed(2));
    const liquorSales = Number((sales?.liquorSales || 0).toFixed(2));
    const totalSales = Number((foodSales + liquorSales).toFixed(2));
    const totalPayments = Number(
      (
        (sales?.cashPayments || 0) +
        (sales?.checkPayments || 0) +
        (sales?.creditCardPayments || 0) +
        (sales?.otherPayments || 0)
      ).toFixed(2),
    );

    let totalExpenses = 0;
    let cashExpenses = 0;
    let debitCardExpenses = 0;
    let checkExpenses = 0;
    expenses.forEach((expense) => {
      totalExpenses += expense.amount;
      if (expense.paymentMethod === 'CASH') {
        cashExpenses += expense.amount;
      } else if (expense.paymentMethod === 'DEBIT_CARD') {
        debitCardExpenses += expense.amount;
      } else if (expense.paymentMethod === 'CHECK') {
        checkExpenses += expense.amount;
      }
    });

    return {
      tenantName: input.tenantName,
      timeZone: input.timeZone,
      workDate: input.workDate,
      officeId: input.officeId,
      officeName: input.officeName,
      sales: {
        foodSales,
        liquorSales,
        totalSales,
        totalPayments,
        balance: Number((totalSales - totalPayments).toFixed(2)),
      },
      expenses: {
        count: expenses.length,
        totalExpenses: Number(totalExpenses.toFixed(2)),
        cashExpenses: Number(cashExpenses.toFixed(2)),
        debitCardExpenses: Number(debitCardExpenses.toFixed(2)),
        checkExpenses: Number(checkExpenses.toFixed(2)),
      },
      supplierOrders: {
        weekStartDate: supplierWeekStartDate,
        windowStartAt: supplierWindowStartAt.toISOString(),
        windowEndAt: input.now.toISOString(),
        supplierNames: Array.from(supplierNames).sort((a, b) =>
          a.localeCompare(b),
        ),
        contributors: Array.from(contributors).sort((a, b) => a.localeCompare(b)),
        orderRecordCount: orders.length,
        itemCount: orderItemCount,
        totalQuantity: Number(totalOrderQuantity.toFixed(2)),
        createdAt:
          orderCreatedAtMs !== null
            ? new Date(orderCreatedAtMs).toISOString()
            : null,
        updatedAt:
          orderUpdatedAtMs !== null
            ? new Date(orderUpdatedAtMs).toISOString()
            : null,
      },
    };
  }

  private buildOwnerReportEmailBody(summary: OwnerReportSummary) {
    const reportDateLabel = this.formatDateKeyUs(summary.workDate);
    const generatedLabel = this.formatDateTimeInTimeZone(
      new Date(),
      summary.timeZone,
    );
    const supplierCreatedLabel = summary.supplierOrders.createdAt
      ? this.formatDateTimeInTimeZone(
          new Date(summary.supplierOrders.createdAt),
          summary.timeZone,
        )
      : 'N/A';
    const supplierUpdatedLabel = summary.supplierOrders.updatedAt
      ? this.formatDateTimeInTimeZone(
          new Date(summary.supplierOrders.updatedAt),
          summary.timeZone,
        )
      : 'N/A';
    const supplierWindowStartLabel = this.formatDateTimeInTimeZone(
      new Date(summary.supplierOrders.windowStartAt),
      summary.timeZone,
    );
    const supplierWindowEndLabel = this.formatDateTimeInTimeZone(
      new Date(summary.supplierOrders.windowEndAt),
      summary.timeZone,
    );
    const suppliers =
      summary.supplierOrders.supplierNames.length > 0
        ? summary.supplierOrders.supplierNames.join(', ')
        : 'No suppliers submitted yet.';
    const contributors =
      summary.supplierOrders.contributors.length > 0
        ? summary.supplierOrders.contributors.join(', ')
        : 'No contributors recorded yet.';

    const lines = [
      `ClockIn Daily Auto Report`,
      `Tenant: ${summary.tenantName}`,
      `Location: ${summary.officeName}`,
      `Date: ${reportDateLabel} (${summary.workDate})`,
      `Timezone: ${summary.timeZone}`,
      `Generated: ${generatedLabel}`,
      ``,
      `Daily Sales`,
      `- Food Sales: ${formatCurrency(summary.sales.foodSales)}`,
      `- Liquor Sales: ${formatCurrency(summary.sales.liquorSales)}`,
      `- Total Sales: ${formatCurrency(summary.sales.totalSales)}`,
      `- Total Payments: ${formatCurrency(summary.sales.totalPayments)}`,
      `- Balance: ${formatCurrency(summary.sales.balance)}`,
      ``,
      `Daily Expenses`,
      `- Entries: ${summary.expenses.count}`,
      `- Total Expenses: ${formatCurrency(summary.expenses.totalExpenses)}`,
      `- Cash: ${formatCurrency(summary.expenses.cashExpenses)}`,
      `- Debit Card: ${formatCurrency(summary.expenses.debitCardExpenses)}`,
      `- Check: ${formatCurrency(summary.expenses.checkExpenses)}`,
      ``,
      `Supplier Orders (Week starts Sunday 9:00 AM)`,
      `- Week Start: ${this.formatDateKeyUs(summary.supplierOrders.weekStartDate)} (${summary.supplierOrders.weekStartDate})`,
      `- Window: ${supplierWindowStartLabel} -> ${supplierWindowEndLabel}`,
      `- Suppliers: ${suppliers}`,
      `- Contributors: ${contributors}`,
      `- Order Records: ${summary.supplierOrders.orderRecordCount}`,
      `- Item Count: ${summary.supplierOrders.itemCount}`,
      `- Total Quantity: ${summary.supplierOrders.totalQuantity}`,
      `- Started: ${supplierCreatedLabel}`,
      `- Last Modified: ${supplierUpdatedLabel}`,
    ];
    const text = lines.join('\n');
    const html = `
      <h2>ClockIn Daily Auto Report</h2>
      <p><strong>Tenant:</strong> ${this.escapeHtml(summary.tenantName)}<br/>
      <strong>Location:</strong> ${this.escapeHtml(summary.officeName)}<br/>
      <strong>Date:</strong> ${this.escapeHtml(reportDateLabel)} (${this.escapeHtml(summary.workDate)})<br/>
      <strong>Timezone:</strong> ${this.escapeHtml(summary.timeZone)}<br/>
      <strong>Generated:</strong> ${this.escapeHtml(generatedLabel)}</p>
      <h3>Daily Sales</h3>
      <ul>
        <li>Food Sales: ${this.escapeHtml(formatCurrency(summary.sales.foodSales))}</li>
        <li>Liquor Sales: ${this.escapeHtml(formatCurrency(summary.sales.liquorSales))}</li>
        <li>Total Sales: ${this.escapeHtml(formatCurrency(summary.sales.totalSales))}</li>
        <li>Total Payments: ${this.escapeHtml(formatCurrency(summary.sales.totalPayments))}</li>
        <li>Balance: ${this.escapeHtml(formatCurrency(summary.sales.balance))}</li>
      </ul>
      <h3>Daily Expenses</h3>
      <ul>
        <li>Entries: ${summary.expenses.count}</li>
        <li>Total Expenses: ${this.escapeHtml(formatCurrency(summary.expenses.totalExpenses))}</li>
        <li>Cash: ${this.escapeHtml(formatCurrency(summary.expenses.cashExpenses))}</li>
        <li>Debit Card: ${this.escapeHtml(formatCurrency(summary.expenses.debitCardExpenses))}</li>
        <li>Check: ${this.escapeHtml(formatCurrency(summary.expenses.checkExpenses))}</li>
      </ul>
      <h3>Supplier Orders (Week starts Sunday 9:00 AM)</h3>
      <ul>
        <li>Week Start: ${this.escapeHtml(this.formatDateKeyUs(summary.supplierOrders.weekStartDate))} (${this.escapeHtml(summary.supplierOrders.weekStartDate)})</li>
        <li>Window: ${this.escapeHtml(supplierWindowStartLabel)} - ${this.escapeHtml(supplierWindowEndLabel)}</li>
        <li>Suppliers: ${this.escapeHtml(suppliers)}</li>
        <li>Contributors: ${this.escapeHtml(contributors)}</li>
        <li>Order Records: ${summary.supplierOrders.orderRecordCount}</li>
        <li>Item Count: ${summary.supplierOrders.itemCount}</li>
        <li>Total Quantity: ${summary.supplierOrders.totalQuantity}</li>
        <li>Started: ${this.escapeHtml(supplierCreatedLabel)}</li>
        <li>Last Modified: ${this.escapeHtml(supplierUpdatedLabel)}</li>
      </ul>
    `.trim();

    return { text, html };
  }

  private async sendOwnerReportEmail(input: {
    recipients: string[];
    subject: string;
    text: string;
    html: string;
    tenantId: string;
    workDate: string;
    officeId: string | null;
  }): Promise<{
    delivered: boolean;
    provider: 'resend' | 'webhook' | 'none';
    error?: string;
  }> {
    if (!input.recipients.length) {
      return {
        delivered: false,
        provider: 'none',
        error: 'No owner recipients configured.',
      };
    }

    const resendApiKey = (this.config.get<string>('RESEND_API_KEY') || '').trim();
    const reportFrom =
      (this.config.get<string>('OWNER_REPORT_EMAIL_FROM') || '').trim() ||
      (this.config.get<string>('REPORT_EMAIL_FROM') || '').trim() ||
      'ClockIn Reports <noreply@clockin.local>';
    if (resendApiKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: reportFrom,
            to: input.recipients,
            subject: input.subject,
            text: input.text,
            html: input.html,
          }),
        });
        if (!response.ok) {
          const payload = await response.text();
          return {
            delivered: false,
            provider: 'resend',
            error: payload || `Resend request failed (${response.status}).`,
          };
        }
        return { delivered: true, provider: 'resend' };
      } catch (error) {
        return {
          delivered: false,
          provider: 'resend',
          error: this.stringifyError(error),
        };
      }
    }

    const webhookUrl =
      (this.config.get<string>('OWNER_REPORT_EMAIL_WEBHOOK_URL') || '').trim() ||
      (this.config.get<string>('REPORT_EMAIL_WEBHOOK_URL') || '').trim();
    if (webhookUrl) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'owner_daily_report',
            tenantId: input.tenantId,
            workDate: input.workDate,
            officeId: input.officeId,
            recipients: input.recipients,
            subject: input.subject,
            text: input.text,
            html: input.html,
          }),
        });
        if (!response.ok) {
          const payload = await response.text();
          return {
            delivered: false,
            provider: 'webhook',
            error: payload || `Webhook request failed (${response.status}).`,
          };
        }
        return { delivered: true, provider: 'webhook' };
      } catch (error) {
        return {
          delivered: false,
          provider: 'webhook',
          error: this.stringifyError(error),
        };
      }
    }

    return {
      delivered: false,
      provider: 'none',
      error:
        'No email provider configured. Set RESEND_API_KEY or REPORT_EMAIL_WEBHOOK_URL.',
    };
  }

  private async getTenantOwnerEmails(tenantId: string) {
    const [tenant, ownerMemberships] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { ownerEmail: true },
      }),
      this.prisma.membership.findMany({
        where: {
          tenantId,
          role: Role.OWNER,
          status: MembershipStatus.ACTIVE,
        },
        select: {
          user: {
            select: { email: true },
          },
        },
      }),
    ]);

    const dedupe = new Map<string, string>();
    const tenantOwner = this.normalizeEmail(tenant?.ownerEmail);
    if (tenantOwner) {
      dedupe.set(tenantOwner, tenantOwner);
    }
    ownerMemberships.forEach((membership) => {
      const email = this.normalizeEmail(membership.user.email);
      if (email) {
        dedupe.set(email, email);
      }
    });
    return Array.from(dedupe.values());
  }

  private getWeekStartDateKey(dateKey: string, weekStartsOn: number) {
    const value = new Date(`${dateKey}T00:00:00.000Z`);
    if (Number.isNaN(value.getTime())) {
      return dateKey;
    }
    const day = value.getUTCDay();
    const delta = (day - weekStartsOn + 7) % 7;
    value.setUTCDate(value.getUTCDate() - delta);
    return value.toISOString().slice(0, 10);
  }

  private extractContributorsFromOrderNotes(notes?: string | null) {
    const source = (notes || '').trim();
    if (!source.startsWith(COMPANY_ORDER_META_PREFIX)) {
      return [];
    }
    const payload = source.slice(COMPANY_ORDER_META_PREFIX.length);
    const newlineIndex = payload.indexOf('\n');
    const metadataRaw =
      newlineIndex >= 0 ? payload.slice(0, newlineIndex).trim() : payload.trim();

    try {
      const parsed = JSON.parse(metadataRaw) as Record<string, unknown>;
      if (!Array.isArray(parsed.contributors)) {
        return [];
      }
      const dedupe = new Map<string, string>();
      parsed.contributors.forEach((value) => {
        if (typeof value !== 'string') {
          return;
        }
        const normalized = value.trim();
        if (!normalized) {
          return;
        }
        const key = normalized.toLowerCase();
        if (!dedupe.has(key)) {
          dedupe.set(key, normalized);
        }
      });
      return Array.from(dedupe.values());
    } catch {
      return [];
    }
  }

  private formatDateKeyUs(dateKey: string) {
    const value = new Date(`${dateKey}T00:00:00.000Z`);
    if (Number.isNaN(value.getTime())) {
      return dateKey;
    }
    return value.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
      timeZone: 'UTC',
    });
  }

  private formatDateTimeInTimeZone(date: Date, timeZone: string) {
    try {
      return date.toLocaleString('en-US', {
        timeZone,
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return date.toISOString();
    }
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private normalizeEmail(value?: string | null) {
    return (value || '').trim().toLowerCase();
  }

  private stringifyError(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown error';
  }

  private async sendPush(
    tenantId: string,
    message: string,
    type: NotificationType,
  ) {
    const devices = await this.prisma.adminDevice.findMany({
      where: { tenantId },
    });
    if (!devices.length) return;

    const body = devices.map((device) => ({
      to: device.expoPushToken,
      sound: 'default',
      title: 'ClockIn Admin',
      body: message,
      data: { type },
    }));

    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch {
      // ignore push failures
    }
  }
}
