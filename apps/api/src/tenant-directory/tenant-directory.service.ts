import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Tenant } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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

@Injectable()
export class TenantDirectoryService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(dto: ResolveTenantDto) {
    const tenantInput = dto.tenant?.trim() || '';
    const hostInput = dto.host?.trim() || '';

    if (!tenantInput && !hostInput) {
      throw new BadRequestException('Tenant is required.');
    }

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

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      subdomain: tenant.slug,
      authOrgId: tenant.authOrgId,
      isActive: tenant.isActive,
    };
  }

  private async findByExactIdentifier(input: string) {
    const normalized = input.trim();
    if (!normalized) {
      return null;
    }

    const byAuthOrgId = await this.prisma.tenant.findUnique({
      where: { authOrgId: normalized },
    });
    if (byAuthOrgId) {
      return byAuthOrgId;
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

    return byName[0] || null;
  }

  private async findBySlug(slug: string) {
    return this.prisma.tenant.findUnique({
      where: { slug },
    });
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
