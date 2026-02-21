import { PrismaService } from "../prisma/prisma.service";
import { TenancyService } from "../tenancy/tenancy.service";
import type { AuthUser } from "../auth/auth.types";
import type { CreatePunchDto } from "./dto/create-punch.dto";
export declare class PunchesService {
    private readonly prisma;
    private readonly tenancy;
    constructor(prisma: PrismaService, tenancy: TenancyService);
    createPunch(authUser: AuthUser, dto: CreatePunchDto, ipAddress?: string): Promise<{
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
    getCurrentPunch(authUser: AuthUser): Promise<{
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
