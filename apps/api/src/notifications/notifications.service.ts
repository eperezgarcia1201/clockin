import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TenancyService } from "../tenancy/tenancy.service";
import type { AuthUser } from "../auth/auth.types";
import { NotificationType, PunchType } from "@prisma/client";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  async list(
    authUser: AuthUser,
    options: { limit?: number; unreadOnly?: boolean },
  ) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);

    await this.ensureBreakAlerts(tenant.id);

    const limit = options.limit && options.limit > 0 ? options.limit : 50;
    const notifications = await this.prisma.notification.findMany({
      where: {
        tenantId: tenant.id,
        readAt: options.unreadOnly ? null : undefined,
      },
      orderBy: { createdAt: "desc" },
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
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);

    await this.prisma.notification.updateMany({
      where: { id, tenantId: tenant.id },
      data: { readAt: new Date() },
    });

    return { ok: true };
  }

  async markAllRead(authUser: AuthUser) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);

    await this.prisma.notification.updateMany({
      where: { tenantId: tenant.id, readAt: null },
      data: { readAt: new Date() },
    });

    return { ok: true };
  }

  async notifyPunch(
    tenantId: string,
    employee: { id: string; fullName: string; displayName?: string | null },
    type: PunchType,
    occurredAt: Date,
  ) {
    const employeeName = employee.displayName || employee.fullName;
    const typeLabel = type.toLowerCase();
    const notificationType = this.mapPunchType(type);

    const notification = await this.prisma.notification.create({
      data: {
        tenantId,
        employeeId: employee.id,
        type: notificationType,
        message: `${employeeName} clocked ${typeLabel}.`,
        metadata: {
          employeeName,
          punchType: type,
          occurredAt: occurredAt.toISOString(),
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

    const overdue = latestPunches.filter((punch) => {
      if (!punch.employee || punch.employee.disabled) {
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
      sound: "default",
      title: "ClockIn Admin",
      body: message,
      data: { type },
    }));

    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch {
      // ignore push failures
    }
  }
}
