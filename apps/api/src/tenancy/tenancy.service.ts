import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "../auth/auth.types";
import { randomUUID } from "crypto";
import {
  type ManagerFeatureKey,
  allManagerFeatures,
  normalizeManagerFeatures,
} from "./manager-features";

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const DEFAULT_ADMIN_USERNAME = "admin";

type AdminActorType = "tenant_admin" | "manager" | "membership" | "limited";

type AdminAccess = {
  actorType: AdminActorType;
  displayName: string;
  featurePermissions: ManagerFeatureKey[];
  employeeId: string | null;
  tenant: Awaited<ReturnType<TenancyService["requireTenantAndUser"]>>["tenant"];
  user: Awaited<ReturnType<TenancyService["requireTenantAndUser"]>>["user"];
  membership: Awaited<
    ReturnType<TenancyService["requireTenantAndUser"]>
  >["membership"];
  settings: {
    adminUsername: string;
    multiLocationEnabled: boolean;
  };
};

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

    if (!tenant.isActive) {
      throw new ForbiddenException("Tenant account is disabled.");
    }

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

  async resolveAdminAccess(authUser: AuthUser): Promise<AdminAccess> {
    const context = await this.requireTenantAndUser(authUser);
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: context.tenant.id },
      select: {
        adminUsername: true,
        multiLocationEnabled: true,
      },
    });

    const adminUsername = (
      settings?.adminUsername || DEFAULT_ADMIN_USERNAME
    ).trim();
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
        actorType: "tenant_admin",
        displayName: adminUsername,
        featurePermissions: allManagerFeatures(),
        employeeId: null,
        settings: {
          adminUsername,
          multiLocationEnabled: settings?.multiLocationEnabled ?? false,
        },
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
        actorType: "manager",
        displayName: manager.displayName || manager.fullName,
        featurePermissions: this.resolveManagerFeatures(manager),
        employeeId: manager.id,
        settings: {
          adminUsername,
          multiLocationEnabled: settings?.multiLocationEnabled ?? false,
        },
      };
    }

    const elevatedRoles: Role[] = [Role.OWNER, Role.ADMIN, Role.MANAGER];
    if (elevatedRoles.includes(context.membership.role)) {
      return {
        ...context,
        actorType: "membership",
        displayName: authUser.name || authUser.email || "Admin",
        featurePermissions: allManagerFeatures(),
        employeeId: null,
        settings: {
          adminUsername,
          multiLocationEnabled: settings?.multiLocationEnabled ?? false,
        },
      };
    }

    return {
      ...context,
      actorType: "limited",
      displayName: authUser.name || authUser.email || "User",
      featurePermissions: [],
      employeeId: null,
      settings: {
        adminUsername,
        multiLocationEnabled: settings?.multiLocationEnabled ?? false,
      },
    };
  }

  async requireFeature(authUser: AuthUser, feature: ManagerFeatureKey) {
    const access = await this.resolveAdminAccess(authUser);
    if (access.featurePermissions.includes(feature)) {
      return access;
    }

    throw new ForbiddenException(
      "This account does not have access to this feature.",
    );
  }

  async requireAnyFeature(
    authUser: AuthUser,
    features: ManagerFeatureKey[],
  ) {
    const access = await this.resolveAdminAccess(authUser);
    if (features.some((feature) => access.featurePermissions.includes(feature))) {
      return access;
    }

    throw new ForbiddenException(
      "This account does not have access to this feature.",
    );
  }

  private async findManagerEmployee(
    tenantId: string,
    loginIdentifier: string,
    email?: string,
  ) {
    const conditions: {
      fullName?: { equals: string; mode: "insensitive" };
      displayName?: { equals: string; mode: "insensitive" };
      email?: { equals: string; mode: "insensitive" };
    }[] = [];

    if (loginIdentifier) {
      conditions.push(
        { fullName: { equals: loginIdentifier, mode: "insensitive" } },
        { displayName: { equals: loginIdentifier, mode: "insensitive" } },
        { email: { equals: loginIdentifier, mode: "insensitive" } },
      );
    }
    if (email?.trim()) {
      conditions.push({ email: { equals: email.trim(), mode: "insensitive" } });
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
        isManager: true,
        isAdmin: true,
        isTimeAdmin: true,
        isReports: true,
        managerPermissions: true,
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

    const derived = new Set<ManagerFeatureKey>(["dashboard"]);
    if (!manager.isManager && manager.isAdmin) {
      allManagerFeatures().forEach((feature) => derived.add(feature));
    }
    if (manager.isTimeAdmin) {
      derived.add("schedules");
      derived.add("timeEdits");
    }
    if (manager.isReports) {
      derived.add("reports");
      derived.add("tips");
      derived.add("salesCapture");
    }

    return allManagerFeatures().filter((feature) => derived.has(feature));
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
