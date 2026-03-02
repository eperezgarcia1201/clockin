import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import type { AuthUser } from '../auth/auth.types';
import type { CreateOfficeDto } from './dto/create-office.dto';
import type { UpdateOfficeDto } from './dto/update-office.dto';
export declare class OfficesService {
    private readonly prisma;
    private readonly tenancy;
    constructor(prisma: PrismaService, tenancy: TenancyService);
    private normalizeOfficeName;
    private normalizeGeofence;
    list(authUser: AuthUser): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        latitude: number | null;
        longitude: number | null;
        geofenceRadiusMeters: number | null;
    }[]>;
    create(authUser: AuthUser, dto: CreateOfficeDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        latitude: number | null;
        longitude: number | null;
        geofenceRadiusMeters: number | null;
    }>;
    update(authUser: AuthUser, officeId: string, dto: UpdateOfficeDto): Promise<{
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
