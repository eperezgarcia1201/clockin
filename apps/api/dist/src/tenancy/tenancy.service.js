"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenancyService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_1 = require("crypto");
const manager_features_1 = require("./manager-features");
const owner_manager_1 = require("./owner-manager");
const slugify = (value) => value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
const DEFAULT_ADMIN_USERNAME = 'admin';
let TenancyService = class TenancyService {
    prisma;
    config;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    async requireTenantAndUser(authUser) {
        if (!authUser.tenantExternalId) {
            throw new common_1.UnauthorizedException('Missing tenant claim in token.');
        }
        const defaultRole = this.parseRole(this.config.get('DEFAULT_ROLE') || 'EMPLOYEE');
        const tenant = await this.prisma.tenant.upsert({
            where: { authOrgId: authUser.tenantExternalId },
            update: {},
            create: {
                authOrgId: authUser.tenantExternalId,
                name: authUser.tenantName ||
                    `Tenant ${authUser.tenantExternalId.slice(0, 6)}`,
                slug: this.makeTenantSlug(authUser),
            },
        });
        if (!tenant.isActive) {
            throw new common_1.ForbiddenException('Tenant account is disabled.');
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
    async resolveAdminAccess(authUser) {
        const context = await this.requireTenantAndUser(authUser);
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId: context.tenant.id },
            select: {
                adminUsername: true,
                multiLocationEnabled: true,
                companyOrdersEnabled: true,
                liquorInventoryEnabled: true,
                premiumFeaturesEnabled: true,
            },
        });
        const adminUsername = (settings?.adminUsername || DEFAULT_ADMIN_USERNAME).trim();
        const companyOrdersEnabled = settings?.companyOrdersEnabled ?? false;
        const liquorInventoryEnabled = settings?.liquorInventoryEnabled ?? false;
        const premiumFeaturesEnabled = settings?.premiumFeaturesEnabled ?? false;
        const loginIdentifier = (authUser.name ||
            authUser.email ||
            authUser.authUserId).trim();
        if (loginIdentifier &&
            loginIdentifier.toLowerCase() === adminUsername.toLowerCase()) {
            return {
                ...context,
                actorType: 'tenant_admin',
                displayName: adminUsername,
                featurePermissions: this.filterTenantFeaturePermissions((0, manager_features_1.allManagerFeatures)(), companyOrdersEnabled),
                employeeId: null,
                settings: {
                    adminUsername,
                    multiLocationEnabled: settings?.multiLocationEnabled ?? false,
                    companyOrdersEnabled,
                    liquorInventoryEnabled,
                    premiumFeaturesEnabled,
                },
                ownerClockExempt: false,
            };
        }
        const manager = await this.findManagerEmployee(context.tenant.id, loginIdentifier, authUser.email);
        if (manager) {
            return {
                ...context,
                actorType: 'manager',
                displayName: manager.displayName || manager.fullName,
                featurePermissions: this.filterTenantFeaturePermissions(this.resolveManagerFeatures(manager), companyOrdersEnabled),
                employeeId: manager.id,
                settings: {
                    adminUsername,
                    multiLocationEnabled: settings?.multiLocationEnabled ?? false,
                    companyOrdersEnabled,
                    liquorInventoryEnabled,
                    premiumFeaturesEnabled,
                },
                ownerClockExempt: manager.isManager &&
                    this.hasOwnerManagerPermission(manager.managerPermissions),
            };
        }
        const elevatedRoles = [client_1.Role.OWNER, client_1.Role.ADMIN, client_1.Role.MANAGER];
        if (elevatedRoles.includes(context.membership.role)) {
            return {
                ...context,
                actorType: 'membership',
                displayName: authUser.name || authUser.email || 'Admin',
                featurePermissions: this.filterTenantFeaturePermissions((0, manager_features_1.allManagerFeatures)(), companyOrdersEnabled),
                employeeId: null,
                settings: {
                    adminUsername,
                    multiLocationEnabled: settings?.multiLocationEnabled ?? false,
                    companyOrdersEnabled,
                    liquorInventoryEnabled,
                    premiumFeaturesEnabled,
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
                liquorInventoryEnabled,
                premiumFeaturesEnabled,
            },
            ownerClockExempt: false,
        };
    }
    async requireFeature(authUser, feature) {
        const access = await this.resolveAdminAccess(authUser);
        if (access.featurePermissions.includes(feature)) {
            return access;
        }
        throw new common_1.ForbiddenException('This account does not have access to this feature.');
    }
    async requireAnyFeature(authUser, features) {
        const access = await this.resolveAdminAccess(authUser);
        if (features.some((feature) => access.featurePermissions.includes(feature))) {
            return access;
        }
        throw new common_1.ForbiddenException('This account does not have access to this feature.');
    }
    async requireCompanyOrdersAccess(authUser) {
        const access = await this.resolveAdminAccess(authUser);
        if (!access.settings.companyOrdersEnabled) {
            throw new common_1.ForbiddenException('Company orders are disabled for this tenant.');
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
        const kitchenManager = await this.findKitchenManagerEmployee(access.tenant.id, authUser);
        if (!kitchenManager) {
            throw new common_1.ForbiddenException('This account does not have access to company orders.');
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
    async findManagerEmployee(tenantId, loginIdentifier, email) {
        const conditions = [];
        if (loginIdentifier) {
            conditions.push({ fullName: { equals: loginIdentifier, mode: 'insensitive' } }, { displayName: { equals: loginIdentifier, mode: 'insensitive' } }, { email: { equals: loginIdentifier, mode: 'insensitive' } });
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
    async getOwnerManagerEmployeeIds(tenantId, employeeIds) {
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
                    has: owner_manager_1.OWNER_MANAGER_PERMISSION,
                },
                id: scopedEmployeeIds.length ? { in: scopedEmployeeIds } : undefined,
            },
            select: {
                id: true,
            },
        });
        return new Set(managerEmployees.map((employee) => employee.id));
    }
    async isOwnerManagerEmployee(tenantId, employeeId) {
        const target = employeeId.trim();
        if (!target) {
            return false;
        }
        const matched = await this.getOwnerManagerEmployeeIds(tenantId, [target]);
        return matched.has(target);
    }
    parseEmployeeActorId(rawUserId) {
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
    async findKitchenManagerEmployee(tenantId, authUser) {
        const actorEmployeeId = this.parseEmployeeActorId(authUser.authUserId || '');
        const loginIdentifier = (authUser.name ||
            authUser.email ||
            authUser.authUserId).trim();
        const conditions = [];
        if (actorEmployeeId) {
            conditions.push({ id: actorEmployeeId });
        }
        if (loginIdentifier) {
            conditions.push({ fullName: { equals: loginIdentifier, mode: 'insensitive' } }, { displayName: { equals: loginIdentifier, mode: 'insensitive' } }, { email: { equals: loginIdentifier, mode: 'insensitive' } });
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
    resolveManagerFeatures(manager) {
        const configured = (0, manager_features_1.normalizeManagerFeatures)(manager.managerPermissions);
        if (configured.length > 0) {
            const enabled = new Set([...configured, 'dashboard']);
            return (0, manager_features_1.allManagerFeatures)().filter((feature) => enabled.has(feature));
        }
        const derived = new Set(['dashboard']);
        if (!manager.isManager && manager.isAdmin) {
            (0, manager_features_1.allManagerFeatures)().forEach((feature) => derived.add(feature));
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
        return (0, manager_features_1.allManagerFeatures)().filter((feature) => derived.has(feature));
    }
    filterTenantFeaturePermissions(features, companyOrdersEnabled) {
        if (companyOrdersEnabled) {
            return features;
        }
        return features.filter((feature) => feature !== 'companyOrders');
    }
    hasOwnerManagerPermission(permissions) {
        return permissions.includes(owner_manager_1.OWNER_MANAGER_PERMISSION);
    }
    makeTenantSlug(authUser) {
        const base = slugify(authUser.tenantName || '') || 'tenant';
        return `${base}-${(0, crypto_1.randomUUID)().slice(0, 6)}`;
    }
    parseRole(value) {
        if (Object.values(client_1.Role).includes(value)) {
            return value;
        }
        return client_1.Role.EMPLOYEE;
    }
};
exports.TenancyService = TenancyService;
exports.TenancyService = TenancyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], TenancyService);
//# sourceMappingURL=tenancy.service.js.map