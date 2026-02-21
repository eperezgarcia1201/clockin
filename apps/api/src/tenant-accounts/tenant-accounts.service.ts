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
    companyOrdersEnabled: boolean;
    multiLocationEnabled: boolean;
    liquorInventoryEnabled: boolean;
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
    companyOrdersEnabled: boolean;
    multiLocationEnabled: boolean;
    liquorInventoryEnabled: boolean;
  };
  counts: {
    employees: number;
    memberships: number;
  };
  createdAt: string;
  updatedAt: string;
};

type TenantDataKey =
  | 'memberships'
  | 'locations'
  | 'offices'
  | 'groups'
  | 'employees'
  | 'statuses'
  | 'punches'
  | 'employeePunches'
  | 'timeEntries'
  | 'notifications'
  | 'adminDevices'
  | 'employeeSchedules'
  | 'scheduleOverrideRequests'
  | 'employeeTips'
  | 'dailySalesReports'
  | 'dailyExpenses'
  | 'companyOrders'
  | 'companyOrderItems'
  | 'liquorInventoryItems'
  | 'liquorInventoryMovements'
  | 'liquorInventoryCounts'
  | 'liquorBottleScans'
  | 'companyOrderCatalogOverrides';

type TenantDataSummaryItem = {
  key: TenantDataKey;
  label: string;
  count: number;
};

type TenantDeletionReport = {
  tenantId: string;
  tenantName: string;
  hasData: boolean;
  totalRecords: number;
  blockers: TenantDataSummaryItem[];
  generatedAt: string;
};

type TenantExportFormat = 'summary' | 'excel' | 'sql';

type TenantExportFile = {
  filename: string;
  contentType: string;
  content: Buffer;
};

type TenantExportDataset = {
  key: string;
  label: string;
  tableName: string;
  rows: Array<Record<string, unknown>>;
};

