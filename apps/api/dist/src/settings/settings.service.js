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
    timezone: "America/New_York",
    roundingMinutes: 15,
    requirePin: true,
    ipRestrictions: "",
    reportsEnabled: true,
    allowManualTimeEdits: true,
});
let SettingsService = class SettingsService {
    prisma;
    tenancy;
    constructor(prisma, tenancy) {
        this.prisma = prisma;
        this.tenancy = tenancy;
    }
    async getSettings(authUser) {
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
    async updateSettings(authUser, dto) {
        const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
        const defaults = defaultSettings();
        return this.prisma.tenantSettings.upsert({
            where: { tenantId: tenant.id },
            update: {
                timezone: dto.timezone ?? undefined,
                roundingMinutes: dto.roundingMinutes ?? undefined,
                requirePin: dto.requirePin ?? undefined,
                ipRestrictions: dto.ipRestrictions !== undefined ? dto.ipRestrictions : undefined,
                reportsEnabled: dto.reportsEnabled ?? undefined,
                allowManualTimeEdits: dto.allowManualTimeEdits ?? undefined,
            },
            create: {
                tenantId: tenant.id,
                timezone: dto.timezone ?? defaults.timezone,
                roundingMinutes: dto.roundingMinutes ?? defaults.roundingMinutes,
                requirePin: dto.requirePin ?? defaults.requirePin,
                ipRestrictions: dto.ipRestrictions ?? defaults.ipRestrictions,
                reportsEnabled: dto.reportsEnabled ?? defaults.reportsEnabled,
                allowManualTimeEdits: dto.allowManualTimeEdits ?? defaults.allowManualTimeEdits,
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