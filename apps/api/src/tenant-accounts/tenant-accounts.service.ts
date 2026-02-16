import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipStatus, Prisma, Role } from '@prisma/client';
import { hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import type {
  CreateTenantAccountDto,
  TenantFeaturesDto,
} from './dto/create-tenant-account.dto';
import type { UpdateTenantAccountDto } from './dto/update-tenant-account.dto';

type TenantAccountRecord = {
  id: string;
  name: string;
  slug: string;
  authOrgId: string;
  ownerEmail: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  settings: {
    adminUsername: string;
    timezone: string;
    roundingMinutes: number;
    requirePin: boolean;
    reportsEnabled: boolean;
    allowManualTimeEdits: boolean;
    dailySalesReportingEnabled: boolean;
    multiLocationEnabled: boolean;
  } | null;
  memberships: {
    user: {
      email: string;
      name: string | null;
    };
  }[];
  _count: {
    employees: number;
    memberships: number;
  };
};

type TenantAccountResponse = {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  authOrgId: string;
  adminUsername: string;
  ownerEmail: string | null;
  ownerName: string | null;
  isActive: boolean;
  timezone: string;
  roundingMinutes: number;
  features: {
    requirePin: boolean;
    reportsEnabled: boolean;
    allowManualTimeEdits: boolean;
    dailySalesReportingEnabled: boolean;
    multiLocationEnabled: boolean;
  };
  counts: {
    employees: number;
    memberships: number;
  };
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_TIMEZONE = 'America/New_York';
const DEFAULT_ROUNDING_MINUTES = 15;
const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = '1234qwer';

const defaultFeatures = () => ({
  requirePin: true,
  reportsEnabled: true,
  allowManualTimeEdits: true,
  dailySalesReportingEnabled: false,
  multiLocationEnabled: false,
});

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

@Injectable()
export class TenantAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  async listTenantAccounts(authUser: AuthUser) {
    await this.requireOwner(authUser);

    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        settings: {
          select: {
            adminUsername: true,
            timezone: true,
            roundingMinutes: true,
            requirePin: true,
            reportsEnabled: true,
            allowManualTimeEdits: true,
            dailySalesReportingEnabled: true,
            multiLocationEnabled: true,
          },
        },
        memberships: {
          where: {
            role: Role.OWNER,
            status: MembershipStatus.ACTIVE,
          },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: {
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            employees: true,
            memberships: true,
          },
        },
      },
    });

    return {
      tenants: tenants.map((tenant) =>
        this.toTenantAccountResponse(tenant as TenantAccountRecord),
      ),
    };
  }

  async getTenantAccount(authUser: AuthUser, tenantId: string) {
    await this.requireOwner(authUser);

    const tenant = await this.findTenantAccount(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant account not found.');
    }

    return this.toTenantAccountResponse(tenant);
  }

  async createTenantAccount(authUser: AuthUser, dto: CreateTenantAccountDto) {
    await this.requireOwner(authUser);

    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Tenant name is required.');
    }

    const requestedSlug = slugify(dto.subdomain || dto.slug || name);
    if (!requestedSlug) {
      throw new BadRequestException(
        'Tenant slug must contain at least one letter or number.',
      );
    }

    const slug = await this.resolveUniqueSlug(requestedSlug);
    const requestedAuthOrgId = (dto.authOrgId || `local-${slug}`).trim();
    const authOrgId = await this.resolveUniqueAuthOrgId(requestedAuthOrgId);
    const features = this.normalizeFeatures(dto.features);

    const adminUsername = this.normalizeAdminUsername(dto.adminUsername);
    const adminPassword =
      dto.adminPassword !== undefined
        ? this.parseAdminPassword(dto.adminPassword)
        : this.defaultAdminPassword();
    const adminPasswordHash = await hash(adminPassword, 10);

    const tenantId = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          authOrgId,
          name,
          slug,
          ownerEmail: dto.ownerEmail?.trim().toLowerCase() || null,
          isActive: dto.isActive ?? true,
        },
      });

      await tx.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          adminUsername,
          adminPasswordHash,
          timezone: dto.timezone?.trim() || DEFAULT_TIMEZONE,
          roundingMinutes: dto.roundingMinutes ?? DEFAULT_ROUNDING_MINUTES,
          requirePin: features.requirePin,
          reportsEnabled: features.reportsEnabled,
          allowManualTimeEdits: features.allowManualTimeEdits,
          dailySalesReportingEnabled: features.dailySalesReportingEnabled,
          multiLocationEnabled: features.multiLocationEnabled,
          ipRestrictions: null,
        },
      });

      await this.ensureOwnerMembership(tx, tenant.id, {
        ownerEmail: dto.ownerEmail,
        ownerName: dto.ownerName,
      });

      return tenant.id;
    });

    const tenant = await this.findTenantAccount(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant account not found after creation.');
    }
    return this.toTenantAccountResponse(tenant);
  }

  async updateTenantAccount(
    authUser: AuthUser,
    tenantId: string,
    dto: UpdateTenantAccountDto,
  ) {
    const ownerContext = await this.requireOwner(authUser);
    const existing = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Tenant account not found.');
    }

    if (dto.isActive === false && ownerContext.tenant.id === tenantId) {
      throw new BadRequestException(
        'You cannot disable your own tenant account.',
      );
    }

    const updates: Prisma.TenantUpdateInput = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) {
        throw new BadRequestException('Tenant name cannot be empty.');
      }
      updates.name = name;
    }

    const slugInput = dto.subdomain ?? dto.slug;
    if (slugInput !== undefined) {
      const requestedSlug = slugify(slugInput);
      if (!requestedSlug) {
        throw new BadRequestException(
          'Tenant slug must contain at least one letter or number.',
        );
      }
      updates.slug = await this.resolveUniqueSlug(requestedSlug, tenantId);
    }

    if (dto.authOrgId !== undefined) {
      const requestedAuthOrgId = dto.authOrgId.trim();
      if (!requestedAuthOrgId) {
        throw new BadRequestException('Auth organization ID cannot be empty.');
      }
      updates.authOrgId = await this.resolveUniqueAuthOrgId(
        requestedAuthOrgId,
        tenantId,
      );
    }

    if (dto.ownerEmail !== undefined) {
      updates.ownerEmail = dto.ownerEmail.trim().toLowerCase();
    }

    if (dto.isActive !== undefined) {
      updates.isActive = dto.isActive;
    }

    const normalizedAdminUsername =
      dto.adminUsername !== undefined
        ? this.normalizeAdminUsername(dto.adminUsername)
        : undefined;
    const adminPasswordHash =
      dto.adminPassword !== undefined
        ? await hash(this.parseAdminPassword(dto.adminPassword), 10)
        : undefined;

    const hasFeaturesUpdate =
      dto.features?.requirePin !== undefined ||
      dto.features?.reportsEnabled !== undefined ||
      dto.features?.allowManualTimeEdits !== undefined ||
      dto.features?.dailySalesReportingEnabled !== undefined ||
      dto.features?.multiLocationEnabled !== undefined;

    const hasSettingsUpdate =
      hasFeaturesUpdate ||
      dto.timezone !== undefined ||
      dto.roundingMinutes !== undefined ||
      normalizedAdminUsername !== undefined ||
      adminPasswordHash !== undefined;

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(updates).length > 0) {
        await tx.tenant.update({
          where: { id: tenantId },
          data: updates,
        });
      }

      if (hasSettingsUpdate) {
        const features = this.normalizeFeatures(dto.features);
        await tx.tenantSettings.upsert({
          where: { tenantId },
          update: {
            adminUsername: normalizedAdminUsername,
            adminPasswordHash,
            timezone: dto.timezone?.trim() || undefined,
            roundingMinutes: dto.roundingMinutes ?? undefined,
            requirePin:
              dto.features?.requirePin !== undefined
                ? dto.features.requirePin
                : undefined,
            reportsEnabled:
              dto.features?.reportsEnabled !== undefined
                ? dto.features.reportsEnabled
                : undefined,
            allowManualTimeEdits:
              dto.features?.allowManualTimeEdits !== undefined
                ? dto.features.allowManualTimeEdits
                : undefined,
            dailySalesReportingEnabled:
              dto.features?.dailySalesReportingEnabled !== undefined
                ? dto.features.dailySalesReportingEnabled
                : undefined,
            multiLocationEnabled:
              dto.features?.multiLocationEnabled !== undefined
                ? dto.features.multiLocationEnabled
                : undefined,
          },
          create: {
            tenantId,
            adminUsername:
              normalizedAdminUsername ?? this.normalizeAdminUsername(undefined),
            adminPasswordHash:
              adminPasswordHash ?? (await hash(this.defaultAdminPassword(), 10)),
            timezone: dto.timezone?.trim() || DEFAULT_TIMEZONE,
            roundingMinutes: dto.roundingMinutes ?? DEFAULT_ROUNDING_MINUTES,
            requirePin: features.requirePin,
            reportsEnabled: features.reportsEnabled,
            allowManualTimeEdits: features.allowManualTimeEdits,
            dailySalesReportingEnabled: features.dailySalesReportingEnabled,
            multiLocationEnabled: features.multiLocationEnabled,
            ipRestrictions: null,
          },
        });
      }

      if (dto.ownerEmail !== undefined || dto.ownerName !== undefined) {
        await this.ensureOwnerMembership(tx, tenantId, {
          ownerEmail: dto.ownerEmail || undefined,
          ownerName: dto.ownerName,
        });
      }
    });

    const tenant = await this.findTenantAccount(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant account not found after update.');
    }
    return this.toTenantAccountResponse(tenant);
  }

  async deleteTenantAccount(authUser: AuthUser, tenantId: string) {
    const ownerContext = await this.requireOwner(authUser);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            memberships: true,
            locations: true,
            offices: true,
            groups: true,
            employees: true,
            statuses: true,
            punches: true,
            employeePunches: true,
            timeEntries: true,
            notifications: true,
            adminDevices: true,
            employeeSchedules: true,
            employeeTips: true,
            dailySalesReports: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant account not found.');
    }

    if (ownerContext.tenant.id === tenantId) {
      throw new BadRequestException(
        'You cannot delete your own tenant account.',
      );
    }

    const totalRelated =
      tenant._count.memberships +
      tenant._count.locations +
      tenant._count.offices +
      tenant._count.groups +
      tenant._count.employees +
      tenant._count.statuses +
      tenant._count.punches +
      tenant._count.employeePunches +
      tenant._count.timeEntries +
      tenant._count.notifications +
      tenant._count.adminDevices +
      tenant._count.employeeSchedules +
      tenant._count.employeeTips +
      tenant._count.dailySalesReports;

    if (totalRelated > 0) {
      throw new BadRequestException(
        'Cannot delete a tenant that already has data. Deactivate it instead.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.tenantSettings.deleteMany({ where: { tenantId } });
      await tx.tenant.delete({ where: { id: tenantId } });
    });

    return { ok: true, id: tenantId };
  }

  private async requireOwner(authUser: AuthUser) {
    const context = await this.tenancy.requireTenantAndUser(authUser);
    if (
      context.membership.role !== Role.OWNER ||
      context.membership.status !== MembershipStatus.ACTIVE
    ) {
      throw new ForbiddenException(
        'Only active owners can manage tenant accounts.',
      );
    }
    return context;
  }

  private normalizeFeatures(features?: TenantFeaturesDto) {
    const defaults = defaultFeatures();
    return {
      requirePin: features?.requirePin ?? defaults.requirePin,
      reportsEnabled: features?.reportsEnabled ?? defaults.reportsEnabled,
      allowManualTimeEdits:
        features?.allowManualTimeEdits ?? defaults.allowManualTimeEdits,
      dailySalesReportingEnabled:
        features?.dailySalesReportingEnabled ??
        defaults.dailySalesReportingEnabled,
      multiLocationEnabled:
        features?.multiLocationEnabled ?? defaults.multiLocationEnabled,
    };
  }

  private normalizeAdminUsername(value?: string) {
    const username = (value || DEFAULT_ADMIN_USERNAME).trim();
    if (!username) {
      throw new BadRequestException('Admin username cannot be empty.');
    }
    return username;
  }

  private parseAdminPassword(value: string) {
    const password = value.trim();
    if (!password) {
      throw new BadRequestException('Admin password cannot be empty.');
    }
    return password;
  }

  private defaultAdminPassword() {
    return (
      process.env.TENANT_ADMIN_DEFAULT_PASSWORD ||
      process.env.ADMIN_PASSWORD ||
      DEFAULT_ADMIN_PASSWORD
    );
  }

  private async resolveUniqueSlug(base: string, excludeTenantId?: string) {
    let slug = base;
    let attempt = 0;
    while (true) {
      const existing = await this.prisma.tenant.findUnique({
        where: { slug },
      });
      if (!existing || existing.id === excludeTenantId) {
        return slug;
      }

      attempt += 1;
      slug = `${base}-${attempt}`;
    }
  }

  private async resolveUniqueAuthOrgId(base: string, excludeTenantId?: string) {
    let authOrgId = base;
    let attempt = 0;
    while (true) {
      const existing = await this.prisma.tenant.findUnique({
        where: { authOrgId },
      });
      if (!existing || existing.id === excludeTenantId) {
        return authOrgId;
      }

      attempt += 1;
      authOrgId = `${base}-${attempt}`;
    }
  }

  private async ensureOwnerMembership(
    tx: Prisma.TransactionClient,
    tenantId: string,
    {
      ownerEmail,
      ownerName,
    }: {
      ownerEmail?: string;
      ownerName?: string;
    },
  ) {
    if (!ownerEmail) {
      return;
    }

    const normalizedEmail = ownerEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      return;
    }

    let user = await tx.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      user = await tx.user.create({
        data: {
          authUserId: `local-owner-${randomUUID()}`,
          email: normalizedEmail,
          name: ownerName?.trim() || null,
        },
      });
    } else if (ownerName?.trim() && !user.name) {
      user = await tx.user.update({
        where: { id: user.id },
        data: { name: ownerName.trim() },
      });
    }

    await tx.membership.upsert({
      where: {
        tenantId_userId: {
          tenantId,
          userId: user.id,
        },
      },
      update: {
        role: Role.OWNER,
        status: MembershipStatus.ACTIVE,
      },
      create: {
        tenantId,
        userId: user.id,
        role: Role.OWNER,
        status: MembershipStatus.ACTIVE,
      },
    });
  }

  private async findTenantAccount(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        settings: {
          select: {
            adminUsername: true,
            timezone: true,
            roundingMinutes: true,
            requirePin: true,
            reportsEnabled: true,
            allowManualTimeEdits: true,
            dailySalesReportingEnabled: true,
            multiLocationEnabled: true,
          },
        },
        memberships: {
          where: {
            role: Role.OWNER,
            status: MembershipStatus.ACTIVE,
          },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: {
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            employees: true,
            memberships: true,
          },
        },
      },
    });

    return tenant as TenantAccountRecord | null;
  }

  private toTenantAccountResponse(
    tenant: TenantAccountRecord,
  ): TenantAccountResponse {
    const defaults = defaultFeatures();
    const owner = tenant.memberships[0]?.user;
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      subdomain: tenant.slug,
      authOrgId: tenant.authOrgId,
      adminUsername: tenant.settings?.adminUsername || DEFAULT_ADMIN_USERNAME,
      ownerEmail: tenant.ownerEmail || owner?.email || null,
      ownerName: owner?.name || null,
      isActive: tenant.isActive,
      timezone: tenant.settings?.timezone || DEFAULT_TIMEZONE,
      roundingMinutes:
        tenant.settings?.roundingMinutes ?? DEFAULT_ROUNDING_MINUTES,
      features: {
        requirePin: tenant.settings?.requirePin ?? defaults.requirePin,
        reportsEnabled:
          tenant.settings?.reportsEnabled ?? defaults.reportsEnabled,
        allowManualTimeEdits:
          tenant.settings?.allowManualTimeEdits ??
          defaults.allowManualTimeEdits,
        dailySalesReportingEnabled:
          tenant.settings?.dailySalesReportingEnabled ??
          defaults.dailySalesReportingEnabled,
        multiLocationEnabled:
          tenant.settings?.multiLocationEnabled ??
          defaults.multiLocationEnabled,
      },
      counts: {
        employees: tenant._count.employees,
        memberships: tenant._count.memberships,
      },
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    };
  }
}