const TENANT_DATA_LABELS: Record<TenantDataKey, string> = {
  memberships: 'Memberships',
  locations: 'Locations',
  offices: 'Offices',
  groups: 'Groups',
  employees: 'Employees',
  statuses: 'Statuses',
  punches: 'Punches',
  employeePunches: 'Employee Punches',
  timeEntries: 'Time Entries',
  notifications: 'Notifications',
  adminDevices: 'Admin Devices',
  employeeSchedules: 'Employee Schedules',
  scheduleOverrideRequests: 'Schedule Override Requests',
  employeeTips: 'Employee Tips',
  dailySalesReports: 'Daily Sales Reports',
  dailyExpenses: 'Daily Expenses',
  companyOrders: 'Company Orders',
  companyOrderItems: 'Company Order Items',
  liquorInventoryItems: 'Liquor Inventory Items',
  liquorInventoryMovements: 'Liquor Inventory Movements',
  liquorInventoryCounts: 'Liquor Inventory Counts',
  liquorBottleScans: 'Liquor Bottle Scans',
  companyOrderCatalogOverrides: 'Company Order Catalog Overrides',
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
  companyOrdersEnabled: false,
  multiLocationEnabled: false,
  liquorInventoryEnabled: false,
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
            companyOrdersEnabled: true,
            multiLocationEnabled: true,
            liquorInventoryEnabled: true,
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
          companyOrdersEnabled: features.companyOrdersEnabled,
          multiLocationEnabled: features.multiLocationEnabled,
          liquorInventoryEnabled: features.liquorInventoryEnabled,
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
      dto.features?.companyOrdersEnabled !== undefined ||
      dto.features?.multiLocationEnabled !== undefined ||
      dto.features?.liquorInventoryEnabled !== undefined;

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
            companyOrdersEnabled:
              dto.features?.companyOrdersEnabled !== undefined
                ? dto.features.companyOrdersEnabled
                : undefined,
            multiLocationEnabled:
              dto.features?.multiLocationEnabled !== undefined
                ? dto.features.multiLocationEnabled
                : undefined,
            liquorInventoryEnabled:
              dto.features?.liquorInventoryEnabled !== undefined
                ? dto.features.liquorInventoryEnabled
                : undefined,
          },
          create: {
            tenantId,
            adminUsername:
              normalizedAdminUsername ?? this.normalizeAdminUsername(undefined),
            adminPasswordHash:
              adminPasswordHash ??
              (await hash(this.defaultAdminPassword(), 10)),
            timezone: dto.timezone?.trim() || DEFAULT_TIMEZONE,
            roundingMinutes: dto.roundingMinutes ?? DEFAULT_ROUNDING_MINUTES,
            requirePin: features.requirePin,
            reportsEnabled: features.reportsEnabled,
            allowManualTimeEdits: features.allowManualTimeEdits,
            dailySalesReportingEnabled: features.dailySalesReportingEnabled,
            companyOrdersEnabled: features.companyOrdersEnabled,
            multiLocationEnabled: features.multiLocationEnabled,
            liquorInventoryEnabled: features.liquorInventoryEnabled,
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

  async getTenantDeletionReport(authUser: AuthUser, tenantId: string) {
    const { tenant } = await this.resolveOwnerManagedTenant(authUser, tenantId);
    return this.buildTenantDeletionReport(tenant.id, tenant.name);
  }

  async exportTenantData(
    authUser: AuthUser,
    tenantId: string,
    format: TenantExportFormat,
  ): Promise<TenantExportFile> {
    const { tenant } = await this.resolveOwnerManagedTenant(authUser, tenantId);
    const report = await this.buildTenantDeletionReport(tenant.id, tenant.name);
    const datasets = await this.loadTenantExportDatasets(tenant.id);
    const safeSlug = slugify(tenant.slug || tenant.name) || tenant.id;

    if (format === 'excel') {
      const html = this.buildTenantExcelExport(report, datasets);
      return {
        filename: `tenant-data-${safeSlug}.xls`,
        contentType: 'application/vnd.ms-excel; charset=utf-8',
        content: Buffer.from(html, 'utf8'),
      };
    }

    if (format === 'sql') {
      const sql = this.buildTenantSqlExport(report, datasets);
      return {
        filename: `tenant-data-${safeSlug}.sql`,
        contentType: 'application/sql; charset=utf-8',
        content: Buffer.from(sql, 'utf8'),
      };
    }

    const text = this.buildTenantSummaryExport(report, datasets);
    return {
      filename: `tenant-data-${safeSlug}.txt`,
      contentType: 'text/plain; charset=utf-8',
      content: Buffer.from(text, 'utf8'),
    };
  }

  async deleteTenantAccount(
    authUser: AuthUser,
    tenantId: string,
    options?: { force?: boolean },
  ) {
    const { tenant } = await this.resolveOwnerManagedTenant(authUser, tenantId);
    const report = await this.buildTenantDeletionReport(tenant.id, tenant.name);
    const force = Boolean(options?.force);

    if (report.hasData && !force) {
      throw new BadRequestException({
        code: 'TENANT_HAS_DATA',
        message:
          'Tenant has existing data. Download exports and confirm permanent delete.',
        summary: report,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await this.purgeTenantData(tx, tenant.id);
      await tx.tenant.delete({ where: { id: tenant.id } });
    });

    return {
      ok: true,
      id: tenant.id,
      deletedRecords: report.totalRecords,
      force,
    };
  }

  private async resolveOwnerManagedTenant(authUser: AuthUser, tenantId: string) {
    const ownerContext = await this.requireOwner(authUser);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
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

    return { ownerContext, tenant };
  }

  private async buildTenantDeletionReport(
    tenantId: string,
    tenantName: string,
  ): Promise<TenantDeletionReport> {
    const counts = await this.prisma.$transaction(async (tx) =>
      this.countTenantData(tx, tenantId),
    );

    const blockers = (Object.keys(counts) as TenantDataKey[])
      .map((key) => ({
        key,
        label: TENANT_DATA_LABELS[key],
        count: counts[key],
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);

    const totalRecords = blockers.reduce(
      (total, item) => total + item.count,
      0,
    );

    return {
      tenantId,
      tenantName,
      hasData: totalRecords > 0,
      totalRecords,
      blockers,
      generatedAt: new Date().toISOString(),
    };
  }

  private async countTenantData(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ): Promise<Record<TenantDataKey, number>> {
    const [
      memberships,
      locations,
      offices,
      groups,
      employees,
      statuses,
      punches,
      employeePunches,
      timeEntries,
      notifications,
      adminDevices,
      employeeSchedules,
      scheduleOverrideRequests,
      employeeTips,
      dailySalesReports,
      dailyExpenses,
      companyOrders,
      companyOrderItems,
      liquorInventoryItems,
      liquorInventoryMovements,
      liquorInventoryCounts,
      liquorBottleScans,
      companyOrderCatalogOverrides,
    ] = await Promise.all([
      tx.membership.count({ where: { tenantId } }),
      tx.location.count({ where: { tenantId } }),
      tx.office.count({ where: { tenantId } }),
      tx.group.count({ where: { tenantId } }),
      tx.employee.count({ where: { tenantId } }),
      tx.punchStatus.count({ where: { tenantId } }),
      tx.punch.count({ where: { tenantId } }),
      tx.employeePunch.count({ where: { tenantId } }),
      tx.timeEntry.count({ where: { tenantId } }),
      tx.notification.count({ where: { tenantId } }),
      tx.adminDevice.count({ where: { tenantId } }),
      tx.employeeSchedule.count({ where: { tenantId } }),
      tx.scheduleOverrideRequest.count({ where: { tenantId } }),
      tx.employeeTip.count({ where: { tenantId } }),
      tx.dailySalesReport.count({ where: { tenantId } }),
      tx.dailyExpense.count({ where: { tenantId } }),
      tx.companyOrder.count({ where: { tenantId } }),
      tx.companyOrderItem.count({ where: { companyOrder: { tenantId } } }),
      tx.liquorInventoryItem.count({ where: { tenantId } }),
      tx.liquorInventoryMovement.count({ where: { tenantId } }),
      tx.liquorInventoryCount.count({ where: { tenantId } }),
      tx.liquorBottleScan.count({ where: { tenantId } }),
      this.countCompanyOrderCatalogOverrides(tx, tenantId),
    ]);

    return {
      memberships,
      locations,
      offices,
      groups,
      employees,
      statuses,
      punches,
      employeePunches,
      timeEntries,
      notifications,
      adminDevices,
      employeeSchedules,
      scheduleOverrideRequests,
      employeeTips,
      dailySalesReports,
      dailyExpenses,
      companyOrders,
      companyOrderItems,
      liquorInventoryItems,
      liquorInventoryMovements,
      liquorInventoryCounts,
      liquorBottleScans,
      companyOrderCatalogOverrides,
    };
  }

  private async purgeTenantData(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ) {
    await tx.dailyExpense.deleteMany({ where: { tenantId } });
    await tx.dailySalesReport.deleteMany({ where: { tenantId } });
    await tx.employeeTip.deleteMany({ where: { tenantId } });
    await tx.scheduleOverrideRequest.deleteMany({ where: { tenantId } });
    await tx.employeeSchedule.deleteMany({ where: { tenantId } });
    await tx.notification.deleteMany({ where: { tenantId } });
    await tx.liquorInventoryCount.deleteMany({ where: { tenantId } });
    await tx.liquorInventoryMovement.deleteMany({ where: { tenantId } });
    await tx.liquorBottleScan.deleteMany({ where: { tenantId } });
    await tx.liquorInventoryItem.deleteMany({ where: { tenantId } });
    await tx.companyOrder.deleteMany({ where: { tenantId } });
    await tx.employeePunch.deleteMany({ where: { tenantId } });
    await tx.punch.deleteMany({ where: { tenantId } });
    await tx.timeEntry.deleteMany({ where: { tenantId } });
    await tx.adminDevice.deleteMany({ where: { tenantId } });
    await tx.punchStatus.deleteMany({ where: { tenantId } });
    await tx.employee.deleteMany({ where: { tenantId } });
    await tx.group.deleteMany({ where: { tenantId } });
    await tx.office.deleteMany({ where: { tenantId } });
    await tx.location.deleteMany({ where: { tenantId } });
    await tx.membership.deleteMany({ where: { tenantId } });
    await tx.tenantSettings.deleteMany({ where: { tenantId } });
    await this.deleteCompanyOrderCatalogOverrides(tx, tenantId);
  }

  private async loadTenantExportDatasets(
    tenantId: string,
  ): Promise<TenantExportDataset[]> {
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) {
        throw new NotFoundException('Tenant account not found.');
      }

      const [
        tenantSettings,
        memberships,
        locations,
        offices,
        groups,
        employees,
        statuses,
        punches,
        employeePunches,
        timeEntries,
        notifications,
        adminDevices,
        employeeSchedules,
        scheduleOverrideRequests,
        employeeTips,
        dailySalesReports,
        dailyExpenses,
        companyOrders,
        companyOrderItems,
        liquorInventoryItems,
        liquorInventoryMovements,
        liquorInventoryCounts,
        liquorBottleScans,
        companyOrderCatalogOverrides,
      ] = await Promise.all([
        tx.tenantSettings.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'asc' },
        }),
        tx.membership.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'asc' },
        }),
        tx.location.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'asc' },
        }),
        tx.office.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'asc' },
        }),
        tx.group.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'asc' },
        }),
        tx.employee.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'asc' },
        }),
        tx.punchStatus.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'asc' },
        }),
        tx.punch.findMany({
          where: { tenantId },
          orderBy: { occurredAt: 'asc' },
        }),
        tx.employeePunch.findMany({
          where: { tenantId },
          orderBy: { occurredAt: 'asc' },
        }),
        tx.timeEntry.findMany({
          where: { tenantId },
          orderBy: { startedAt: 'asc' },
        }),
        tx.notification.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'asc' },
        }),
        tx.adminDevice.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'asc' },
        }),
        tx.employeeSchedule.findMany({
          where: { tenantId },
          orderBy: [{ employeeId: 'asc' }, { weekday: 'asc' }],
        }),
        tx.scheduleOverrideRequest.findMany({
          where: { tenantId },
          orderBy: [{ workDate: 'asc' }, { createdAt: 'asc' }],
        }),
        tx.employeeTip.findMany({
          where: { tenantId },
          orderBy: [{ workDate: 'asc' }, { createdAt: 'asc' }],
        }),
        tx.dailySalesReport.findMany({
          where: { tenantId },
          orderBy: { reportDate: 'asc' },
        }),
        tx.dailyExpense.findMany({
          where: { tenantId },
          orderBy: [{ expenseDate: 'asc' }, { createdAt: 'asc' }],
        }),
        tx.companyOrder.findMany({
          where: { tenantId },
          orderBy: [{ orderDate: 'asc' }, { createdAt: 'asc' }],
        }),
        tx.companyOrderItem.findMany({
          where: { companyOrder: { tenantId } },
          orderBy: [{ companyOrderId: 'asc' }, { createdAt: 'asc' }],
        }),
        tx.liquorInventoryItem.findMany({
          where: { tenantId },
          orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
        }),
        tx.liquorInventoryMovement.findMany({
          where: { tenantId },
          orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }],
        }),
        tx.liquorInventoryCount.findMany({
          where: { tenantId },
          orderBy: [{ countDate: 'asc' }, { createdAt: 'asc' }],
        }),
        tx.liquorBottleScan.findMany({
          where: { tenantId },
          orderBy: [{ measuredAt: 'asc' }, { createdAt: 'asc' }],
        }),
        this.loadCompanyOrderCatalogOverrides(tx, tenantId),
      ]);

      const userIds = new Set<string>();
      memberships.forEach((row) => {
        userIds.add(row.userId);
      });
      punches.forEach((row) => {
        userIds.add(row.userId);
      });
      timeEntries.forEach((row) => {
        userIds.add(row.userId);
      });
      dailySalesReports.forEach((row) => {
        if (row.submittedByUserId) {
          userIds.add(row.submittedByUserId);
        }
      });
      dailyExpenses.forEach((row) => {
        if (row.submittedByUserId) {
          userIds.add(row.submittedByUserId);
        }
      });
      scheduleOverrideRequests.forEach((row) => {
        if (row.approvedByUserId) {
          userIds.add(row.approvedByUserId);
        }
        if (row.rejectedByUserId) {
          userIds.add(row.rejectedByUserId);
        }
      });

      const users =
        userIds.size > 0
          ? await tx.user.findMany({
              where: { id: { in: Array.from(userIds) } },
              orderBy: { createdAt: 'asc' },
            })
          : [];

      return [
        {
          key: 'tenant',
          label: 'Tenant Profile',
          tableName: 'Tenant',
          rows: this.toRows([tenant]),
        },
        {
          key: 'tenantSettings',
          label: 'Tenant Settings',
          tableName: 'TenantSettings',
          rows: this.toRows(tenantSettings),
        },
        {
          key: 'users',
          label: 'Referenced Users',
          tableName: 'User',
          rows: this.toRows(users),
        },
        {
          key: 'memberships',
          label: 'Memberships',
          tableName: 'Membership',
          rows: this.toRows(memberships),
        },
        {
          key: 'locations',
          label: 'Locations',
          tableName: 'Location',
          rows: this.toRows(locations),
        },
        {
          key: 'offices',
          label: 'Offices',
          tableName: 'Office',
          rows: this.toRows(offices),
        },
        {
          key: 'groups',
          label: 'Groups',
          tableName: 'Group',
          rows: this.toRows(groups),
        },
        {
          key: 'employees',
          label: 'Employees',
          tableName: 'Employee',
          rows: this.toRows(employees),
        },
        {
          key: 'statuses',
          label: 'Punch Statuses',
          tableName: 'PunchStatus',
          rows: this.toRows(statuses),
        },
        {
          key: 'punches',
          label: 'User Punches',
          tableName: 'Punch',
          rows: this.toRows(punches),
        },
        {
          key: 'employeePunches',
          label: 'Employee Punches',
          tableName: 'EmployeePunch',
          rows: this.toRows(employeePunches),
        },
        {
          key: 'timeEntries',
          label: 'Time Entries',
          tableName: 'TimeEntry',
          rows: this.toRows(timeEntries),
        },
        {
          key: 'notifications',
          label: 'Notifications',
          tableName: 'Notification',
          rows: this.toRows(notifications),
        },
        {
          key: 'adminDevices',
          label: 'Admin Devices',
          tableName: 'AdminDevice',
          rows: this.toRows(adminDevices),
        },
        {
          key: 'employeeSchedules',
          label: 'Employee Schedules',
          tableName: 'EmployeeSchedule',
          rows: this.toRows(employeeSchedules),
        },
        {
          key: 'scheduleOverrideRequests',
          label: 'Schedule Override Requests',
          tableName: 'ScheduleOverrideRequest',
          rows: this.toRows(scheduleOverrideRequests),
        },
        {
          key: 'employeeTips',
          label: 'Employee Tips',
          tableName: 'EmployeeTip',
          rows: this.toRows(employeeTips),
        },
        {
          key: 'dailySalesReports',
          label: 'Daily Sales Reports',
          tableName: 'DailySalesReport',
          rows: this.toRows(dailySalesReports),
        },
        {
          key: 'dailyExpenses',
          label: 'Daily Expenses',
          tableName: 'DailyExpense',
          rows: this.toRows(dailyExpenses),
        },
        {
          key: 'companyOrders',
          label: 'Company Orders',
          tableName: 'CompanyOrder',
          rows: this.toRows(companyOrders),
        },
        {
          key: 'companyOrderItems',
          label: 'Company Order Items',
          tableName: 'CompanyOrderItem',
          rows: this.toRows(companyOrderItems),
        },
        {
          key: 'liquorInventoryItems',
          label: 'Liquor Inventory Items',
          tableName: 'LiquorInventoryItem',
          rows: this.toRows(liquorInventoryItems),
        },
        {
          key: 'liquorInventoryMovements',
          label: 'Liquor Inventory Movements',
          tableName: 'LiquorInventoryMovement',
          rows: this.toRows(liquorInventoryMovements),
        },
        {
          key: 'liquorInventoryCounts',
          label: 'Liquor Inventory Counts',
          tableName: 'LiquorInventoryCount',
          rows: this.toRows(liquorInventoryCounts),
        },
        {
          key: 'liquorBottleScans',
          label: 'Liquor Bottle Scans',
          tableName: 'LiquorBottleScan',
          rows: this.toRows(liquorBottleScans),
        },
        {
          key: 'companyOrderCatalogOverrides',
          label: 'Company Order Catalog Overrides',
          tableName: 'CompanyOrderCatalogOverride',
          rows: companyOrderCatalogOverrides,
        },
      ];
    });
  }

  private toRows<T extends object>(rows: T[]): Array<Record<string, unknown>> {
    return rows.map((row) => row as unknown as Record<string, unknown>);
  }

  private buildTenantSummaryExport(
    report: TenantDeletionReport,
    datasets: TenantExportDataset[],
  ) {
    const lines: string[] = [];
    lines.push('ClockIn Tenant Data Export');
    lines.push('========================');
    lines.push(`Tenant: ${report.tenantName}`);
    lines.push(`Tenant ID: ${report.tenantId}`);
    lines.push(`Generated: ${report.generatedAt}`);
    lines.push(`Total Records: ${report.totalRecords}`);
    lines.push('');
    lines.push('Data Summary');
    lines.push('------------');
    if (report.blockers.length === 0) {
      lines.push('No tenant-owned data rows were found.');
    } else {
      report.blockers.forEach((item) => {
        lines.push(`- ${item.label}: ${item.count}`);
      });
    }

    datasets.forEach((dataset) => {
      lines.push('');
      lines.push(`${dataset.label} (${dataset.rows.length})`);
      lines.push('-'.repeat(Math.max(12, dataset.label.length + 6)));

      if (!dataset.rows.length) {
        lines.push('No records.');
        return;
      }

      dataset.rows.forEach((row, index) => {
        lines.push(`Record ${index + 1}`);
        Object.entries(row).forEach(([key, value]) => {
          lines.push(
            `  ${this.humanizeFieldLabel(key)}: ${this.formatReadableValue(value)}`,
          );
        });
      });
    });

    return lines.join('\n');
  }

  private buildTenantExcelExport(
    report: TenantDeletionReport,
    datasets: TenantExportDataset[],
  ) {
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const sections = datasets
      .map((dataset) => {
        if (!dataset.rows.length) {
          return `<h2>${escapeHtml(dataset.label)} (0)</h2><p>No records.</p>`;
        }

        const columns = this.resolveDatasetColumns(dataset.rows);
        const header = columns
          .map((column) => `<th>${escapeHtml(this.humanizeFieldLabel(column))}</th>`)
          .join('');
        const body = dataset.rows
          .map((row) => {
            const cells = columns
              .map((column) =>
                `<td>${escapeHtml(this.formatReadableValue(row[column]))}</td>`,
              )
              .join('');
            return `<tr>${cells}</tr>`;
          })
          .join('');

        return `<h2>${escapeHtml(dataset.label)} (${dataset.rows.length})</h2><table border="1"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
      })
      .join('');

    return `<!doctype html><html><head><meta charset="utf-8" /></head><body><h1>ClockIn Tenant Data Export</h1><p><strong>Tenant:</strong> ${escapeHtml(report.tenantName)}</p><p><strong>Tenant ID:</strong> ${escapeHtml(report.tenantId)}</p><p><strong>Generated:</strong> ${escapeHtml(report.generatedAt)}</p><p><strong>Total Records:</strong> ${report.totalRecords}</p>${sections}</body></html>`;
  }

  private buildTenantSqlExport(
    report: TenantDeletionReport,
    datasets: TenantExportDataset[],
  ) {
    const lines: string[] = [];
    lines.push('-- ClockIn Tenant SQL Export');
    lines.push(`-- Tenant: ${report.tenantName} (${report.tenantId})`);
    lines.push(`-- Generated: ${report.generatedAt}`);
    lines.push(`-- Total Records: ${report.totalRecords}`);
    lines.push('BEGIN;');
    lines.push('');

    datasets.forEach((dataset) => {
      lines.push(`-- ${dataset.label} (${dataset.rows.length})`);
      if (!dataset.rows.length) {
        lines.push('');
        return;
      }

      if (dataset.key === 'companyOrderCatalogOverrides') {
        lines.push('-- Requires table "CompanyOrderCatalogOverride" to exist.');
      }

      dataset.rows.forEach((row) => {
        const columns = Object.keys(row);
        if (!columns.length) {
          return;
        }
        const columnList = columns.map((column) => `"${column}"`).join(', ');
        const values = columns
          .map((column) => this.toSqlLiteral(row[column]))
          .join(', ');
        lines.push(
          `INSERT INTO "${dataset.tableName}" (${columnList}) VALUES (${values});`,
        );
      });
      lines.push('');
    });

    lines.push('COMMIT;');
    return lines.join('\n');
  }

  private resolveDatasetColumns(rows: Array<Record<string, unknown>>) {
    const columns = new Set<string>();
    rows.forEach((row) => {
      Object.keys(row).forEach((column) => columns.add(column));
    });
    return Array.from(columns.values());
  }

  private humanizeFieldLabel(key: string) {
    return key
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (value) => value.toUpperCase());
  }

  private formatReadableValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (Buffer.isBuffer(value)) {
      return `${value.length} bytes (base64)`;
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.formatReadableValue(item)).join(', ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private toSqlLiteral(value: unknown): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (value instanceof Date) {
      return `'${this.escapeSqlString(value.toISOString())}'::timestamptz`;
    }
    if (Buffer.isBuffer(value)) {
      return `decode('${value.toString('base64')}', 'base64')`;
    }
    if (Array.isArray(value)) {
      return `ARRAY[${value.map((item) => this.toSqlLiteral(item)).join(', ')}]`;
    }
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? String(value) : 'NULL';
    }
    if (typeof value === 'object') {
      return `'${this.escapeSqlString(JSON.stringify(value))}'::jsonb`;
    }
    return `'${this.escapeSqlString(String(value))}'`;
  }

  private escapeSqlString(value: string) {
    return value.replace(/'/g, "''");
  }

  private async companyOrderCatalogOverridesTableExists(
    tx: Prisma.TransactionClient,
  ) {
    const rows = await tx.$queryRawUnsafe<Array<{ tableName: string | null }>>(
      'SELECT to_regclass(\'"CompanyOrderCatalogOverride"\')::text AS "tableName"',
    );
    return Boolean(rows[0]?.tableName);
  }

  private parseNumericCount(value: unknown) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return Math.floor(parsed);
  }

  private async countCompanyOrderCatalogOverrides(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ) {
    const hasTable = await this.companyOrderCatalogOverridesTableExists(tx);
    if (!hasTable) {
      return 0;
    }
    const rows = await tx.$queryRawUnsafe<Array<{ count: unknown }>>(
      'SELECT COUNT(*)::bigint AS "count" FROM "CompanyOrderCatalogOverride" WHERE "tenantId" = $1',
      tenantId,
    );
    return this.parseNumericCount(rows[0]?.count);
  }

  private async loadCompanyOrderCatalogOverrides(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ) {
    const hasTable = await this.companyOrderCatalogOverridesTableExists(tx);
    if (!hasTable) {
      return [] as Array<Record<string, unknown>>;
    }

    const rows = await tx.$queryRawUnsafe<
      Array<{
        tenantId: string;
        catalogJson: unknown;
        updatedAt: Date | string;
      }>
    >(
      'SELECT "tenantId", "catalogJson", "updatedAt" FROM "CompanyOrderCatalogOverride" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC',
      tenantId,
    );

    return rows.map((row) => ({
      tenantId: row.tenantId,
      catalogJson: row.catalogJson,
      updatedAt:
        row.updatedAt instanceof Date
          ? row.updatedAt
          : new Date(String(row.updatedAt)),
    }));
  }

  private async deleteCompanyOrderCatalogOverrides(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ) {
    const hasTable = await this.companyOrderCatalogOverridesTableExists(tx);
    if (!hasTable) {
      return;
    }
    await tx.$executeRawUnsafe(
      'DELETE FROM "CompanyOrderCatalogOverride" WHERE "tenantId" = $1',
      tenantId,
    );
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
      companyOrdersEnabled:
        features?.companyOrdersEnabled ?? defaults.companyOrdersEnabled,
      multiLocationEnabled:
        features?.multiLocationEnabled ?? defaults.multiLocationEnabled,
      liquorInventoryEnabled:
        features?.liquorInventoryEnabled ?? defaults.liquorInventoryEnabled,
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
            companyOrdersEnabled: true,
            multiLocationEnabled: true,
            liquorInventoryEnabled: true,
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
        companyOrdersEnabled:
          tenant.settings?.companyOrdersEnabled ??
          defaults.companyOrdersEnabled,
        multiLocationEnabled:
          tenant.settings?.multiLocationEnabled ??
          defaults.multiLocationEnabled,
        liquorInventoryEnabled:
          tenant.settings?.liquorInventoryEnabled ??
          defaults.liquorInventoryEnabled,
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
