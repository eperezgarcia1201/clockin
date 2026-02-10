import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TenancyService } from "../tenancy/tenancy.service";
import type { AuthUser } from "../auth/auth.types";
import type { UpdateSettingsDto } from "./dto/update-settings.dto";

const defaultSettings = () => ({
  timezone: "America/New_York",
  roundingMinutes: 15,
  requirePin: true,
  ipRestrictions: "",
  reportsEnabled: true,
  allowManualTimeEdits: true,
});

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  async getSettings(authUser: AuthUser) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);

    let settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
    });

    if (!settings) {
      settings = await this.prisma.tenantSettings.create({
        data: { tenantId: tenant.id, ...defaultSettings() },
      });
    }

    return settings;
  }

  async updateSettings(authUser: AuthUser, dto: UpdateSettingsDto) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
    const defaults = defaultSettings();

    return this.prisma.tenantSettings.upsert({
      where: { tenantId: tenant.id },
      update: {
        timezone: dto.timezone ?? undefined,
        roundingMinutes:
          dto.roundingMinutes ?? undefined,
        requirePin: dto.requirePin ?? undefined,
        ipRestrictions:
          dto.ipRestrictions !== undefined ? dto.ipRestrictions : undefined,
        reportsEnabled: dto.reportsEnabled ?? undefined,
        allowManualTimeEdits: dto.allowManualTimeEdits ?? undefined,
      },
      create: {
        tenantId: tenant.id,
        timezone: dto.timezone ?? defaults.timezone,
        roundingMinutes:
          dto.roundingMinutes ?? defaults.roundingMinutes,
        requirePin: dto.requirePin ?? defaults.requirePin,
        ipRestrictions:
          dto.ipRestrictions ?? defaults.ipRestrictions,
        reportsEnabled:
          dto.reportsEnabled ?? defaults.reportsEnabled,
        allowManualTimeEdits:
          dto.allowManualTimeEdits ?? defaults.allowManualTimeEdits,
      },
    });
  }
}
