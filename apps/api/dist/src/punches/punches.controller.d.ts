import type { RequestWithUser } from '../auth/auth.types';
import { CreatePunchDto } from './dto/create-punch.dto';
import { PunchesService } from './punches.service';
export declare class PunchesController {
    private readonly punches;
    constructor(punches: PunchesService);
    createPunch(dto: CreatePunchDto, req: RequestWithUser): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        userId: string;
        latitude: number | null;
        longitude: number | null;
        notes: string | null;
        type: import("@prisma/client").$Enums.PunchType;
        occurredAt: Date;
        ipAddress: string | null;
        deviceLabel: string | null;
    }>;
    getCurrent(req: RequestWithUser): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        userId: string;
        latitude: number | null;
        longitude: number | null;
        notes: string | null;
        type: import("@prisma/client").$Enums.PunchType;
        occurredAt: Date;
        ipAddress: string | null;
        deviceLabel: string | null;
    } | null>;
}
