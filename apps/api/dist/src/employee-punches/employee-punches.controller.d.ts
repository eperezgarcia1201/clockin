import type { RequestWithUser } from "../auth/auth.types";
import { EmployeePunchesService } from "./employee-punches.service";
import { CreateEmployeePunchDto } from "./dto/create-employee-punch.dto";
import { ManualEmployeePunchDto } from "./dto/manual-employee-punch.dto";
import { UpdateEmployeePunchDto } from "./dto/update-employee-punch.dto";
export declare class EmployeePunchesController {
    private readonly punches;
    constructor(punches: EmployeePunchesService);
    create(req: RequestWithUser, employeeId: string, dto: CreateEmployeePunchDto): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        type: import("@prisma/client").$Enums.PunchType;
        occurredAt: Date;
        notes: string | null;
        ipAddress: string | null;
        employeeId: string;
    }>;
    recent(req: RequestWithUser): Promise<{
        rows: {
            id: string;
            name: string;
            status: import("@prisma/client").$Enums.PunchType;
            occurredAt: string | null;
            office: string | null;
            group: string | null;
        }[];
    }>;
    records(req: RequestWithUser, employeeId?: string, limit?: string, from?: string, to?: string, tzOffset?: string): Promise<{
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
    createManual(req: RequestWithUser, dto: ManualEmployeePunchDto): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        type: import("@prisma/client").$Enums.PunchType;
        occurredAt: Date;
        notes: string | null;
        ipAddress: string | null;
        employeeId: string;
    }>;
    updateRecord(req: RequestWithUser, id: string, dto: UpdateEmployeePunchDto): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        type: import("@prisma/client").$Enums.PunchType;
        occurredAt: Date;
        notes: string | null;
        ipAddress: string | null;
        employeeId: string;
    }>;
    deleteRecord(req: RequestWithUser, id: string): Promise<{
        ok: boolean;
    }>;
}
