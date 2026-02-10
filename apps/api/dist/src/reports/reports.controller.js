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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const auth_guard_1 = require("../auth/auth.guard");
const reports_service_1 = require("./reports.service");
let ReportsController = class ReportsController {
    reports;
    constructor(reports) {
        this.reports = reports;
    }
    async hoursReport(req, query) {
        if (!req.user) {
            throw new common_1.UnauthorizedException();
        }
        const from = query.from;
        const to = query.to;
        if (!from || !to) {
            throw new common_1.BadRequestException("from and to are required (YYYY-MM-DD)");
        }
        const roundMinutes = Number(query.round ?? 0);
        const tzOffset = Number(query.tzOffset ?? 0);
        const round = [0, 5, 10, 15, 20, 30].includes(roundMinutes)
            ? roundMinutes
            : 0;
        return this.reports.getHoursReport(req.user, {
            from,
            to,
            roundMinutes: round,
            tzOffset,
            employeeId: query.employeeId || undefined,
            officeId: query.officeId || undefined,
            groupId: query.groupId || undefined,
            includeDetails: query.details === "1" || query.details === "true",
        });
    }
    async dailyReport(req, query) {
        if (!req.user) {
            throw new common_1.UnauthorizedException();
        }
        const from = query.from;
        const to = query.to;
        if (!from || !to) {
            throw new common_1.BadRequestException("from and to are required (YYYY-MM-DD)");
        }
        const roundMinutes = Number(query.round ?? 0);
        const tzOffset = Number(query.tzOffset ?? 0);
        const round = [0, 5, 10, 15, 20, 30].includes(roundMinutes)
            ? roundMinutes
            : 0;
        return this.reports.getDailyReport(req.user, {
            from,
            to,
            roundMinutes: round,
            tzOffset,
            employeeId: query.employeeId || undefined,
            officeId: query.officeId || undefined,
            groupId: query.groupId || undefined,
            includeDetails: true,
        });
    }
    async payrollReport(req, query) {
        if (!req.user) {
            throw new common_1.UnauthorizedException();
        }
        const from = query.from;
        const to = query.to;
        if (!from || !to) {
            throw new common_1.BadRequestException("from and to are required (YYYY-MM-DD)");
        }
        const roundMinutes = Number(query.round ?? 0);
        const tzOffset = Number(query.tzOffset ?? 0);
        const round = [0, 5, 10, 15, 20, 30].includes(roundMinutes)
            ? roundMinutes
            : 0;
        const weekStartsOn = [0, 1].includes(Number(query.weekStartsOn))
            ? Number(query.weekStartsOn)
            : 1;
        const overtimeThreshold = Number(query.overtimeThreshold ?? 40) || 40;
        return this.reports.getPayrollReport(req.user, {
            from,
            to,
            roundMinutes: round,
            tzOffset,
            employeeId: query.employeeId || undefined,
            officeId: query.officeId || undefined,
            groupId: query.groupId || undefined,
            includeDetails: false,
            weekStartsOn,
            overtimeThreshold,
        });
    }
    async auditReport(req, query) {
        if (!req.user) {
            throw new common_1.UnauthorizedException();
        }
        const from = query.from;
        const to = query.to;
        if (!from || !to) {
            throw new common_1.BadRequestException("from and to are required (YYYY-MM-DD)");
        }
        const tzOffset = Number(query.tzOffset ?? 0);
        const limit = Number(query.limit ?? 200);
        const type = query.type && Object.values(client_1.PunchType).includes(query.type)
            ? query.type
            : undefined;
        return this.reports.getAuditReport(req.user, {
            from,
            to,
            tzOffset,
            employeeId: query.employeeId || undefined,
            officeId: query.officeId || undefined,
            groupId: query.groupId || undefined,
            type,
            limit,
        });
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)("hours"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "hoursReport", null);
__decorate([
    (0, common_1.Get)("daily"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "dailyReport", null);
__decorate([
    (0, common_1.Get)("payroll"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "payrollReport", null);
__decorate([
    (0, common_1.Get)("audit"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "auditReport", null);
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.Controller)("reports"),
    (0, common_1.UseGuards)(auth_guard_1.AuthOrDevGuard),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map