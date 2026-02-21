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
exports.StatusesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const tenancy_service_1 = require("../tenancy/tenancy.service");
let StatusesService = class StatusesService {
    prisma;
    tenancy;
    constructor(prisma, tenancy) {
        this.prisma = prisma;
        this.tenancy = tenancy;
    }
    async list(authUser) {
        const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
        return this.prisma.punchStatus.findMany({
            where: { tenantId: tenant.id },
            orderBy: { label: "asc" },
        });
    }
    async create(authUser, dto) {
        const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
        return this.prisma.punchStatus.create({
            data: {
                tenantId: tenant.id,
                label: dto.label,
                color: dto.color || "#2a4d8f",
                isIn: dto.isIn ?? false,
            },
        });
    }
};
exports.StatusesService = StatusesService;
exports.StatusesService = StatusesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tenancy_service_1.TenancyService])
], StatusesService);
//# sourceMappingURL=statuses.service.js.map