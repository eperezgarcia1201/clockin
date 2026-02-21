import { PunchType } from "@prisma/client";
export declare class CreatePunchDto {
    type: PunchType;
    occurredAt?: string;
    notes?: string;
    latitude?: number;
    longitude?: number;
    deviceLabel?: string;
}
