import { PunchType } from "@prisma/client";
export declare class CreateEmployeePunchDto {
    type: PunchType;
    occurredAt?: string;
    notes?: string;
    deviceLabel?: string;
    ipAddress?: string;
    pin?: string;
}
