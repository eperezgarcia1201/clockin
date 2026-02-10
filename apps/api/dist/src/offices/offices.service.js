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
    async list(authUser) {
        const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
        return this.prisma.office.findMany({
            where: { tenantId: tenant.id },
            orderBy: { name: "asc" },
        });
    }
    async create(authUser, dto) {
        const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
        return this.prisma.office.create({
            data: {
                tenantId: tenant.id,
                name: dto.name,
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