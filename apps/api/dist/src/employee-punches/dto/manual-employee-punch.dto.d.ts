import { PunchType } from "@prisma/client";
export declare class ManualEmployeePunchDto {
    employeeId: string;
    type: PunchType;
    occurredAt: string;
    notes?: string;
}
