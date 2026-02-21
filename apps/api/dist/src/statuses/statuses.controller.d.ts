import type { RequestWithUser } from "../auth/auth.types";
import { CreateStatusDto } from "./dto/create-status.dto";
import { StatusesService } from "./statuses.service";
export declare class StatusesController {
    private readonly statuses;
    constructor(statuses: StatusesService);
    list(req: RequestWithUser): Promise<{
        statuses: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            label: string;
            color: string;
            isIn: boolean;
        }[];
    }>;
    create(req: RequestWithUser, dto: CreateStatusDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        label: string;
        color: string;
        isIn: boolean;
    }>;
}
