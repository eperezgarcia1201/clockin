import type { RequestWithUser } from '../auth/auth.types';
import { TenancyService } from '../tenancy/tenancy.service';
export declare class AccessController {
    private readonly tenancy;
    constructor(tenancy: TenancyService);
    getAccess(request: RequestWithUser): Promise<{
        role: import("@prisma/client").$Enums.Role;
        status: import("@prisma/client").$Enums.MembershipStatus;
        isAdmin: boolean;
        actorType: "membership" | "tenant_admin" | "manager" | "limited";
        actorName: string;
        employeeId: string | null;
        ownerClockExempt: boolean;
        adminUsername: string;
        multiLocationEnabled: boolean;
        liquorInventoryEnabled: boolean;
        premiumFeaturesEnabled: boolean;
        permissions: Record<"locations" | "groups" | "statuses" | "notifications" | "companyOrders" | "settings" | "tips" | "schedules" | "dashboard" | "users" | "manageMultiLocation" | "reports" | "salesCapture" | "timeEdits", boolean>;
    }>;
}
