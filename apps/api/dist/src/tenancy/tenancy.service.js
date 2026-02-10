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
exports.TenancyService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_1 = require("crypto");
const slugify = (value) => value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
let TenancyService = class TenancyService {
    prisma;
    config;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    async requireTenantAndUser(authUser) {
        if (!authUser.tenantExternalId) {
            throw new common_1.UnauthorizedException("Missing tenant claim in token.");
        }
        const defaultRole = this.parseRole(this.config.get("DEFAULT_ROLE") || "EMPLOYEE");
        const tenant = await this.prisma.tenant.upsert({
            where: { authOrgId: authUser.tenantExternalId },
            update: {},
            create: {
                authOrgId: authUser.tenantExternalId,
                name: authUser.tenantName ||
                    `Tenant ${authUser.tenantExternalId.slice(0, 6)}`,
                slug: this.makeTenantSlug(authUser),
            },
        });
        const user = await this.prisma.user.upsert({
            where: { authUserId: authUser.authUserId },
            update: {
                email: authUser.email || "unknown@clockin.local",
                name: authUser.name,
            },
            create: {
                authUserId: authUser.authUserId,
                email: authUser.email || "unknown@clockin.local",
                name: authUser.name,
            },
        });
        const membership = await this.prisma.membership.upsert({
            where: {
                tenantId_userId: {
                    tenantId: tenant.id,
                    userId: user.id,
                },
            },
            update: {},
            create: {
                tenantId: tenant.id,
                userId: user.id,
                role: defaultRole,
            },
        });
        return { tenant, user, membership };
    }
    makeTenantSlug(authUser) {
        const base = slugify(authUser.tenantName || "") || "tenant";
        return `${base}-${(0, crypto_1.randomUUID)().slice(0, 6)}`;
    }
    parseRole(value) {
        if (Object.values(client_1.Role).includes(value)) {
            return value;
        }
        return client_1.Role.EMPLOYEE;
    }
};
exports.TenancyService = TenancyService;
exports.TenancyService = TenancyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], TenancyService);
//# sourceMappingURL=tenancy.service.js.map