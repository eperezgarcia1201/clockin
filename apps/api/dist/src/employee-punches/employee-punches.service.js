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
exports.EmployeePunchesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const tenancy_service_1 = require("../tenancy/tenancy.service");
const bcryptjs_1 = require("bcryptjs");
let EmployeePunchesService = class EmployeePunchesService {
    prisma;
    tenancy;
    constructor(prisma, tenancy) {
        this.prisma = prisma;
        this.tenancy = tenancy;
    }
    async createPunch(authUser, employeeId, dto) {
        const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId: tenant.id },
        });
        const employee = await this.prisma.employee.findFirst({
            where: { id: employeeId, tenantId: tenant.id },
        });
        if (!employee) {
            throw new common_1.NotFoundException("Employee not found");
        }
        const requirePin = settings?.requirePin ?? true;
        if (requirePin && employee.pinHash) {
            if (!dto.pin) {
                throw new common_1.UnauthorizedException("PIN required.");
            }
            const valid = await (0, bcryptjs_1.compare)(dto.pin, employee.pinHash);
            if (!valid) {
                throw new common_1.UnauthorizedException("Invalid PIN.");
            }
        }
        const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
        return this.prisma.employeePunch.create({
            data: {
                tenantId: tenant.id,
                employeeId: employee.id,
                type: dto.type,
                occurredAt,
                notes: dto.notes,
                ipAddress: dto.ipAddress,
            },
        });
    }
    async getRecent(authUser) {
        const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
        const employees = await this.prisma.employee.findMany({
            where: {
                tenantId: tenant.id,
                disabled: false,
            },
            orderBy: { fullName: "asc" },
            include: {
                office: { select: { name: true } },
                group: { select: { name: true } },
                punches: { orderBy: { occurredAt: "desc" }, take: 1 },
            },
        });
        return {
            rows: employees.map((employee) => {
                const latest = employee.punches[0];
                return {
                    id: employee.id,
                    name: employee.displayName || employee.fullName,
                    status: latest?.type ?? null,
                    occurredAt: latest?.occurredAt
                        ? latest.occurredAt.toISOString()
                        : null,
                    office: employee.office?.name ?? null,
                    group: employee.group?.name ?? null,
                };
            }),
        };
    }
    async listRecords(authUser, options) {
        const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
        const limit = options.limit && options.limit > 0 ? options.limit : 50;
        const offsetMs = (options.tzOffset || 0) * 60 * 1000;
        const occurredAt = {};
        if (options.from) {
            const startUtc = new Date(`${options.from}T00:00:00.000Z`).getTime() - offsetMs;
            occurredAt.gte = new Date(startUtc);
        }
        if (options.to) {
            const endUtc = new Date(`${options.to}T23:59:59.999Z`).getTime() - offsetMs;
            occurredAt.lte = new Date(endUtc);
        }
        const punches = await this.prisma.employeePunch.findMany({
            where: {
                tenantId: tenant.id,
                employeeId: options.employeeId || undefined,
                occurredAt: Object.keys(occurredAt).length ? occurredAt : undefined,
            },
            orderBy: { occurredAt: "desc" },
            take: limit,
            include: {
                employee: {
                    select: {
                        id: true,
                        fullName: true,
                        displayName: true,
                        office: { select: { name: true } },
                        group: { select: { name: true } },
                    },
                },
            },
        });
        return {
            records: punches.map((punch) => ({
                id: punch.id,
                employeeId: punch.employeeId,
                employeeName: punch.employee.displayName || punch.employee.fullName,
                office: punch.employee.office?.name ?? null,
                group: punch.employee.group?.name ?? null,
                type: punch.type,
                occurredAt: punch.occurredAt.toISOString(),
                notes: punch.notes ?? "",
            })),
        };
    }
    async createManual(authUser, dto) {
        const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId: tenant.id },
        });
        if (settings && settings.allowManualTimeEdits === false) {
            throw new common_1.UnauthorizedException("Manual time edits disabled.");
        }
        const employee = await this.prisma.employee.findFirst({
            where: { id: dto.employeeId, tenantId: tenant.id },
        });
        if (!employee) {
            throw new common_1.NotFoundException("Employee not found");
        }
        return this.prisma.employeePunch.create({
            data: {
                tenantId: tenant.id,
                employeeId: employee.id,
                type: dto.type,
                occurredAt: new Date(dto.occurredAt),
                notes: dto.notes,
            },
        });
    }
    async updateRecord(authUser, recordId, dto) {
        const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId: tenant.id },
        });
        if (settings && settings.allowManualTimeEdits === false) {
            throw new common_1.UnauthorizedException("Manual time edits disabled.");
        }
        const existing = await this.prisma.employeePunch.findFirst({
            where: { id: recordId, tenantId: tenant.id },
        });
        if (!existing) {
            throw new common_1.NotFoundException("Record not found");
        }
        return this.prisma.employeePunch.update({
            where: { id: existing.id },
            data: {
                type: dto.type ?? undefined,
                occurredAt: dto.occurredAt
                    ? new Date(dto.occurredAt)
                    : undefined,
                notes: dto.notes ?? undefined,
            },
        });
    }
    async deleteRecord(authUser, recordId) {
        const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId: tenant.id },
        });
        if (settings && settings.allowManualTimeEdits === false) {
            throw new common_1.UnauthorizedException("Manual time edits disabled.");
        }
        const existing = await this.prisma.employeePunch.findFirst({
            where: { id: recordId, tenantId: tenant.id },
        });
        if (!existing) {
            throw new common_1.NotFoundException("Record not found");
        }
        await this.prisma.employeePunch.delete({ where: { id: existing.id } });
        return { ok: true };
    }
};
exports.EmployeePunchesService = EmployeePunchesService;
exports.EmployeePunchesService = EmployeePunchesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tenancy_service_1.TenancyService])
], EmployeePunchesService);
//# sourceMappingURL=employee-punches.service.js.map