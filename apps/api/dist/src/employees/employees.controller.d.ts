import type { RequestWithUser } from "../auth/auth.types";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { EmployeesService } from "./employees.service";
export declare class EmployeesController {
    private readonly employees;
    constructor(employees: EmployeesService);
    list(req: RequestWithUser): Promise<{
        employees: {
            id: string;
            name: string;
            active: boolean;
            email: string | null;
            hourlyRate: number | null;
            officeId: string | null;
            groupId: string | null;
            isAdmin: boolean;
            isTimeAdmin: boolean;
            isReports: boolean;
        }[];
    }>;
    summary(req: RequestWithUser): Promise<{
        total: number;
        admins: number;
        timeAdmins: number;
        reports: number;
    }>;
    create(req: RequestWithUser, dto: CreateEmployeeDto): Promise<{
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
        disabled: boolean;
    }>;
    getOne(req: RequestWithUser, id: string): Promise<{
        id: string;
        fullName: string;
        displayName: string | null;
        email: string | null;
        hourlyRate: number | null;
        officeId: string | null;
        groupId: string | null;
        isAdmin: boolean;
        isTimeAdmin: boolean;
        isReports: boolean;
        disabled: boolean;
    }>;
    update(req: RequestWithUser, id: string, dto: UpdateEmployeeDto): Promise<{
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
        disabled: boolean;
    }>;
    remove(req: RequestWithUser, id: string): Promise<{
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
        disabled: boolean;
    }>;
}
