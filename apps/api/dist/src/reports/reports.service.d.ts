import { PunchType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TenancyService } from "../tenancy/tenancy.service";
import type { AuthUser } from "../auth/auth.types";
type HoursReportInput = {
    from: string;
    to: string;
    roundMinutes: number;
    tzOffset: number;
    employeeId?: string;
    officeId?: string;
    groupId?: string;
    includeDetails: boolean;
};
type DayHours = {
    date: string;
    minutes: number;
    hoursDecimal: number;
    hoursFormatted: string;
    firstIn?: string | null;
    lastOut?: string | null;
};
export declare class ReportsService {
    private readonly prisma;
    private readonly tenancy;
    constructor(prisma: PrismaService, tenancy: TenancyService);
    getHoursReport(authUser: AuthUser, input: HoursReportInput): Promise<{
        range: {
            from: string;
            to: string;
        };
        roundMinutes: number;
        employees: {
            id: string;
            name: string;
            totalMinutes: number;
            totalHoursDecimal: number;
            totalHoursFormatted: string;
            days: DayHours[];
        }[];
    }>;
    getDailyReport(authUser: AuthUser, input: HoursReportInput): Promise<{
        range: {
            from: string;
            to: string;
        };
        roundMinutes: number;
        employees: {
            id: string;
            name: string;
            totalMinutes: number;
            totalHoursDecimal: number;
            totalHoursFormatted: string;
            days: DayHours[];
        }[];
    }>;
    getPayrollReport(authUser: AuthUser, input: HoursReportInput & {
        weekStartsOn: number;
        overtimeThreshold: number;
    }): Promise<{
        range: {
            from: string;
            to: string;
        };
        roundMinutes: number;
        weekStartsOn: number;
        overtimeThreshold: number;
        employees: never[];
        overtimeMultiplier?: undefined;
    } | {
        range: {
            from: string;
            to: string;
        };
        roundMinutes: number;
        weekStartsOn: number;
        overtimeThreshold: number;
        overtimeMultiplier: number;
        employees: {
            id: string;
            name: string;
            hourlyRate: number;
            totalMinutes: number;
            totalHoursDecimal: number;
            totalHoursFormatted: string;
            totalPay: number;
            weeks: {
                weekStart: string;
                totalMinutes: number;
                totalHoursFormatted: string;
                totalHoursDecimal: number;
                regularMinutes: number;
                regularHoursFormatted: string;
                overtimeMinutes: number;
                overtimeHoursFormatted: string;
                regularPay: number;
                overtimePay: number;
                totalPay: number;
            }[];
        }[];
    }>;
    getAuditReport(authUser: AuthUser, input: {
        from: string;
        to: string;
        tzOffset: number;
        employeeId?: string;
        officeId?: string;
        groupId?: string;
        type?: PunchType;
        limit?: number;
    }): Promise<{
        records: {
            id: string;
            employeeName: string;
            office: string | null;
            group: string | null;
            type: import("@prisma/client").$Enums.PunchType;
            occurredAt: string;
            notes: string;
        }[];
    }>;
    private getPunchContext;
}
export {};
