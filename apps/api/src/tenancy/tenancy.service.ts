import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/auth.types';
import { randomUUID } from 'crypto';
import {
  type ManagerFeatureKey,
  allManagerFeatures,
  normalizeManagerFeatures,
} from './manager-features';
import { OWNER_MANAGER_PERMISSION } from './owner-manager';

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const DEFAULT_ADMIN_USERNAME = 'admin';

type AdminActorType = 'tenant_admin' | 'manager' | 'membership' | 'limited';

type AdminAccess = {
  actorType: AdminActorType;
  displayName: string;
  featurePermissions: ManagerFeatureKey[];
  employeeId: string | null;
  tenant: Awaited<ReturnType<TenancyService['requireTenantAndUser']>>['tenant'];
  user: Awaited<ReturnType<TenancyService['requireTenantAndUser']>>['user'];
  membership: Awaited<
    ReturnType<TenancyService['requireTenantAndUser']>
  >['membership'];
  settings: {
    adminUsername: string;
    multiLocationEnabled: boolean;
    companyOrdersEnabled: boolean;
  };
  ownerClockExempt: boolean;
};

type CompanyOrdersAccess = {
  actorType: AdminActorType | 'kitchen_manager';
  displayName: string;
  employeeId: string | null;
  allowedOfficeId: string | null;
  tenant: Awaited<ReturnType<TenancyService['requireTenantAndUser']>>['tenant'];
  user: Awaited<ReturnType<TenancyService['requireTenantAndUser']>>['user'];
  membership: Awaited<
    ReturnType<TenancyService['requireTenantAndUser']>
  >['membership'];
};

@Injectable()
export class TenancyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async requireTenantAndUser(authUser: AuthUser) {
    if (!authUser.tenantExternalId) {
      throw new UnauthorizedException('Missing tenant claim in token.');
    }

    const defaultRole = this.parseRole(
      this.config.get<string>('DEFAULT_ROLE') || 'EMPLOYEE',
    );

    const tenant = await this.prisma.tenant.upsert({
      where: { authOrgId: authUser.tenantExternalId },
      update: {},
      create: {
        authOrgId: authUser.tenantExternalId,
        name:
          authUser.tenantName ||
          `Tenant ${authUser.tenantExternalId.slice(0, 6)}`,
        slug: this.makeTenantSlug(authUser),
      },
    });

    if (!tenant.isActive) {
      throw new ForbiddenException('Tenant account is disabled.');
    }

    const user = await this.prisma.user.upsert({
      where: { authUserId: authUser.authUserId },
      update: {
        email: authUser.email || 'unknown@clockin.local',
        name: authUser.name,
      },
      create: {
        authUserId: authUser.authUserId,
        email: authUser.email || 'unknown@clockin.local',
        name: authUser.name,
      },
    });

