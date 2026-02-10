import { PrismaService } from "../prisma/prisma.service";
import { TenancyService } from "../tenancy/tenancy.service";
import type { AuthUser } from "../auth/auth.types";
import type { CreateEmployeePunchDto } from "./dto/create-employee-punch.dto";
import type { ManualEmployeePunchDto } from "./dto/manual-employee-punch.dto";
import type { UpdateEmployeePunchDto } from "./dto/update-employee-punch.dto";
export declare class EmployeePunchesService {
    private readonly prisma;
    private readonly tenancy;
    constructor(prisma: PrismaService, tenancy: TenancyService);
    createPunch(authUser: AuthUser, employeeId: string, dto: CreateEmployeePunchDto): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        type: import("@prisma/client").$Enums.PunchType;
        occurredAt: Date;
        notes: string | null;
        ipAddress: string | null;
        employeeId: string;
    }>;
    getRecent(authUser: AuthUser): Promise<{
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
        }[];
    }>;
    createManual(authUser: AuthUser, dto: ManualEmployeePunchDto): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        type: import("@prisma/client").$Enums.PunchType;
        occurredAt: Date;
        notes: string | null;
        ipAddress: string | null;
        employeeId: string;
    }>;
    updateRecord(authUser: AuthUser, recordId: string, dto: UpdateEmployeePunchDto): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        type: import("@prisma/client").$Enums.PunchType;
        occurredAt: Date;
        notes: string | null;
        ipAddress: string | null;
        employeeId: string;
    }>;
    deleteRecord(authUser: AuthUser, recordId: string): Promise<{
        ok: boolean;
    }>;
}
