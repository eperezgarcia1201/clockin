import type { RequestWithUser } from "../auth/auth.types";
import { ReportsService } from "./reports.service";
export declare class ReportsController {
    private readonly reports;
    constructor(reports: ReportsService);
    hoursReport(req: RequestWithUser, query: Record<string, string>): Promise<{
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
            days: {
                date: string;
                minutes: number;
                hoursDecimal: number;
                hoursFormatted: string;
                firstIn?: string | null;
                lastOut?: string | null;
            }[];
        }[];
    }>;
    dailyReport(req: RequestWithUser, query: Record<string, string>): Promise<{
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
            days: {
                date: string;
                minutes: number;
                hoursDecimal: number;
                hoursFormatted: string;
                firstIn?: string | null;
                lastOut?: string | null;
            }[];
        }[];
    }>;
    payrollReport(req: RequestWithUser, query: Record<string, string>): Promise<{
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
    auditReport(req: RequestWithUser, query: Record<string, string>): Promise<{
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
}
