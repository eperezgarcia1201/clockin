import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/auth.types';
import { type ManagerFeatureKey } from './manager-features';
type AdminActorType = 'tenant_admin' | 'manager' | 'membership' | 'limited';
type AdminAccess = {
    actorType: AdminActorType;
    displayName: string;
    featurePermissions: ManagerFeatureKey[];
    employeeId: string | null;
    tenant: Awaited<ReturnType<TenancyService['requireTenantAndUser']>>['tenant'];
    user: Awaited<ReturnType<TenancyService['requireTenantAndUser']>>['user'];
    membership: Awaited<ReturnType<TenancyService['requireTenantAndUser']>>['membership'];
    settings: {
        adminUsername: string;
        multiLocationEnabled: boolean;
        companyOrdersEnabled: boolean;
        liquorInventoryEnabled: boolean;
        premiumFeaturesEnabled: boolean;
    };
    ownerClockExempt: boolean;
};
type CompanyOrdersAccess = {
    actorType: AdminActorType | 'kitchen_manager';
    displayName: string;
    employeeId: string | null;
    allowedOfficeId: string | null;
    tenant: Awaited<ReturnType<TenancyService['requireTenantAndUser']>>['tenant'];
    user: Awaited<ReturnType<TenancyService['requireTenantAndUser']>>['user'];
    membership: Awaited<ReturnType<TenancyService['requireTenantAndUser']>>['membership'];
};
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
            ownerEmail: string | null;
            isActive: boolean;
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
    resolveAdminAccess(authUser: AuthUser): Promise<AdminAccess>;
    requireFeature(authUser: AuthUser, feature: ManagerFeatureKey): Promise<AdminAccess>;
    requireAnyFeature(authUser: AuthUser, features: ManagerFeatureKey[]): Promise<AdminAccess>;
    requireCompanyOrdersAccess(authUser: AuthUser): Promise<CompanyOrdersAccess>;
    private findManagerEmployee;
    getOwnerManagerEmployeeIds(tenantId: string, employeeIds?: string[]): Promise<Set<string>>;
    isOwnerManagerEmployee(tenantId: string, employeeId: string): Promise<boolean>;
    private parseEmployeeActorId;
    private findKitchenManagerEmployee;
    private resolveManagerFeatures;
    private filterTenantFeaturePermissions;
    private hasOwnerManagerPermission;
    private makeTenantSlug;
    private parseRole;
}
export {};
