import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import type { AuthUser } from '../auth/auth.types';
import type { CreateEmployeePunchDto } from './dto/create-employee-punch.dto';
import type { ManualEmployeePunchDto } from './dto/manual-employee-punch.dto';
import type { UpdateEmployeePunchDto } from './dto/update-employee-punch.dto';
import { NotificationsService } from '../notifications/notifications.service';
export declare class EmployeePunchesService {
    private readonly prisma;
    private readonly tenancy;
    private readonly notifications;
    constructor(prisma: PrismaService, tenancy: TenancyService, notifications: NotificationsService);
    private scopedOfficeFilter;
    createPunch(authUser: AuthUser, employeeId: string, dto: CreateEmployeePunchDto): Promise<{
        managerMessage: {
            id: string;
            subject: string;
            message: string;
            fromName: string | null;
            createdAt: string;
        } | null;
        id: string;
        createdAt: Date;
        tenantId: string;
        latitude: number | null;
        longitude: number | null;
        notes: string | null;
        employeeId: string;
        type: import("@prisma/client").$Enums.PunchType;
        occurredAt: Date;
        ipAddress: string | null;
    }>;
    getRecent(authUser: AuthUser, options?: {
        officeId?: string;
    }): Promise<{
        rows: {
            id: string;
            name: string;
            status: import("@prisma/client").$Enums.PunchType;
            occurredAt: string | null;
            office: string | null;
            group: string | null;
        }[];
    }>;
    listRecords(authUser: AuthUser, options: {
        employeeId?: string;
        limit?: number;
        from?: string;
        to?: string;
        tzOffset?: number;
        officeId?: string;
    }): Promise<{
        records: {
            id: string;
            employeeId: string;
            employeeName: string;
            office: string | null;
            group: string | null;
            type: import("@prisma/client").$Enums.PunchType;
            occurredAt: string;
            notes: string;
            latitude: number | null;
            longitude: number | null;
        }[];
    }>;
    createManual(authUser: AuthUser, dto: ManualEmployeePunchDto): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        latitude: number | null;
        longitude: number | null;
        notes: string | null;
        employeeId: string;
        type: import("@prisma/client").$Enums.PunchType;
        occurredAt: Date;
        ipAddress: string | null;
    }>;
    updateRecord(authUser: AuthUser, recordId: string, dto: UpdateEmployeePunchDto): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        latitude: number | null;
        longitude: number | null;
        notes: string | null;
        employeeId: string;
        type: import("@prisma/client").$Enums.PunchType;
        occurredAt: Date;
        ipAddress: string | null;
    }>;
    deleteRecord(authUser: AuthUser, recordId: string): Promise<{
        ok: boolean;
    }>;
    approveScheduleOverride(authUser: AuthUser, requestId: string): Promise<{
        request: {
            id: string;
            employeeId: string;
            employeeName: string | null;
            workDate: string;
            attemptedAt: string;
            reason: import("@prisma/client").$Enums.ScheduleOverrideReason;
            reasonMessage: string | null;
            status: import("@prisma/client").$Enums.ScheduleOverrideStatus;
            approvedAt: string | null;
            rejectedAt: string | null;
            consumedAt: string | null;
            createdAt: string;
            updatedAt: string;
        };
        autoClockIn?: undefined;
    } | {
        request: {
            id: string;
            employeeId: string;
            employeeName: string | null;
            workDate: string;
            attemptedAt: string;
            reason: import("@prisma/client").$Enums.ScheduleOverrideReason;
            reasonMessage: string | null;
            status: import("@prisma/client").$Enums.ScheduleOverrideStatus;
            approvedAt: string | null;
            rejectedAt: string | null;
            consumedAt: string | null;
            createdAt: string;
            updatedAt: string;
        };
        autoClockIn: {
            clockedIn: boolean;
            alreadyActive: boolean;
            occurredAt: string;
            punchId?: undefined;
        } | {
            clockedIn: boolean;
            alreadyActive: boolean;
            punchId: string;
            occurredAt: string;
        } | null;
    }>;
    rejectScheduleOverride(authUser: AuthUser, requestId: string): Promise<{
        request: {
            id: string;
            employeeId: string;
            employeeName: string | null;
            workDate: string;
            attemptedAt: string;
            reason: import("@prisma/client").$Enums.ScheduleOverrideReason;
            reasonMessage: string | null;
            status: import("@prisma/client").$Enums.ScheduleOverrideStatus;
            approvedAt: string | null;
            rejectedAt: string | null;
            consumedAt: string | null;
            createdAt: string;
            updatedAt: string;
        };
        autoClockIn?: undefined;
    } | {
        request: {
            id: string;
            employeeId: string;
            employeeName: string | null;
            workDate: string;
            attemptedAt: string;
            reason: import("@prisma/client").$Enums.ScheduleOverrideReason;
            reasonMessage: string | null;
            status: import("@prisma/client").$Enums.ScheduleOverrideStatus;
            approvedAt: string | null;
            rejectedAt: string | null;
            consumedAt: string | null;
            createdAt: string;
            updatedAt: string;
        };
        autoClockIn: {
            clockedIn: boolean;
            alreadyActive: boolean;
            occurredAt: string;
            punchId?: undefined;
        } | {
            clockedIn: boolean;
            alreadyActive: boolean;
            punchId: string;
            occurredAt: string;
        } | null;
    }>;
    private resolveScheduleOverride;
    private autoClockInApprovedOverride;
    private serializeScheduleOverride;
    private updateScheduleOverrideNotificationState;
    private getLocalDayInfo;
    private parseTime;
    private toLocalDateKey;
    private enforceServerTipBeforeClockOut;
    private autoClockOutAfterSchedule;
    private enforcePendingAutoClockOutTipsBeforeClockIn;
    private enforceScheduleWithOverride;
    private shouldBypassScheduleOverrideForEmployee;
    private enforceNoActiveShift;
    private enforceSingleClockInForScheduledDay;
    private enforceClockInGeofence;
    private distanceMeters;
    private parsePendingTipsWorkDate;
    private dateKeyToUtc;
    private shiftDateKey;
    private getWeekStartDateKey;
    private getScheduleViolation;
}
