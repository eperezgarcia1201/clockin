import { PrismaService } from "../prisma/prisma.service";
import { TenancyService } from "../tenancy/tenancy.service";
import type { AuthUser } from "../auth/auth.types";
import type { CreateStatusDto } from "./dto/create-status.dto";
export declare class StatusesService {
    private readonly prisma;
    private readonly tenancy;
    constructor(prisma: PrismaService, tenancy: TenancyService);
    list(authUser: AuthUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        label: string;
        color: string;
        isIn: boolean;
    }[]>;
    create(authUser: AuthUser, dto: CreateStatusDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        label: string;
        color: string;
        isIn: boolean;
    }>;
}
