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
let ReportsService = class ReportsService {
    prisma;
    tenancy;
    constructor(prisma, tenancy) {
        this.prisma = prisma;
        this.tenancy = tenancy;
    }
    async getHoursReport(authUser, input) {
        const context = await this.getPunchContext(authUser, input);
        if (!context.reportsEnabled) {
            throw new common_1.ForbiddenException("Reports are disabled.");
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
        const context = await this.getPunchContext(authUser, input);
        if (!context.reportsEnabled) {
            throw new common_1.ForbiddenException("Reports are disabled.");
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
        const context = await this.getPunchContext(authUser, input);
        if (!context.reportsEnabled) {
            throw new common_1.ForbiddenException("Reports are disabled.");
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
        const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId: tenant.id },
        });
        if (settings && settings.reportsEnabled === false) {
            throw new common_1.ForbiddenException("Reports are disabled.");
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
                    officeId: input.officeId,
                    groupId: input.groupId,
                },
            },
            orderBy: { occurredAt: "desc" },
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
                notes: punch.notes ?? "",
            })),
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
                officeId: input.officeId,
                groupId: input.groupId,
            },
            orderBy: { fullName: "asc" },
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
            orderBy: { occurredAt: "asc" },
        });
        const lastBeforeRange = await this.prisma.employeePunch.findMany({
            where: {
                tenantId: tenant.id,
                employeeId: { in: employeeIds },
                occurredAt: { lt: rangeStartDate },
            },
            orderBy: { occurredAt: "desc" },
            distinct: ["employeeId"],
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
function toHoursDecimal(minutes) {
    return Number((minutes / 60).toFixed(2));
}
function formatHoursMinutes(minutes) {
    const rounded = Math.round(minutes);
    const hours = Math.floor(rounded / 60);
    const mins = Math.abs(rounded % 60);
    return `${hours}:${String(mins).padStart(2, "0")}`;
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
    }
    const dayKeys = new Set();
    minutesByDay.forEach((_value, key) => dayKeys.add(key));
    punchesByDay.forEach((_value, key) => dayKeys.add(key));
    const days = Array.from(dayKeys)
        .sort()
        .map((date) => {
        const minutes = minutesByDay.get(date) || 0;
        const roundedMinutes = roundMinutes(minutes, roundTo);
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
//# sourceMappingURL=reports.service.js.map