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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const tenancy_service_1 = require("../tenancy/tenancy.service");
const WORKING_TYPES = new Set([client_1.PunchType.IN]);
const LIQUOR_OUTGOING_TYPES = new Set([
    client_1.LiquorInventoryMovementType.SALE,
    client_1.LiquorInventoryMovementType.WASTE,
    client_1.LiquorInventoryMovementType.ADJUSTMENT_OUT,
    client_1.LiquorInventoryMovementType.TRANSFER_OUT,
]);
const AUTO_SCHEDULE_OUT_TOKEN = '[AUTO_SCHEDULE_OUT]';
const MAX_RECEIPT_SIZE_BYTES = 6 * 1024 * 1024;
const ALLOWED_RECEIPT_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
]);
let ReportsService = class ReportsService {
    prisma;
    tenancy;
    constructor(prisma, tenancy) {
        this.prisma = prisma;
        this.tenancy = tenancy;
    }
    scopedOfficeFilter(officeId) {
        const scopedOfficeId = officeId?.trim() || undefined;
        if (!scopedOfficeId) {
            return {};
        }
        return {
            OR: [{ officeId: scopedOfficeId }, { officeId: null }],
        };
    }
    async getHoursReport(authUser, input) {
        await this.tenancy.requireFeature(authUser, 'reports');
        const context = await this.getPunchContext(authUser, input);
        if (!context.reportsEnabled) {
            throw new common_1.ForbiddenException('Reports are disabled.');
        }
        if (context.employees.length === 0) {
            return {
                range: { from: input.from, to: input.to },
                roundMinutes: input.roundMinutes,
                employees: [],
            };
        }
        const employeesReport = context.employees.map((employee) => {
            const { days, totalMinutes } = buildDailySummary({
                punches: context.punchesByEmployee.get(employee.id) || [],
                before: context.lastBeforeMap.get(employee.id),
                rangeStartUtc: context.rangeStartUtc,
                rangeEndUtc: context.rangeEndUtc,
                offsetMs: context.offsetMs,
                roundTo: input.roundMinutes,
            });
            return {
                id: employee.id,
                name: employee.displayName || employee.fullName,
                totalMinutes,
                totalHoursDecimal: toHoursDecimal(totalMinutes),
                totalHoursFormatted: formatHoursMinutes(totalMinutes),
                days,
            };
        });
        return {
            range: { from: input.from, to: input.to },
            roundMinutes: input.roundMinutes,
            employees: employeesReport,
        };
    }
    async getDailyReport(authUser, input) {
        await this.tenancy.requireFeature(authUser, 'reports');
        const context = await this.getPunchContext(authUser, input);
        if (!context.reportsEnabled) {
            throw new common_1.ForbiddenException('Reports are disabled.');
        }
        if (context.employees.length === 0) {
            return {
                range: { from: input.from, to: input.to },
                roundMinutes: input.roundMinutes,
                employees: [],
            };
        }
        const employeesReport = context.employees.map((employee) => {
            const { days, totalMinutes } = buildDailySummary({
                punches: context.punchesByEmployee.get(employee.id) || [],
                before: context.lastBeforeMap.get(employee.id),
                rangeStartUtc: context.rangeStartUtc,
                rangeEndUtc: context.rangeEndUtc,
                offsetMs: context.offsetMs,
                roundTo: input.roundMinutes,
                includeInOutTimes: true,
            });
            return {
                id: employee.id,
                name: employee.displayName || employee.fullName,
                totalMinutes,
                totalHoursDecimal: toHoursDecimal(totalMinutes),
                totalHoursFormatted: formatHoursMinutes(totalMinutes),
                days,
            };
        });
        return {
            range: { from: input.from, to: input.to },
            roundMinutes: input.roundMinutes,
            employees: employeesReport,
        };
    }
    async getPayrollReport(authUser, input) {
        await this.tenancy.requireFeature(authUser, 'reports');
        const context = await this.getPunchContext(authUser, input);
        if (!context.reportsEnabled) {
            throw new common_1.ForbiddenException('Reports are disabled.');
        }
        if (context.employees.length === 0) {
            return {
                range: { from: input.from, to: input.to },
                roundMinutes: input.roundMinutes,
                weekStartsOn: input.weekStartsOn,
                overtimeThreshold: input.overtimeThreshold,
                employees: [],
            };
        }
        const employeesReport = context.employees.map((employee) => {
            const { days, totalMinutes } = buildDailySummary({
                punches: context.punchesByEmployee.get(employee.id) || [],
                before: context.lastBeforeMap.get(employee.id),
                rangeStartUtc: context.rangeStartUtc,
                rangeEndUtc: context.rangeEndUtc,
                offsetMs: context.offsetMs,
                roundTo: input.roundMinutes,
            });
            const weekMap = new Map();
            for (const day of days) {
                const weekKey = getWeekStart(day.date, input.weekStartsOn);
                weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + day.minutes);
            }
            const hourlyRate = employee.hourlyRate ?? 0;
            const overtimeMultiplier = 1.5;
            const weeks = Array.from(weekMap.entries())
                .sort(([a], [b]) => (a < b ? -1 : 1))
                .map(([weekStart, minutes]) => {
                const thresholdMinutes = input.overtimeThreshold * 60;
                const regularMinutes = Math.min(minutes, thresholdMinutes);
                const overtimeMinutes = Math.max(0, minutes - thresholdMinutes);
                const regularPay = (regularMinutes / 60) * hourlyRate;
                const overtimePay = (overtimeMinutes / 60) * hourlyRate * overtimeMultiplier;
                const totalPay = regularPay + overtimePay;
                return {
                    weekStart,
                    totalMinutes: minutes,
                    totalHoursFormatted: formatHoursMinutes(minutes),
                    totalHoursDecimal: toHoursDecimal(minutes),
                    regularMinutes,
                    regularHoursFormatted: formatHoursMinutes(regularMinutes),
                    overtimeMinutes,
                    overtimeHoursFormatted: formatHoursMinutes(overtimeMinutes),
                    regularPay,
                    overtimePay,
                    totalPay,
                };
            });
            const totalPay = weeks.reduce((sum, week) => sum + week.totalPay, 0);
            return {
                id: employee.id,
                name: employee.displayName || employee.fullName,
                hourlyRate,
                totalMinutes,
                totalHoursDecimal: toHoursDecimal(totalMinutes),
                totalHoursFormatted: formatHoursMinutes(totalMinutes),
                totalPay,
                weeks,
            };
        });
        return {
            range: { from: input.from, to: input.to },
            roundMinutes: input.roundMinutes,
            weekStartsOn: input.weekStartsOn,
            overtimeThreshold: input.overtimeThreshold,
            overtimeMultiplier: 1.5,
            employees: employeesReport,
        };
    }
    async getAuditReport(authUser, input) {
        await this.tenancy.requireFeature(authUser, 'reports');
        const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId: tenant.id },
        });
        if (settings && settings.reportsEnabled === false) {
            throw new common_1.ForbiddenException('Reports are disabled.');
        }
        const offsetMs = (input.tzOffset || 0) * 60 * 1000;
        const rangeStartUtc = new Date(`${input.from}T00:00:00.000Z`).getTime() - offsetMs;
        const rangeEndUtc = new Date(`${input.to}T23:59:59.999Z`).getTime() - offsetMs;
        const punches = await this.prisma.employeePunch.findMany({
            where: {
                tenantId: tenant.id,
                employeeId: input.employeeId,
                type: input.type,
                occurredAt: {
                    gte: new Date(rangeStartUtc),
                    lte: new Date(rangeEndUtc),
                },
                employee: {
                    ...this.scopedOfficeFilter(input.officeId),
                    groupId: input.groupId,
                },
            },
            orderBy: { occurredAt: 'desc' },
            take: input.limit && input.limit > 0 ? input.limit : 200,
            include: {
                employee: {
                    select: {
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
                employeeName: punch.employee.displayName || punch.employee.fullName,
                office: punch.employee.office?.name ?? null,
                group: punch.employee.group?.name ?? null,
                type: punch.type,
                occurredAt: punch.occurredAt.toISOString(),
                notes: punch.notes ?? '',
            })),
        };
    }
    async getTipsReport(authUser, input) {
        await this.tenancy.requireFeature(authUser, 'reports');
        const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId: tenant.id },
        });
        if (settings && settings.reportsEnabled === false) {
            throw new common_1.ForbiddenException('Reports are disabled.');
        }
        const fromUtc = new Date(`${input.from}T00:00:00.000Z`);
        const toUtc = new Date(`${input.to}T00:00:00.000Z`);
        const employees = await this.prisma.employee.findMany({
            where: {
                tenantId: tenant.id,
                id: input.employeeId,
                ...this.scopedOfficeFilter(input.officeId),
                groupId: input.groupId,
                isServer: true,
            },
            orderBy: { fullName: 'asc' },
            select: {
                id: true,
                fullName: true,
                displayName: true,
            },
        });
        if (!employees.length) {
            return {
                range: { from: input.from, to: input.to },
                employees: [],
            };
        }
        const tips = await this.prisma.employeeTip.findMany({
            where: {
                tenantId: tenant.id,
                employeeId: { in: employees.map((employee) => employee.id) },
                workDate: {
                    gte: fromUtc,
                    lte: toUtc,
                },
            },
            orderBy: [{ employeeId: 'asc' }, { workDate: 'asc' }],
        });
        const tipsByEmployee = new Map();
        for (const tip of tips) {
            const list = tipsByEmployee.get(tip.employeeId) || [];
            list.push(tip);
            tipsByEmployee.set(tip.employeeId, list);
        }
        return {
            range: { from: input.from, to: input.to },
            employees: employees.map((employee) => {
                const rows = (tipsByEmployee.get(employee.id) || []).map((tip) => {
                    const cashTips = Number(tip.cashTips.toFixed(2));
                    const creditCardTips = Number(tip.creditCardTips.toFixed(2));
                    return {
                        date: tip.workDate.toISOString().slice(0, 10),
                        cashTips,
                        creditCardTips,
                        totalTips: Number((cashTips + creditCardTips).toFixed(2)),
                    };
                });
                const totals = rows.reduce((acc, row) => {
                    acc.cashTips += row.cashTips;
                    acc.creditCardTips += row.creditCardTips;
                    return acc;
                }, { cashTips: 0, creditCardTips: 0 });
                return {
                    id: employee.id,
                    name: employee.displayName || employee.fullName,
                    totalCashTips: Number(totals.cashTips.toFixed(2)),
                    totalCreditCardTips: Number(totals.creditCardTips.toFixed(2)),
                    totalTips: Number((totals.cashTips + totals.creditCardTips).toFixed(2)),
                    days: rows,
                };
            }),
        };
    }
    async getSalesReport(authUser, input) {
        await this.tenancy.requireAnyFeature(authUser, ['reports', 'salesCapture']);
        const { tenant } = await this.requireDailySalesReporting(authUser);
        const fromUtc = parseIsoDateOnly(input.from, 'from');
        const toUtc = parseIsoDateOnly(input.to, 'to');
        if (fromUtc.getTime() > toUtc.getTime()) {
            throw new common_1.BadRequestException('from must be less than or equal to to.');
        }
        const toExclusiveUtc = new Date(toUtc);
        toExclusiveUtc.setUTCDate(toExclusiveUtc.getUTCDate() + 1);
        const reports = await this.prisma.dailySalesReport.findMany({
            where: {
                tenantId: tenant.id,
                reportDate: {
                    gte: fromUtc,
                    lt: toExclusiveUtc,
                },
            },
            orderBy: { reportDate: 'desc' },
            include: {
                submittedBy: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });
        const expenses = await this.prisma.dailyExpense.findMany({
            where: {
                tenantId: tenant.id,
                expenseDate: {
                    gte: fromUtc,
                    lt: toExclusiveUtc,
                },
            },
            orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
            select: {
                id: true,
                expenseDate: true,
                companyName: true,
                paymentMethod: true,
                invoiceNumber: true,
                amount: true,
                checkNumber: true,
                payToCompany: true,
                notes: true,
                receiptUploadedAt: true,
                createdAt: true,
                updatedAt: true,
                submittedBy: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });
        const rows = reports.map((report) => this.toDailySalesReportRow(report));
        const expenseRows = expenses.map((expense) => this.toDailyExpenseRow(expense));
        const totals = rows.reduce((acc, row) => {
            acc.foodSales += row.foodSales;
            acc.liquorSales += row.liquorSales;
            acc.totalSales += row.totalSales;
            acc.cashPayments += row.cashPayments;
            acc.checkPayments += row.checkPayments;
            acc.creditCardPayments += row.creditCardPayments;
            acc.otherPayments += row.otherPayments;
            acc.totalPayments += row.totalPayments;
            return acc;
        }, {
            foodSales: 0,
            liquorSales: 0,
            totalSales: 0,
            cashPayments: 0,
            checkPayments: 0,
            creditCardPayments: 0,
            otherPayments: 0,
            totalPayments: 0,
        });
        const expenseTotals = expenseRows.reduce((acc, row) => {
            acc.totalExpenses += row.amount;
            if (row.paymentMethod === client_1.ExpensePaymentMethod.CASH) {
                acc.cashExpenses += row.amount;
            }
            else if (row.paymentMethod === client_1.ExpensePaymentMethod.DEBIT_CARD) {
                acc.debitCardExpenses += row.amount;
            }
            else if (row.paymentMethod === client_1.ExpensePaymentMethod.CHECK) {
                acc.checkExpenses += row.amount;
            }
            return acc;
        }, {
            totalExpenses: 0,
            cashExpenses: 0,
            debitCardExpenses: 0,
            checkExpenses: 0,
        });
        const totalSales = toMoney(totals.totalSales);
        const totalPayments = toMoney(totals.totalPayments);
        return {
            range: { from: input.from, to: input.to },
            totals: {
                foodSales: toMoney(totals.foodSales),
                liquorSales: toMoney(totals.liquorSales),
                totalSales,
                cashPayments: toMoney(totals.cashPayments),
                checkPayments: toMoney(totals.checkPayments),
                creditCardPayments: toMoney(totals.creditCardPayments),
                otherPayments: toMoney(totals.otherPayments),
                totalPayments,
                balance: toMoney(totalSales - totalPayments),
            },
            reports: rows,
            expenseTotals: {
                totalExpenses: toMoney(expenseTotals.totalExpenses),
                cashExpenses: toMoney(expenseTotals.cashExpenses),
                debitCardExpenses: toMoney(expenseTotals.debitCardExpenses),
                checkExpenses: toMoney(expenseTotals.checkExpenses),
            },
            expenses: expenseRows,
        };
    }
    async getComparisonReport(authUser, input) {
        await this.tenancy.requireFeature(authUser, 'reports');
        const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId: tenant.id },
            select: {
                reportsEnabled: true,
                timezone: true,
                liquorInventoryEnabled: true,
            },
        });
        if (settings && settings.reportsEnabled === false) {
            throw new common_1.ForbiddenException('Reports are disabled.');
        }
        const timezone = settings?.timezone || 'America/New_York';
        const weekStartsOn = input.weekStartsOn === 0 ? 0 : 1;
        const trendWeeks = Math.min(Math.max(Math.round(input.trendWeeks || 8), 4), 26);
        const hasExplicitRange = Boolean(input.from?.trim() || input.to?.trim());
        let currentRange;
        let previousRange;
        let anchorDate;
        if (hasExplicitRange) {
            if (!input.from?.trim() || !input.to?.trim()) {
                throw new common_1.BadRequestException('from and to must both be provided when using a custom date range.');
            }
            currentRange = {
                from: parseIsoDateOnly(input.from, 'from').toISOString().slice(0, 10),
                to: parseIsoDateOnly(input.to, 'to').toISOString().slice(0, 10),
            };
            if (currentRange.from > currentRange.to) {
                throw new common_1.BadRequestException('from must be less than or equal to to.');
            }
            previousRange = buildPreviousRangeMatching(currentRange);
            anchorDate = currentRange.to;
        }
        else {
            anchorDate = input.anchorDate?.trim()
                ? parseIsoDateOnly(input.anchorDate, 'anchorDate')
                    .toISOString()
                    .slice(0, 10)
                : getDateKeyInTimeZone(new Date(), timezone);
            const periods = buildComparisonRanges(input.period, anchorDate);
            currentRange = periods.current;
            previousRange = periods.previous;
        }
        const trendEndWeekStart = getWeekStart(currentRange.to, weekStartsOn);
        const trendRange = {
            from: addDaysToDateKey(trendEndWeekStart, -(trendWeeks - 1) * 7),
            to: addDaysToDateKey(trendEndWeekStart, 6),
        };
        const sourceRange = mergeRanges([currentRange, previousRange, trendRange]);
        const context = await this.getPunchContext(authUser, {
            from: sourceRange.from,
            to: sourceRange.to,
            tzOffset: input.tzOffset,
            employeeId: input.employeeId,
            officeId: input.officeId,
            groupId: input.groupId,
        });
        if (!context.reportsEnabled) {
            throw new common_1.ForbiddenException('Reports are disabled.');
        }
        const employeeSummaries = new Map();
        const dailyLaborCurrent = new Map();
        const dailyLaborPrevious = new Map();
        const dailyPunchCurrent = new Map();
        for (const employee of context.employees) {
            const summary = buildDailySummary({
                punches: context.punchesByEmployee.get(employee.id) || [],
                before: context.lastBeforeMap.get(employee.id),
                rangeStartUtc: context.rangeStartUtc,
                rangeEndUtc: context.rangeEndUtc,
                offsetMs: context.offsetMs,
                roundTo: 0,
            });
            const hourlyRate = employee.hourlyRate ?? 0;
            const employeeSummary = {
                employeeId: employee.id,
                name: employee.displayName || employee.fullName,
                currentMinutes: 0,
                previousMinutes: 0,
                currentWages: 0,
                previousWages: 0,
                currentTips: 0,
                previousTips: 0,
                currentPunches: 0,
                currentPunchIn: 0,
                currentPunchOut: 0,
                currentPunchBreak: 0,
                currentPunchLunch: 0,
                weekly: new Map(),
            };
            for (const day of summary.days) {
                const weekKey = getWeekStart(day.date, weekStartsOn);
                const existingWeek = employeeSummary.weekly.get(weekKey) || {
                    minutes: 0,
                    wages: 0,
                    tips: 0,
                };
                existingWeek.minutes += day.minutes;
                existingWeek.wages += (day.minutes / 60) * hourlyRate;
                employeeSummary.weekly.set(weekKey, existingWeek);
                if (isDateInRange(day.date, currentRange)) {
                    employeeSummary.currentMinutes += day.minutes;
                    employeeSummary.currentWages += (day.minutes / 60) * hourlyRate;
                    const existingDay = dailyLaborCurrent.get(day.date) || {
                        minutes: 0,
                        wages: 0,
                        employees: new Set(),
                    };
                    existingDay.minutes += day.minutes;
                    existingDay.wages += (day.minutes / 60) * hourlyRate;
                    existingDay.employees.add(employee.id);
                    dailyLaborCurrent.set(day.date, existingDay);
                }
                if (isDateInRange(day.date, previousRange)) {
                    employeeSummary.previousMinutes += day.minutes;
                    employeeSummary.previousWages += (day.minutes / 60) * hourlyRate;
                    const existingDay = dailyLaborPrevious.get(day.date) || {
                        minutes: 0,
                        wages: 0,
                        employees: new Set(),
                    };
                    existingDay.minutes += day.minutes;
                    existingDay.wages += (day.minutes / 60) * hourlyRate;
                    existingDay.employees.add(employee.id);
                    dailyLaborPrevious.set(day.date, existingDay);
                }
            }
            const employeePunches = context.punchesByEmployee.get(employee.id) || [];
            for (const punch of employeePunches) {
                const dateKey = dayKeyFromUtc(punch.occurredAt.getTime(), context.offsetMs);
                if (!isDateInRange(dateKey, currentRange)) {
                    continue;
                }
                employeeSummary.currentPunches += 1;
                if (punch.type === client_1.PunchType.IN) {
                    employeeSummary.currentPunchIn += 1;
                }
                else if (punch.type === client_1.PunchType.OUT) {
                    employeeSummary.currentPunchOut += 1;
                }
                else if (punch.type === client_1.PunchType.BREAK) {
                    employeeSummary.currentPunchBreak += 1;
                }
                else if (punch.type === client_1.PunchType.LUNCH) {
                    employeeSummary.currentPunchLunch += 1;
                }
                const punchDay = dailyPunchCurrent.get(dateKey) || {
                    punches: 0,
                    employees: new Set(),
                };
                punchDay.punches += 1;
                punchDay.employees.add(employee.id);
                dailyPunchCurrent.set(dateKey, punchDay);
            }
            employeeSummaries.set(employee.id, employeeSummary);
        }
        const sourceFromUtc = parseIsoDateOnly(sourceRange.from, 'from');
        const sourceToUtcExclusive = parseIsoDateOnly(sourceRange.to, 'to');
        sourceToUtcExclusive.setUTCDate(sourceToUtcExclusive.getUTCDate() + 1);
        const employeeIds = context.employees.map((employee) => employee.id);
        const tipsByDateCurrent = new Map();
        const tipsByDatePrevious = new Map();
        if (employeeIds.length > 0) {
            const tipsRows = await this.prisma.employeeTip.findMany({
                where: {
                    tenantId: tenant.id,
                    employeeId: { in: employeeIds },
                    workDate: {
                        gte: sourceFromUtc,
                        lt: sourceToUtcExclusive,
                    },
                },
                select: {
                    employeeId: true,
                    workDate: true,
                    cashTips: true,
                    creditCardTips: true,
                },
            });
            for (const tipRow of tipsRows) {
                const summary = employeeSummaries.get(tipRow.employeeId);
                if (!summary) {
                    continue;
                }
                const dateKey = tipRow.workDate.toISOString().slice(0, 10);
                const totalTips = toMoney(tipRow.cashTips + tipRow.creditCardTips);
                const weekKey = getWeekStart(dateKey, weekStartsOn);
                const existingWeek = summary.weekly.get(weekKey) || {
                    minutes: 0,
                    wages: 0,
                    tips: 0,
                };
                existingWeek.tips += totalTips;
                summary.weekly.set(weekKey, existingWeek);
                if (isDateInRange(dateKey, currentRange)) {
                    summary.currentTips += totalTips;
                    tipsByDateCurrent.set(dateKey, (tipsByDateCurrent.get(dateKey) || 0) + totalTips);
                }
                if (isDateInRange(dateKey, previousRange)) {
                    summary.previousTips += totalTips;
                    tipsByDatePrevious.set(dateKey, (tipsByDatePrevious.get(dateKey) || 0) + totalTips);
                }
            }
        }
        const salesRows = await this.prisma.dailySalesReport.findMany({
            where: {
                tenantId: tenant.id,
                reportDate: {
                    gte: sourceFromUtc,
                    lt: sourceToUtcExclusive,
                },
            },
            select: {
                reportDate: true,
                foodSales: true,
                liquorSales: true,
            },
        });
        const expenseRows = await this.prisma.dailyExpense.findMany({
            where: {
                tenantId: tenant.id,
                expenseDate: {
                    gte: sourceFromUtc,
                    lt: sourceToUtcExclusive,
                },
            },
            select: {
                expenseDate: true,
                amount: true,
                paymentMethod: true,
            },
        });
        let currentSales = 0;
        let previousSales = 0;
        let currentExpenses = 0;
        let previousExpenses = 0;
        const weeklySales = new Map();
        const weeklyExpenses = new Map();
        const currentSalesByDate = new Map();
        const previousSalesByDate = new Map();
        const currentExpensesByDate = new Map();
        const previousExpensesByDate = new Map();
        for (const row of salesRows) {
            const dateKey = row.reportDate.toISOString().slice(0, 10);
            const foodSales = toMoney(row.foodSales);
            const liquorSales = toMoney(row.liquorSales);
            const totalSales = toMoney(row.foodSales + row.liquorSales);
            const weekKey = getWeekStart(dateKey, weekStartsOn);
            weeklySales.set(weekKey, (weeklySales.get(weekKey) || 0) + totalSales);
            if (isDateInRange(dateKey, currentRange)) {
                currentSales += totalSales;
                const currentDay = currentSalesByDate.get(dateKey) || {
                    foodSales: 0,
                    liquorSales: 0,
                    totalSales: 0,
                };
                currentDay.foodSales += foodSales;
                currentDay.liquorSales += liquorSales;
                currentDay.totalSales += totalSales;
                currentSalesByDate.set(dateKey, currentDay);
            }
            if (isDateInRange(dateKey, previousRange)) {
                previousSales += totalSales;
                const previousDay = previousSalesByDate.get(dateKey) || {
                    foodSales: 0,
                    liquorSales: 0,
                    totalSales: 0,
                };
                previousDay.foodSales += foodSales;
                previousDay.liquorSales += liquorSales;
                previousDay.totalSales += totalSales;
                previousSalesByDate.set(dateKey, previousDay);
            }
        }
        for (const row of expenseRows) {
            const dateKey = row.expenseDate.toISOString().slice(0, 10);
            const amount = toMoney(row.amount);
            const weekKey = getWeekStart(dateKey, weekStartsOn);
            weeklyExpenses.set(weekKey, (weeklyExpenses.get(weekKey) || 0) + amount);
            if (isDateInRange(dateKey, currentRange)) {
                currentExpenses += amount;
                const currentDay = currentExpensesByDate.get(dateKey) || {
                    totalExpenses: 0,
                    expenseCount: 0,
                    cashExpenses: 0,
                    debitCardExpenses: 0,
                    checkExpenses: 0,
                };
                currentDay.totalExpenses += amount;
                currentDay.expenseCount += 1;
                if (row.paymentMethod === client_1.ExpensePaymentMethod.CASH) {
                    currentDay.cashExpenses += amount;
                }
                else if (row.paymentMethod === client_1.ExpensePaymentMethod.DEBIT_CARD) {
                    currentDay.debitCardExpenses += amount;
                }
                else if (row.paymentMethod === client_1.ExpensePaymentMethod.CHECK) {
                    currentDay.checkExpenses += amount;
                }
                currentExpensesByDate.set(dateKey, currentDay);
            }
            if (isDateInRange(dateKey, previousRange)) {
                previousExpenses += amount;
                const previousDay = previousExpensesByDate.get(dateKey) || {
                    totalExpenses: 0,
                    expenseCount: 0,
                    cashExpenses: 0,
                    debitCardExpenses: 0,
                    checkExpenses: 0,
                };
                previousDay.totalExpenses += amount;
                previousDay.expenseCount += 1;
                if (row.paymentMethod === client_1.ExpensePaymentMethod.CASH) {
                    previousDay.cashExpenses += amount;
                }
                else if (row.paymentMethod === client_1.ExpensePaymentMethod.DEBIT_CARD) {
                    previousDay.debitCardExpenses += amount;
                }
                else if (row.paymentMethod === client_1.ExpensePaymentMethod.CHECK) {
                    previousDay.checkExpenses += amount;
                }
                previousExpensesByDate.set(dateKey, previousDay);
            }
        }
        const employeeStats = Array.from(employeeSummaries.values()).map((row) => {
            const currentHours = toHoursDecimal(row.currentMinutes);
            const previousHours = toHoursDecimal(row.previousMinutes);
            const currentWages = toMoney(row.currentWages);
            const previousWages = toMoney(row.previousWages);
            const currentTips = toMoney(row.currentTips);
            const previousTips = toMoney(row.previousTips);
            const deltaMinutes = row.currentMinutes - row.previousMinutes;
            return {
                employeeId: row.employeeId,
                name: row.name,
                currentMinutes: Math.round(row.currentMinutes),
                previousMinutes: Math.round(row.previousMinutes),
                currentHours,
                previousHours,
                currentWages,
                previousWages,
                currentTips,
                previousTips,
                deltaMinutes: Math.round(deltaMinutes),
                deltaHours: toHoursDecimal(deltaMinutes),
                deltaWages: toMoney(currentWages - previousWages),
                deltaTips: toMoney(currentTips - previousTips),
            };
        });
        const currentTotals = this.buildComparisonTotals(employeeStats, 'current', currentSales, currentExpenses);
        const previousTotals = this.buildComparisonTotals(employeeStats, 'previous', previousSales, previousExpenses);
        const weekStarts = buildWeekStartSeries(trendRange, weekStartsOn);
        const weekly = weekStarts.map((weekStart) => {
            const weekEnd = addDaysToDateKey(weekStart, 6);
            const workers = employeeStats
                .map((employee) => {
                const weeklyRow = employeeSummaries.get(employee.employeeId)?.weekly.get(weekStart) ||
                    null;
                if (!weeklyRow || weeklyRow.minutes <= 0) {
                    return null;
                }
                return {
                    employeeId: employee.employeeId,
                    name: employee.name,
                    minutes: Math.round(weeklyRow.minutes),
                    hours: toHoursDecimal(weeklyRow.minutes),
                    wages: toMoney(weeklyRow.wages),
                    tips: toMoney(weeklyRow.tips),
                };
            })
                .filter((worker) => Boolean(worker))
                .sort((a, b) => b.minutes - a.minutes);
            const laborMinutes = workers.reduce((sum, worker) => sum + worker.minutes, 0);
            const wages = workers.reduce((sum, worker) => sum + worker.wages, 0);
            const tips = workers.reduce((sum, worker) => sum + worker.tips, 0);
            const sales = toMoney(weeklySales.get(weekStart) || 0);
            const expenses = toMoney(weeklyExpenses.get(weekStart) || 0);
            return {
                weekStart,
                weekEnd,
                laborMinutes: Math.round(laborMinutes),
                laborHours: toHoursDecimal(laborMinutes),
                wages: toMoney(wages),
                tips: toMoney(tips),
                sales,
                expenses,
                net: toMoney(sales - expenses),
                leader: workers[0] || null,
            };
        });
        const leadersCurrent = [...employeeStats]
            .sort((a, b) => b.currentMinutes - a.currentMinutes)
            .slice(0, 10);
        const leadersPrevious = [...employeeStats]
            .sort((a, b) => b.previousMinutes - a.previousMinutes)
            .slice(0, 10);
        const changes = [...employeeStats]
            .sort((a, b) => Math.abs(b.deltaMinutes) - Math.abs(a.deltaMinutes))
            .slice(0, 10);
        const currentDateSeries = buildDateSeries(currentRange.from, currentRange.to);
        const previousDateSeries = buildDateSeries(previousRange.from, previousRange.to);
        const employeeActivityDaily = currentDateSeries.map((date) => {
            const labor = dailyLaborCurrent.get(date);
            const punch = dailyPunchCurrent.get(date);
            const employeeIds = new Set();
            labor?.employees.forEach((employeeId) => employeeIds.add(employeeId));
            punch?.employees.forEach((employeeId) => employeeIds.add(employeeId));
            return {
                date,
                laborHours: toHoursDecimal(labor?.minutes || 0),
                estimatedWages: toMoney(labor?.wages || 0),
                punches: punch?.punches || 0,
                activeEmployees: employeeIds.size,
            };
        });
        const payrollDailyCurrent = currentDateSeries.map((date) => {
            const labor = dailyLaborCurrent.get(date);
            const wages = toMoney(labor?.wages || 0);
            const tips = toMoney(tipsByDateCurrent.get(date) || 0);
            return {
                date,
                laborHours: toHoursDecimal(labor?.minutes || 0),
                wages,
                tips,
                totalComp: toMoney(wages + tips),
                employeeCount: labor?.employees.size || 0,
            };
        });
        const payrollDailyPrevious = previousDateSeries.map((date) => {
            const labor = dailyLaborPrevious.get(date);
            const wages = toMoney(labor?.wages || 0);
            const tips = toMoney(tipsByDatePrevious.get(date) || 0);
            return {
                date,
                laborHours: toHoursDecimal(labor?.minutes || 0),
                wages,
                tips,
                totalComp: toMoney(wages + tips),
                employeeCount: labor?.employees.size || 0,
            };
        });
        const highestPayrollCurrent = maxBy(payrollDailyCurrent, (row) => row.wages) || null;
        const highestPayrollPrevious = maxBy(payrollDailyPrevious, (row) => row.wages) || null;
        const salesDailyCurrent = currentDateSeries.map((date) => {
            const row = currentSalesByDate.get(date);
            return {
                date,
                foodSales: toMoney(row?.foodSales || 0),
                liquorSales: toMoney(row?.liquorSales || 0),
                totalSales: toMoney(row?.totalSales || 0),
            };
        });
        const salesDailyPrevious = previousDateSeries.map((date) => {
            const row = previousSalesByDate.get(date);
            return {
                date,
                foodSales: toMoney(row?.foodSales || 0),
                liquorSales: toMoney(row?.liquorSales || 0),
                totalSales: toMoney(row?.totalSales || 0),
            };
        });
        const highestSalesCurrent = maxBy(salesDailyCurrent, (row) => row.totalSales) || null;
        const highestSalesPrevious = maxBy(salesDailyPrevious, (row) => row.totalSales) || null;
        const expensesDailyCurrent = currentDateSeries.map((date) => {
            const row = currentExpensesByDate.get(date);
            return {
                date,
                totalExpenses: toMoney(row?.totalExpenses || 0),
                expenseCount: row?.expenseCount || 0,
                cashExpenses: toMoney(row?.cashExpenses || 0),
                debitCardExpenses: toMoney(row?.debitCardExpenses || 0),
                checkExpenses: toMoney(row?.checkExpenses || 0),
            };
        });
        const expensesDailyPrevious = previousDateSeries.map((date) => {
            const row = previousExpensesByDate.get(date);
            return {
                date,
                totalExpenses: toMoney(row?.totalExpenses || 0),
                expenseCount: row?.expenseCount || 0,
                cashExpenses: toMoney(row?.cashExpenses || 0),
                debitCardExpenses: toMoney(row?.debitCardExpenses || 0),
                checkExpenses: toMoney(row?.checkExpenses || 0),
            };
        });
        const highestExpenseCurrent = maxBy(expensesDailyCurrent, (row) => row.totalExpenses) || null;
        const highestExpensePrevious = maxBy(expensesDailyPrevious, (row) => row.totalExpenses) || null;
        let liquorCurrentQuantity = 0;
        let liquorPreviousQuantity = 0;
        let liquorCurrentCost = 0;
        let liquorPreviousCost = 0;
        const liquorByItem = new Map();
        const liquorByDate = new Map();
        if (settings?.liquorInventoryEnabled) {
            const movementRows = await this.prisma.liquorInventoryMovement.findMany({
                where: {
                    tenantId: tenant.id,
                    officeId: input.officeId || undefined,
                    occurredAt: {
                        gte: sourceFromUtc,
                        lt: sourceToUtcExclusive,
                    },
                },
                select: {
                    itemId: true,
                    type: true,
                    quantity: true,
                    unitCostOverride: true,
                    occurredAt: true,
                    item: {
                        select: {
                            name: true,
                            supplierName: true,
                            brand: true,
                            unitCost: true,
                        },
                    },
                },
            });
            for (const movement of movementRows) {
                if (!LIQUOR_OUTGOING_TYPES.has(movement.type)) {
                    continue;
                }
                const dateKey = movement.occurredAt.toISOString().slice(0, 10);
                const quantity = toQuantity(movement.quantity || 0);
                const costPerUnit = movement.unitCostOverride !== null
                    ? movement.unitCostOverride
                    : movement.item.unitCost;
                const cost = toMoney(quantity * costPerUnit);
                const existing = liquorByItem.get(movement.itemId) || {
                    itemId: movement.itemId,
                    itemName: movement.item.name,
                    company: movement.item.supplierName || 'Unknown',
                    kind: movement.item.brand || '',
                    currentQuantity: 0,
                    previousQuantity: 0,
                    currentCost: 0,
                    previousCost: 0,
                };
                if (isDateInRange(dateKey, currentRange)) {
                    existing.currentQuantity += quantity;
                    existing.currentCost += cost;
                    liquorCurrentQuantity += quantity;
                    liquorCurrentCost += cost;
                    const day = liquorByDate.get(dateKey) || { quantity: 0, cost: 0 };
                    day.quantity += quantity;
                    day.cost += cost;
                    liquorByDate.set(dateKey, day);
                }
                if (isDateInRange(dateKey, previousRange)) {
                    existing.previousQuantity += quantity;
                    existing.previousCost += cost;
                    liquorPreviousQuantity += quantity;
                    liquorPreviousCost += cost;
                }
                liquorByItem.set(movement.itemId, existing);
            }
        }
        const liquorTopConsumed = Array.from(liquorByItem.values())
            .map((row) => ({
            itemId: row.itemId,
            itemName: row.itemName,
            company: row.company,
            kind: row.kind,
            currentQuantity: toQuantity(row.currentQuantity),
            previousQuantity: toQuantity(row.previousQuantity),
            deltaQuantity: toQuantity(row.currentQuantity - row.previousQuantity),
            currentCost: toMoney(row.currentCost),
            previousCost: toMoney(row.previousCost),
            deltaCost: toMoney(row.currentCost - row.previousCost),
        }))
            .sort((a, b) => b.currentQuantity - a.currentQuantity)
            .slice(0, 15);
        const liquorDaily = currentDateSeries.map((date) => {
            const row = liquorByDate.get(date);
            return {
                date,
                quantity: toQuantity(row?.quantity || 0),
                cost: toMoney(row?.cost || 0),
            };
        });
        const highlights = [];
        if (leadersCurrent[0]) {
            highlights.push(`${leadersCurrent[0].name} logged the most hours in the selected range (${leadersCurrent[0].currentHours.toFixed(2)}h).`);
        }
        if (leadersPrevious[0]) {
            highlights.push(`${leadersPrevious[0].name} led the previous range (${leadersPrevious[0].previousHours.toFixed(2)}h).`);
        }
        const largestChange = changes[0];
        if (largestChange) {
            const direction = largestChange.deltaHours >= 0 ? 'increased' : 'decreased';
            highlights.push(`${largestChange.name} ${direction} by ${Math.abs(largestChange.deltaHours).toFixed(2)}h versus the previous range.`);
        }
        if (highestPayrollCurrent) {
            highlights.push(`Highest payroll date in current range: ${highestPayrollCurrent.date} (${toMoney(highestPayrollCurrent.wages)} wages).`);
        }
        if (highestSalesCurrent) {
            highlights.push(`Highest daily sales date in current range: ${highestSalesCurrent.date} (${toMoney(highestSalesCurrent.totalSales)} total sales).`);
        }
        if (highestExpenseCurrent) {
            highlights.push(`Highest daily expense date in current range: ${highestExpenseCurrent.date} (${toMoney(highestExpenseCurrent.totalExpenses)} expenses).`);
        }
        if (settings?.liquorInventoryEnabled && liquorTopConsumed[0]) {
            highlights.push(`Most consumed liquor item: ${liquorTopConsumed[0].itemName} (${liquorTopConsumed[0].currentQuantity} units in current range).`);
        }
        highlights.push(`Sales are ${trendDirectionLabel(currentTotals.sales - previousTotals.sales)} by ${Math.abs(currentTotals.sales - previousTotals.sales).toFixed(2)} compared with the previous range.`);
        highlights.push(`Expenses are ${trendDirectionLabel(currentTotals.expenses - previousTotals.expenses)} by ${Math.abs(currentTotals.expenses - previousTotals.expenses).toFixed(2)} compared with the previous range.`);
        return {
            generatedAt: new Date().toISOString(),
            period: {
                type: input.period,
                anchorDate,
                current: currentRange,
                previous: previousRange,
                isCustomRange: hasExplicitRange,
            },
            totals: {
                current: currentTotals,
                previous: previousTotals,
                delta: buildTotalsDelta(currentTotals, previousTotals),
            },
            employees: {
                currentLeaders: leadersCurrent,
                previousLeaders: leadersPrevious,
                changes,
            },
            employeeActivity: {
                daily: employeeActivityDaily,
                topByPunches: [...employeeStats]
                    .map((employee) => {
                    const summary = employeeSummaries.get(employee.employeeId);
                    return {
                        employeeId: employee.employeeId,
                        name: employee.name,
                        punches: summary?.currentPunches || 0,
                        inPunches: summary?.currentPunchIn || 0,
                        outPunches: summary?.currentPunchOut || 0,
                        breakPunches: summary?.currentPunchBreak || 0,
                        lunchPunches: summary?.currentPunchLunch || 0,
                        hours: employee.currentHours,
                        wages: employee.currentWages,
                        tips: employee.currentTips,
                    };
                })
                    .sort((a, b) => b.punches - a.punches)
                    .slice(0, 20),
            },
            payroll: {
                currentDaily: payrollDailyCurrent,
                previousDaily: payrollDailyPrevious,
                highestCurrentDate: highestPayrollCurrent,
                highestPreviousDate: highestPayrollPrevious,
            },
            salesComparison: {
                currentDaily: salesDailyCurrent,
                previousDaily: salesDailyPrevious,
                highestCurrentDate: highestSalesCurrent,
                highestPreviousDate: highestSalesPrevious,
            },
            expensesComparison: {
                currentDaily: expensesDailyCurrent,
                previousDaily: expensesDailyPrevious,
                highestCurrentDate: highestExpenseCurrent,
                highestPreviousDate: highestExpensePrevious,
            },
            liquor: {
                enabled: Boolean(settings?.liquorInventoryEnabled),
                summary: {
                    currentQuantity: toQuantity(liquorCurrentQuantity),
                    previousQuantity: toQuantity(liquorPreviousQuantity),
                    deltaQuantity: toQuantity(liquorCurrentQuantity - liquorPreviousQuantity),
                    currentCost: toMoney(liquorCurrentCost),
                    previousCost: toMoney(liquorPreviousCost),
                    deltaCost: toMoney(liquorCurrentCost - liquorPreviousCost),
                },
                topConsumed: liquorTopConsumed,
                byDate: liquorDaily,
            },
            trend: {
                weekStartsOn,
                weeks: trendWeeks,
                range: trendRange,
                weekly,
            },
            highlights,
            notes: [
                input.officeId
                    ? 'Labor and tips are scoped by selected location. Sales and daily expenses are tenant-wide. Liquor is scoped by selected location.'
                    : 'Labor and tips reflect all matched employees. Sales and daily expenses are tenant-wide.',
            ],
        };
    }
    buildComparisonTotals(employeeStats, period, sales, expenses) {
        const laborMinutes = employeeStats.reduce((sum, row) => sum + (period === 'current' ? row.currentMinutes : row.previousMinutes), 0);
        const estimatedWages = employeeStats.reduce((sum, row) => sum + (period === 'current' ? row.currentWages : row.previousWages), 0);
        const tips = employeeStats.reduce((sum, row) => sum + (period === 'current' ? row.currentTips : row.previousTips), 0);
        return {
            laborMinutes: Math.round(laborMinutes),
            laborHours: toHoursDecimal(laborMinutes),
            estimatedWages: toMoney(estimatedWages),
            tips: toMoney(tips),
            sales: toMoney(sales),
            expenses: toMoney(expenses),
            net: toMoney(sales - expenses),
        };
    }
    async upsertDailySalesReport(authUser, input) {
        await this.tenancy.requireFeature(authUser, 'salesCapture');
        const { tenant, user, membership, settings } = await this.requireDailySalesReporting(authUser);
        const reportDate = parseIsoDateOnly(input.date, 'date');
        const reportDateKey = reportDate.toISOString().slice(0, 10);
        const todayKey = getDateKeyInTimeZone(new Date(), settings.timezone);
        const hasOverridePermission = this.canOverrideDailySalesDateLock(membership.role);
        if (reportDateKey !== todayKey && !hasOverridePermission) {
            throw new common_1.ForbiddenException(`Daily sales reports are locked to today's date (${todayKey}). Ask an admin to authorize modifications for other dates.`);
        }
        const row = await this.prisma.dailySalesReport.upsert({
            where: {
                tenantId_reportDate: {
                    tenantId: tenant.id,
                    reportDate,
                },
            },
            update: {
                foodSales: input.foodSales,
                liquorSales: input.liquorSales,
                cashPayments: input.cashPayments,
                bankDepositBatch: input.bankDepositBatch?.trim().slice(0, 80) || null,
                checkPayments: input.checkPayments,
                creditCardPayments: input.creditCardPayments,
                otherPayments: input.otherPayments,
                notes: input.notes || null,
                submittedByUserId: user.id,
            },
            create: {
                tenantId: tenant.id,
                reportDate,
                foodSales: input.foodSales,
                liquorSales: input.liquorSales,
                cashPayments: input.cashPayments,
                bankDepositBatch: input.bankDepositBatch?.trim().slice(0, 80) || null,
                checkPayments: input.checkPayments,
                creditCardPayments: input.creditCardPayments,
                otherPayments: input.otherPayments,
                notes: input.notes || null,
                submittedByUserId: user.id,
            },
            include: {
                submittedBy: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });
        const report = this.toDailySalesReportRow(row);
        return {
            ok: true,
            report,
        };
    }
    async createDailyExpense(authUser, input) {
        await this.tenancy.requireFeature(authUser, 'salesCapture');
        const { tenant, user } = await this.requireDailySalesReporting(authUser);
        const expenseDate = parseIsoDateOnly(input.date, 'date');
        const companyName = input.companyName.trim();
        if (!companyName) {
            throw new common_1.BadRequestException('companyName is required.');
        }
        const invoiceNumber = input.invoiceNumber.trim();
        if (!invoiceNumber) {
            throw new common_1.BadRequestException('invoiceNumber is required.');
        }
        if (!Number.isFinite(input.amount) || input.amount < 0) {
            throw new common_1.BadRequestException('amount must be a non-negative number.');
        }
        const checkNumber = input.checkNumber?.trim() || '';
        const payToCompany = input.payToCompany?.trim() || '';
        if (input.paymentMethod === client_1.ExpensePaymentMethod.CHECK) {
            if (!checkNumber) {
                throw new common_1.BadRequestException('checkNumber is required when payment method is CHECK.');
            }
            if (!payToCompany) {
                throw new common_1.BadRequestException('payToCompany is required when payment method is CHECK.');
            }
        }
        const row = await this.prisma.dailyExpense.create({
            data: {
                tenantId: tenant.id,
                expenseDate,
                companyName: companyName.slice(0, 160),
                paymentMethod: input.paymentMethod,
                amount: toMoney(input.amount),
                invoiceNumber: invoiceNumber.slice(0, 80),
                checkNumber: input.paymentMethod === client_1.ExpensePaymentMethod.CHECK
                    ? checkNumber.slice(0, 40)
                    : null,
                payToCompany: input.paymentMethod === client_1.ExpensePaymentMethod.CHECK
                    ? payToCompany.slice(0, 160)
                    : null,
                notes: input.notes?.trim().slice(0, 500) || null,
                submittedByUserId: user.id,
            },
            select: {
                id: true,
                expenseDate: true,
                companyName: true,
                paymentMethod: true,
                invoiceNumber: true,
                amount: true,
                checkNumber: true,
                payToCompany: true,
                notes: true,
                receiptUploadedAt: true,
                createdAt: true,
                updatedAt: true,
                submittedBy: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });
        return {
            ok: true,
            expense: this.toDailyExpenseRow(row),
        };
    }
    async uploadDailyExpenseReceipt(authUser, expenseId, input) {
        await this.tenancy.requireFeature(authUser, 'salesCapture');
        const { tenant } = await this.requireDailySalesReporting(authUser);
        const trimmedExpenseId = expenseId.trim();
        if (!trimmedExpenseId) {
            throw new common_1.BadRequestException('expenseId is required.');
        }
        if (!input.buffer || input.buffer.length === 0) {
            throw new common_1.BadRequestException('Receipt file is required.');
        }
        if (input.size > MAX_RECEIPT_SIZE_BYTES) {
            throw new common_1.PayloadTooLargeException('Receipt file is too large. Max size is 6 MB.');
        }
        const mimeType = input.mimeType.trim().toLowerCase();
        if (!ALLOWED_RECEIPT_MIME_TYPES.has(mimeType)) {
            throw new common_1.UnsupportedMediaTypeException('Unsupported file type. Allowed types: JPG, PNG, WEBP, PDF.');
        }
        const existing = await this.prisma.dailyExpense.findFirst({
            where: {
                id: trimmedExpenseId,
                tenantId: tenant.id,
            },
            select: { id: true },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Expense not found.');
        }
        const row = await this.prisma.dailyExpense.update({
            where: { id: existing.id },
            data: {
                receiptData: input.buffer,
                receiptMimeType: mimeType.slice(0, 120),
                receiptFileName: (input.fileName || 'receipt').trim().slice(0, 180),
                receiptUploadedAt: new Date(),
            },
            select: {
                id: true,
                expenseDate: true,
                companyName: true,
                paymentMethod: true,
                invoiceNumber: true,
                amount: true,
                checkNumber: true,
                payToCompany: true,
                notes: true,
                receiptUploadedAt: true,
                createdAt: true,
                updatedAt: true,
                submittedBy: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });
        return {
            ok: true,
            expense: this.toDailyExpenseRow(row),
        };
    }
    async getDailyExpenseReceipt(authUser, expenseId) {
        await this.tenancy.requireFeature(authUser, 'salesCapture');
        const { tenant } = await this.requireDailySalesReporting(authUser);
        const trimmedExpenseId = expenseId.trim();
        if (!trimmedExpenseId) {
            throw new common_1.BadRequestException('expenseId is required.');
        }
        const expense = await this.prisma.dailyExpense.findFirst({
            where: {
                id: trimmedExpenseId,
                tenantId: tenant.id,
            },
            select: {
                id: true,
                expenseDate: true,
                receiptData: true,
                receiptMimeType: true,
                receiptFileName: true,
            },
        });
        if (!expense) {
            throw new common_1.NotFoundException('Expense not found.');
        }
        if (!expense.receiptData || !expense.receiptMimeType) {
            throw new common_1.NotFoundException('Receipt not found for this expense.');
        }
        const fallbackName = `expense-${expense.expenseDate
            .toISOString()
            .slice(0, 10)}.${extensionFromMimeType(expense.receiptMimeType)}`;
        return {
            mimeType: expense.receiptMimeType,
            fileName: expense.receiptFileName?.trim() || fallbackName,
            data: expense.receiptData,
        };
    }
    async requireDailySalesReporting(authUser) {
        const context = await this.tenancy.requireTenantAndUser(authUser);
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId: context.tenant.id },
            select: {
                reportsEnabled: true,
                dailySalesReportingEnabled: true,
                timezone: true,
            },
        });
        if (settings?.reportsEnabled === false) {
            throw new common_1.ForbiddenException('Reports are disabled.');
        }
        if (!(settings?.dailySalesReportingEnabled ?? false)) {
            throw new common_1.ForbiddenException('Daily sales reporting is disabled for this tenant.');
        }
        return {
            ...context,
            settings: {
                reportsEnabled: settings?.reportsEnabled ?? true,
                dailySalesReportingEnabled: settings?.dailySalesReportingEnabled ?? false,
                timezone: settings?.timezone || 'America/New_York',
            },
        };
    }
    canOverrideDailySalesDateLock(role) {
        return role === client_1.Role.OWNER || role === client_1.Role.ADMIN;
    }
    toDailySalesReportRow(report) {
        const foodSales = toMoney(report.foodSales);
        const liquorSales = toMoney(report.liquorSales);
        const cashPayments = toMoney(report.cashPayments);
        const checkPayments = toMoney(report.checkPayments);
        const creditCardPayments = toMoney(report.creditCardPayments);
        const otherPayments = toMoney(report.otherPayments);
        const totalSales = toMoney(foodSales + liquorSales);
        const totalPayments = toMoney(cashPayments + checkPayments + creditCardPayments + otherPayments);
        return {
            id: report.id,
            date: report.reportDate.toISOString().slice(0, 10),
            foodSales,
            liquorSales,
            totalSales,
            cashPayments,
            bankDepositBatch: report.bankDepositBatch || '',
            checkPayments,
            creditCardPayments,
            otherPayments,
            totalPayments,
            balance: toMoney(totalSales - totalPayments),
            notes: report.notes || '',
            submittedBy: report.submittedBy?.name || report.submittedBy?.email || null,
            submittedAt: report.updatedAt.toISOString(),
            createdAt: report.createdAt.toISOString(),
            updatedAt: report.updatedAt.toISOString(),
        };
    }
    toDailyExpenseRow(expense) {
        return {
            id: expense.id,
            date: expense.expenseDate.toISOString().slice(0, 10),
            companyName: expense.companyName,
            paymentMethod: expense.paymentMethod,
            invoiceNumber: expense.invoiceNumber,
            amount: toMoney(expense.amount),
            checkNumber: expense.checkNumber || null,
            payToCompany: expense.payToCompany || null,
            hasReceipt: Boolean(expense.receiptUploadedAt),
            notes: expense.notes || '',
            submittedBy: expense.submittedBy?.name || expense.submittedBy?.email || null,
            submittedAt: expense.updatedAt.toISOString(),
            createdAt: expense.createdAt.toISOString(),
            updatedAt: expense.updatedAt.toISOString(),
        };
    }
    async getPunchContext(authUser, input) {
        const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId: tenant.id },
        });
        const offsetMs = (input.tzOffset || 0) * 60 * 1000;
        const rangeStartUtc = new Date(`${input.from}T00:00:00.000Z`).getTime() - offsetMs;
        const rangeEndUtc = new Date(`${input.to}T23:59:59.999Z`).getTime() - offsetMs;
        const employees = await this.prisma.employee.findMany({
            where: {
                tenantId: tenant.id,
                id: input.employeeId,
                ...this.scopedOfficeFilter(input.officeId),
                groupId: input.groupId,
            },
            orderBy: { fullName: 'asc' },
        });
        if (employees.length === 0) {
            return {
                tenant,
                employees,
                punchesByEmployee: new Map(),
                lastBeforeMap: new Map(),
                offsetMs,
                rangeStartUtc,
                rangeEndUtc,
                reportsEnabled: settings?.reportsEnabled ?? true,
            };
        }
        const employeeIds = employees.map((employee) => employee.id);
        const rangeStartDate = new Date(rangeStartUtc);
        const rangeEndDate = new Date(rangeEndUtc);
        const punchesInRange = await this.prisma.employeePunch.findMany({
            where: {
                tenantId: tenant.id,
                employeeId: { in: employeeIds },
                occurredAt: { gte: rangeStartDate, lte: rangeEndDate },
            },
            orderBy: { occurredAt: 'asc' },
        });
        const lastBeforeRange = await this.prisma.employeePunch.findMany({
            where: {
                tenantId: tenant.id,
                employeeId: { in: employeeIds },
                occurredAt: { lt: rangeStartDate },
            },
            orderBy: { occurredAt: 'desc' },
            distinct: ['employeeId'],
        });
        const lastBeforeMap = new Map(lastBeforeRange.map((punch) => [punch.employeeId, punch]));
        const punchesByEmployee = new Map();
        for (const punch of punchesInRange) {
            const list = punchesByEmployee.get(punch.employeeId) || [];
            list.push(punch);
            punchesByEmployee.set(punch.employeeId, list);
        }
        return {
            tenant,
            employees,
            punchesByEmployee,
            lastBeforeMap,
            offsetMs,
            rangeStartUtc,
            rangeEndUtc,
            reportsEnabled: settings?.reportsEnabled ?? true,
        };
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tenancy_service_1.TenancyService])
], ReportsService);
function getDateKeyInTimeZone(date, timeZone) {
    try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        const parts = formatter.formatToParts(date);
        const year = parts.find((part) => part.type === 'year')?.value;
        const month = parts.find((part) => part.type === 'month')?.value;
        const day = parts.find((part) => part.type === 'day')?.value;
        if (year && month && day) {
            return `${year}-${month}-${day}`;
        }
    }
    catch {
    }
    return date.toISOString().slice(0, 10);
}
function extensionFromMimeType(mimeType) {
    switch (mimeType) {
        case 'image/jpeg':
            return 'jpg';
        case 'image/png':
            return 'png';
        case 'image/webp':
            return 'webp';
        case 'application/pdf':
            return 'pdf';
        default:
            return 'bin';
    }
}
function dayKeyFromUtc(timestamp, offsetMs) {
    const local = new Date(timestamp + offsetMs);
    return local.toISOString().slice(0, 10);
}
function nextDayStartUtc(timestamp, offsetMs) {
    const dayKey = dayKeyFromUtc(timestamp, offsetMs);
    const dayStartUtc = new Date(`${dayKey}T00:00:00.000Z`).getTime() - offsetMs;
    return dayStartUtc + 24 * 60 * 60 * 1000;
}
function roundMinutes(minutes, roundTo) {
    if (!roundTo) {
        return Math.round(minutes * 100) / 100;
    }
    return Math.round(minutes / roundTo) * roundTo;
}
function toMoney(value) {
    return Number(value.toFixed(2));
}
function toQuantity(value) {
    return Number(value.toFixed(3));
}
function parseIsoDateOnly(raw, field) {
    const value = raw.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new common_1.BadRequestException(`${field} must be in YYYY-MM-DD format.`);
    }
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== value) {
        throw new common_1.BadRequestException(`${field} is not a valid date.`);
    }
    return parsed;
}
function toHoursDecimal(minutes) {
    return Number((minutes / 60).toFixed(2));
}
function formatHoursMinutes(minutes) {
    const rounded = Math.round(minutes);
    const hours = Math.floor(rounded / 60);
    const mins = Math.abs(rounded % 60);
    return `${hours}:${String(mins).padStart(2, '0')}`;
}
function buildDailySummary({ punches, before, rangeStartUtc, rangeEndUtc, offsetMs, roundTo, includeInOutTimes, }) {
    const intervals = [];
    let currentStart = null;
    if (before && WORKING_TYPES.has(before.type)) {
        currentStart = rangeStartUtc;
    }
    for (const punch of punches) {
        const timestamp = punch.occurredAt.getTime();
        const isWorking = WORKING_TYPES.has(punch.type);
        if (isWorking) {
            if (currentStart === null) {
                currentStart = timestamp;
            }
        }
        else if (currentStart !== null) {
            if (timestamp > currentStart) {
                intervals.push({ start: currentStart, end: timestamp });
            }
            currentStart = null;
        }
    }
    if (currentStart !== null && rangeEndUtc > currentStart) {
        intervals.push({ start: currentStart, end: rangeEndUtc });
    }
    const minutesByDay = new Map();
    const penaltyByDay = new Map();
    for (const interval of intervals) {
        let cursor = interval.start;
        while (cursor < interval.end) {
            const dayKey = dayKeyFromUtc(cursor, offsetMs);
            const dayEndUtc = nextDayStartUtc(cursor, offsetMs);
            const segmentEnd = Math.min(interval.end, dayEndUtc);
            const minutes = (segmentEnd - cursor) / 60000;
            minutesByDay.set(dayKey, (minutesByDay.get(dayKey) || 0) + minutes);
            cursor = segmentEnd;
        }
    }
    const punchesByDay = new Map();
    for (const punch of punches) {
        const dayKey = dayKeyFromUtc(punch.occurredAt.getTime(), offsetMs);
        const list = punchesByDay.get(dayKey) || [];
        list.push(punch);
        punchesByDay.set(dayKey, list);
        if (punch.type !== client_1.PunchType.OUT || !punch.notes) {
            continue;
        }
        if (!punch.notes.includes(AUTO_SCHEDULE_OUT_TOKEN)) {
            continue;
        }
        const penaltyMatch = /\[PENALTY_MINUTES:(\d+)\]/i.exec(punch.notes);
        if (!penaltyMatch) {
            continue;
        }
        const penaltyMinutes = Number(penaltyMatch[1] || '0');
        if (!Number.isFinite(penaltyMinutes) || penaltyMinutes <= 0) {
            continue;
        }
        penaltyByDay.set(dayKey, (penaltyByDay.get(dayKey) || 0) + penaltyMinutes);
    }
    const dayKeys = new Set();
    minutesByDay.forEach((_value, key) => dayKeys.add(key));
    punchesByDay.forEach((_value, key) => dayKeys.add(key));
    const days = Array.from(dayKeys)
        .sort()
        .map((date) => {
        const minutes = minutesByDay.get(date) || 0;
        const penaltyMinutes = penaltyByDay.get(date) || 0;
        const adjustedMinutes = Math.max(0, minutes - penaltyMinutes);
        const roundedMinutes = roundMinutes(adjustedMinutes, roundTo);
        let firstIn = null;
        let lastOut = null;
        if (includeInOutTimes) {
            const dayPunches = punchesByDay.get(date) || [];
            const firstInPunch = dayPunches.find((punch) => punch.type === client_1.PunchType.IN);
            const lastOutPunch = [...dayPunches]
                .reverse()
                .find((punch) => punch.type !== client_1.PunchType.IN);
            firstIn = firstInPunch?.occurredAt.toISOString() ?? null;
            lastOut = lastOutPunch?.occurredAt.toISOString() ?? null;
        }
        return {
            date,
            minutes: roundedMinutes,
            hoursDecimal: toHoursDecimal(roundedMinutes),
            hoursFormatted: formatHoursMinutes(roundedMinutes),
            firstIn,
            lastOut,
        };
    });
    const totalMinutes = days.reduce((sum, day) => sum + day.minutes, 0);
    return { days, totalMinutes };
}
function getWeekStart(dateKey, weekStartsOn) {
    const start = Number.isFinite(weekStartsOn) ? weekStartsOn : 1;
    const date = new Date(`${dateKey}T00:00:00.000Z`);
    const day = date.getUTCDay();
    const diff = (day - start + 7) % 7;
    date.setUTCDate(date.getUTCDate() - diff);
    return date.toISOString().slice(0, 10);
}
function isDateInRange(dateKey, range) {
    return dateKey >= range.from && dateKey <= range.to;
}
function addDaysToDateKey(dateKey, days) {
    const date = new Date(`${dateKey}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}
function mergeRanges(ranges) {
    const from = ranges
        .map((range) => range.from)
        .sort((a, b) => (a < b ? -1 : 1))[0];
    const to = ranges
        .map((range) => range.to)
        .sort((a, b) => (a < b ? 1 : -1))[0];
    return { from, to };
}
function buildPreviousRangeMatching(current) {
    const days = diffDaysInclusive(current.from, current.to);
    const previousTo = addDaysToDateKey(current.from, -1);
    const previousFrom = addDaysToDateKey(previousTo, -(days - 1));
    return {
        from: previousFrom,
        to: previousTo,
    };
}
function buildDateSeries(from, to) {
    const dates = [];
    let cursor = from;
    while (cursor <= to) {
        dates.push(cursor);
        cursor = addDaysToDateKey(cursor, 1);
    }
    return dates;
}
function diffDaysInclusive(from, to) {
    const fromMs = new Date(`${from}T00:00:00.000Z`).getTime();
    const toMs = new Date(`${to}T00:00:00.000Z`).getTime();
    const diff = Math.round((toMs - fromMs) / (24 * 60 * 60 * 1000));
    return diff + 1;
}
function maxBy(rows, score) {
    let winner;
    let maxScore = Number.NEGATIVE_INFINITY;
    for (const row of rows) {
        const value = score(row);
        if (value > maxScore) {
            maxScore = value;
            winner = row;
        }
    }
    return winner;
}
function buildComparisonRanges(period, anchorDate) {
    const anchor = new Date(`${anchorDate}T00:00:00.000Z`);
    switch (period) {
        case 'week': {
            const current = {
                from: addDaysToDateKey(anchorDate, -6),
                to: anchorDate,
            };
            const previous = {
                from: addDaysToDateKey(current.from, -7),
                to: addDaysToDateKey(current.from, -1),
            };
            return { current, previous };
        }
        case 'year': {
            const year = anchor.getUTCFullYear();
            const current = {
                from: `${year}-01-01`,
                to: `${year}-12-31`,
            };
            const previous = {
                from: `${year - 1}-01-01`,
                to: `${year - 1}-12-31`,
            };
            return { current, previous };
        }
        case 'month':
        default: {
            const year = anchor.getUTCFullYear();
            const month = anchor.getUTCMonth();
            const currentStart = new Date(Date.UTC(year, month, 1));
            const currentEnd = new Date(Date.UTC(year, month + 1, 0));
            const previousStart = new Date(Date.UTC(year, month - 1, 1));
            const previousEnd = new Date(Date.UTC(year, month, 0));
            const current = {
                from: currentStart.toISOString().slice(0, 10),
                to: currentEnd.toISOString().slice(0, 10),
            };
            const previous = {
                from: previousStart.toISOString().slice(0, 10),
                to: previousEnd.toISOString().slice(0, 10),
            };
            return { current, previous };
        }
    }
}
function buildWeekStartSeries(range, weekStartsOn) {
    const firstWeek = getWeekStart(range.from, weekStartsOn);
    const starts = [];
    let cursor = firstWeek;
    while (cursor <= range.to) {
        starts.push(cursor);
        cursor = addDaysToDateKey(cursor, 7);
    }
    return starts;
}
function buildTotalsDelta(current, previous) {
    return {
        laborHours: deltaWithPercent(current.laborHours, previous.laborHours),
        estimatedWages: deltaWithPercent(current.estimatedWages, previous.estimatedWages),
        tips: deltaWithPercent(current.tips, previous.tips),
        sales: deltaWithPercent(current.sales, previous.sales),
        expenses: deltaWithPercent(current.expenses, previous.expenses),
        net: deltaWithPercent(current.net, previous.net),
    };
}
function deltaWithPercent(current, previous) {
    const delta = toMoney(current - previous);
    if (previous === 0) {
        return {
            delta,
            percent: current === 0 ? 0 : null,
        };
    }
    return {
        delta,
        percent: toMoney((delta / previous) * 100),
    };
}
function trendDirectionLabel(value) {
    if (Math.abs(value) < 0.005) {
        return 'flat';
    }
    return value > 0 ? 'up' : 'down';
}
//# sourceMappingURL=reports.service.js.map