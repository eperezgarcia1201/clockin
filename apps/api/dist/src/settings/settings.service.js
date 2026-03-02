"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const tenancy_service_1 = require("../tenancy/tenancy.service");
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
let SettingsService = class SettingsService {
    prisma;
    tenancy;
    constructor(prisma, tenancy) {
        this.prisma = prisma;
        this.tenancy = tenancy;
    }
    async getSettings(authUser) {
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
    async updateSettings(authUser, dto) {
        const { tenant } = await this.tenancy.requireFeature(authUser, 'settings');
        const defaults = defaultSettings();
        return this.prisma.tenantSettings.upsert({
            where: { tenantId: tenant.id },
            update: {
                companyName: dto.companyName !== undefined ? dto.companyName.trim() : undefined,
                companyLegalName: dto.companyLegalName !== undefined
                    ? dto.companyLegalName.trim()
                    : undefined,
                companyAddressLine1: dto.companyAddressLine1 !== undefined
                    ? dto.companyAddressLine1.trim()
                    : undefined,
                companyAddressLine2: dto.companyAddressLine2 !== undefined
                    ? dto.companyAddressLine2.trim()
                    : undefined,
                companyCity: dto.companyCity !== undefined ? dto.companyCity.trim() : undefined,
                companyState: dto.companyState !== undefined ? dto.companyState.trim() : undefined,
                companyPostalCode: dto.companyPostalCode !== undefined
                    ? dto.companyPostalCode.trim()
                    : undefined,
                companyCountry: dto.companyCountry !== undefined
                    ? dto.companyCountry.trim()
                    : undefined,
                companyPhone: dto.companyPhone !== undefined ? dto.companyPhone.trim() : undefined,
                companyEmail: dto.companyEmail !== undefined ? dto.companyEmail.trim() : undefined,
                companyWebsite: dto.companyWebsite !== undefined
                    ? dto.companyWebsite.trim()
                    : undefined,
                companyTaxId: dto.companyTaxId !== undefined ? dto.companyTaxId.trim() : undefined,
                timezone: dto.timezone ?? undefined,
                roundingMinutes: dto.roundingMinutes ?? undefined,
                requirePin: dto.requirePin ?? undefined,
                ipRestrictions: dto.ipRestrictions !== undefined ? dto.ipRestrictions : undefined,
                reportsEnabled: dto.reportsEnabled ?? undefined,
                allowManualTimeEdits: dto.allowManualTimeEdits ?? undefined,
                multiLocationEnabled: dto.multiLocationEnabled ?? undefined,
            },
            create: {
                tenantId: tenant.id,
                companyName: dto.companyName?.trim() ?? defaults.companyName,
                companyLegalName: dto.companyLegalName?.trim() ?? defaults.companyLegalName,
                companyAddressLine1: dto.companyAddressLine1?.trim() ?? defaults.companyAddressLine1,
                companyAddressLine2: dto.companyAddressLine2?.trim() ?? defaults.companyAddressLine2,
                companyCity: dto.companyCity?.trim() ?? defaults.companyCity,
                companyState: dto.companyState?.trim() ?? defaults.companyState,
                companyPostalCode: dto.companyPostalCode?.trim() ?? defaults.companyPostalCode,
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
                allowManualTimeEdits: dto.allowManualTimeEdits ?? defaults.allowManualTimeEdits,
                multiLocationEnabled: dto.multiLocationEnabled ?? defaults.multiLocationEnabled,
            },
        });
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tenancy_service_1.TenancyService])
], SettingsService);
//# sourceMappingURL=settings.service.js.map