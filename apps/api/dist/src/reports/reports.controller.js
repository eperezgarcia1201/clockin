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
const platform_express_1 = require("@nestjs/platform-express");
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
            throw new common_1.BadRequestException('from and to are required (YYYY-MM-DD)');
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
            includeDetails: query.details === '1' || query.details === 'true',
        });
    }
    async dailyReport(req, query) {
        if (!req.user) {
            throw new common_1.UnauthorizedException();
        }
        const from = query.from;
        const to = query.to;
        if (!from || !to) {
            throw new common_1.BadRequestException('from and to are required (YYYY-MM-DD)');
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
            throw new common_1.BadRequestException('from and to are required (YYYY-MM-DD)');
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
            throw new common_1.BadRequestException('from and to are required (YYYY-MM-DD)');
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
    async tipsReport(req, query) {
        if (!req.user) {
            throw new common_1.UnauthorizedException();
        }
        const from = query.from;
        const to = query.to;
        if (!from || !to) {
            throw new common_1.BadRequestException('from and to are required (YYYY-MM-DD)');
        }
        return this.reports.getTipsReport(req.user, {
            from,
            to,
            employeeId: query.employeeId || undefined,
            officeId: query.officeId || undefined,
            groupId: query.groupId || undefined,
        });
    }
    async salesReport(req, query) {
        if (!req.user) {
            throw new common_1.UnauthorizedException();
        }
        const from = query.from;
        const to = query.to;
        if (!from || !to) {
            throw new common_1.BadRequestException('from and to are required (YYYY-MM-DD)');
        }
        return this.reports.getSalesReport(req.user, {
            from,
            to,
        });
    }
    async comparisonReport(req, query) {
        if (!req.user) {
            throw new common_1.UnauthorizedException();
        }
        const periodRaw = typeof query.period === 'string' ? query.period.trim().toLowerCase() : '';
        const period = periodRaw === 'week' || periodRaw === 'month' || periodRaw === 'year'
            ? periodRaw
            : 'month';
        const anchorDate = query.anchorDate || undefined;
        const tzOffset = Number(query.tzOffset ?? 0);
        const weekStartsOn = [0, 1].includes(Number(query.weekStartsOn))
            ? Number(query.weekStartsOn)
            : 1;
        const trendWeeksRaw = Number(query.trendWeeks ?? 8);
        const trendWeeks = Number.isFinite(trendWeeksRaw) ? trendWeeksRaw : 8;
        return this.reports.getComparisonReport(req.user, {
            period,
            anchorDate,
            from: query.from || undefined,
            to: query.to || undefined,
            tzOffset,
            weekStartsOn,
            trendWeeks,
            employeeId: query.employeeId || undefined,
            officeId: query.officeId || undefined,
            groupId: query.groupId || undefined,
        });
    }
    async saveSalesReport(req, body) {
        if (!req.user) {
            throw new common_1.UnauthorizedException();
        }
        const date = typeof body.date === 'string' ? body.date.trim() : '';
        if (!date) {
            throw new common_1.BadRequestException('date is required (YYYY-MM-DD)');
        }
        const parseAmount = (field) => {
            const raw = body[field];
            const value = typeof raw === 'number' ? raw : Number(raw);
            if (!Number.isFinite(value) || value < 0) {
                throw new common_1.BadRequestException(`${field} must be a non-negative number.`);
            }
            return Number(value.toFixed(2));
        };
        const notesValue = body.notes;
        const notes = typeof notesValue === 'string' && notesValue.trim()
            ? notesValue.trim().slice(0, 500)
            : undefined;
        const bankDepositBatchValue = body.bankDepositBatch;
        const bankDepositBatch = typeof bankDepositBatchValue === 'string' && bankDepositBatchValue.trim()
            ? bankDepositBatchValue.trim().slice(0, 80)
            : undefined;
        return this.reports.upsertDailySalesReport(req.user, {
            date,
            foodSales: parseAmount('foodSales'),
            liquorSales: parseAmount('liquorSales'),
            cashPayments: parseAmount('cashPayments'),
            bankDepositBatch,
            checkPayments: parseAmount('checkPayments'),
            creditCardPayments: parseAmount('creditCardPayments'),
            otherPayments: parseAmount('otherPayments'),
            notes,
        });
    }
    async saveDailyExpense(req, body) {
        if (!req.user) {
            throw new common_1.UnauthorizedException();
        }
        const date = typeof body.date === 'string' ? body.date.trim() : '';
        if (!date) {
            throw new common_1.BadRequestException('date is required (YYYY-MM-DD)');
        }
        const companyName = typeof body.companyName === 'string' ? body.companyName.trim() : '';
        if (!companyName) {
            throw new common_1.BadRequestException('companyName is required.');
        }
        const invoiceNumber = typeof body.invoiceNumber === 'string' ? body.invoiceNumber.trim() : '';
        if (!invoiceNumber) {
            throw new common_1.BadRequestException('invoiceNumber is required.');
        }
        const paymentRaw = typeof body.paymentMethod === 'string'
            ? body.paymentMethod.trim().toUpperCase()
            : '';
        if (!Object.values(client_1.ExpensePaymentMethod).includes(paymentRaw)) {
            throw new common_1.BadRequestException('paymentMethod must be CHECK, DEBIT_CARD, or CASH.');
        }
        const paymentMethod = paymentRaw;
        const amountRaw = body.amount;
        const amount = typeof amountRaw === 'number' ? amountRaw : Number(amountRaw);
        if (!Number.isFinite(amount) || amount < 0) {
            throw new common_1.BadRequestException('amount must be a non-negative number.');
        }
        const checkNumber = typeof body.checkNumber === 'string'
            ? body.checkNumber.trim()
            : undefined;
        const payToCompany = typeof body.payToCompany === 'string'
            ? body.payToCompany.trim()
            : undefined;
        const notes = typeof body.notes === 'string' ? body.notes.trim() : undefined;
        return this.reports.createDailyExpense(req.user, {
            date,
            companyName,
            paymentMethod,
            amount: Number(amount.toFixed(2)),
            invoiceNumber,
            checkNumber,
            payToCompany,
            notes,
        });
    }
    async uploadExpenseReceipt(req, expenseId, file) {
        if (!req.user) {
            throw new common_1.UnauthorizedException();
        }
        if (!file?.buffer || !file.mimetype) {
            throw new common_1.BadRequestException('file is required.');
        }
        return this.reports.uploadDailyExpenseReceipt(req.user, expenseId, {
            fileName: file.originalname || 'receipt',
            mimeType: file.mimetype,
            size: file.size || file.buffer.length,
            buffer: file.buffer,
        });
    }
    async getExpenseReceipt(req, expenseId, response) {
        if (!req.user) {
            throw new common_1.UnauthorizedException();
        }
        const receipt = await this.reports.getDailyExpenseReceipt(req.user, expenseId);
        response.setHeader('Content-Type', receipt.mimeType);
        response.setHeader('Content-Disposition', `inline; filename="${sanitizeFilenameForHeader(receipt.fileName)}"`);
        response.setHeader('Cache-Control', 'no-store');
        return new common_1.StreamableFile(receipt.data);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('hours'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "hoursReport", null);
__decorate([
    (0, common_1.Get)('daily'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "dailyReport", null);
__decorate([
    (0, common_1.Get)('payroll'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "payrollReport", null);
__decorate([
    (0, common_1.Get)('audit'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "auditReport", null);
__decorate([
    (0, common_1.Get)('tips'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "tipsReport", null);
__decorate([
    (0, common_1.Get)('sales'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "salesReport", null);
__decorate([
    (0, common_1.Get)('comparison'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "comparisonReport", null);
__decorate([
    (0, common_1.Post)('sales'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "saveSalesReport", null);
__decorate([
    (0, common_1.Post)('sales/expenses'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "saveDailyExpense", null);
__decorate([
    (0, common_1.Post)('sales/expenses/:expenseId/receipt'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('expenseId')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "uploadExpenseReceipt", null);
__decorate([
    (0, common_1.Get)('sales/expenses/:expenseId/receipt'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('expenseId')),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getExpenseReceipt", null);
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.Controller)('reports'),
    (0, common_1.UseGuards)(auth_guard_1.AuthOrDevGuard),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
function sanitizeFilenameForHeader(fileName) {
    return fileName.replace(/["\r\n]/g, '').trim() || 'receipt';
}
//# sourceMappingURL=reports.controller.js.map