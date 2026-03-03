import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import type { AuthUser } from '../auth/auth.types';
import type { CreateGroupDto } from './dto/create-group.dto';
import type { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
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

  private normalizeGroupName(value: string) {
    const name = value.trim();
    if (!name) {
      throw new BadRequestException('Group name is required.');
    }
    return name;
  }

  private async resolveScopedOfficeId(tenantId: string, officeId?: string) {
    const trimmedOfficeId = officeId?.trim();
    if (!trimmedOfficeId) {
      return null;
    }

    const office = await this.prisma.office.findFirst({
      where: { id: trimmedOfficeId, tenantId },
      select: { id: true },
    });
    if (!office) {
      throw new BadRequestException('Location not found for this tenant.');
    }
    return office.id;
  }

  async list(authUser: AuthUser, officeId?: string) {
    const access = await this.tenancy.requireFeature(authUser, 'groups');
    const { tenant } = access;
    const officeScope = this.tenancy.resolveOfficeScope(access, officeId);
    const scopedOfficeId = officeScope.officeId;

    return this.prisma.group.findMany({
      where: scopedOfficeId
        ? {
            tenantId: tenant.id,
            ...(officeScope.restrictedToAllowedOffice
              ? { officeId: scopedOfficeId }
              : { OR: [{ officeId: scopedOfficeId }, { officeId: null }] }),
          }
        : { tenantId: tenant.id },
      orderBy: { name: 'asc' },
    });
  }

  async create(authUser: AuthUser, dto: CreateGroupDto) {
    const access = await this.tenancy.requireFeature(authUser, 'groups');
    const { tenant } = access;
    const name = this.normalizeGroupName(dto.name);
    const officeScope = this.tenancy.resolveOfficeScope(access, dto.officeId);
    const officeId = await this.resolveScopedOfficeId(
      tenant.id,
      officeScope.officeId,
    );

    try {
      return await this.prisma.group.create({
        data: {
          tenantId: tenant.id,
          name,
          officeId,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('A group with that name already exists.');
      }
      throw error;
    }
  }

  async update(authUser: AuthUser, groupId: string, dto: UpdateGroupDto) {
    const access = await this.tenancy.requireFeature(authUser, 'groups');
    const { tenant } = access;
    const currentOfficeScope = this.tenancy.resolveOfficeScope(access);

    const existing = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        tenantId: tenant.id,
        ...(currentOfficeScope.restrictedToAllowedOffice
          ? { officeId: currentOfficeScope.officeId }
          : {}),
      },
      select: { id: true, officeId: true },
    });
    if (!existing) {
      throw new NotFoundException('Group not found.');
    }

    const data: Prisma.GroupUncheckedUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = this.normalizeGroupName(dto.name);
    }
    if (dto.officeId !== undefined) {
      const officeScope = this.tenancy.resolveOfficeScope(access, dto.officeId);
      data.officeId = await this.resolveScopedOfficeId(
        tenant.id,
        officeScope.officeId,
      );
    }

    try {
      return await this.prisma.group.update({
        where: { id: existing.id },
        data,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('A group with that name already exists.');
      }
      throw error;
    }
  }

  async remove(authUser: AuthUser, groupId: string) {
    const access = await this.tenancy.requireFeature(authUser, 'groups');
    const { tenant } = access;
    const officeScope = this.tenancy.resolveOfficeScope(access);

    const existing = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        tenantId: tenant.id,
        ...(officeScope.restrictedToAllowedOffice
          ? { officeId: officeScope.officeId }
          : {}),
      },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Group not found.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedEmployees = await tx.employee.updateMany({
        where: { tenantId: tenant.id, groupId: existing.id },
        data: { groupId: null },
      });
      await tx.group.delete({
        where: { id: existing.id },
      });
      return updatedEmployees.count;
    });

    return {
      ok: true,
      id: existing.id,
      clearedEmployees: result,
    };
  }
}
