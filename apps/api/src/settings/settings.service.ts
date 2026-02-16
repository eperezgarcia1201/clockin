import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import type { AuthUser } from '../auth/auth.types';
import type { UpdateSettingsDto } from './dto/update-settings.dto';

const defaultSettings = () => ({
  companyName: '',
  companyLegalName: '',
  companyAddressLine1: '',
  companyAddressLine2: '',
  companyCity: '',
  companyState: '',
  companyPostalCode: '',
  companyCountry: '',
  companyPhone: '',
  companyEmail: '',
  companyWebsite: '',
  companyTaxId: '',
  timezone: 'America/New_York',
  roundingMinutes: 15,
  requirePin: true,
  ipRestrictions: '',
  reportsEnabled: true,
  allowManualTimeEdits: true,
  dailySalesReportingEnabled: false,
  multiLocationEnabled: false,
});

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  async getSettings(authUser: AuthUser) {
    const { tenant } = await this.tenancy.requireFeature(authUser, 'dashboard');

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
    const { tenant } = await this.tenancy.requireFeature(authUser, 'settings');
    const defaults = defaultSettings();

    return this.prisma.tenantSettings.upsert({
      where: { tenantId: tenant.id },
      update: {
        companyName:
          dto.companyName !== undefined ? dto.companyName.trim() : undefined,
        companyLegalName:
          dto.companyLegalName !== undefined
            ? dto.companyLegalName.trim()
            : undefined,
        companyAddressLine1:
          dto.companyAddressLine1 !== undefined
            ? dto.companyAddressLine1.trim()
            : undefined,
        companyAddressLine2:
          dto.companyAddressLine2 !== undefined
            ? dto.companyAddressLine2.trim()
            : undefined,
        companyCity:
          dto.companyCity !== undefined ? dto.companyCity.trim() : undefined,
        companyState:
          dto.companyState !== undefined ? dto.companyState.trim() : undefined,
        companyPostalCode:
          dto.companyPostalCode !== undefined
            ? dto.companyPostalCode.trim()
            : undefined,
        companyCountry:
          dto.companyCountry !== undefined
            ? dto.companyCountry.trim()
            : undefined,
        companyPhone:
          dto.companyPhone !== undefined ? dto.companyPhone.trim() : undefined,
        companyEmail:
          dto.companyEmail !== undefined ? dto.companyEmail.trim() : undefined,
        companyWebsite:
          dto.companyWebsite !== undefined
            ? dto.companyWebsite.trim()
            : undefined,
        companyTaxId:
          dto.companyTaxId !== undefined ? dto.companyTaxId.trim() : undefined,
        timezone: dto.timezone ?? undefined,
        roundingMinutes: dto.roundingMinutes ?? undefined,
        requirePin: dto.requirePin ?? undefined,
        ipRestrictions:
          dto.ipRestrictions !== undefined ? dto.ipRestrictions : undefined,
        reportsEnabled: dto.reportsEnabled ?? undefined,
        allowManualTimeEdits: dto.allowManualTimeEdits ?? undefined,
        multiLocationEnabled: dto.multiLocationEnabled ?? undefined,
      },
      create: {
        tenantId: tenant.id,
        companyName: dto.companyName?.trim() ?? defaults.companyName,
        companyLegalName:
          dto.companyLegalName?.trim() ?? defaults.companyLegalName,
        companyAddressLine1:
          dto.companyAddressLine1?.trim() ?? defaults.companyAddressLine1,
        companyAddressLine2:
          dto.companyAddressLine2?.trim() ?? defaults.companyAddressLine2,
        companyCity: dto.companyCity?.trim() ?? defaults.companyCity,
        companyState: dto.companyState?.trim() ?? defaults.companyState,
        companyPostalCode:
          dto.companyPostalCode?.trim() ?? defaults.companyPostalCode,
        companyCountry: dto.companyCountry?.trim() ?? defaults.companyCountry,
        companyPhone: dto.companyPhone?.trim() ?? defaults.companyPhone,
        companyEmail: dto.companyEmail?.trim() ?? defaults.companyEmail,
        companyWebsite: dto.companyWebsite?.trim() ?? defaults.companyWebsite,
        companyTaxId: dto.companyTaxId?.trim() ?? defaults.companyTaxId,
        timezone: dto.timezone ?? defaults.timezone,
        roundingMinutes: dto.roundingMinutes ?? defaults.roundingMinutes,
        requirePin: dto.requirePin ?? defaults.requirePin,
        ipRestrictions: dto.ipRestrictions ?? defaults.ipRestrictions,
        reportsEnabled: dto.reportsEnabled ?? defaults.reportsEnabled,
        allowManualTimeEdits:
          dto.allowManualTimeEdits ?? defaults.allowManualTimeEdits,
        multiLocationEnabled:
          dto.multiLocationEnabled ?? defaults.multiLocationEnabled,
      },
    });
  }
}
