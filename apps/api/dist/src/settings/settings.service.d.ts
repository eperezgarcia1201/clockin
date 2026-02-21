import { PrismaService } from "../prisma/prisma.service";
import { TenancyService } from "../tenancy/tenancy.service";
import type { AuthUser } from "../auth/auth.types";
import type { UpdateSettingsDto } from "./dto/update-settings.dto";
export declare class SettingsService {
    private readonly prisma;
    private readonly tenancy;
    constructor(prisma: PrismaService, tenancy: TenancyService);
    getSettings(authUser: AuthUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        timezone: string;
        roundingMinutes: number;
        requirePin: boolean;
        ipRestrictions: string | null;
        reportsEnabled: boolean;
        allowManualTimeEdits: boolean;
    }>;
    updateSettings(authUser: AuthUser, dto: UpdateSettingsDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        timezone: string;
        roundingMinutes: number;
        requirePin: boolean;
        ipRestrictions: string | null;
        reportsEnabled: boolean;
        allowManualTimeEdits: boolean;
    }>;
}
