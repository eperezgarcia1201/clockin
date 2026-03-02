import type { RequestWithUser } from '../auth/auth.types';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';
import { OfficesService } from './offices.service';
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
            latitude: number | null;
            longitude: number | null;
            geofenceRadiusMeters: number | null;
        }[];
    }>;
    create(req: RequestWithUser, dto: CreateOfficeDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        latitude: number | null;
        longitude: number | null;
        geofenceRadiusMeters: number | null;
    }>;
    update(req: RequestWithUser, id: string, dto: UpdateOfficeDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        latitude: number | null;
        longitude: number | null;
        geofenceRadiusMeters: number | null;
    }>;
}
