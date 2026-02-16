import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Tenant } from '@prisma/client';
import { compare } from 'bcryptjs';
import { timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  allManagerFeatures,
  normalizeManagerFeatures,
} from '../tenancy/manager-features';
import type { TenantAdminLoginDto } from './dto/admin-login.dto';
import type { ResolveTenantDto } from './dto/resolve-tenant.dto';

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const RESERVED_SUBDOMAINS = new Set([
  'www',
  'app',
  'api',
  'admin',
  'owner',
  'localhost',
]);

const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = '1234qwer';

@Injectable()
export class TenantDirectoryService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(dto: ResolveTenantDto) {
    const tenantInput = dto.tenant?.trim() || '';
    const hostInput = dto.host?.trim() || '';

    if (!tenantInput && !hostInput) {
      throw new BadRequestException('Tenant is required.');
    }

    const tenant = await this.resolveTenantRecord(tenantInput, hostInput);

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      subdomain: tenant.slug,
      authOrgId: tenant.authOrgId,
      isActive: tenant.isActive,
    };
  }

  async employeeContext(dto: ResolveTenantDto) {
    const tenantInput = dto.tenant?.trim() || '';
    const hostInput = dto.host?.trim() || '';

    if (!tenantInput && !hostInput) {
      throw new BadRequestException('Tenant is required.');
    }

    const tenant = await this.resolveTenantRecord(tenantInput, hostInput);
    const [settings, offices] = await Promise.all([
      this.prisma.tenantSettings.findUnique({
        where: { tenantId: tenant.id },
        select: {
          adminUsername: true,
          multiLocationEnabled: true,
        },
      }),
      this.prisma.office.findMany({
        where: { tenantId: tenant.id },
        select: {
          id: true,
          name: true,
        },
        orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
      }),
    ]);

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      subdomain: tenant.slug,
      authOrgId: tenant.authOrgId,
      isActive: tenant.isActive,
      adminUsername: settings?.adminUsername || DEFAULT_ADMIN_USERNAME,
      multiLocationEnabled: settings?.multiLocationEnabled ?? false,
      offices,
    };
  }

  async verifyAdminLogin(dto: TenantAdminLoginDto) {
    const tenantInput = dto.tenant?.trim() || '';
    const hostInput = dto.host?.trim() || '';
    const username = dto.username?.trim() || '';
    const password = dto.password || '';

    if (!tenantInput || !username || !password) {
      throw new UnauthorizedException('Invalid administrator credentials.');
    }

    const tenant = await this.resolveTenantRecord(tenantInput, hostInput);

    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
      select: {
        adminUsername: true,
        adminPasswordHash: true,
      },
    });

    const expectedUsername = settings?.adminUsername || DEFAULT_ADMIN_USERNAME;
    const tenantAdminValid = await this.isTenantAdminCredentialValid(
      expectedUsername,
      settings?.adminPasswordHash,
      username,
      password,
    );

    if (tenantAdminValid) {
      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        subdomain: tenant.slug,
        authOrgId: tenant.authOrgId,
        isActive: tenant.isActive,
        adminUsername: expectedUsername,
        loginType: 'tenant_admin',
        managerEmployeeId: null,
        featurePermissions: allManagerFeatures(),
      };
    }

    if (this.safeEqual(username, expectedUsername)) {
      throw new UnauthorizedException('Invalid administrator credentials.');
    }

    const manager = await this.verifyManagerLogin(
      tenant.id,
      username,
      password,
    );
    if (!manager) {
      throw new UnauthorizedException('Invalid administrator credentials.');
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      subdomain: tenant.slug,
      authOrgId: tenant.authOrgId,
      isActive: tenant.isActive,
      adminUsername: manager.username,
      loginType: 'manager',
      managerEmployeeId: manager.id,
      featurePermissions: manager.featurePermissions,
    };
  }

  private async isTenantAdminCredentialValid(
    expectedUsername: string,
    configuredPasswordHash: string | null | undefined,
    username: string,
    password: string,
  ) {
    if (!this.safeEqual(username, expectedUsername)) {
      return false;
    }

    const passwordHash = configuredPasswordHash?.trim() || '';
    if (passwordHash) {
      return compare(password, passwordHash);
    }
    return this.safeEqual(password, this.defaultAdminPassword());
  }

  private async verifyManagerLogin(
    tenantId: string,
    username: string,
    password: string,
  ) {
    const manager = await this.prisma.employee.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        disabled: false,
        OR: [{ isManager: true }, { isAdmin: true }],
        AND: [
          {
            OR: [
              { fullName: { equals: username, mode: 'insensitive' } },
              { displayName: { equals: username, mode: 'insensitive' } },
              { email: { equals: username, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        fullName: true,
        displayName: true,
        pinHash: true,
        isAdmin: true,
        isManager: true,
        isTimeAdmin: true,
        isReports: true,
        managerPermissions: true,
      },
    });

    if (!manager?.pinHash) {
      return null;
    }

    const valid = await compare(password, manager.pinHash);
    if (!valid) {
      return null;
    }

    const configured = normalizeManagerFeatures(manager.managerPermissions);
    const derived = new Set<string>(['dashboard']);
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

    const configuredWithDashboard = new Set([...configured, 'dashboard']);
    const featurePermissions =
      configured.length > 0
        ? allManagerFeatures().filter((feature) =>
            configuredWithDashboard.has(feature),
          )
        : allManagerFeatures().filter((feature) => derived.has(feature));

    return {
      id: manager.id,
      username: manager.displayName || manager.fullName,
      featurePermissions,
    };
  }

  private async resolveTenantRecord(tenantInput: string, hostInput: string) {
    const hostSubdomain = this.extractSubdomain(hostInput);
    let tenant: Tenant | null = null;

    if (hostSubdomain) {
      tenant = await this.findBySlug(hostSubdomain);
    }

    if (!tenant && tenantInput) {
      tenant = await this.findByExactIdentifier(tenantInput);
    }

    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    if (!tenant.isActive) {
      throw new ForbiddenException('Tenant account is disabled.');
    }

    return tenant;
  }

  private async findByExactIdentifier(input: string) {
    const normalized = input.trim();
    if (!normalized) {
      return null;
    }

    const hostSubdomain = this.extractSubdomain(normalized);
    if (hostSubdomain) {
      const byHostSubdomain = await this.findBySlug(hostSubdomain);
      if (byHostSubdomain) {
        return byHostSubdomain;
      }
    }

    const slugCandidate = slugify(normalized);
    if (slugCandidate) {
      const bySlug = await this.findBySlug(slugCandidate);
      if (bySlug) {
        return bySlug;
      }
    }

    const byName = await this.prisma.tenant.findMany({
      where: {
        name: {
          equals: normalized,
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 2,
    });

    if (byName.length > 1) {
      throw new ConflictException(
        'Multiple tenants match that name. Use tenant subdomain instead.',
      );
    }

    if (byName[0]) {
      return byName[0];
    }

    const byAuthOrgId = await this.prisma.tenant.findUnique({
      where: { authOrgId: normalized },
    });
    if (byAuthOrgId) {
      return byAuthOrgId;
    }

    return null;
  }

  private async findBySlug(slug: string) {
    return this.prisma.tenant.findUnique({
      where: { slug },
    });
  }

  private safeEqual(a: string, b: string) {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    if (left.length !== right.length) {
      return false;
    }
    return timingSafeEqual(left, right);
  }

  private defaultAdminPassword() {
    return (
      process.env.TENANT_ADMIN_DEFAULT_PASSWORD ||
      process.env.ADMIN_PASSWORD ||
      DEFAULT_ADMIN_PASSWORD
    );
  }

  private extractSubdomain(value: string) {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      .split(':')[0];

    if (!normalized) {
      return null;
    }

    if (RESERVED_SUBDOMAINS.has(normalized)) {
      return null;
    }

    if (
      normalized === 'localhost' ||
      /^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized)
    ) {
      return null;
    }

    const parts = normalized.split('.').filter(Boolean);
    if (parts.length === 0) {
      return null;
    }

    if (parts.length === 1) {
      const single = slugify(parts[0]);
      if (!single || RESERVED_SUBDOMAINS.has(single)) {
        return null;
      }
      return single;
    }

    if (parts[parts.length - 1] === 'localhost') {
      const local = slugify(parts[0]);
      if (!local || RESERVED_SUBDOMAINS.has(local)) {
        return null;
      }
      return local;
    }

    if (parts.length >= 3) {
      const candidate = slugify(parts[0]);
      if (!candidate || RESERVED_SUBDOMAINS.has(candidate)) {
        return null;
      }
      return candidate;
    }

    return null;
  }
}
