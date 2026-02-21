import type { RequestWithUser } from "../auth/auth.types";
import { CreatePunchDto } from "./dto/create-punch.dto";
import { PunchesService } from "./punches.service";
export declare class PunchesController {
    private readonly punches;
    constructor(punches: PunchesService);
    createPunch(dto: CreatePunchDto, req: RequestWithUser): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        userId: string;
        type: import("@prisma/client").$Enums.PunchType;
        occurredAt: Date;
        notes: string | null;
        deviceLabel: string | null;
        ipAddress: string | null;
        latitude: number | null;
        longitude: number | null;
    }>;
    getCurrent(req: RequestWithUser): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        userId: string;
        type: import("@prisma/client").$Enums.PunchType;
        occurredAt: Date;
        notes: string | null;
        deviceLabel: string | null;
        ipAddress: string | null;
        latitude: number | null;
        longitude: number | null;
    } | null>;
}
