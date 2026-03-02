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
exports.OfficesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const tenancy_service_1 = require("../tenancy/tenancy.service");
let OfficesService = class OfficesService {
    prisma;
    tenancy;
    constructor(prisma, tenancy) {
        this.prisma = prisma;
        this.tenancy = tenancy;
    }
    normalizeOfficeName(value) {
        const normalized = value.trim();
        if (!normalized) {
            throw new common_1.BadRequestException('Location name is required.');
        }
        return normalized;
    }
    normalizeGeofence(payload, existing) {
        const latitude = payload.latitude !== undefined
            ? (payload.latitude ?? null)
            : (existing?.latitude ?? null);
        const longitude = payload.longitude !== undefined
            ? (payload.longitude ?? null)
            : (existing?.longitude ?? null);
        const geofenceRadiusMeters = payload.geofenceRadiusMeters !== undefined
            ? (payload.geofenceRadiusMeters ?? null)
            : (existing?.geofenceRadiusMeters ?? null);
        if ((latitude === null) !== (longitude === null)) {
            throw new common_1.BadRequestException('Latitude and longitude must be provided together.');
        }
        return {
            latitude,
            longitude,
            geofenceRadiusMeters,
        };
    }
    async list(authUser) {
        const { tenant } = await this.tenancy.requireFeature(authUser, 'locations');
        return this.prisma.office.findMany({
            where: { tenantId: tenant.id },
            orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
        });
    }
    async create(authUser, dto) {
        const access = await this.tenancy.requireFeature(authUser, 'locations');
        const { tenant } = access;
        if (!access.settings.multiLocationEnabled) {
            const locationCount = await this.prisma.office.count({
                where: { tenantId: tenant.id },
            });
            if (locationCount > 0) {
                throw new common_1.ForbiddenException('Multi-location management is disabled for this tenant.');
            }
        }
        const geofence = this.normalizeGeofence(dto);
        return this.prisma.office.create({
            data: {
                tenantId: tenant.id,
                name: this.normalizeOfficeName(dto.name),
                latitude: geofence.latitude,
                longitude: geofence.longitude,
                geofenceRadiusMeters: geofence.geofenceRadiusMeters,
            },
        });
    }
    async update(authUser, officeId, dto) {
        const { tenant } = await this.tenancy.requireFeature(authUser, 'locations');
        const existing = await this.prisma.office.findFirst({
            where: { id: officeId, tenantId: tenant.id },
            select: {
                id: true,
                latitude: true,
                longitude: true,
                geofenceRadiusMeters: true,
            },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Location not found.');
        }
        const geofence = this.normalizeGeofence(dto, {
            latitude: existing.latitude,
            longitude: existing.longitude,
            geofenceRadiusMeters: existing.geofenceRadiusMeters,
        });
        return this.prisma.office.update({
            where: { id: existing.id },
            data: {
                name: dto.name !== undefined
                    ? this.normalizeOfficeName(dto.name)
                    : undefined,
                latitude: geofence.latitude,
                longitude: geofence.longitude,
                geofenceRadiusMeters: geofence.geofenceRadiusMeters,
            },
        });
    }
};
exports.OfficesService = OfficesService;
exports.OfficesService = OfficesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tenancy_service_1.TenancyService])
], OfficesService);
//# sourceMappingURL=offices.service.js.map