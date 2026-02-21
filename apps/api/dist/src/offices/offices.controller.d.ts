import type { RequestWithUser } from "../auth/auth.types";
import { CreateOfficeDto } from "./dto/create-office.dto";
import { OfficesService } from "./offices.service";
export declare class OfficesController {
    private readonly offices;
    constructor(offices: OfficesService);
    list(req: RequestWithUser): Promise<{
        offices: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
        }[];
    }>;
    create(req: RequestWithUser, dto: CreateOfficeDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
    }>;
}
