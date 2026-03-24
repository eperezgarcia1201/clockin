import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import type { AuthUser } from '../auth/auth.types';
import type { RegisterEmployeeDeviceDto } from './dto/register-employee-device.dto';
import { resolveDefaultEmployeeDeviceNotifications } from '../settings/notification-policy';

@Injectable()
export class EmployeeDevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  async register(authUser: AuthUser, payload: RegisterEmployeeDeviceDto) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
    const employeeId = payload.employeeId.trim();
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        tenantId: tenant.id,
        disabled: false,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const defaultPreferences = await this.loadDefaultNotifications(tenant.id);
    const device = await this.prisma.employeeDevice.upsert({
      where: { expoPushToken: payload.expoPushToken },
      update: {
        tenantId: tenant.id,
        employeeId: employee.id,
        label: this.normalizeOptionalString(payload.label),
        platform: this.normalizeOptionalString(payload.platform),
        timeZone: this.normalizeOptionalString(payload.timeZone),
        notifyLateClockInReminders:
          payload.notifyLateClockInReminders ?? undefined,
      },
      create: {
        tenantId: tenant.id,
        employeeId: employee.id,
        expoPushToken: payload.expoPushToken,
        label: this.normalizeOptionalString(payload.label) ?? null,
        platform: this.normalizeOptionalString(payload.platform) ?? null,
        timeZone: this.normalizeOptionalString(payload.timeZone) ?? null,
        ...defaultPreferences,
        notifyLateClockInReminders:
          payload.notifyLateClockInReminders ??
          defaultPreferences.notifyLateClockInReminders,
      },
    });

    return { device: this.serializeDevice(device) };
  }

  private normalizeOptionalString(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }
    const trimmed = value?.trim() || '';
    return trimmed || null;
  }

  private async loadDefaultNotifications(tenantId: string) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        employeeLateClockInPushEnabled: true,
      },
    });
    return resolveDefaultEmployeeDeviceNotifications(settings);
  }

  private serializeDevice(
    device:
      | {
          id: string;
          employeeId: string;
          label: string | null;
          platform: string | null;
          timeZone: string | null;
          notifyLateClockInReminders: boolean;
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
      employeeId: device.employeeId,
      label: device.label,
      platform: device.platform,
      timeZone: device.timeZone,
      createdAt: device.createdAt.toISOString(),
      updatedAt: device.updatedAt.toISOString(),
      notifications: {
        notifyLateClockInReminders: device.notifyLateClockInReminders,
      },
    };
  }
}
