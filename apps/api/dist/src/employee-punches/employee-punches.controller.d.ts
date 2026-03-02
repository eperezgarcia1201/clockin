import type { RequestWithUser } from '../auth/auth.types';
import { EmployeePunchesService } from './employee-punches.service';
import { CreateEmployeePunchDto } from './dto/create-employee-punch.dto';
import { ManualEmployeePunchDto } from './dto/manual-employee-punch.dto';
import { UpdateEmployeePunchDto } from './dto/update-employee-punch.dto';
export declare class EmployeePunchesController {
    private readonly punches;
    constructor(punches: EmployeePunchesService);
    recent(req: RequestWithUser, officeId?: string): Promise<{
        rows: {
            id: string;
            name: string;
            status: import("@prisma/client").$Enums.PunchType;
            occurredAt: string | null;
            office: string | null;
            group: string | null;
        }[];
    }>;
    records(req: RequestWithUser, employeeId?: string, limit?: string, from?: string, to?: string, tzOffset?: string, officeId?: string): Promise<{
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
    createManual(req: RequestWithUser, dto: ManualEmployeePunchDto): Promise<{
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
    approveScheduleOverride(req: RequestWithUser, id: string): Promise<{
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
    rejectScheduleOverride(req: RequestWithUser, id: string): Promise<{
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
    create(req: RequestWithUser, employeeId: string, dto: CreateEmployeePunchDto): Promise<{
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
    updateRecord(req: RequestWithUser, id: string, dto: UpdateEmployeePunchDto): Promise<{
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
    deleteRecord(req: RequestWithUser, id: string): Promise<{
        ok: boolean;
    }>;
}
