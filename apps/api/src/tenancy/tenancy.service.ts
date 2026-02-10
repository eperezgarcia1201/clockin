import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "../auth/auth.types";
import { randomUUID } from "crypto";

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

@Injectable()
export class TenancyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async requireTenantAndUser(authUser: AuthUser) {
    if (!authUser.tenantExternalId) {
      throw new UnauthorizedException("Missing tenant claim in token.");
    }

    const defaultRole = this.parseRole(
      this.config.get<string>("DEFAULT_ROLE") || "EMPLOYEE",
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

    const user = await this.prisma.user.upsert({
      where: { authUserId: authUser.authUserId },
      update: {
        email: authUser.email || "unknown@clockin.local",
        name: authUser.name,
      },
      create: {
        authUserId: authUser.authUserId,
        email: authUser.email || "unknown@clockin.local",
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

  private makeTenantSlug(authUser: AuthUser): string {
    const base = slugify(authUser.tenantName || "") || "tenant";
    return `${base}-${randomUUID().slice(0, 6)}`;
  }

  private parseRole(value: string): Role {
    if (Object.values(Role).includes(value as Role)) {
      return value as Role;
    }
    return Role.EMPLOYEE;
  }
}
