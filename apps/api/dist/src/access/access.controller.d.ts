import type { RequestWithUser } from "../auth/auth.types";
import { TenancyService } from "../tenancy/tenancy.service";
export declare class AccessController {
    private readonly tenancy;
    constructor(tenancy: TenancyService);
    getAccess(request: RequestWithUser): Promise<{
        role: import("@prisma/client").$Enums.Role;
        status: import("@prisma/client").$Enums.MembershipStatus;
        isAdmin: boolean;
    }>;
}
