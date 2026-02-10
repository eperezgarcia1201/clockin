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
exports.EmployeesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const tenancy_service_1 = require("../tenancy/tenancy.service");
const bcryptjs_1 = require("bcryptjs");
let EmployeesService = class EmployeesService {
    prisma;
    tenancy;
    constructor(prisma, tenancy) {
        this.prisma = prisma;
        this.tenancy = tenancy;
    }
    async listEmployees(authUser) {
        const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
        const employees = await this.prisma.employee.findMany({
            where: { tenantId: tenant.id },
            orderBy: { fullName: "asc" },
        });
        return employees.map((employee) => ({
            id: employee.id,
            name: employee.displayName || employee.fullName,
            active: !employee.disabled,
            email: employee.email,
            hourlyRate: employee.hourlyRate,
            officeId: employee.officeId,
            groupId: employee.groupId,
            isAdmin: employee.isAdmin,
            isTimeAdmin: employee.isTimeAdmin,
            isReports: employee.isReports,
        }));
    }
    async createEmployee(authUser, dto) {
        const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
        const pinHash = dto.pin ? await (0, bcryptjs_1.hash)(dto.pin, 10) : null;
        return this.prisma.employee.create({
            data: {
                tenantId: tenant.id,
                fullName: dto.fullName,
                displayName: dto.displayName,
                email: dto.email,
                pinHash,
                hourlyRate: dto.hourlyRate ?? null,
                officeId: dto.officeId || null,
                groupId: dto.groupId || null,
                isAdmin: dto.isAdmin ?? false,
                isTimeAdmin: dto.isTimeAdmin ?? false,
                isReports: dto.isReports ?? false,
                disabled: dto.disabled ?? false,
            },
        });
    }
    async getEmployee(authUser, employeeId) {
        const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
        const employee = await this.prisma.employee.findFirst({
            where: { id: employeeId, tenantId: tenant.id },
        });
        if (!employee) {
            throw new common_1.NotFoundException("Employee not found");
        }
        return {
            id: employee.id,
            fullName: employee.fullName,
            displayName: employee.displayName,
            email: employee.email,
            hourlyRate: employee.hourlyRate,
            officeId: employee.officeId,
            groupId: employee.groupId,
            isAdmin: employee.isAdmin,
            isTimeAdmin: employee.isTimeAdmin,
            isReports: employee.isReports,
            disabled: employee.disabled,
        };
    }
    async updateEmployee(authUser, employeeId, dto) {
        const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
        const existing = await this.prisma.employee.findFirst({
            where: { id: employeeId, tenantId: tenant.id },
        });
        if (!existing) {
            throw new common_1.NotFoundException("Employee not found");
        }
        const data = {};
        if (dto.fullName !== undefined) {
            data.fullName = dto.fullName;
        }
        if (dto.displayName !== undefined) {
            data.displayName = dto.displayName || null;
        }
        if (dto.email !== undefined) {
            data.email = dto.email || null;
        }
        if (dto.hourlyRate !== undefined) {
            data.hourlyRate = dto.hourlyRate ?? null;
        }
        if (dto.officeId !== undefined) {
            data.officeId = dto.officeId || null;
        }
        if (dto.groupId !== undefined) {
            data.groupId = dto.groupId || null;
        }
        if (dto.isAdmin !== undefined) {
            data.isAdmin = dto.isAdmin;
        }
        if (dto.isTimeAdmin !== undefined) {
            data.isTimeAdmin = dto.isTimeAdmin;
        }
        if (dto.isReports !== undefined) {
            data.isReports = dto.isReports;
        }
        if (dto.disabled !== undefined) {
            data.disabled = dto.disabled;
        }
        if (dto.pin !== undefined) {
            data.pinHash = dto.pin ? await (0, bcryptjs_1.hash)(dto.pin, 10) : null;
        }
        return this.prisma.employee.update({
            where: { id: existing.id },
            data,
        });
    }
    async deleteEmployee(authUser, employeeId) {
        const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
        const existing = await this.prisma.employee.findFirst({
            where: { id: employeeId, tenantId: tenant.id },
        });
        if (!existing) {
            throw new common_1.NotFoundException("Employee not found");
        }
        return this.prisma.employee.update({
            where: { id: existing.id },
            data: { disabled: true },
        });
    }
    async getSummary(authUser) {
        const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
        const [total, admins, timeAdmins, reports] = await Promise.all([
            this.prisma.employee.count({ where: { tenantId: tenant.id } }),
            this.prisma.employee.count({
                where: { tenantId: tenant.id, isAdmin: true },
            }),
            this.prisma.employee.count({
                where: { tenantId: tenant.id, isTimeAdmin: true },
            }),
            this.prisma.employee.count({
                where: { tenantId: tenant.id, isReports: true },
            }),
        ]);
        return { total, admins, timeAdmins, reports };
    }
};
exports.EmployeesService = EmployeesService;
exports.EmployeesService = EmployeesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tenancy_service_1.TenancyService])
], EmployeesService);
//# sourceMappingURL=employees.service.js.map