    const membership = await this.prisma.membership.upsert({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: user.id,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        userId: user.id,
        role: defaultRole,
      },
    });

    return { tenant, user, membership };
  }

  async resolveAdminAccess(authUser: AuthUser): Promise<AdminAccess> {
    const context = await this.requireTenantAndUser(authUser);
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: context.tenant.id },
      select: {
        adminUsername: true,
        multiLocationEnabled: true,
        companyOrdersEnabled: true,
      },
    });

    const adminUsername = (
      settings?.adminUsername || DEFAULT_ADMIN_USERNAME
    ).trim();
    const companyOrdersEnabled = settings?.companyOrdersEnabled ?? false;
    const loginIdentifier = (
      authUser.name ||
      authUser.email ||
      authUser.authUserId
    ).trim();

    if (
      loginIdentifier &&
      loginIdentifier.toLowerCase() === adminUsername.toLowerCase()
    ) {
      return {
        ...context,
        actorType: 'tenant_admin',
        displayName: adminUsername,
        featurePermissions: this.filterTenantFeaturePermissions(
          allManagerFeatures(),
          companyOrdersEnabled,
        ),
        employeeId: null,
        settings: {
          adminUsername,
          multiLocationEnabled: settings?.multiLocationEnabled ?? false,
          companyOrdersEnabled,
        },
        ownerClockExempt: false,
      };
    }

    const manager = await this.findManagerEmployee(
      context.tenant.id,
      loginIdentifier,
      authUser.email,
    );

    if (manager) {
      return {
        ...context,
        actorType: 'manager',
        displayName: manager.displayName || manager.fullName,
        featurePermissions: this.filterTenantFeaturePermissions(
          this.resolveManagerFeatures(manager),
          companyOrdersEnabled,
        ),
        employeeId: manager.id,
        settings: {
          adminUsername,
          multiLocationEnabled: settings?.multiLocationEnabled ?? false,
          companyOrdersEnabled,
        },
        ownerClockExempt:
          manager.isManager &&
          this.hasOwnerManagerPermission(manager.managerPermissions),
      };
    }

    const elevatedRoles: Role[] = [Role.OWNER, Role.ADMIN, Role.MANAGER];
    if (elevatedRoles.includes(context.membership.role)) {
      return {
        ...context,
        actorType: 'membership',
        displayName: authUser.name || authUser.email || 'Admin',
        featurePermissions: this.filterTenantFeaturePermissions(
          allManagerFeatures(),
          companyOrdersEnabled,
        ),
        employeeId: null,
        settings: {
          adminUsername,
          multiLocationEnabled: settings?.multiLocationEnabled ?? false,
          companyOrdersEnabled,
        },
        ownerClockExempt: false,
      };
    }

    return {
      ...context,
      actorType: 'limited',
      displayName: authUser.name || authUser.email || 'User',
      featurePermissions: [],
      employeeId: null,
      settings: {
        adminUsername,
        multiLocationEnabled: settings?.multiLocationEnabled ?? false,
        companyOrdersEnabled,
      },
      ownerClockExempt: false,
    };
  }

  async requireFeature(authUser: AuthUser, feature: ManagerFeatureKey) {
    const access = await this.resolveAdminAccess(authUser);
    if (access.featurePermissions.includes(feature)) {
      return access;
    }

    throw new ForbiddenException(
      'This account does not have access to this feature.',
    );
  }

  async requireAnyFeature(authUser: AuthUser, features: ManagerFeatureKey[]) {
    const access = await this.resolveAdminAccess(authUser);
    if (
      features.some((feature) => access.featurePermissions.includes(feature))
    ) {
      return access;
    }

    throw new ForbiddenException(
      'This account does not have access to this feature.',
    );
  }

  async requireCompanyOrdersAccess(
    authUser: AuthUser,
  ): Promise<CompanyOrdersAccess> {
    const access = await this.resolveAdminAccess(authUser);
    if (!access.settings.companyOrdersEnabled) {
      throw new ForbiddenException(
        'Company orders are disabled for this tenant.',
      );
    }
    if (access.featurePermissions.includes('companyOrders')) {
      return {
        actorType: access.actorType,
        displayName: access.displayName,
        employeeId: access.employeeId,
        allowedOfficeId: null,
        tenant: access.tenant,
        user: access.user,
        membership: access.membership,
      };
    }

    const kitchenManager = await this.findKitchenManagerEmployee(
      access.tenant.id,
      authUser,
    );
    if (!kitchenManager) {
      throw new ForbiddenException(
        'This account does not have access to company orders.',
      );
    }

    return {
      actorType: 'kitchen_manager',
      displayName: kitchenManager.displayName || kitchenManager.fullName,
      employeeId: kitchenManager.id,
      allowedOfficeId: kitchenManager.officeId || null,
      tenant: access.tenant,
      user: access.user,
      membership: access.membership,
    };
  }

  private async findManagerEmployee(
    tenantId: string,
    loginIdentifier: string,
    email?: string,
  ) {
    const conditions: {
      fullName?: { equals: string; mode: 'insensitive' };
      displayName?: { equals: string; mode: 'insensitive' };
      email?: { equals: string; mode: 'insensitive' };
    }[] = [];

    if (loginIdentifier) {
      conditions.push(
        { fullName: { equals: loginIdentifier, mode: 'insensitive' } },
        { displayName: { equals: loginIdentifier, mode: 'insensitive' } },
        { email: { equals: loginIdentifier, mode: 'insensitive' } },
      );
    }
    if (email?.trim()) {
      conditions.push({ email: { equals: email.trim(), mode: 'insensitive' } });
    }

    if (conditions.length === 0) {
      return null;
    }

    return this.prisma.employee.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        disabled: false,
        OR: [{ isManager: true }, { isAdmin: true }],
        AND: [{ OR: conditions }],
      },
      select: {
        id: true,
        fullName: true,
        displayName: true,
        email: true,
        isManager: true,
        isAdmin: true,
        isTimeAdmin: true,
        isReports: true,
        managerPermissions: true,
      },
    });
  }

  async getOwnerManagerEmployeeIds(
    tenantId: string,
    employeeIds?: string[],
  ): Promise<Set<string>> {
    const scopedEmployeeIds = (employeeIds || [])
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const managerEmployees = await this.prisma.employee.findMany({
      where: {
        tenantId,
        deletedAt: null,
        disabled: false,
        isManager: true,
        managerPermissions: {
          has: OWNER_MANAGER_PERMISSION,
        },
        id: scopedEmployeeIds.length ? { in: scopedEmployeeIds } : undefined,
      },
      select: {
        id: true,
      },
    });

    return new Set<string>(managerEmployees.map((employee) => employee.id));
  }

  async isOwnerManagerEmployee(tenantId: string, employeeId: string) {
    const target = employeeId.trim();
    if (!target) {
      return false;
    }
    const matched = await this.getOwnerManagerEmployeeIds(tenantId, [target]);
    return matched.has(target);
  }

  private parseEmployeeActorId(rawUserId: string) {
    const value = rawUserId.trim();
    if (!value) {
      return '';
    }
    const match = /^(?:employee|kitchen-manager):(.+)$/i.exec(value);
    if (!match) {
      return '';
    }
    return match[1]?.trim() || '';
  }

  private async findKitchenManagerEmployee(tenantId: string, authUser: AuthUser) {
    const actorEmployeeId = this.parseEmployeeActorId(authUser.authUserId || '');
    const loginIdentifier = (
      authUser.name ||
      authUser.email ||
      authUser.authUserId
    ).trim();
    const conditions: {
      id?: string;
      fullName?: { equals: string; mode: 'insensitive' };
      displayName?: { equals: string; mode: 'insensitive' };
      email?: { equals: string; mode: 'insensitive' };
    }[] = [];

    if (actorEmployeeId) {
      conditions.push({ id: actorEmployeeId });
    }
    if (loginIdentifier) {
      conditions.push(
        { fullName: { equals: loginIdentifier, mode: 'insensitive' } },
        { displayName: { equals: loginIdentifier, mode: 'insensitive' } },
        { email: { equals: loginIdentifier, mode: 'insensitive' } },
      );
    }
    if (authUser.email?.trim()) {
      conditions.push({
        email: { equals: authUser.email.trim(), mode: 'insensitive' },
      });
    }

    if (conditions.length === 0) {
      return null;
    }

    return this.prisma.employee.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        disabled: false,
        isKitchenManager: true,
        AND: [{ OR: conditions }],
      },
      select: {
        id: true,
        fullName: true,
        displayName: true,
        officeId: true,
      },
    });
  }

  private resolveManagerFeatures(manager: {
    isManager: boolean;
    isAdmin: boolean;
    isTimeAdmin: boolean;
    isReports: boolean;
    managerPermissions: string[];
  }) {
    const configured = normalizeManagerFeatures(manager.managerPermissions);
    if (configured.length > 0) {
      const enabled = new Set<ManagerFeatureKey>([...configured, 'dashboard']);
      return allManagerFeatures().filter((feature) => enabled.has(feature));
    }

    const derived = new Set<ManagerFeatureKey>(['dashboard']);
    if (!manager.isManager && manager.isAdmin) {
      allManagerFeatures().forEach((feature) => derived.add(feature));
    }
    if (manager.isTimeAdmin) {
      derived.add('schedules');
      derived.add('timeEdits');
    }
    if (manager.isReports) {
      derived.add('reports');
      derived.add('tips');
      derived.add('salesCapture');
    }

    return allManagerFeatures().filter((feature) => derived.has(feature));
  }

  private filterTenantFeaturePermissions(
    features: ManagerFeatureKey[],
    companyOrdersEnabled: boolean,
  ) {
    if (companyOrdersEnabled) {
      return features;
    }
    return features.filter((feature) => feature !== 'companyOrders');
  }

  private hasOwnerManagerPermission(permissions: string[]) {
    return permissions.includes(OWNER_MANAGER_PERMISSION);
  }

  private makeTenantSlug(authUser: AuthUser): string {
    const base = slugify(authUser.tenantName || '') || 'tenant';
    return `${base}-${randomUUID().slice(0, 6)}`;
  }

  private parseRole(value: string): Role {
    if (Object.values(Role).includes(value as Role)) {
      return value as Role;
    }
    return Role.EMPLOYEE;
  }
}
