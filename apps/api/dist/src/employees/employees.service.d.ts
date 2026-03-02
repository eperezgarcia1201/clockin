import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import type { AuthUser } from '../auth/auth.types';
import type { CreateEmployeeDto } from './dto/create-employee.dto';
import type { UpdateEmployeeDto } from './dto/update-employee.dto';
export declare class EmployeesService {
    private readonly prisma;
    private readonly tenancy;
    constructor(prisma: PrismaService, tenancy: TenancyService);
    private scopedOfficeFilter;
    listEmployees(authUser: AuthUser, options?: {
        includeDeleted?: boolean;
        officeId?: string;
    }): Promise<{
        id: string;
        name: string;
        active: boolean;
        email: string | null;
        hourlyRate: number | null;
        officeId: string | null;
        groupId: string | null;
        isManager: boolean;
        managerPermissions: ("locations" | "groups" | "statuses" | "notifications" | "companyOrders" | "settings" | "tips" | "schedules" | "dashboard" | "users" | "manageMultiLocation" | "reports" | "salesCapture" | "timeEdits")[];
        isAdmin: boolean;
        isTimeAdmin: boolean;
        isReports: boolean;
        isServer: boolean;
        isKitchenManager: boolean;
        isOwnerManager: boolean;
        deletedAt: string | null;
        deletedBy: string | null;
        hoursRecordCount: number;
        tipRecordCount: number;
        scheduleRecordCount: number;
        notificationRecordCount: number;
    }[]>;
    createEmployee(authUser: AuthUser, dto: CreateEmployeeDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        tenantId: string;
        officeId: string | null;
        isReports: boolean;
        isTimeAdmin: boolean;
        isAdmin: boolean;
        fullName: string;
        displayName: string | null;
        pinHash: string | null;
        hourlyRate: number | null;
        groupId: string | null;
        isManager: boolean;
        managerPermissions: string[];
        isServer: boolean;
        isKitchenManager: boolean;
        disabled: boolean;
        deletedAt: Date | null;
        deletedBy: string | null;
    }>;
    getEmployee(authUser: AuthUser, employeeId: string): Promise<{
        id: string;
        fullName: string;
        displayName: string | null;
        email: string | null;
        hourlyRate: number | null;
        officeId: string | null;
        groupId: string | null;
        isManager: boolean;
        managerPermissions: ("locations" | "groups" | "statuses" | "notifications" | "companyOrders" | "settings" | "tips" | "schedules" | "dashboard" | "users" | "manageMultiLocation" | "reports" | "salesCapture" | "timeEdits")[];
        isAdmin: boolean;
        isTimeAdmin: boolean;
        isReports: boolean;
        isServer: boolean;
        isKitchenManager: boolean;
        isOwnerManager: boolean;
        disabled: boolean;
    }>;
    updateEmployee(authUser: AuthUser, employeeId: string, dto: UpdateEmployeeDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        tenantId: string;
        officeId: string | null;
        isReports: boolean;
        isTimeAdmin: boolean;
        isAdmin: boolean;
        fullName: string;
        displayName: string | null;
        pinHash: string | null;
        hourlyRate: number | null;
        groupId: string | null;
        isManager: boolean;
        managerPermissions: string[];
        isServer: boolean;
        isKitchenManager: boolean;
        disabled: boolean;
        deletedAt: Date | null;
        deletedBy: string | null;
    }>;
    softDeleteEmployee(authUser: AuthUser, employeeId: string): Promise<{
        ok: boolean;
        id: string;
        deletedAt: string;
        deletedBy: string;
        softDeleted: boolean;
    }>;
    restoreEmployee(authUser: AuthUser, employeeId: string): Promise<{
        ok: boolean;
        id: string;
        restored: boolean;
    }>;
    deleteEmployeePermanently(authUser: AuthUser, employeeId: string): Promise<{
        ok: boolean;
        id: string;
        permanentlyDeleted: boolean;
        deletedRecords?: undefined;
    } | {
        ok: boolean;
        id: string;
        permanentlyDeleted: boolean;
        deletedRecords: {
            punches: number;
            tips: number;
            notifications: number;
            schedules: number;
            scheduleOverrideRequests: number;
        };
    }>;
    getSummary(authUser: AuthUser, options?: {
        officeId?: string;
    }): Promise<{
        total: number;
        admins: number;
        timeAdmins: number;
        reports: number;
    }>;
    private composeManagerPermissions;
    private hasOwnerManagerPermission;
}
