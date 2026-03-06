import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

  private isUniqueConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

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
    const access = await this.tenancy.requireFeature(authUser, 'locations');
    const { tenant } = access;

    return this.prisma.office.findMany({
      where: {
        tenantId: tenant.id,
        ...(access.allowedOfficeId
          ? { id: access.allowedOfficeId }
          : {}),
      },
      orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
    });
  }

  async create(authUser: AuthUser, dto: CreateOfficeDto) {
    const access = await this.tenancy.requireFeature(authUser, 'locations');
    const { tenant } = access;
    this.tenancy.ensureGlobalAdminAccess(
      access,
      'Managers cannot create locations. Ask an owner or tenant admin.',
    );

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

    try {
      return await this.prisma.office.create({
        data: {
          tenantId: tenant.id,
          name: this.normalizeOfficeName(dto.name),
          latitude: geofence.latitude,
          longitude: geofence.longitude,
          geofenceRadiusMeters: geofence.geofenceRadiusMeters,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('A location with that name already exists.');
      }
      throw error;
    }
  }

  async update(authUser: AuthUser, officeId: string, dto: UpdateOfficeDto) {
    const access = await this.tenancy.requireFeature(authUser, 'locations');
    const { tenant } = access;
    this.tenancy.ensureGlobalAdminAccess(
      access,
      'Managers cannot edit location settings. Ask an owner or tenant admin.',
    );
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

    try {
      return await this.prisma.office.update({
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
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('A location with that name already exists.');
      }
      throw error;
    }
  }

  async remove(authUser: AuthUser, officeId: string) {
    const access = await this.tenancy.requireFeature(authUser, 'locations');
    const { tenant } = access;
    this.tenancy.ensureGlobalAdminAccess(
      access,
      'Managers cannot delete locations. Ask an owner or tenant admin.',
    );

    const existing = await this.prisma.office.findFirst({
      where: { id: officeId, tenantId: tenant.id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Location not found.');
    }

    const locationCount = await this.prisma.office.count({
      where: { tenantId: tenant.id },
    });
    if (locationCount <= 1) {
      throw new BadRequestException(
        'You must keep at least one location for this tenant.',
      );
    }

    const [movementCount, inventoryCount, bottleScanCount] = await Promise.all([
      this.prisma.liquorInventoryMovement.count({
        where: { tenantId: tenant.id, officeId: existing.id },
      }),
      this.prisma.liquorInventoryCount.count({
        where: { tenantId: tenant.id, officeId: existing.id },
      }),
      this.prisma.liquorBottleScan.count({
        where: { tenantId: tenant.id, officeId: existing.id },
      }),
    ]);

    if (movementCount > 0 || inventoryCount > 0 || bottleScanCount > 0) {
      throw new BadRequestException(
        'This location has liquor inventory history and cannot be deleted.',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const [clearedEmployees, clearedGroups, clearedCompanyOrders] =
        await Promise.all([
          tx.employee.updateMany({
            where: { tenantId: tenant.id, officeId: existing.id },
            data: { officeId: null },
          }),
          tx.group.updateMany({
            where: { tenantId: tenant.id, officeId: existing.id },
            data: { officeId: null },
          }),
          tx.companyOrder.updateMany({
            where: { tenantId: tenant.id, officeId: existing.id },
            data: { officeId: null },
          }),
        ]);

      await tx.office.delete({
        where: { id: existing.id },
      });

      return {
        clearedEmployees: clearedEmployees.count,
        clearedGroups: clearedGroups.count,
        clearedCompanyOrders: clearedCompanyOrders.count,
      };
    });

    return {
      ok: true,
      id: existing.id,
      ...result,
    };
  }
}
