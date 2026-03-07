import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import type { AuthUser } from '../auth/auth.types';
import type { RegisterAdminDeviceDto } from './dto/register-admin-device.dto';
import type { UpdateAdminDeviceDto } from './dto/update-admin-device.dto';
import { resolveDefaultAdminDeviceNotifications } from '../settings/notification-policy';

@Injectable()
export class AdminDevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  async list(authUser: AuthUser) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
    const devices = await this.prisma.adminDevice.findMany({
      where: { tenantId: tenant.id },
      orderBy: { updatedAt: 'desc' },
    });
    return { devices: devices.map((device) => this.serializeDevice(device)) };
  }

  async register(authUser: AuthUser, payload: RegisterAdminDeviceDto) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
    const updatePreferences = this.extractPreferencePatch(payload);
    const defaultPreferences = await this.loadDefaultNotifications(tenant.id);
    const device = await this.prisma.adminDevice.upsert({
      where: { expoPushToken: payload.expoPushToken },
      update: {
        tenantId: tenant.id,
        label: this.normalizeOptionalString(payload.label),
        platform: this.normalizeOptionalString(payload.platform),
        timeZone: this.normalizeOptionalString(payload.timeZone),
        ...updatePreferences,
      },
      create: {
        tenantId: tenant.id,
        expoPushToken: payload.expoPushToken,
        label: this.normalizeOptionalString(payload.label) ?? null,
        platform: this.normalizeOptionalString(payload.platform) ?? null,
        timeZone: this.normalizeOptionalString(payload.timeZone) ?? null,
        ...defaultPreferences,
        ...updatePreferences,
      },
    });

    return { device: this.serializeDevice(device) };
  }

  async update(authUser: AuthUser, id: string, payload: UpdateAdminDeviceDto) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
    const existing = await this.prisma.adminDevice.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Admin device not found');
    }

    const device = await this.prisma.adminDevice.update({
      where: { id: existing.id },
      data: {
        label: this.normalizeOptionalString(payload.label),
        platform: this.normalizeOptionalString(payload.platform),
        timeZone: this.normalizeOptionalString(payload.timeZone),
        ...this.extractPreferencePatch(payload),
      },
    });

    return { device: this.serializeDevice(device) };
  }

  async remove(authUser: AuthUser, id: string) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
    await this.prisma.adminDevice.deleteMany({
      where: { id, tenantId: tenant.id },
    });
    return { ok: true };
  }

  private normalizeOptionalString(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }
    const trimmed = value?.trim() || '';
    return trimmed || null;
  }

  private extractPreferencePatch(
    payload: Partial<
      Pick<
        RegisterAdminDeviceDto,
        | 'notifyPunchActivity'
        | 'notifyNoBreakAlerts'
        | 'notifyLateClockInReminders'
        | 'notifyScheduleOverrides'
        | 'notifyTipSummaries'
        | 'notifyDailySalesReminders'
      >
    >,
  ) {
    return {
      notifyPunchActivity: payload.notifyPunchActivity ?? undefined,
      notifyNoBreakAlerts: payload.notifyNoBreakAlerts ?? undefined,
      notifyLateClockInReminders:
        payload.notifyLateClockInReminders ?? undefined,
      notifyScheduleOverrides: payload.notifyScheduleOverrides ?? undefined,
      notifyTipSummaries: payload.notifyTipSummaries ?? undefined,
      notifyDailySalesReminders:
        payload.notifyDailySalesReminders ?? undefined,
    };
  }

  private async loadDefaultNotifications(tenantId: string) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        defaultNotifyPunchActivity: true,
        defaultNotifyNoBreakAlerts: true,
        defaultNotifyLateClockInReminders: true,
        defaultNotifyScheduleOverrides: true,
        defaultNotifyTipSummaries: true,
        defaultNotifyDailySalesReminders: true,
      },
    });
    return resolveDefaultAdminDeviceNotifications(settings);
  }

  private serializeDevice(
    device:
      | {
          id: string;
          expoPushToken: string;
          label: string | null;
          platform: string | null;
          timeZone: string | null;
          notifyPunchActivity: boolean;
          notifyNoBreakAlerts: boolean;
          notifyLateClockInReminders: boolean;
          notifyScheduleOverrides: boolean;
          notifyTipSummaries: boolean;
          notifyDailySalesReminders: boolean;
          createdAt: Date;
          updatedAt: Date;
        }
      | undefined,
  ) {
    if (!device) {
      return null;
    }
    return {
      id: device.id,
      label: device.label,
      platform: device.platform,
      timeZone: device.timeZone,
      tokenPreview: device.expoPushToken
        ? device.expoPushToken.slice(-8)
        : null,
      createdAt: device.createdAt.toISOString(),
      updatedAt: device.updatedAt.toISOString(),
      notifications: {
        notifyPunchActivity: device.notifyPunchActivity,
        notifyNoBreakAlerts: device.notifyNoBreakAlerts,
        notifyLateClockInReminders: device.notifyLateClockInReminders,
        notifyScheduleOverrides: device.notifyScheduleOverrides,
        notifyTipSummaries: device.notifyTipSummaries,
        notifyDailySalesReminders: device.notifyDailySalesReminders,
      },
    };
  }
}
