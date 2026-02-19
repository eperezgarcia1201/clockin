import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import type { AuthUser } from '../auth/auth.types';
import type { CreateOfficeDto } from './dto/create-office.dto';
import type { UpdateOfficeDto } from './dto/update-office.dto';

@Injectable()
export class OfficesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  private normalizeOfficeName(value: string) {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException('Location name is required.');
    }
    return normalized;
  }

  private normalizeGeofence(
    payload: {
      latitude?: number | null;
      longitude?: number | null;
      geofenceRadiusMeters?: number | null;
    },
    existing?: {
      latitude: number | null;
      longitude: number | null;
      geofenceRadiusMeters: number | null;
    },
  ) {
    const latitude =
      payload.latitude !== undefined
        ? (payload.latitude ?? null)
        : (existing?.latitude ?? null);
    const longitude =
      payload.longitude !== undefined
        ? (payload.longitude ?? null)
        : (existing?.longitude ?? null);
    const geofenceRadiusMeters =
      payload.geofenceRadiusMeters !== undefined
        ? (payload.geofenceRadiusMeters ?? null)
        : (existing?.geofenceRadiusMeters ?? null);

    if ((latitude === null) !== (longitude === null)) {
      throw new BadRequestException(
        'Latitude and longitude must be provided together.',
      );
    }

    return {
      latitude,
      longitude,
      geofenceRadiusMeters,
    };
  }

  async list(authUser: AuthUser) {
    const { tenant } = await this.tenancy.requireFeature(authUser, 'locations');

    return this.prisma.office.findMany({
      where: { tenantId: tenant.id },
      orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
    });
  }

  async create(authUser: AuthUser, dto: CreateOfficeDto) {
    const access = await this.tenancy.requireFeature(authUser, 'locations');
    const { tenant } = access;

    if (!access.settings.multiLocationEnabled) {
      const locationCount = await this.prisma.office.count({
        where: { tenantId: tenant.id },
      });
      if (locationCount > 0) {
        throw new ForbiddenException(
          'Multi-location management is disabled for this tenant.',
        );
      }
    }

    const geofence = this.normalizeGeofence(dto);

    return this.prisma.office.create({
      data: {
        tenantId: tenant.id,
        name: this.normalizeOfficeName(dto.name),
        latitude: geofence.latitude,
        longitude: geofence.longitude,
        geofenceRadiusMeters: geofence.geofenceRadiusMeters,
      },
    });
  }

  async update(authUser: AuthUser, officeId: string, dto: UpdateOfficeDto) {
    const { tenant } = await this.tenancy.requireFeature(authUser, 'locations');
    const existing = await this.prisma.office.findFirst({
      where: { id: officeId, tenantId: tenant.id },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        geofenceRadiusMeters: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Location not found.');
    }

    const geofence = this.normalizeGeofence(dto, {
      latitude: existing.latitude,
      longitude: existing.longitude,
      geofenceRadiusMeters: existing.geofenceRadiusMeters,
    });

    return this.prisma.office.update({
      where: { id: existing.id },
      data: {
        name:
          dto.name !== undefined
            ? this.normalizeOfficeName(dto.name)
            : undefined,
        latitude: geofence.latitude,
        longitude: geofence.longitude,
        geofenceRadiusMeters: geofence.geofenceRadiusMeters,
      },
    });
  }
}
