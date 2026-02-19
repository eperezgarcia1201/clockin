import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import type { AuthUser } from '../auth/auth.types';
import type { CreateEmployeeDto } from './dto/create-employee.dto';
import { hash } from 'bcryptjs';
import type { UpdateEmployeeDto } from './dto/update-employee.dto';
import { normalizeManagerFeatures } from '../tenancy/manager-features';
import { OWNER_MANAGER_PERMISSION } from '../tenancy/owner-manager';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  private scopedOfficeFilter(officeId?: string) {
    const scopedOfficeId = officeId?.trim() || undefined;
    if (!scopedOfficeId) {
      return {};
    }
    return {
      OR: [{ officeId: scopedOfficeId }, { officeId: null }],
    };
  }

  async listEmployees(
    authUser: AuthUser,
    options?: { includeDeleted?: boolean; officeId?: string },
  ) {
    const { tenant } = await this.tenancy.requireFeature(authUser, 'users');
    const includeDeleted = options?.includeDeleted === true;

    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId: tenant.id,
        deletedAt: includeDeleted ? { not: null } : null,
        ...this.scopedOfficeFilter(options?.officeId),
      },
      orderBy: { fullName: 'asc' },
      include: {
        _count: {
          select: {
            punches: true,
            tips: true,
            schedules: true,
            notifications: true,
          },
        },
      },
    });

    return employees.map((employee) => ({
      id: employee.id,
      name: employee.displayName || employee.fullName,
      active: !employee.disabled,
      email: employee.email,
      hourlyRate: employee.hourlyRate,
      officeId: employee.officeId,
      groupId: employee.groupId,
      isManager: employee.isManager,
      managerPermissions: normalizeManagerFeatures(employee.managerPermissions),
      isAdmin: employee.isAdmin,
      isTimeAdmin: employee.isTimeAdmin,
      isReports: employee.isReports,
      isServer: employee.isServer,
      isKitchenManager: employee.isKitchenManager,
      isOwnerManager:
        employee.isManager &&
        this.hasOwnerManagerPermission(employee.managerPermissions),
      deletedAt: employee.deletedAt ? employee.deletedAt.toISOString() : null,
      deletedBy: employee.deletedBy || null,
      hoursRecordCount: employee._count.punches || 0,
      tipRecordCount: employee._count.tips || 0,
      scheduleRecordCount: employee._count.schedules || 0,
      notificationRecordCount: employee._count.notifications || 0,
    }));
  }

  async createEmployee(authUser: AuthUser, dto: CreateEmployeeDto) {
    const { tenant } = await this.tenancy.requireFeature(authUser, 'users');

    const pinHash = dto.pin ? await hash(dto.pin, 10) : null;
    const isManager = dto.isManager ?? false;
    const isOwnerManager = dto.isOwnerManager ?? false;
    const managerPermissions = this.composeManagerPermissions({
      managerEnabled: isManager,
      managerPermissionsInput: dto.managerPermissions,
      ownerManagerEnabled: isOwnerManager,
    });
    const isAdmin = dto.isAdmin ?? isManager;

    return this.prisma.employee.create({
      data: {
        tenantId: tenant.id,
        fullName: dto.fullName,
        displayName: dto.displayName,
        email: dto.email,
        pinHash,
        hourlyRate: dto.hourlyRate ?? null,
        officeId: dto.officeId || null,
        groupId: dto.groupId || null,
        isManager,
        managerPermissions,
        isAdmin,
        isTimeAdmin: dto.isTimeAdmin ?? false,
        isReports: dto.isReports ?? false,
        isServer: dto.isServer ?? false,
        isKitchenManager: dto.isKitchenManager ?? false,
        disabled: dto.disabled ?? false,
        deletedAt: null,
        deletedBy: null,
      },
    });
  }

  async getEmployee(authUser: AuthUser, employeeId: string) {
    const { tenant } = await this.tenancy.requireFeature(authUser, 'users');

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId: tenant.id, deletedAt: null },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return {
      id: employee.id,
      fullName: employee.fullName,
      displayName: employee.displayName,
      email: employee.email,
      hourlyRate: employee.hourlyRate,
      officeId: employee.officeId,
      groupId: employee.groupId,
      isManager: employee.isManager,
      managerPermissions: normalizeManagerFeatures(employee.managerPermissions),
      isAdmin: employee.isAdmin,
      isTimeAdmin: employee.isTimeAdmin,
      isReports: employee.isReports,
      isServer: employee.isServer,
      isKitchenManager: employee.isKitchenManager,
      isOwnerManager:
        employee.isManager &&
        this.hasOwnerManagerPermission(employee.managerPermissions),
      disabled: employee.disabled,
    };
  }

  async updateEmployee(
    authUser: AuthUser,
    employeeId: string,
    dto: UpdateEmployeeDto,
  ) {
    const { tenant } = await this.tenancy.requireFeature(authUser, 'users');

    const existing = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId: tenant.id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Employee not found');
    }

    const data: Record<string, unknown> = {};

    if (dto.fullName !== undefined) {
      data.fullName = dto.fullName;
    }
    if (dto.displayName !== undefined) {
      data.displayName = dto.displayName || null;
    }
    if (dto.email !== undefined) {
      data.email = dto.email || null;
    }
    if (dto.hourlyRate !== undefined) {
      data.hourlyRate = dto.hourlyRate ?? null;
    }
    if (dto.officeId !== undefined) {
      data.officeId = dto.officeId || null;
    }
    if (dto.groupId !== undefined) {
      data.groupId = dto.groupId || null;
    }

    const existingOwnerManager = this.hasOwnerManagerPermission(
      existing.managerPermissions,
    );
    const managerEnabled = dto.isManager ?? existing.isManager;
    if (dto.isManager !== undefined) {
      data.isManager = dto.isManager;
      if (dto.isAdmin === undefined && dto.isManager === true) {
        data.isAdmin = true;
      }
    }
    if (
      dto.managerPermissions !== undefined ||
      dto.isOwnerManager !== undefined ||
      dto.isManager !== undefined
    ) {
      data.managerPermissions = this.composeManagerPermissions({
        managerEnabled,
        managerPermissionsInput:
          dto.managerPermissions !== undefined
            ? dto.managerPermissions
            : existing.managerPermissions,
        ownerManagerEnabled:
          dto.isOwnerManager !== undefined
            ? dto.isOwnerManager
            : existingOwnerManager,
      });
    }
    if (dto.isAdmin !== undefined) {
      data.isAdmin = dto.isAdmin;
    }
    if (dto.isTimeAdmin !== undefined) {
      data.isTimeAdmin = dto.isTimeAdmin;
    }
    if (dto.isReports !== undefined) {
      data.isReports = dto.isReports;
    }
    if (dto.isServer !== undefined) {
      data.isServer = dto.isServer;
    }
    if (dto.isKitchenManager !== undefined) {
      data.isKitchenManager = dto.isKitchenManager;
    }
    if (dto.disabled !== undefined) {
      data.disabled = dto.disabled;
    }
    if (dto.pin !== undefined) {
      data.pinHash = dto.pin ? await hash(dto.pin, 10) : null;
    }

    return this.prisma.employee.update({
      where: { id: existing.id },
      data,
    });
  }

  async softDeleteEmployee(authUser: AuthUser, employeeId: string) {
    const { tenant } = await this.tenancy.requireFeature(authUser, 'users');

    const existing = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId: tenant.id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Employee not found');
    }

    const deletedBy = authUser.email || authUser.name || authUser.authUserId;
    const deletedAt = new Date();

    await this.prisma.employee.update({
      where: { id: existing.id },
      data: {
        disabled: true,
        deletedAt,
        deletedBy,
      },
    });

    return {
      ok: true,
      id: existing.id,
      deletedAt: deletedAt.toISOString(),
      deletedBy,
      softDeleted: true,
    };
  }

  async restoreEmployee(authUser: AuthUser, employeeId: string) {
    const { tenant } = await this.tenancy.requireFeature(authUser, 'users');

    const existing = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId: tenant.id, deletedAt: { not: null } },
    });

    if (!existing) {
      throw new NotFoundException('Deleted employee not found');
    }

    const restored = await this.prisma.employee.update({
      where: { id: existing.id },
      data: {
        deletedAt: null,
        deletedBy: null,
        disabled: false,
      },
    });

    return {
      ok: true,
      id: restored.id,
      restored: true,
    };
  }

  async deleteEmployeePermanently(authUser: AuthUser, employeeId: string) {
    const { tenant } = await this.tenancy.requireFeature(authUser, 'users');

    const existing = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId: tenant.id, deletedAt: { not: null } },
    });

    if (!existing) {
      throw new NotFoundException('Deleted employee not found');
    }

    const usage = await this.prisma.employee.findFirst({
      where: { id: existing.id },
      select: {
        _count: {
          select: {
            punches: true,
            tips: true,
            notifications: true,
            schedules: true,
            scheduleOverrideRequests: true,
          },
        },
      },
    });

    const relatedCount =
      (usage?._count.punches || 0) +
      (usage?._count.tips || 0) +
      (usage?._count.notifications || 0) +
      (usage?._count.schedules || 0) +
      (usage?._count.scheduleOverrideRequests || 0);

    if (relatedCount === 0) {
      await this.prisma.employee.delete({
        where: { id: existing.id },
      });
      return { ok: true, id: existing.id, permanentlyDeleted: true };
    }

    await this.prisma.$transaction([
      this.prisma.notification.deleteMany({
        where: { tenantId: tenant.id, employeeId: existing.id },
      }),
      this.prisma.employeeSchedule.deleteMany({
        where: { tenantId: tenant.id, employeeId: existing.id },
      }),
      this.prisma.employeeTip.deleteMany({
        where: { tenantId: tenant.id, employeeId: existing.id },
      }),
      this.prisma.scheduleOverrideRequest.deleteMany({
        where: { tenantId: tenant.id, employeeId: existing.id },
      }),
      this.prisma.employeePunch.deleteMany({
        where: { tenantId: tenant.id, employeeId: existing.id },
      }),
      this.prisma.employee.delete({
        where: { id: existing.id },
      }),
    ]);

    return {
      ok: true,
      id: existing.id,
      permanentlyDeleted: true,
      deletedRecords: {
        punches: usage?._count.punches || 0,
        tips: usage?._count.tips || 0,
        notifications: usage?._count.notifications || 0,
        schedules: usage?._count.schedules || 0,
        scheduleOverrideRequests: usage?._count.scheduleOverrideRequests || 0,
      },
    };
  }

  async getSummary(authUser: AuthUser, options?: { officeId?: string }) {
    const { tenant } = await this.tenancy.requireFeature(authUser, 'dashboard');
    const officeFilter = this.scopedOfficeFilter(options?.officeId);

    const [total, admins, timeAdmins, reports] = await Promise.all([
      this.prisma.employee.count({
        where: {
          tenantId: tenant.id,
          deletedAt: null,
          ...officeFilter,
        },
      }),
      this.prisma.employee.count({
        where: {
          tenantId: tenant.id,
          isAdmin: true,
          deletedAt: null,
          ...officeFilter,
        },
      }),
      this.prisma.employee.count({
        where: {
          tenantId: tenant.id,
          isTimeAdmin: true,
          deletedAt: null,
          ...officeFilter,
        },
      }),
      this.prisma.employee.count({
        where: {
          tenantId: tenant.id,
          isReports: true,
          deletedAt: null,
          ...officeFilter,
        },
      }),
    ]);

    return { total, admins, timeAdmins, reports };
  }

  private composeManagerPermissions(input: {
    managerEnabled: boolean;
    managerPermissionsInput?: unknown;
    ownerManagerEnabled: boolean;
  }) {
    if (!input.managerEnabled) {
      return [];
    }
    const normalized = normalizeManagerFeatures(input.managerPermissionsInput);
    if (!input.ownerManagerEnabled) {
      return normalized;
    }
    return [...normalized, OWNER_MANAGER_PERMISSION];
  }

  private hasOwnerManagerPermission(permissions?: string[] | null) {
    if (!Array.isArray(permissions)) {
      return false;
    }
    return permissions.includes(OWNER_MANAGER_PERMISSION);
  }
}
