import { PunchType } from "@prisma/client";
export declare class UpdateEmployeePunchDto {
    type?: PunchType;
    occurredAt?: string;
    notes?: string;
}
