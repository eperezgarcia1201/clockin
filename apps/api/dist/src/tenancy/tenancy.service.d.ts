import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "../auth/auth.types";
export declare class TenancyService {
    private readonly prisma;
    private readonly config;
    constructor(prisma: PrismaService, config: ConfigService);
    requireTenantAndUser(authUser: AuthUser): Promise<{
        tenant: {
            id: string;
            authOrgId: string;
            slug: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
        };
        user: {
            id: string;
            name: string | null;
            createdAt: Date;
            updatedAt: Date;
            authUserId: string;
            email: string;
        };
        membership: {
            id: string;
            createdAt: Date;
            tenantId: string;
            userId: string;
            role: import("@prisma/client").$Enums.Role;
            status: import("@prisma/client").$Enums.MembershipStatus;
        };
    }>;
    private makeTenantSlug;
    private parseRole;
}
