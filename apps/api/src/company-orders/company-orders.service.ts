import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import type { AuthUser } from '../auth/auth.types';
import type { CreateCompanyOrderDto } from './dto/create-company-order.dto';
import type {
  CompanyOrderCatalogSupplierDto,
  UpdateCompanyOrderCatalogDto,
} from './dto/update-company-order-catalog.dto';
import type { UpdateCompanyOrderInPersonDto } from './dto/update-company-order-in-person.dto';
import {
  COMPANY_ORDER_CATALOG,
} from './company-order-catalog';

const catalogItemKey = (nameEs: string, nameEn: string) =>
  `${nameEs.trim().toLowerCase()}|${nameEn.trim().toLowerCase()}`;
const supplierCatalogItemKey = (
  supplierName: string,
  nameEs: string,
  nameEn: string,
) => `${supplierName.trim().toLowerCase()}|${catalogItemKey(nameEs, nameEn)}`;

const dateKeyToUtc = (value: string) => new Date(`${value}T00:00:00.000Z`);
const COMPANY_ORDER_TIME_ZONE = 'America/Chicago';
const COMPANY_ORDER_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: COMPANY_ORDER_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const COMPANY_ORDER_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: COMPANY_ORDER_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
const COMPANY_ORDER_META_PREFIX = '__company_order_meta__';
const COMPANY_ORDER_SUBMITTED_KIND = 'COMPANY_ORDER_SUBMITTED';
const MAX_SUBMITTED_DATES = 28;
const MAX_CONTRIBUTORS = 40;
const MAX_NOTE_LINES = 120;
const DEFAULT_COMPARISON_UNIT: CompanyOrderComparisonUnit = 'each';
const LB_COMPARISON_UNIT: CompanyOrderComparisonUnit = 'lb';
const LEGACY_LB_ORDER_MODE: CompanyOrderLbOrderMode = 'weight';
const DEFAULT_LB_ORDER_MODE: CompanyOrderLbOrderMode = 'case';
const DEFAULT_LB_COMPARISON_ITEM_KEYS = new Set<string>([
  supplierCatalogItemKey('JOLIVETTE', 'POLLO', 'CHICKEN'),
  supplierCatalogItemKey('JOLIVETTE', 'CHICKEN MALU', 'CHICKEN MALU'),
  supplierCatalogItemKey(
    'MERRILL DISTRIBUTING',
    'PUERCO CARNITAS',
    'PORK LAN NO BONE',
  ),
  supplierCatalogItemKey(
    'MERRILL DISTRIBUTING',
    'PUERCO CHORIZO',
    'GROUND PORK',
  ),
  supplierCatalogItemKey('MERRILL DISTRIBUTING', 'TOCINO', 'BACON'),
  supplierCatalogItemKey('MERRILL DISTRIBUTING', 'RIBEYE', 'RIBEYE'),
  supplierCatalogItemKey('SYSCO', 'POLLO', 'CHICKEN BREAST'),
  supplierCatalogItemKey('SYSCO', 'CARNE FAJA', 'BALL TIPS'),
  supplierCatalogItemKey('SYSCO', 'CHULETA', 'PORK CHUP THIN CUT'),
  supplierCatalogItemKey('SYSCO', 'CARNE MOLIDA', 'GROUND BEEF'),
]);
type ExportFormat = 'pdf' | 'csv' | 'excel';
type CompanyOrderComparisonUnit = 'each' | 'lb';
type CompanyOrderLbOrderMode = 'weight' | 'case';
type CompanyOrderOrderUnit = 'each' | 'case' | 'lb';
type CatalogSupplierWithComparisonUnit = {
  supplierName: string;
  items: Array<{
    nameEs: string;
    nameEn: string;
    comparisonUnit?: CompanyOrderComparisonUnit;
    caseSizeLb?: number | null;
    companyUnitPrice?: number | null;
  }>;
};
type OrderQuantityByUnit = Record<CompanyOrderOrderUnit, number>;
type CatalogItemSettings = {
  comparisonUnit: CompanyOrderComparisonUnit;
  caseSizeLb: number | null;
  companyUnitPrice: number | null;
};
type CatalogSettingsLookup = Map<
  string,
  Map<string, CatalogItemSettings>
>;

type CompanyOrderDbRow = {
  id: string;
  supplierName: string;
  orderDate: Date;
  notes: string | null;
  officeId: string | null;
  createdByEmployeeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  office: { name: string } | null;
  createdByEmployee: { fullName: string; displayName: string | null } | null;
  items: Array<{
    id: string;
    nameEs: string;
    nameEn: string;
    quantity: number;
  }>;
};

type StoredInPersonPurchase = {
  nameEs: string;
  nameEn: string;
  purchasedQuantity: number;
  purchasedWeightLb: number | null;
  unitPrice: number | null;
  companyUnitPrice: number | null;
};

type StoredOrderMetadata = {
  version: 5;
  lbOrderMode: CompanyOrderLbOrderMode;
  weekStart: string;
  weekEnd: string;
  submittedDates: string[];
  contributors: string[];
  noteLines: string[];
  inPersonPurchases: StoredInPersonPurchase[];
};

type ParsedStoredOrderNotes = {
  lbOrderMode: CompanyOrderLbOrderMode;
  weekStart: string;
  weekEnd: string;
  submittedDates: string[];
  contributors: string[];
  noteLines: string[];
  inPersonPurchases: StoredInPersonPurchase[];
  notes: string;
};
type SerializedCompanyOrder = {
  id: string;
  supplierName: string;
  supplierNames: string[];
  companyName: string;
  orderDate: string;
  weekStartDate: string;
  weekEndDate: string;
  lbOrderMode: CompanyOrderLbOrderMode;
  orderLabel: string;
  submittedDates: string[];
  contributors: string[];
  notes: string;
  officeId: string | null;
  officeName: string | null;
  createdBy: string | null;
  totalQuantity: number;
  itemCount: number;
  items: Array<{
    id: string;
    nameEs: string;
    nameEn: string;
    quantity: number;
  }>;
  inPersonPurchases: StoredInPersonPurchase[];
  createdAt: string;
  updatedAt: string;
};

type SerializedCompanyOrderInPersonSupplier = {
  supplierName: string;
  itemCount: number;
  totalOrderedQuantity: number;
  totalPurchasedQuantity: number;
  totalRemainingQuantity: number;
  items: Array<{
    nameEs: string;
    nameEn: string;
    orderedQuantity: number;
    purchasedQuantity: number;
    remainingQuantity: number;
    orderQuantityUnit: CompanyOrderOrderUnit;
    comparisonUnit: CompanyOrderComparisonUnit;
    caseSizeLb: number | null;
    purchasedWeightLb: number | null;
    unitPrice: number | null;
    companyUnitPrice: number | null;
  }>;
  totalPurchasedWeightLb: number;
};

@Injectable()
export class CompanyOrdersService {
  private catalogOverridesTableReady = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  async getCatalog(authUser: AuthUser) {
    const access = await this.tenancy.requireCompanyOrdersAccess(authUser);
    const suppliers = await this.getCatalogForTenant(access.tenant.id);
    return { suppliers };
  }

  async updateCatalog(authUser: AuthUser, dto: UpdateCompanyOrderCatalogDto) {
    const access = await this.tenancy.requireFeature(authUser, 'companyOrders');
    const suppliers = this.normalizeCatalogSuppliers(dto.suppliers);
    if (!suppliers.length) {
      throw new BadRequestException('At least one supplier is required.');
    }

    await this.saveCatalogForTenant(access.tenant.id, suppliers);
    return { suppliers };
  }

  async listOrders(
    authUser: AuthUser,
    options: { limit?: number; from?: string; to?: string; officeId?: string },
  ) {
    const access = await this.tenancy.requireCompanyOrdersAccess(authUser);
    const tenantId = access.tenant.id;
    const limit = options.limit && options.limit > 0 ? options.limit : 30;
    const requestedOfficeId = options.officeId?.trim() || undefined;
    if (
      access.allowedOfficeId &&
      requestedOfficeId &&
      requestedOfficeId !== access.allowedOfficeId
    ) {
      throw new BadRequestException(
        'Kitchen manager can only access orders for their assigned location.',
      );
    }
    const officeId = access.allowedOfficeId || requestedOfficeId;
    const orderDate: { gte?: Date; lte?: Date } = {};
    if (options.from) {
      orderDate.gte = dateKeyToUtc(options.from);
    }
    if (options.to) {
      orderDate.lte = dateKeyToUtc(options.to);
    }

    const where: Prisma.CompanyOrderWhereInput = {
      tenantId,
      officeId,
      orderDate: Object.keys(orderDate).length ? orderDate : undefined,
    };

    const orders = (await this.prisma.companyOrder.findMany({
      where,
      orderBy: [
        { updatedAt: 'desc' },
        { orderDate: 'desc' },
        { createdAt: 'desc' },
      ],
      take: Math.min(400, Math.max(limit * 8, limit)),
      include: {
        office: { select: { name: true } },
        createdByEmployee: { select: { fullName: true, displayName: true } },
        items: {
          orderBy: [{ createdAt: 'asc' }],
          select: {
            id: true,
            nameEs: true,
            nameEn: true,
            quantity: true,
          },
        },
      },
    })) as CompanyOrderDbRow[];

    const mergedOrders = this.aggregateOrdersForList(
      orders.map((order) => this.serializeOrder(order)),
    ).slice(0, Math.min(200, limit));

    return {
      orders: mergedOrders,
    };
  }

  async createOrder(authUser: AuthUser, dto: CreateCompanyOrderDto) {
    const access = await this.tenancy.requireCompanyOrdersAccess(authUser);
    const tenantId = access.tenant.id;
    const supplier = await this.resolveSupplier(tenantId, dto.supplierName);
    const submissionDate = dto.orderDate ? new Date(dto.orderDate) : new Date();
    if (Number.isNaN(submissionDate.getTime())) {
      throw new BadRequestException('Invalid order date.');
    }
    const week = this.getWeekBounds(submissionDate);

    const requestedOfficeId = dto.officeId?.trim() || undefined;
    if (
      access.allowedOfficeId &&
      requestedOfficeId &&
      requestedOfficeId !== access.allowedOfficeId
    ) {
      throw new BadRequestException(
        'Kitchen manager can only submit orders for their assigned location.',
      );
    }
    const officeId = access.allowedOfficeId || requestedOfficeId;
    if (officeId) {
      const office = await this.prisma.office.findFirst({
        where: { id: officeId, tenantId },
        select: { id: true },
      });
      if (!office) {
        throw new BadRequestException('Invalid location for this tenant.');
      }
    }

    const normalizedItems = this.normalizeItems(dto.items, supplier);
    if (!normalizedItems.length) {
      throw new BadRequestException('At least one item quantity is required.');
    }

    const actorName = this.normalizeContributor(
      access.displayName,
      'Team Member',
    );
    const submittedDateKey = this.toDateKey(submissionDate);
    const rawSubmissionNote = dto.notes?.trim() || '';
    const submissionNote = rawSubmissionNote
      ? `${submittedDateKey} - ${actorName}: ${rawSubmissionNote}`
      : '';

    const order = await this.prisma.$transaction(async (tx) => {
      const existingOrders = (await tx.companyOrder.findMany({
        where: {
          tenantId,
          officeId: officeId || null,
          supplierName: supplier.supplierName,
          orderDate: {
            gte: week.weekStart,
            lte: week.weekEnd,
          },
        },
        orderBy: [{ createdAt: 'asc' }],
        include: {
          office: { select: { name: true } },
          createdByEmployee: { select: { fullName: true, displayName: true } },
          items: {
            orderBy: [{ createdAt: 'asc' }],
            select: {
              id: true,
              nameEs: true,
              nameEn: true,
              quantity: true,
            },
          },
        },
      })) as CompanyOrderDbRow[];

      const mergedItems = new Map<
        string,
        { nameEs: string; nameEn: string; quantity: number }
      >();
      const contributors = new Set<string>();
      const submittedDates = new Set<string>();
      const noteLines = new Set<string>();
      const inPersonPurchases = new Map<string, StoredInPersonPurchase>();
      let lbOrderMode: CompanyOrderLbOrderMode = DEFAULT_LB_ORDER_MODE;

      existingOrders.forEach((existingOrder) => {
        existingOrder.items.forEach((item) => {
          this.accumulateOrderItem(
            mergedItems,
            item.nameEs,
            item.nameEn,
            item.quantity,
          );
        });

        const parsed = this.readStoredOrderNotes(existingOrder.notes);
        lbOrderMode = parsed.lbOrderMode;
        parsed.contributors.forEach((name) => contributors.add(name));
        parsed.submittedDates.forEach((dateKey) => submittedDates.add(dateKey));
        parsed.noteLines.forEach((line) => noteLines.add(line));
        parsed.inPersonPurchases.forEach((purchase) => {
          inPersonPurchases.set(
            catalogItemKey(purchase.nameEs, purchase.nameEn),
            purchase,
          );
        });

        if (!parsed.submittedDates.length) {
          submittedDates.add(this.toDateKey(existingOrder.orderDate));
        }

        const fallbackContributor = this.resolveOrderContributor(existingOrder);
        if (fallbackContributor) {
          contributors.add(fallbackContributor);
        }

        if (!parsed.noteLines.length && parsed.notes) {
          noteLines.add(parsed.notes);
        }
      });

      normalizedItems.forEach((item) => {
        this.accumulateOrderItem(
          mergedItems,
          item.nameEs,
          item.nameEn,
          item.quantity,
        );
      });

      contributors.add(actorName);
      submittedDates.add(submittedDateKey);
      if (submissionNote) {
        noteLines.add(submissionNote);
      }

      const mergedItemsList = Array.from(mergedItems.values());
      if (!mergedItemsList.length) {
        throw new BadRequestException(
          'At least one item quantity is required.',
        );
      }

      const metadata: StoredOrderMetadata = {
        version: 5,
        lbOrderMode,
        weekStart: week.weekStartKey,
        weekEnd: week.weekEndKey,
        submittedDates: this.normalizeDateKeys(Array.from(submittedDates)),
        contributors: this.normalizeContributors(Array.from(contributors)),
        noteLines: this.normalizeNoteLines(Array.from(noteLines)),
        inPersonPurchases: this.normalizeStoredInPersonPurchases(
          Array.from(inPersonPurchases.values()),
        ),
      };

      const storedNotes = this.composeStoredOrderNotes(metadata);

      if (!existingOrders.length) {
        return (await tx.companyOrder.create({
          data: {
            tenantId,
            officeId: officeId || null,
            supplierName: supplier.supplierName,
            orderDate: submissionDate,
            notes: storedNotes,
            createdByEmployeeId: access.employeeId || null,
            items: {
              create: mergedItemsList.map((item) => ({
                nameEs: item.nameEs,
                nameEn: item.nameEn,
                quantity: item.quantity,
              })),
            },
          },
          include: {
            office: { select: { name: true } },
            createdByEmployee: {
              select: { fullName: true, displayName: true },
            },
            items: {
              orderBy: [{ createdAt: 'asc' }],
              select: {
                id: true,
                nameEs: true,
                nameEn: true,
                quantity: true,
              },
            },
          },
        })) as CompanyOrderDbRow;
      }

      const primaryOrder = existingOrders[0];
      const duplicateIds = existingOrders.slice(1).map((entry) => entry.id);
      if (duplicateIds.length) {
        await tx.companyOrder.deleteMany({
          where: {
            tenantId,
            id: { in: duplicateIds },
          },
        });
      }

      await tx.companyOrderItem.deleteMany({
        where: { companyOrderId: primaryOrder.id },
      });

      return (await tx.companyOrder.update({
        where: { id: primaryOrder.id },
        data: {
          orderDate: submissionDate,
          notes: storedNotes,
          createdByEmployeeId:
            access.employeeId || primaryOrder.createdByEmployeeId || null,
          items: {
            create: mergedItemsList.map((item) => ({
              nameEs: item.nameEs,
              nameEn: item.nameEn,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          office: { select: { name: true } },
          createdByEmployee: { select: { fullName: true, displayName: true } },
          items: {
            orderBy: [{ createdAt: 'asc' }],
            select: {
              id: true,
              nameEs: true,
              nameEn: true,
              quantity: true,
            },
          },
        },
      })) as CompanyOrderDbRow;
    });

    const serializedOrder = this.serializeOrder(order);
    await this.notifyCompanyOrderSubmitted(tenantId, {
      orderId: serializedOrder.id,
      supplierName: serializedOrder.supplierName,
      weekStartDate: serializedOrder.weekStartDate,
      weekEndDate: serializedOrder.weekEndDate,
      officeId: serializedOrder.officeId,
      officeName: serializedOrder.officeName,
      contributor: actorName,
      submittedAt: submissionDate.toISOString(),
    });

    return serializedOrder;
  }

  async deleteOrder(authUser: AuthUser, orderId: string) {
    const access = await this.tenancy.requireCompanyOrdersAccess(authUser);
    const tenantId = access.tenant.id;
    const normalizedOrderId = orderId.trim();
    if (!normalizedOrderId) {
      throw new BadRequestException('Order id is required.');
    }

    const anchorOrder = (await this.prisma.companyOrder.findFirst({
      where: {
        tenantId,
        id: normalizedOrderId,
      },
      include: {
        office: { select: { name: true } },
        createdByEmployee: { select: { fullName: true, displayName: true } },
        items: {
          orderBy: [{ createdAt: 'asc' }],
          select: {
            id: true,
            nameEs: true,
            nameEn: true,
            quantity: true,
          },
        },
      },
    })) as CompanyOrderDbRow | null;

    if (!anchorOrder) {
      throw new NotFoundException('Company order not found.');
    }

    if (
      access.allowedOfficeId &&
      anchorOrder.officeId !== access.allowedOfficeId
    ) {
      throw new BadRequestException(
        'Kitchen manager can only delete orders for their assigned location.',
      );
    }

    const serializedOrder = this.serializeOrder(anchorOrder);
    const weekStartDate = serializedOrder.weekStartDate;
    const weekEndDate = serializedOrder.weekEndDate;
    const officeId = anchorOrder.officeId || null;

    const deleted = await this.prisma.companyOrder.deleteMany({
      where: {
        tenantId,
        officeId,
        orderDate: {
          gte: dateKeyToUtc(weekStartDate),
          lte: new Date(`${weekEndDate}T23:59:59.999Z`),
        },
      },
    });

    return {
      deletedCount: deleted.count,
      weekStartDate,
      weekEndDate,
      officeName: anchorOrder.office?.name || null,
    };
  }

  async getInPersonShopping(
    authUser: AuthUser,
    options: { weekStart?: string; officeId?: string },
  ) {
    const access = await this.tenancy.requireCompanyOrdersAccess(authUser);
    const tenantId = access.tenant.id;
    const requestedOfficeId = options.officeId?.trim() || undefined;
    if (
      access.allowedOfficeId &&
      requestedOfficeId &&
      requestedOfficeId !== access.allowedOfficeId
    ) {
      throw new BadRequestException(
        'Kitchen manager can only access orders for their assigned location.',
      );
    }
    const officeId = access.allowedOfficeId || requestedOfficeId;
    const week = this.getWeekBounds(
      this.parseWeekStartDate(options.weekStart) || new Date(),
    );

    const orders = (await this.prisma.companyOrder.findMany({
      where: {
        tenantId,
        officeId,
        orderDate: {
          gte: week.weekStart,
          lte: week.weekEnd,
        },
      },
      orderBy: [
        { supplierName: 'asc' },
        { orderDate: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        office: { select: { name: true } },
        createdByEmployee: { select: { fullName: true, displayName: true } },
        items: {
          orderBy: [{ nameEs: 'asc' }, { nameEn: 'asc' }],
          select: {
            id: true,
            nameEs: true,
            nameEn: true,
            quantity: true,
          },
        },
      },
    })) as CompanyOrderDbRow[];
    const serializedOrders = orders.map((order) => this.serializeOrder(order));
    const catalogSettingsLookup = this.buildCatalogSettingsLookup(
      await this.getCatalogForTenant(tenantId),
    );

    return {
      weekStartDate: week.weekStartKey,
      weekEndDate: week.weekEndKey,
      suppliers: this.buildInPersonShoppingSuppliers(
        serializedOrders,
        catalogSettingsLookup,
      ),
    };
  }

  async deleteInPersonShopping(
    authUser: AuthUser,
    options: { weekStart?: string; officeId?: string; supplierName?: string },
  ) {
    const access = await this.tenancy.requireCompanyOrdersAccess(authUser);
    const tenantId = access.tenant.id;
    const supplierName = options.supplierName?.trim();
    if (!supplierName) {
      throw new BadRequestException('Supplier name is required.');
    }

    const requestedOfficeId = options.officeId?.trim() || undefined;
    if (
      access.allowedOfficeId &&
      requestedOfficeId &&
      requestedOfficeId !== access.allowedOfficeId
    ) {
      throw new BadRequestException(
        'Kitchen manager can only access orders for their assigned location.',
      );
    }
    const officeId = access.allowedOfficeId || requestedOfficeId;
    const week = this.getWeekBounds(
      this.parseWeekStartDate(options.weekStart) || new Date(),
    );

    const orders = await this.prisma.companyOrder.findMany({
      where: {
        tenantId,
        officeId,
        orderDate: {
          gte: week.weekStart,
          lte: week.weekEnd,
        },
      },
      orderBy: [
        { supplierName: 'asc' },
        { orderDate: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        supplierName: true,
        orderDate: true,
        notes: true,
      },
    });

    const normalizedSupplierKey = supplierName.toLowerCase();
    const matchingOrders = orders.filter(
      (order) => order.supplierName.trim().toLowerCase() === normalizedSupplierKey,
    );

    if (!matchingOrders.length) {
      throw new NotFoundException(
        `Supplier "${supplierName}" has no order for this week.`,
      );
    }

    let clearedItemCount = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const order of matchingOrders) {
        const parsed = this.readStoredOrderNotes(order.notes);
        clearedItemCount += parsed.inPersonPurchases.length;

        if (!parsed.inPersonPurchases.length) {
          continue;
        }

        const metadata: StoredOrderMetadata = {
          version: 5,
          lbOrderMode: parsed.lbOrderMode,
          weekStart:
            this.normalizeDateKey(parsed.weekStart) || week.weekStartKey,
          weekEnd: this.normalizeDateKey(parsed.weekEnd) || week.weekEndKey,
          submittedDates: this.normalizeDateKeys(
            parsed.submittedDates.length
              ? parsed.submittedDates
              : [this.toDateKey(order.orderDate)],
          ),
          contributors: this.normalizeContributors(parsed.contributors),
          noteLines: this.normalizeNoteLines(parsed.noteLines),
          inPersonPurchases: [],
        };

        await tx.companyOrder.update({
          where: { id: order.id },
          data: {
            notes: this.composeStoredOrderNotes(metadata),
          },
        });
      }
    });

    const refreshed = await this.getInPersonShopping(authUser, {
      weekStart: week.weekStartKey,
      officeId: officeId || undefined,
    });

    return {
      ...refreshed,
      clearedSupplierName: matchingOrders[0]?.supplierName || supplierName,
      clearedItemCount,
    };
  }

  async updateInPersonShopping(
    authUser: AuthUser,
    dto: UpdateCompanyOrderInPersonDto,
  ) {
    const access = await this.tenancy.requireCompanyOrdersAccess(authUser);
    const tenantId = access.tenant.id;
    const requestedOfficeId = dto.officeId?.trim() || undefined;
    if (
      access.allowedOfficeId &&
      requestedOfficeId &&
      requestedOfficeId !== access.allowedOfficeId
    ) {
      throw new BadRequestException(
        'Kitchen manager can only access orders for their assigned location.',
      );
    }
    const officeId = access.allowedOfficeId || requestedOfficeId;
    const week = this.getWeekBounds(
      this.parseWeekStartDate(dto.weekStart) || new Date(),
    );

    const orders = (await this.prisma.companyOrder.findMany({
      where: {
        tenantId,
        officeId,
        orderDate: {
          gte: week.weekStart,
          lte: week.weekEnd,
        },
      },
      orderBy: [
        { supplierName: 'asc' },
        { orderDate: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        office: { select: { name: true } },
        createdByEmployee: { select: { fullName: true, displayName: true } },
        items: {
          orderBy: [{ nameEs: 'asc' }, { nameEn: 'asc' }],
          select: {
            id: true,
            nameEs: true,
            nameEn: true,
            quantity: true,
          },
        },
      },
    })) as CompanyOrderDbRow[];

    const ordersBySupplier = new Map<string, CompanyOrderDbRow>();
    const validItemsBySupplier = new Map<
      string,
      Map<string, { nameEs: string; nameEn: string }>
    >();

    orders.forEach((order) => {
      ordersBySupplier.set(order.supplierName.trim().toLowerCase(), order);
      const itemMap = new Map<string, { nameEs: string; nameEn: string }>();
      order.items.forEach((item) => {
        itemMap.set(catalogItemKey(item.nameEs, item.nameEn), {
          nameEs: item.nameEs,
          nameEn: item.nameEn,
        });
      });
      validItemsBySupplier.set(order.supplierName.trim().toLowerCase(), itemMap);
    });

    if (!ordersBySupplier.size) {
      throw new BadRequestException(
        'No company orders found for the selected week.',
      );
    }

    const catalogSettingsLookup = this.buildCatalogSettingsLookup(
      await this.getCatalogForTenant(tenantId),
    );

    const purchasesBySupplier = new Map<
      string,
      Map<string, StoredInPersonPurchase>
    >();

    dto.items.forEach((item) => {
      const supplierKey = item.supplierName.trim().toLowerCase();
      const order = ordersBySupplier.get(supplierKey);
      if (!order) {
        throw new BadRequestException(
          `Supplier "${item.supplierName}" has no order for this week.`,
        );
      }
      const itemKey = catalogItemKey(item.nameEs, item.nameEn);
      const validItems = validItemsBySupplier.get(supplierKey);
      if (!validItems?.has(itemKey)) {
        throw new BadRequestException(
          `Item "${item.nameEs}" is not part of supplier ${order.supplierName}'s weekly order.`,
        );
      }
      const settings = this.resolveCatalogItemSettings(
        catalogSettingsLookup,
        order.supplierName,
        item.nameEs,
        item.nameEn,
      );

      const supplierBucket =
        purchasesBySupplier.get(supplierKey) ||
        new Map<string, StoredInPersonPurchase>();
      purchasesBySupplier.set(supplierKey, supplierBucket);
      supplierBucket.set(itemKey, {
        nameEs: item.nameEs.trim(),
        nameEn: item.nameEn.trim(),
        purchasedQuantity: item.purchasedQuantity,
        purchasedWeightLb:
          item.purchasedWeightLb === undefined || item.purchasedWeightLb === null
            ? null
            : item.purchasedWeightLb,
        unitPrice:
          item.unitPrice === undefined || item.unitPrice === null
            ? null
            : item.unitPrice,
        companyUnitPrice:
          item.companyUnitPrice === undefined || item.companyUnitPrice === null
            ? settings.companyUnitPrice
            : item.companyUnitPrice,
      });
    });

    await this.prisma.$transaction(async (tx) => {
      for (const order of orders) {
        const supplierKey = order.supplierName.trim().toLowerCase();
        const parsed = this.readStoredOrderNotes(order.notes);
        const nextPurchases = purchasesBySupplier.get(supplierKey);
        const metadata: StoredOrderMetadata = {
          version: 5,
          lbOrderMode: parsed.lbOrderMode,
          weekStart:
            this.normalizeDateKey(parsed.weekStart) || week.weekStartKey,
          weekEnd: this.normalizeDateKey(parsed.weekEnd) || week.weekEndKey,
          submittedDates: this.normalizeDateKeys(
            parsed.submittedDates.length
              ? parsed.submittedDates
              : [this.toDateKey(order.orderDate)],
          ),
          contributors: this.normalizeContributors(
            parsed.contributors.length
              ? parsed.contributors
              : this.resolveOrderContributor(order)
                ? [this.resolveOrderContributor(order) as string]
                : [],
          ),
          noteLines: this.normalizeNoteLines(parsed.noteLines),
          inPersonPurchases: this.normalizeStoredInPersonPurchases(
            nextPurchases
              ? Array.from(nextPurchases.values())
              : parsed.inPersonPurchases,
          ),
        };

        await tx.companyOrder.update({
          where: { id: order.id },
          data: {
            notes: this.composeStoredOrderNotes(metadata),
          },
        });
      }
    });

    return this.getInPersonShopping(authUser, {
      weekStart: week.weekStartKey,
      officeId: officeId || undefined,
    });
  }

  async exportOrderPdf(authUser: AuthUser, orderId: string) {
    const access = await this.tenancy.requireCompanyOrdersAccess(authUser);
    const tenantId = access.tenant.id;
    const normalizedOrderId = orderId.trim();
    if (!normalizedOrderId) {
      throw new BadRequestException('Order ID is required.');
    }

    const order = (await this.prisma.companyOrder.findFirst({
      where: {
        id: normalizedOrderId,
        tenantId,
        officeId: access.allowedOfficeId || undefined,
      },
      include: {
        office: { select: { name: true } },
        createdByEmployee: { select: { fullName: true, displayName: true } },
        items: {
          orderBy: [{ createdAt: 'asc' }],
          select: {
            id: true,
            nameEs: true,
            nameEn: true,
            quantity: true,
          },
        },
      },
    })) as CompanyOrderDbRow | null;

    if (!order) {
      throw new NotFoundException('Company order not found.');
    }

    const serialized = this.serializeOrder(order);
    const weekStartDate = serialized.weekStartDate;
    const weekEndDate = serialized.weekEndDate;
    const weekStart = dateKeyToUtc(weekStartDate);
    const weekEnd = new Date(`${weekEndDate}T23:59:59.999Z`);

    const weeklyOrders = (await this.prisma.companyOrder.findMany({
      where: {
        tenantId,
        officeId: order.officeId || null,
        orderDate: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      orderBy: [
        { supplierName: 'asc' },
        { orderDate: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        office: { select: { name: true } },
        createdByEmployee: { select: { fullName: true, displayName: true } },
        items: {
          orderBy: [{ createdAt: 'asc' }],
          select: {
            id: true,
            nameEs: true,
            nameEn: true,
            quantity: true,
          },
        },
      },
    })) as CompanyOrderDbRow[];

    const serializedOrders = weeklyOrders.length
      ? weeklyOrders.map((entry) => this.serializeOrder(entry))
      : [serialized];
    const catalogSettingsLookup = this.buildCatalogSettingsLookup(
      await this.getCatalogForTenant(tenantId),
    );
    const pdf = this.buildOrdersPdf(serializedOrders, catalogSettingsLookup, {
      weekStartDate,
      weekEndDate,
      locationLabel: this.resolvePdfLocationLabel(serializedOrders),
      generatedAt: new Date(),
    });
    return {
      filename: `company-order-week-${weekStartDate}.pdf`,
      content: pdf,
    };
  }

  async exportWeeklyOrders(
    authUser: AuthUser,
    options: {
      format: ExportFormat;
      weekStart?: string;
      officeId?: string;
      supplierName?: string;
    },
  ) {
    const access = await this.tenancy.requireCompanyOrdersAccess(authUser);
    const tenantId = access.tenant.id;
    const requestedOfficeId = options.officeId?.trim() || undefined;
    if (
      access.allowedOfficeId &&
      requestedOfficeId &&
      requestedOfficeId !== access.allowedOfficeId
    ) {
      throw new BadRequestException(
        'Kitchen manager can only access orders for their assigned location.',
      );
    }
    const officeId = access.allowedOfficeId || requestedOfficeId;
    const supplierName = options.supplierName?.trim() || undefined;
    const week = this.getWeekBounds(
      this.parseWeekStartDate(options.weekStart) || new Date(),
    );

    const orders = (await this.prisma.companyOrder.findMany({
      where: {
        tenantId,
        officeId,
        supplierName: supplierName
          ? { equals: supplierName, mode: 'insensitive' }
          : undefined,
        orderDate: {
          gte: week.weekStart,
          lte: week.weekEnd,
        },
      },
      orderBy: [
        { supplierName: 'asc' },
        { orderDate: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        office: { select: { name: true } },
        createdByEmployee: { select: { fullName: true, displayName: true } },
        items: {
          orderBy: [{ nameEs: 'asc' }, { nameEn: 'asc' }],
          select: {
            id: true,
            nameEs: true,
            nameEn: true,
            quantity: true,
          },
        },
      },
    })) as CompanyOrderDbRow[];
    const catalogSettingsLookup = this.buildCatalogSettingsLookup(
      await this.getCatalogForTenant(tenantId),
    );
    const serializedOrders = orders.map((order) => this.serializeOrder(order));
    const exportedOrders = this.applyInPersonShoppingToOrders(
      serializedOrders,
      catalogSettingsLookup,
    );

    if (options.format === 'csv') {
      const csv = this.buildWeeklyCsv(exportedOrders, week.weekStartKey);
      return {
        filename: this.buildWeeklyExportFilename(
          week.weekStartKey,
          'csv',
          supplierName,
        ),
        contentType: 'text/csv; charset=utf-8',
        content: Buffer.from(csv, 'utf8'),
      };
    }
    if (options.format === 'excel') {
      const excelHtml = this.buildWeeklyExcelHtml(
        exportedOrders,
        week.weekStartKey,
      );
      return {
        filename: this.buildWeeklyExportFilename(
          week.weekStartKey,
          'xls',
          supplierName,
        ),
        contentType: 'application/vnd.ms-excel; charset=utf-8',
        content: Buffer.from(excelHtml, 'utf8'),
      };
    }

    const pdf = this.buildOrdersPdf(
      serializedOrders,
      catalogSettingsLookup,
      {
        weekStartDate: week.weekStartKey,
        weekEndDate: week.weekEndKey,
        locationLabel: this.resolvePdfLocationLabel(serializedOrders),
        supplierLabel: supplierName || null,
        generatedAt: new Date(),
      },
    );
    return {
      filename: this.buildWeeklyExportFilename(
        week.weekStartKey,
        'pdf',
        supplierName,
      ),
      contentType: 'application/pdf',
      content: pdf,
    };
  }

  private parseWeekStartDate(rawValue?: string) {
    const value = rawValue?.trim() || '';
    if (!value) {
      return null;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('Invalid weekStart date.');
    }
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid weekStart date.');
    }
    return parsed;
  }

  private resolvePdfLocationLabel(orders: SerializedCompanyOrder[]) {
    const locationNames = Array.from(
      new Set(
        orders
          .map((order) => order.officeName?.trim())
          .filter((name): name is string => Boolean(name)),
      ),
    );
    if (!locationNames.length) {
      return 'All locations';
    }
    if (locationNames.length === 1) {
      return locationNames[0];
    }
    return 'Multiple locations';
  }

  private buildWeeklyExportFilename(
    weekStartDate: string,
    extension: 'pdf' | 'csv' | 'xls',
    supplierName?: string,
  ) {
    const supplierSlug = supplierName
      ? supplierName
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')
      : '';
    return supplierSlug
      ? `company-orders-${supplierSlug}-week-${weekStartDate}.${extension}`
      : `company-orders-week-${weekStartDate}.${extension}`;
  }

  private buildWeeklyCsv(
    orders: SerializedCompanyOrder[],
    weekStartDate: string,
  ) {
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const formattedWeekStartDate = this.formatDateKeyUs(weekStartDate);
    const rows: string[][] = [
      [
        'weekStart',
        'supplier',
        'office',
        'submittedDates',
        'contributors',
        'itemEs',
        'itemEn',
        'quantity',
        'notes',
      ],
    ];

    if (!orders.length) {
      rows.push([formattedWeekStartDate, '', '', '', '', '', '', '', '']);
    } else {
      orders.forEach((order) => {
        const submittedDatesLabel = order.submittedDates
          .map((dateKey) => this.formatDateKeyUs(dateKey))
          .join('; ');
        if (!order.items.length) {
          rows.push([
            formattedWeekStartDate,
            order.supplierName,
            order.officeName || '',
            submittedDatesLabel,
            order.contributors.join('; '),
            '',
            '',
            '',
            order.notes || '',
          ]);
          return;
        }
        order.items.forEach((item, itemIndex) => {
          rows.push([
            formattedWeekStartDate,
            order.supplierName,
            order.officeName || '',
            submittedDatesLabel,
            order.contributors.join('; '),
            item.nameEs,
            item.nameEn,
            String(item.quantity),
            itemIndex === 0 ? order.notes || '' : '',
          ]);
        });
      });
    }

    return rows
      .map((row) => row.map((cell) => escapeCsv(cell || '')).join(','))
      .join('\n');
  }

  private buildWeeklyExcelHtml(
    orders: SerializedCompanyOrder[],
    weekStartDate: string,
  ) {
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const formattedWeekStartDate = this.formatDateKeyUs(weekStartDate);

    const header = [
      'Week Start',
      'Supplier',
      'Location',
      'Submitted Dates',
      'Contributors',
      'Item (ES)',
      'Item (EN)',
      'Quantity',
      'Notes',
    ];

    const bodyRows: string[] = [];
    if (!orders.length) {
      bodyRows.push(
        `<tr>${[formattedWeekStartDate, '', '', '', '', '', '', '', '']
          .map((cell) => `<td>${escapeHtml(cell)}</td>`)
          .join('')}</tr>`,
      );
    } else {
      orders.forEach((order) => {
        const submittedDatesLabel = order.submittedDates
          .map((dateKey) => this.formatDateKeyUs(dateKey))
          .join('; ');
        const baseCells = [
          formattedWeekStartDate,
          order.supplierName,
          order.officeName || '',
          submittedDatesLabel,
          order.contributors.join('; '),
        ];

        if (!order.items.length) {
          bodyRows.push(
            `<tr>${[...baseCells, '', '', '', order.notes || '']
              .map((cell) => `<td>${escapeHtml(cell)}</td>`)
              .join('')}</tr>`,
          );
          return;
        }

        order.items.forEach((item, itemIndex) => {
          bodyRows.push(
            `<tr>${[
              ...baseCells,
              item.nameEs,
              item.nameEn,
              String(item.quantity),
              itemIndex === 0 ? order.notes || '' : '',
            ]
              .map((cell) => `<td>${escapeHtml(cell)}</td>`)
              .join('')}</tr>`,
          );
        });
      });
    }

    return `<!doctype html><html><head><meta charset="utf-8" /></head><body><table border="1"><thead><tr>${header
      .map((cell) => `<th>${escapeHtml(cell)}</th>`)
      .join(
        '',
      )}</tr></thead><tbody>${bodyRows.join('')}</tbody></table></body></html>`;
  }

  private async resolveSupplier(tenantId: string, rawSupplierName: string) {
    const supplierName = rawSupplierName.trim();
    if (!supplierName) {
      throw new BadRequestException('Supplier is required.');
    }

    const catalog = await this.getCatalogForTenant(tenantId);
    const supplier = catalog.find(
      (entry) =>
        entry.supplierName.toLowerCase() === supplierName.toLowerCase(),
    );
    if (!supplier) {
      throw new BadRequestException(
        'Supplier not found in company order catalog.',
      );
    }
    return supplier;
  }

  private async getCatalogForTenant(tenantId: string) {
    await this.ensureCatalogOverridesTable();
    const rows = await this.prisma.$queryRawUnsafe<
      Array<{ catalogJson: unknown }>
    >(
      'SELECT "catalogJson" FROM "CompanyOrderCatalogOverride" WHERE "tenantId" = $1 LIMIT 1',
      tenantId,
    );
    const tenantCatalog = rows[0]?.catalogJson;
    if (Array.isArray(tenantCatalog) && tenantCatalog.length) {
      return this.normalizeCatalogSuppliers(tenantCatalog);
    }
    return this.normalizeCatalogSuppliers(COMPANY_ORDER_CATALOG);
  }

  private async saveCatalogForTenant(
    tenantId: string,
    suppliers: CatalogSupplierWithComparisonUnit[],
  ) {
    await this.ensureCatalogOverridesTable();
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "CompanyOrderCatalogOverride" ("tenantId", "catalogJson", "updatedAt")
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT ("tenantId")
       DO UPDATE SET "catalogJson" = EXCLUDED."catalogJson", "updatedAt" = NOW()`,
      tenantId,
      JSON.stringify(suppliers),
    );
  }

  private async ensureCatalogOverridesTable() {
    if (this.catalogOverridesTableReady) {
      return;
    }
    await this.prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "CompanyOrderCatalogOverride" (
         "tenantId" TEXT PRIMARY KEY,
         "catalogJson" JSONB NOT NULL,
         "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
       )`,
    );
    this.catalogOverridesTableReady = true;
  }

  private buildCatalogSettingsLookup(
    suppliers: CatalogSupplierWithComparisonUnit[],
  ) {
    const lookup: CatalogSettingsLookup = new Map();
    suppliers.forEach((supplier) => {
      const supplierKey = supplier.supplierName.trim().toLowerCase();
      const itemLookup = new Map<string, CatalogItemSettings>();
      supplier.items.forEach((item) => {
        itemLookup.set(
          catalogItemKey(item.nameEs, item.nameEn),
          this.normalizeCatalogItemSettings(
            item,
            supplier.supplierName,
            item.nameEs,
            item.nameEn,
          ),
        );
      });
      lookup.set(supplierKey, itemLookup);
    });
    return lookup;
  }

  private normalizeCatalogItemSettings(
    rawItem:
      | {
          comparisonUnit?: unknown;
          caseSizeLb?: unknown;
          companyUnitPrice?: unknown;
        }
      | null
      | undefined,
    supplierName: string,
    nameEs: string,
    nameEn: string,
  ): CatalogItemSettings {
    const comparisonUnit = this.normalizeCatalogComparisonUnit(
      rawItem?.comparisonUnit,
      supplierName,
      nameEs,
      nameEn,
    );

    return {
      comparisonUnit,
      caseSizeLb: this.normalizeCatalogCaseSizeLb(
        rawItem?.caseSizeLb,
        comparisonUnit,
      ),
      companyUnitPrice: this.normalizeCatalogCompanyUnitPrice(
        rawItem?.companyUnitPrice,
      ),
    };
  }

  private normalizeCatalogComparisonUnit(
    rawValue: unknown,
    supplierName: string,
    nameEs: string,
    nameEn: string,
  ): CompanyOrderComparisonUnit {
    const normalizedValue =
      typeof rawValue === 'string' ? rawValue.trim().toLowerCase() : '';
    if (normalizedValue === LB_COMPARISON_UNIT) {
      return LB_COMPARISON_UNIT;
    }
    if (normalizedValue === DEFAULT_COMPARISON_UNIT) {
      return DEFAULT_COMPARISON_UNIT;
    }

    const explicitKey = supplierCatalogItemKey(supplierName, nameEs, nameEn);
    if (DEFAULT_LB_COMPARISON_ITEM_KEYS.has(explicitKey)) {
      return LB_COMPARISON_UNIT;
    }

    const normalizedEs = nameEs.trim().toLowerCase();
    if (
      normalizedEs === 'pollo' ||
      normalizedEs.startsWith('carne ') ||
      normalizedEs.startsWith('puerco ') ||
      normalizedEs === 'ribeye' ||
      normalizedEs === 'chuleta' ||
      normalizedEs === 'tocino'
    ) {
      return LB_COMPARISON_UNIT;
    }

    return DEFAULT_COMPARISON_UNIT;
  }

  private normalizeCatalogCaseSizeLb(
    rawValue: unknown,
    comparisonUnit: CompanyOrderComparisonUnit,
  ) {
    if (comparisonUnit !== LB_COMPARISON_UNIT) {
      return null;
    }
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return Number(parsed.toFixed(2));
  }

  private normalizeCatalogCompanyUnitPrice(rawValue: unknown) {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return null;
    }
    return Number(parsed.toFixed(2));
  }

  private resolveCatalogItemSettings(
    lookup: CatalogSettingsLookup,
    supplierName: string,
    nameEs: string,
    nameEn: string,
  ): CatalogItemSettings {
    const supplierKey = supplierName.trim().toLowerCase();
    const itemKey = catalogItemKey(nameEs, nameEn);
    const existing = lookup.get(supplierKey)?.get(itemKey);
    if (existing) {
      return existing;
    }
    return this.normalizeCatalogItemSettings(
      undefined,
      supplierName,
      nameEs,
      nameEn,
    );
  }

  private resolveOrderQuantityUnit(
    comparisonUnit: CompanyOrderComparisonUnit,
    lbOrderMode: CompanyOrderLbOrderMode,
  ): CompanyOrderOrderUnit {
    if (comparisonUnit !== LB_COMPARISON_UNIT) {
      return 'each';
    }
    return lbOrderMode === DEFAULT_LB_ORDER_MODE ? 'case' : 'lb';
  }

  private createOrderQuantityByUnit(): OrderQuantityByUnit {
    return {
      each: 0,
      case: 0,
      lb: 0,
    };
  }

  private addOrderQuantityByUnit(
    bucket: OrderQuantityByUnit,
    orderUnit: CompanyOrderOrderUnit,
    quantity: number,
  ) {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return bucket;
    }
    bucket[orderUnit] = Number(
      (bucket[orderUnit] + quantity).toFixed(2),
    );
    return bucket;
  }

  private formatComparisonQuantityWithUnit(
    quantity: number,
    comparisonUnit: CompanyOrderComparisonUnit,
  ) {
    return comparisonUnit === LB_COMPARISON_UNIT
      ? `${this.formatPdfQuantity(quantity)} lb`
      : `${this.formatPdfQuantity(quantity)} each`;
  }

  private formatPdfWeightWithUnit(quantity: number) {
    return `${this.formatPdfQuantity(quantity)} lbs`;
  }

  private formatPdfRemainingOrderCaseCount(
    quantity: number,
    orderQuantityUnit: CompanyOrderOrderUnit,
  ) {
    if (orderQuantityUnit === 'lb') {
      return '-';
    }
    return this.formatPdfQuantity(quantity);
  }

  private formatPdfRemainingOrderLbs(
    quantity: number,
    orderQuantityUnit: CompanyOrderOrderUnit,
    comparisonUnit: CompanyOrderComparisonUnit,
    caseSizeLb: number | null,
  ) {
    if (comparisonUnit !== LB_COMPARISON_UNIT) {
      return '-';
    }
    if (
      orderQuantityUnit === 'case' &&
      caseSizeLb !== null &&
      caseSizeLb > 0
    ) {
      const totalWeight = Number((quantity * caseSizeLb).toFixed(2));
      return this.formatPdfWeightWithUnit(totalWeight);
    }
    if (orderQuantityUnit === 'lb') {
      return this.formatPdfWeightWithUnit(quantity);
    }
    return '-';
  }

  private formatPdfUnitPriceShort(
    value: number | null,
    comparisonUnit: CompanyOrderComparisonUnit,
  ) {
    if (value === null || !Number.isFinite(value) || value <= 0) {
      return '-';
    }
    return comparisonUnit === LB_COMPARISON_UNIT
      ? `${this.formatPdfMoney(value)}/lb`
      : `${this.formatPdfMoney(value)} ea`;
  }

  private formatPdfItemLabel(nameEs: string, nameEn: string) {
    if (!nameEn || nameEn === nameEs) {
      return nameEs || '-';
    }
    return `${nameEs} / ${nameEn}`;
  }

  private formatOrderQuantityWithUnit(
    quantity: number,
    orderUnit: CompanyOrderOrderUnit,
  ) {
    if (orderUnit === 'case') {
      return `${this.formatPdfQuantity(quantity)} ${
        Math.abs(quantity - 1) < 0.005 ? 'case' : 'cases'
      }`;
    }
    if (orderUnit === 'lb') {
      return `${this.formatPdfQuantity(quantity)} lb`;
    }
    return `${this.formatPdfQuantity(quantity)} each`;
  }

  private formatOrderQuantitySummaryByUnit(bucket: OrderQuantityByUnit) {
    const parts: string[] = [];
    if (bucket.each > 0) {
      parts.push(`${this.formatPdfQuantity(bucket.each)} each`);
    }
    if (bucket.case > 0) {
      parts.push(
        `${this.formatPdfQuantity(bucket.case)} ${
          Math.abs(bucket.case - 1) < 0.005 ? 'case' : 'cases'
        }`,
      );
    }
    if (bucket.lb > 0) {
      parts.push(`${this.formatPdfQuantity(bucket.lb)} lb`);
    }
    return parts.length ? parts.join(' + ') : '0';
  }

  private formatPdfUnitPrice(
    value: number,
    comparisonUnit: CompanyOrderComparisonUnit,
  ) {
    return comparisonUnit === LB_COMPARISON_UNIT
      ? `${this.formatPdfMoney(value)}/lb`
      : `${this.formatPdfMoney(value)} each`;
  }

  private normalizeCatalogSuppliers(
    rawSuppliers: Array<
      | CatalogSupplierWithComparisonUnit
      | CompanyOrderCatalogSupplierDto
      | {
          supplierName?: string;
          items?: Array<{
            nameEs?: string;
            nameEn?: string;
            comparisonUnit?: unknown;
            caseSizeLb?: unknown;
            companyUnitPrice?: unknown;
          }>;
        }
    >,
  ) {
    const bySupplier = new Map<
      string,
      {
        supplierName: string;
        itemsByKey: Map<
          string,
          {
            nameEs: string;
            nameEn: string;
            comparisonUnit: CompanyOrderComparisonUnit;
            caseSizeLb: number | null;
            companyUnitPrice: number | null;
          }
        >;
      }
    >();

    rawSuppliers.forEach((rawSupplier) => {
      const supplierName = (rawSupplier?.supplierName || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 120);
      if (!supplierName) {
        return;
      }
      const supplierKey = supplierName.toLowerCase();
      const existing = bySupplier.get(supplierKey) || {
        supplierName,
        itemsByKey: new Map<
          string,
          {
            nameEs: string;
            nameEn: string;
            comparisonUnit: CompanyOrderComparisonUnit;
            caseSizeLb: number | null;
            companyUnitPrice: number | null;
          }
        >(),
      };
      if (!bySupplier.has(supplierKey)) {
        bySupplier.set(supplierKey, existing);
      }

      const rawItems = Array.isArray(rawSupplier?.items)
        ? rawSupplier.items
        : [];
      rawItems.forEach((rawItem) => {
        const nameEs = (rawItem?.nameEs || '')
          .trim()
          .replace(/\s+/g, ' ')
          .slice(0, 200);
        const nameEn = (rawItem?.nameEn || '')
          .trim()
          .replace(/\s+/g, ' ')
          .slice(0, 200);
        if (!nameEs || !nameEn) {
          return;
        }
        existing.itemsByKey.set(catalogItemKey(nameEs, nameEn), {
          nameEs,
          nameEn,
          ...this.normalizeCatalogItemSettings(
            rawItem,
            supplierName,
            nameEs,
            nameEn,
          ),
        });
      });
    });

    return Array.from(bySupplier.values())
      .map((supplier) => ({
        supplierName: supplier.supplierName,
        items: Array.from(supplier.itemsByKey.values()),
      }))
      .filter((supplier) => supplier.items.length > 0);
  }

  private serializeOrder(order: CompanyOrderDbRow) {
    const parsedNotes = this.readStoredOrderNotes(order.notes);
    const fallbackWeek = this.getWeekBounds(order.orderDate);
    const weekStartDate =
      this.normalizeDateKey(parsedNotes.weekStart) || fallbackWeek.weekStartKey;
    const weekEndDate =
      this.normalizeDateKey(parsedNotes.weekEnd) || fallbackWeek.weekEndKey;

    const submittedDates = this.normalizeDateKeys(
      parsedNotes.submittedDates.length
        ? parsedNotes.submittedDates
        : [this.toDateKey(order.orderDate)],
    );
    const lastSubmittedDate =
      submittedDates[submittedDates.length - 1] ||
      this.toDateKey(order.orderDate);
    const createdBy = this.resolveOrderContributor(order) || null;
    const contributors = this.normalizeContributors(
      parsedNotes.contributors.length
        ? parsedNotes.contributors
        : createdBy
          ? [createdBy]
          : [],
    );

    return {
      id: order.id,
      supplierName: order.supplierName,
      supplierNames: [order.supplierName],
      companyName: '',
      orderDate: order.orderDate.toISOString(),
      weekStartDate,
      weekEndDate,
      lbOrderMode: parsedNotes.lbOrderMode,
      orderLabel: this.formatOrderLabel(weekStartDate, lastSubmittedDate),
      submittedDates,
      contributors,
      notes: parsedNotes.notes,
      officeId: order.officeId || null,
      officeName: order.office?.name || null,
      createdBy,
      totalQuantity: Number(
        order.items
          .reduce((total, item) => total + item.quantity, 0)
          .toFixed(2),
      ),
      itemCount: order.items.length,
      items: order.items.map((item) => ({
        id: item.id,
        nameEs: item.nameEs,
        nameEn: item.nameEn,
        quantity: Number(item.quantity.toFixed(2)),
      })),
      inPersonPurchases: parsedNotes.inPersonPurchases,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  private aggregateOrdersForList(orders: SerializedCompanyOrder[]) {
    type OrderAggregate = {
      id: string;
      weekStartDate: string;
      weekEndDate: string;
      officeId: string | null;
      officeName: string | null;
      createdBy: string | null;
      supplierNames: Map<string, string>;
      submittedDates: Set<string>;
      contributors: Set<string>;
      noteLines: Set<string>;
      items: Map<
        string,
        { id: string; nameEs: string; nameEn: string; quantity: number }
      >;
      createdAtMs: number;
      updatedAtMs: number;
      orderDateMs: number;
    };

    const aggregates = new Map<string, OrderAggregate>();

    orders.forEach((order) => {
      const officeKey = order.officeId || '__all__';
      const aggregateKey = `${order.weekStartDate}|${officeKey}`;
      const createdAtMs = Date.parse(order.createdAt);
      const updatedAtMs = Date.parse(order.updatedAt || order.orderDate);
      const orderDateMs = Date.parse(order.orderDate);
      const nowMs = Date.now();
      const safeOrderDateMs = Number.isFinite(orderDateMs)
        ? orderDateMs
        : nowMs;
      const safeCreatedAtMs = Number.isFinite(createdAtMs)
        ? createdAtMs
        : safeOrderDateMs;
      const safeUpdatedAtMs = Number.isFinite(updatedAtMs)
        ? updatedAtMs
        : safeOrderDateMs;

      let aggregate = aggregates.get(aggregateKey);
      if (!aggregate) {
        aggregate = {
          id: order.id,
          weekStartDate: order.weekStartDate,
          weekEndDate: order.weekEndDate,
          officeId: order.officeId || null,
          officeName: order.officeName || null,
          createdBy: order.createdBy || null,
          supplierNames: new Map<string, string>(),
          submittedDates: new Set<string>(),
          contributors: new Set<string>(),
          noteLines: new Set<string>(),
          items: new Map<
            string,
            { id: string; nameEs: string; nameEn: string; quantity: number }
          >(),
          createdAtMs: safeCreatedAtMs,
          updatedAtMs: safeUpdatedAtMs,
          orderDateMs: safeOrderDateMs,
        };
        aggregates.set(aggregateKey, aggregate);
      }

      if (safeCreatedAtMs < aggregate.createdAtMs) {
        aggregate.createdAtMs = safeCreatedAtMs;
        aggregate.id = order.id;
        aggregate.createdBy = order.createdBy || aggregate.createdBy;
      }
      if (safeUpdatedAtMs > aggregate.updatedAtMs) {
        aggregate.updatedAtMs = safeUpdatedAtMs;
      }
      if (safeOrderDateMs > aggregate.orderDateMs) {
        aggregate.orderDateMs = safeOrderDateMs;
      }
      if (!aggregate.officeName && order.officeName) {
        aggregate.officeName = order.officeName;
      }
      if (!aggregate.createdBy && order.createdBy) {
        aggregate.createdBy = order.createdBy;
      }

      [order.supplierName, ...(order.supplierNames || [])].forEach(
        (supplierName) => {
          const normalized = supplierName.trim();
          if (!normalized) {
            return;
          }
          const key = normalized.toLowerCase();
          if (!aggregate.supplierNames.has(key)) {
            aggregate.supplierNames.set(key, normalized);
          }
        },
      );

      this.normalizeDateKeys(order.submittedDates || []).forEach((dateKey) => {
        aggregate.submittedDates.add(dateKey);
      });
      this.normalizeContributors(order.contributors || []).forEach(
        (contributor) => {
          aggregate.contributors.add(contributor);
        },
      );
      this.normalizeNoteLines((order.notes || '').split('\n')).forEach(
        (line) => {
          aggregate.noteLines.add(line);
        },
      );

      order.items.forEach((item) => {
        const key = `${order.supplierName.trim().toLowerCase()}|${catalogItemKey(item.nameEs, item.nameEn)}`;
        const existing = aggregate.items.get(key);
        if (existing) {
          existing.quantity = Number(
            (existing.quantity + item.quantity).toFixed(2),
          );
          return;
        }
        aggregate.items.set(key, {
          id: item.id,
          nameEs: item.nameEs,
          nameEn: item.nameEn,
          quantity: Number(item.quantity.toFixed(2)),
        });
      });
    });

    return Array.from(aggregates.values())
      .map((aggregate) => {
        const supplierNames = this.normalizeSupplierNames(
          Array.from(aggregate.supplierNames.values()),
        );
        const submittedDates = this.normalizeDateKeys(
          Array.from(aggregate.submittedDates.values()),
        );
        const contributors = this.normalizeContributors(
          Array.from(aggregate.contributors.values()),
        );
        const notes = this.normalizeNoteLines(
          Array.from(aggregate.noteLines.values()),
        ).join('\n');
        const items = Array.from(aggregate.items.values()).sort((a, b) =>
          catalogItemKey(a.nameEs, a.nameEn).localeCompare(
            catalogItemKey(b.nameEs, b.nameEn),
          ),
        );
        const totalQuantity = Number(
          items.reduce((total, item) => total + item.quantity, 0).toFixed(2),
        );
        const orderDate = new Date(aggregate.orderDateMs);
        const fallbackSubmittedDate = this.toDateKey(orderDate);
        const lastSubmittedDate =
          submittedDates[submittedDates.length - 1] || fallbackSubmittedDate;

        return {
          id: aggregate.id,
          supplierName: supplierNames.join(', '),
          supplierNames,
          companyName: '',
          orderDate: orderDate.toISOString(),
          weekStartDate: aggregate.weekStartDate,
          weekEndDate: aggregate.weekEndDate,
          lbOrderMode: DEFAULT_LB_ORDER_MODE,
          orderLabel: this.formatOrderLabel(
            aggregate.weekStartDate,
            lastSubmittedDate,
          ),
          submittedDates,
          contributors,
          notes,
          officeId: aggregate.officeId,
          officeName: aggregate.officeName,
          createdBy: aggregate.createdBy,
          totalQuantity,
          itemCount: items.length,
          items,
          inPersonPurchases: [],
          createdAt: new Date(aggregate.createdAtMs).toISOString(),
          updatedAt: new Date(aggregate.updatedAtMs).toISOString(),
        };
      })
      .sort((a, b) => {
        const updatedDiff = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
        if (updatedDiff !== 0) {
          return updatedDiff;
        }
        const createdDiff = Date.parse(b.createdAt) - Date.parse(a.createdAt);
        if (createdDiff !== 0) {
          return createdDiff;
        }
        return b.weekStartDate.localeCompare(a.weekStartDate);
      });
  }

  private buildInPersonShoppingSuppliers(
    orders: SerializedCompanyOrder[],
    catalogSettingsLookup: CatalogSettingsLookup,
  ): SerializedCompanyOrderInPersonSupplier[] {
    return orders
      .map((order) => {
        const purchasesByKey = new Map<string, StoredInPersonPurchase>();
        order.inPersonPurchases.forEach((purchase) => {
          purchasesByKey.set(
            catalogItemKey(purchase.nameEs, purchase.nameEn),
            purchase,
          );
        });
        const items = order.items
          .map((item) => {
            const purchase = purchasesByKey.get(
              catalogItemKey(item.nameEs, item.nameEn),
            );
            const settings = this.resolveCatalogItemSettings(
              catalogSettingsLookup,
              order.supplierName,
              item.nameEs,
              item.nameEn,
            );
            const orderQuantityUnit = this.resolveOrderQuantityUnit(
              settings.comparisonUnit,
              order.lbOrderMode,
            );
            const purchasedQuantity = Number(
              Math.max(0, purchase?.purchasedQuantity || 0).toFixed(2),
            );
            const remainingQuantity = Number(
              Math.max(0, item.quantity - purchasedQuantity).toFixed(2),
            );
            const purchasedWeightLb =
              settings.comparisonUnit === LB_COMPARISON_UNIT
                ? Number(
                    Math.max(
                      0,
                      purchase?.purchasedWeightLb ??
                        (orderQuantityUnit === 'lb'
                          ? purchase?.purchasedQuantity || 0
                          : 0),
                    ).toFixed(2),
                  )
                : null;
            return {
              nameEs: item.nameEs,
              nameEn: item.nameEn,
              orderedQuantity: Number(item.quantity.toFixed(2)),
              purchasedQuantity,
              remainingQuantity,
              orderQuantityUnit,
              comparisonUnit: settings.comparisonUnit,
              caseSizeLb: settings.caseSizeLb,
              purchasedWeightLb,
              unitPrice:
                purchase?.unitPrice === null || purchase?.unitPrice === undefined
                  ? null
                  : Number(purchase.unitPrice.toFixed(2)),
              companyUnitPrice:
                purchase?.companyUnitPrice === null ||
                purchase?.companyUnitPrice === undefined
                  ? settings.companyUnitPrice
                  : Number(purchase.companyUnitPrice.toFixed(2)),
            };
          })
          .sort((a, b) =>
            catalogItemKey(a.nameEs, a.nameEn).localeCompare(
              catalogItemKey(b.nameEs, b.nameEn),
            ),
          );

        return {
          supplierName: order.supplierName,
          itemCount: items.length,
          totalOrderedQuantity: Number(
            items
              .reduce((total, item) => total + item.orderedQuantity, 0)
              .toFixed(2),
          ),
          totalPurchasedQuantity: Number(
            items
              .reduce((total, item) => total + item.purchasedQuantity, 0)
              .toFixed(2),
          ),
          totalRemainingQuantity: Number(
            items
              .reduce((total, item) => total + item.remainingQuantity, 0)
              .toFixed(2),
          ),
          totalPurchasedWeightLb: Number(
            items
              .reduce(
                (total, item) => total + (item.purchasedWeightLb || 0),
                0,
              )
              .toFixed(2),
          ),
          items,
        };
      })
      .sort((a, b) => a.supplierName.localeCompare(b.supplierName));
  }

  private applyInPersonShoppingToOrders(
    orders: SerializedCompanyOrder[],
    _catalogSettingsLookup: CatalogSettingsLookup,
  ) {
    return orders
      .map((order) => {
        const purchasesByKey = new Map<string, StoredInPersonPurchase>();
        order.inPersonPurchases.forEach((purchase) => {
          purchasesByKey.set(
            catalogItemKey(purchase.nameEs, purchase.nameEn),
            purchase,
          );
        });

        const items = order.items
          .map((item) => {
            const purchase = purchasesByKey.get(
              catalogItemKey(item.nameEs, item.nameEn),
            );
            const remainingQuantity = Number(
              Math.max(0, item.quantity - (purchase?.purchasedQuantity || 0))
                .toFixed(2),
            );
            if (remainingQuantity <= 0) {
              return null;
            }
            return {
              ...item,
              quantity: remainingQuantity,
            };
          })
          .filter(
            (
              item,
            ): item is {
              id: string;
              nameEs: string;
              nameEn: string;
              quantity: number;
            } => item !== null,
          );

        if (!items.length) {
          return null;
        }

        return {
          ...order,
          itemCount: items.length,
          totalQuantity: Number(
            items.reduce((total, item) => total + item.quantity, 0).toFixed(2),
          ),
          items,
        };
      })
      .filter((order): order is SerializedCompanyOrder => order !== null);
  }

  private buildPdfRemainingOrderRows(
    order: SerializedCompanyOrder,
    catalogSettingsLookup: CatalogSettingsLookup,
  ) {
    const purchasesByKey = new Map<string, StoredInPersonPurchase>();
    order.inPersonPurchases.forEach((purchase) => {
      purchasesByKey.set(catalogItemKey(purchase.nameEs, purchase.nameEn), purchase);
    });

    const rows = order.items
      .map((item) => {
        const purchase = purchasesByKey.get(
          catalogItemKey(item.nameEs, item.nameEn),
        );
        const remainingQuantity = Number(
          Math.max(0, item.quantity - (purchase?.purchasedQuantity || 0)).toFixed(2),
        );
        if (remainingQuantity <= 0) {
          return null;
        }
        const settings = this.resolveCatalogItemSettings(
          catalogSettingsLookup,
          order.supplierName,
          item.nameEs,
          item.nameEn,
        );
        const orderQuantityUnit = this.resolveOrderQuantityUnit(
          settings.comparisonUnit,
          order.lbOrderMode,
        );
        const unitPrice =
          purchase?.unitPrice === null || purchase?.unitPrice === undefined
            ? null
            : Number(purchase.unitPrice.toFixed(2));
        const companyUnitPrice =
          purchase?.companyUnitPrice === null ||
          purchase?.companyUnitPrice === undefined ||
          purchase.companyUnitPrice <= 0
            ? settings.companyUnitPrice
            : Number(purchase.companyUnitPrice.toFixed(2));
        return {
          nameEs: item.nameEs || item.nameEn || '-',
          nameEn: item.nameEn || item.nameEs || '-',
          quantity: remainingQuantity,
          orderQuantityUnit,
          comparisonUnit: settings.comparisonUnit,
          caseSizeLb: settings.caseSizeLb,
          unitPrice,
          companyUnitPrice,
        };
      })
      .filter(
        (
          item,
        ): item is {
          nameEs: string;
          nameEn: string;
          quantity: number;
          orderQuantityUnit: CompanyOrderOrderUnit;
          comparisonUnit: CompanyOrderComparisonUnit;
          caseSizeLb: number | null;
          unitPrice: number | null;
          companyUnitPrice: number | null;
        } => item !== null,
      )
      .map((item, index) => ({
        rowNumber: index + 1,
        itemLabel: this.formatPdfItemLabel(item.nameEs, item.nameEn),
        caseCount: this.formatPdfRemainingOrderCaseCount(
          item.quantity,
          item.orderQuantityUnit,
        ),
        lbs: this.formatPdfRemainingOrderLbs(
          item.quantity,
          item.orderQuantityUnit,
          item.comparisonUnit,
          item.caseSizeLb,
        ),
        storePrice: this.formatPdfUnitPriceShort(
          item.unitPrice,
          item.comparisonUnit,
        ),
        supplierPrice: this.formatPdfUnitPriceShort(
          item.companyUnitPrice,
          item.comparisonUnit,
        ),
      }));

    if (rows.length) {
      return rows;
    }

    return [
      {
        rowNumber: 1,
        itemLabel: 'No remaining company-order items',
        caseCount: '-',
        lbs: '-',
        storePrice: '-',
        supplierPrice: '-',
      },
    ];
  }

  private buildPdfRemainingOrderTotals(
    order: SerializedCompanyOrder,
    catalogSettingsLookup: CatalogSettingsLookup,
  ) {
    const purchasesByKey = new Map<string, StoredInPersonPurchase>();
    order.inPersonPurchases.forEach((purchase) => {
      purchasesByKey.set(catalogItemKey(purchase.nameEs, purchase.nameEn), purchase);
    });

    const quantitiesByUnit = this.createOrderQuantityByUnit();
    let totalRemainingWeightLb = 0;
    const remainingItems = order.items.reduce((count, item) => {
      const remainingQuantity = Number(
        Math.max(
          0,
          item.quantity -
            (purchasesByKey.get(catalogItemKey(item.nameEs, item.nameEn))
              ?.purchasedQuantity || 0),
        ).toFixed(2),
      );
      if (remainingQuantity <= 0) {
        return count;
      }
      const settings = this.resolveCatalogItemSettings(
        catalogSettingsLookup,
        order.supplierName,
        item.nameEs,
        item.nameEn,
      );
      this.addOrderQuantityByUnit(
        quantitiesByUnit,
        this.resolveOrderQuantityUnit(settings.comparisonUnit, order.lbOrderMode),
        remainingQuantity,
      );
      if (settings.comparisonUnit === LB_COMPARISON_UNIT) {
        const orderQuantityUnit = this.resolveOrderQuantityUnit(
          settings.comparisonUnit,
          order.lbOrderMode,
        );
        if (orderQuantityUnit === 'case' && settings.caseSizeLb && settings.caseSizeLb > 0) {
          totalRemainingWeightLb = Number(
            (totalRemainingWeightLb + remainingQuantity * settings.caseSizeLb).toFixed(2),
          );
        } else if (orderQuantityUnit === 'lb') {
          totalRemainingWeightLb = Number(
            (totalRemainingWeightLb + remainingQuantity).toFixed(2),
          );
        }
      }
      return count + 1;
    }, 0);

    return {
      itemCount: remainingItems,
      quantitiesByUnit,
      totalRemainingWeightLb,
    };
  }

  private buildPdfInPersonPurchaseSummary(
    order: SerializedCompanyOrder,
    catalogSettingsLookup: CatalogSettingsLookup,
  ) {
    const items = order.inPersonPurchases
      .map((purchase) => {
        const settings = this.resolveCatalogItemSettings(
          catalogSettingsLookup,
          order.supplierName,
          purchase.nameEs,
          purchase.nameEn,
        );
        const purchasedQuantity = Number(
          Math.max(0, purchase.purchasedQuantity || 0).toFixed(2),
        );
        const orderQuantityUnit = this.resolveOrderQuantityUnit(
          settings.comparisonUnit,
          order.lbOrderMode,
        );
        const comparisonQuantity =
          settings.comparisonUnit === LB_COMPARISON_UNIT
            ? Number(
                Math.max(
                  0,
                  purchase.purchasedWeightLb ??
                    (orderQuantityUnit === 'lb' ? purchase.purchasedQuantity || 0 : 0),
                ).toFixed(2),
              )
            : purchasedQuantity;
        const unitPrice =
          purchase.unitPrice === null || purchase.unitPrice === undefined
            ? null
            : Number(purchase.unitPrice.toFixed(2));
        const companyUnitPrice =
          purchase.companyUnitPrice === null ||
          purchase.companyUnitPrice === undefined ||
          purchase.companyUnitPrice <= 0
            ? null
            : Number(purchase.companyUnitPrice.toFixed(2));
        const inPersonSpend =
          comparisonQuantity > 0 && unitPrice !== null
            ? Number((comparisonQuantity * unitPrice).toFixed(2))
            : null;
        const companySpend =
          comparisonQuantity > 0 && companyUnitPrice !== null
            ? Number((comparisonQuantity * companyUnitPrice).toFixed(2))
            : null;
        const savings =
          inPersonSpend !== null && companySpend !== null
            ? Number((companySpend - inPersonSpend).toFixed(2))
            : null;

        if (
          purchasedQuantity <= 0 &&
          comparisonQuantity <= 0 &&
          unitPrice === null &&
          companyUnitPrice === null
        ) {
          return null;
        }

        return {
          nameEs: purchase.nameEs || purchase.nameEn || '-',
          nameEn: purchase.nameEn || purchase.nameEs || '-',
          purchasedQuantity,
          purchasedWeightLb:
            settings.comparisonUnit === LB_COMPARISON_UNIT
              ? comparisonQuantity
              : null,
          orderQuantityUnit,
          comparisonUnit: settings.comparisonUnit,
          caseSizeLb: settings.caseSizeLb,
          unitPrice,
          companyUnitPrice,
          inPersonSpend,
          companySpend,
          savings,
        };
      })
      .filter(
        (
          item,
        ): item is {
          nameEs: string;
          nameEn: string;
          purchasedQuantity: number;
          purchasedWeightLb: number | null;
          orderQuantityUnit: CompanyOrderOrderUnit;
          comparisonUnit: CompanyOrderComparisonUnit;
          caseSizeLb: number | null;
          unitPrice: number | null;
          companyUnitPrice: number | null;
          inPersonSpend: number | null;
          companySpend: number | null;
          savings: number | null;
        } => item !== null,
      )
      .sort((a, b) =>
        catalogItemKey(a.nameEs, a.nameEn).localeCompare(
          catalogItemKey(b.nameEs, b.nameEn),
        ),
      );

    const purchasedQuantitiesByUnit = this.createOrderQuantityByUnit();
    items.forEach((item) => {
      this.addOrderQuantityByUnit(
        purchasedQuantitiesByUnit,
        item.orderQuantityUnit,
        item.purchasedQuantity,
      );
    });

    return {
      items,
      purchasedQuantitiesByUnit,
      totalPurchasedWeightLb: Number(
        items.reduce((total, item) => total + (item.purchasedWeightLb || 0), 0).toFixed(2),
      ),
      totalInPersonSpend: Number(
        items
          .reduce((total, item) => total + (item.inPersonSpend || 0), 0)
          .toFixed(2),
      ),
      totalCompanySpend: Number(
        items
          .reduce((total, item) => total + (item.companySpend || 0), 0)
          .toFixed(2),
      ),
      totalSavings: Number(
        items.reduce((total, item) => total + (item.savings || 0), 0).toFixed(2),
      ),
    };
  }

  private buildPdfInPersonTotals(
    orders: SerializedCompanyOrder[],
    catalogSettingsLookup: CatalogSettingsLookup,
  ) {
    return orders.reduce(
      (acc, order) => {
        const summary = this.buildPdfInPersonPurchaseSummary(
          order,
          catalogSettingsLookup,
        );
        this.addOrderQuantityByUnit(
          acc.purchasedQuantitiesByUnit,
          'each',
          summary.purchasedQuantitiesByUnit.each,
        );
        this.addOrderQuantityByUnit(
          acc.purchasedQuantitiesByUnit,
          'case',
          summary.purchasedQuantitiesByUnit.case,
        );
        this.addOrderQuantityByUnit(
          acc.purchasedQuantitiesByUnit,
          'lb',
          summary.purchasedQuantitiesByUnit.lb,
        );
        return {
          purchasedQuantitiesByUnit: acc.purchasedQuantitiesByUnit,
          totalPurchasedWeightLb: Number(
            (acc.totalPurchasedWeightLb + summary.totalPurchasedWeightLb).toFixed(2),
          ),
          totalInPersonSpend: Number(
            (acc.totalInPersonSpend + summary.totalInPersonSpend).toFixed(2),
          ),
          totalCompanySpend: Number(
            (acc.totalCompanySpend + summary.totalCompanySpend).toFixed(2),
          ),
          totalSavings: Number(
            (acc.totalSavings + summary.totalSavings).toFixed(2),
          ),
          itemCount: acc.itemCount + summary.items.length,
        };
      },
      {
        purchasedQuantitiesByUnit: this.createOrderQuantityByUnit(),
        totalPurchasedWeightLb: 0,
        totalInPersonSpend: 0,
        totalCompanySpend: 0,
        totalSavings: 0,
        itemCount: 0,
      },
    );
  }

  private buildPdfCombinedOrderRows(
    order: SerializedCompanyOrder,
    catalogSettingsLookup: CatalogSettingsLookup,
  ) {
    const orderedItemsByKey = new Map<
      string,
      { nameEs: string; nameEn: string; quantity: number }
    >();
    order.items.forEach((item) => {
      orderedItemsByKey.set(catalogItemKey(item.nameEs, item.nameEn), {
        nameEs: item.nameEs,
        nameEn: item.nameEn,
        quantity: Number(item.quantity.toFixed(2)),
      });
    });

    const purchasesByKey = new Map<string, StoredInPersonPurchase>();
    order.inPersonPurchases.forEach((purchase) => {
      purchasesByKey.set(
        catalogItemKey(purchase.nameEs, purchase.nameEn),
        purchase,
      );
    });

    const rowKeys = Array.from(orderedItemsByKey.keys()).sort((a, b) =>
      a.localeCompare(b),
    );

    const rows = rowKeys
      .map((key) => {
        const orderedItem = orderedItemsByKey.get(key);
        const purchase = purchasesByKey.get(key);
        const nameEs = orderedItem?.nameEs || purchase?.nameEs || '-';
        const nameEn = orderedItem?.nameEn || purchase?.nameEn || '';
        const settings = this.resolveCatalogItemSettings(
          catalogSettingsLookup,
          order.supplierName,
          nameEs,
          nameEn,
        );
        const orderQuantityUnit = this.resolveOrderQuantityUnit(
          settings.comparisonUnit,
          order.lbOrderMode,
        );
        const orderedQuantity = Number((orderedItem?.quantity || 0).toFixed(2));
        const purchasedQuantity = Number(
          Math.max(0, purchase?.purchasedQuantity || 0).toFixed(2),
        );
        const remainingQuantity = Number(
          Math.max(0, orderedQuantity - purchasedQuantity).toFixed(2),
        );
        const purchasedWeightLb =
          settings.comparisonUnit === LB_COMPARISON_UNIT
            ? Number(
                Math.max(
                  0,
                  purchase?.purchasedWeightLb ??
                    (orderQuantityUnit === 'lb'
                      ? purchase?.purchasedQuantity || 0
                      : 0),
                ).toFixed(2),
              )
            : 0;
        const unitPrice =
          purchase?.unitPrice === null || purchase?.unitPrice === undefined
            ? null
            : Number(purchase.unitPrice.toFixed(2));
        const companyUnitPrice =
          purchase?.companyUnitPrice !== null &&
          purchase?.companyUnitPrice !== undefined &&
          purchase.companyUnitPrice > 0
            ? Number(purchase.companyUnitPrice.toFixed(2))
            : settings.companyUnitPrice ?? null;
        const comparisonQuantity =
          settings.comparisonUnit === LB_COMPARISON_UNIT
            ? purchasedWeightLb
            : purchasedQuantity;
        const inPersonSpend =
          comparisonQuantity > 0 && unitPrice !== null
            ? Number((comparisonQuantity * unitPrice).toFixed(2))
            : null;
        const companySpend =
          comparisonQuantity > 0 &&
          companyUnitPrice !== null &&
          companyUnitPrice > 0
            ? Number((comparisonQuantity * companyUnitPrice).toFixed(2))
            : null;
        const savings =
          inPersonSpend !== null && companySpend !== null
            ? Number((companySpend - inPersonSpend).toFixed(2))
            : null;
        if (orderedQuantity <= 0 || remainingQuantity <= 0) {
          return null;
        }

        return {
          itemLabel: this.formatPdfItemLabel(nameEs, nameEn),
          requestedCount: this.formatPdfQuantity(orderedQuantity),
          storeCount:
            purchasedQuantity > 0 ? this.formatPdfQuantity(purchasedQuantity) : '-',
          needCount: this.formatPdfQuantity(remainingQuantity),
          lbs:
            settings.comparisonUnit === LB_COMPARISON_UNIT &&
            purchasedWeightLb > 0
              ? this.formatPdfQuantity(purchasedWeightLb)
              : '-',
          ourPrice: this.formatPdfCompactMoney(unitPrice),
          supplierPrice: this.formatPdfCompactMoney(companyUnitPrice),
          ourTotal: this.formatPdfCompactMoney(inPersonSpend),
          supplierTotal: this.formatPdfCompactMoney(companySpend),
          save: this.formatPdfCompactDifference(savings),
          saveValue: savings,
        };
      })
      .filter(
        (
          row,
        ): row is {
          itemLabel: string;
          requestedCount: string;
          storeCount: string;
          needCount: string;
          lbs: string;
          ourPrice: string;
          supplierPrice: string;
          ourTotal: string;
          supplierTotal: string;
          save: string;
          saveValue: number | null;
        } => row !== null,
      )
      .map((row, index) => ({
        rowNumber: index + 1,
        ...row,
      }));

    if (rows.length) {
      return rows;
    }

    return [
      {
        rowNumber: 1,
        itemLabel: 'Nothing left to order from supplier',
        requestedCount: '-',
        storeCount: '-',
        needCount: '-',
        lbs: '-',
        ourPrice: '-',
        supplierPrice: '-',
        ourTotal: '-',
        supplierTotal: '-',
        save: '-',
        saveValue: null,
      },
    ];
  }

  private formatOrderLabel(weekStartDate: string, submittedDate: string) {
    return `Order for week of ${this.formatDateKeyUs(weekStartDate)} (submitted ${this.formatDateKeyUs(submittedDate)})`;
  }

  private formatDateUs(value: Date) {
    return value.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
      timeZone: 'UTC',
    });
  }

  private formatDateKeyUs(dateKey: string) {
    const value = dateKeyToUtc(dateKey);
    if (Number.isNaN(value.getTime())) {
      return dateKey;
    }
    return this.formatDateUs(value);
  }

  private async notifyCompanyOrderSubmitted(
    tenantId: string,
    order: {
      orderId: string;
      supplierName: string;
      weekStartDate: string;
      weekEndDate: string;
      officeId?: string | null;
      officeName?: string | null;
      contributor?: string | null;
      submittedAt?: string | null;
    },
  ) {
    const supplierName = order.supplierName.trim();
    if (!supplierName) {
      return;
    }

    const officeLabel =
      order.officeName && order.officeName.trim()
        ? ` for ${order.officeName.trim()}`
        : '';
    const contributorLabel =
      order.contributor && order.contributor.trim()
        ? `${order.contributor.trim()} submitted`
        : 'A team member submitted';
    const message =
      `${contributorLabel} ${supplierName} company order${officeLabel} ` +
      `for week ${this.formatDateKeyUs(order.weekStartDate)}.`;
    const metadata = {
      kind: COMPANY_ORDER_SUBMITTED_KIND,
      scope: 'company_orders',
      orderId: order.orderId,
      supplierName,
      weekStartDate: order.weekStartDate,
      weekEndDate: order.weekEndDate,
      officeId: order.officeId || null,
      officeName: order.officeName?.trim() || null,
      contributor: order.contributor?.trim() || null,
      submittedAt: order.submittedAt || new Date().toISOString(),
    };

    await this.prisma.notification.create({
      data: {
        tenantId,
        employeeId: null,
        type: NotificationType.LATE_CLOCK_IN_5M,
        message,
        metadata,
      },
    });

    await this.sendAdminPushNotification(
      tenantId,
      message,
      NotificationType.LATE_CLOCK_IN_5M,
      metadata,
    );
  }

  private async sendAdminPushNotification(
    tenantId: string,
    message: string,
    type: NotificationType,
    metadata: {
      kind: string;
      scope: string;
      orderId: string;
      supplierName: string;
      weekStartDate: string;
      weekEndDate: string;
      officeId: string | null;
      officeName: string | null;
      contributor: string | null;
      submittedAt: string;
    },
  ) {
    const devices = await this.prisma.adminDevice.findMany({
      where: { tenantId },
      select: { expoPushToken: true },
    });
    if (!devices.length) {
      return;
    }

    const payload = devices.map((device) => ({
      to: device.expoPushToken,
      sound: 'default',
      title: 'ClockIn Admin',
      body: message,
      data: {
        type,
        kind: metadata.kind,
        supplierName: metadata.supplierName,
        weekStartDate: metadata.weekStartDate,
        weekEndDate: metadata.weekEndDate,
        officeId: metadata.officeId || '',
        orderId: metadata.orderId,
      },
    }));

    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch {
      // ignore push failures
    }
  }

  private resolveOrderContributor(order: CompanyOrderDbRow) {
    const byEmployee =
      order.createdByEmployee?.displayName || order.createdByEmployee?.fullName;
    return this.normalizeContributor(byEmployee || '', '');
  }

  private normalizeContributor(value: string, fallback: string) {
    const normalized = value.trim().slice(0, 120);
    return normalized || fallback;
  }

  private normalizeSupplierNames(values: string[]) {
    const byKey = new Map<string, string>();
    values.forEach((value) => {
      const normalized = value.trim().replace(/\s+/g, ' ').slice(0, 120);
      if (!normalized) {
        return;
      }
      const key = normalized.toLowerCase();
      if (!byKey.has(key)) {
        byKey.set(key, normalized);
      }
    });
    return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b));
  }

  private normalizeContributors(values: string[]) {
    const byKey = new Map<string, string>();
    values.forEach((value) => {
      const normalized = value.trim().slice(0, 120);
      if (!normalized) {
        return;
      }
      const key = normalized.toLowerCase();
      if (!byKey.has(key)) {
        byKey.set(key, normalized);
      }
    });
    return Array.from(byKey.values()).slice(0, MAX_CONTRIBUTORS);
  }

  private normalizeDateKey(value: string) {
    const normalized = value.trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : '';
  }

  private normalizeDateKeys(values: string[]) {
    const byKey = new Set<string>();
    values.forEach((value) => {
      const normalized = this.normalizeDateKey(value);
      if (normalized) {
        byKey.add(normalized);
      }
    });
    return Array.from(byKey).sort().slice(-MAX_SUBMITTED_DATES);
  }

  private normalizeNoteLines(values: string[]) {
    const byKey = new Map<string, string>();
    values.forEach((value) => {
      const normalized = value.trim().replace(/\s+/g, ' ').slice(0, 220);
      if (!normalized) {
        return;
      }
      const key = normalized.toLowerCase();
      if (!byKey.has(key)) {
        byKey.set(key, normalized);
      }
    });
    const all = Array.from(byKey.values());
    return all.slice(Math.max(0, all.length - MAX_NOTE_LINES));
  }

  private normalizeStoredInPersonPurchases(values: StoredInPersonPurchase[]) {
    const byKey = new Map<string, StoredInPersonPurchase>();
    values.forEach((value) => {
      const nameEs = value.nameEs?.trim().replace(/\s+/g, ' ').slice(0, 200);
      const nameEn = value.nameEn?.trim().replace(/\s+/g, ' ').slice(0, 200);
      if (!nameEs || !nameEn) {
        return;
      }
      const purchasedQuantity = Number(value.purchasedQuantity);
      const unitPriceRaw =
        value.unitPrice === null || value.unitPrice === undefined
          ? null
          : Number(value.unitPrice);
      const companyUnitPriceRaw =
        value.companyUnitPrice === null || value.companyUnitPrice === undefined
          ? null
          : Number(value.companyUnitPrice);
      const purchasedWeightLbRaw =
        value.purchasedWeightLb === null || value.purchasedWeightLb === undefined
          ? null
          : Number(value.purchasedWeightLb);
      const safePurchasedQuantity =
        Number.isFinite(purchasedQuantity) && purchasedQuantity > 0
          ? Number(purchasedQuantity.toFixed(2))
          : 0;
      const safePurchasedWeightLb =
        purchasedWeightLbRaw !== null &&
        Number.isFinite(purchasedWeightLbRaw) &&
        purchasedWeightLbRaw > 0
          ? Number(purchasedWeightLbRaw.toFixed(2))
          : null;
      const safeUnitPrice =
        unitPriceRaw !== null && Number.isFinite(unitPriceRaw) && unitPriceRaw >= 0
          ? Number(unitPriceRaw.toFixed(2))
          : null;
      const safeCompanyUnitPrice =
        companyUnitPriceRaw !== null &&
        Number.isFinite(companyUnitPriceRaw) &&
        companyUnitPriceRaw >= 0
          ? Number(companyUnitPriceRaw.toFixed(2))
          : null;
      if (
        safePurchasedQuantity <= 0 &&
        safePurchasedWeightLb === null &&
        safeUnitPrice === null &&
        safeCompanyUnitPrice === null
      ) {
        return;
      }
      byKey.set(catalogItemKey(nameEs, nameEn), {
        nameEs,
        nameEn,
        purchasedQuantity: safePurchasedQuantity,
        purchasedWeightLb: safePurchasedWeightLb,
        unitPrice: safeUnitPrice,
        companyUnitPrice: safeCompanyUnitPrice,
      });
    });
    return Array.from(byKey.values()).sort((a, b) =>
      catalogItemKey(a.nameEs, a.nameEn).localeCompare(
        catalogItemKey(b.nameEs, b.nameEn),
      ),
    );
  }

  private composeStoredOrderNotes(metadata: StoredOrderMetadata) {
    const payload: StoredOrderMetadata = {
      version: 5,
      lbOrderMode:
        metadata.lbOrderMode === LEGACY_LB_ORDER_MODE
          ? LEGACY_LB_ORDER_MODE
          : DEFAULT_LB_ORDER_MODE,
      weekStart: this.normalizeDateKey(metadata.weekStart),
      weekEnd: this.normalizeDateKey(metadata.weekEnd),
      submittedDates: this.normalizeDateKeys(metadata.submittedDates),
      contributors: this.normalizeContributors(metadata.contributors),
      noteLines: this.normalizeNoteLines(metadata.noteLines),
      inPersonPurchases: this.normalizeStoredInPersonPurchases(
        metadata.inPersonPurchases,
      ),
    };

    const serialized = JSON.stringify(payload);
    return `${COMPANY_ORDER_META_PREFIX}${serialized}`;
  }

  private readStoredOrderNotes(
    rawNotes?: string | null,
  ): ParsedStoredOrderNotes {
    const source = rawNotes?.trim() || '';
    if (!source.startsWith(COMPANY_ORDER_META_PREFIX)) {
      return {
        lbOrderMode: LEGACY_LB_ORDER_MODE,
        weekStart: '',
        weekEnd: '',
        submittedDates: [],
        contributors: [],
        noteLines: source ? [source] : [],
        inPersonPurchases: [],
        notes: source,
      };
    }

    const payload = source.slice(COMPANY_ORDER_META_PREFIX.length);
    const newlineIndex = payload.indexOf('\n');
    const metadataRaw =
      newlineIndex >= 0
        ? payload.slice(0, newlineIndex).trim()
        : payload.trim();
    const legacyNotes =
      newlineIndex >= 0 ? payload.slice(newlineIndex + 1).trim() : '';

    try {
      const parsed = JSON.parse(metadataRaw) as Record<string, unknown>;
      const version = Number(parsed.version || 0);
      const weekStart =
        typeof parsed.weekStart === 'string'
          ? this.normalizeDateKey(parsed.weekStart)
          : '';
      const weekEnd =
        typeof parsed.weekEnd === 'string'
          ? this.normalizeDateKey(parsed.weekEnd)
          : '';
      const submittedDates = Array.isArray(parsed.submittedDates)
        ? this.normalizeDateKeys(
            parsed.submittedDates.filter(
              (value): value is string => typeof value === 'string',
            ),
          )
        : [];
      const contributors = Array.isArray(parsed.contributors)
        ? this.normalizeContributors(
            parsed.contributors.filter(
              (value): value is string => typeof value === 'string',
            ),
          )
        : [];
      const noteLines = this.normalizeNoteLines([
        ...(Array.isArray(parsed.noteLines)
          ? parsed.noteLines.filter(
              (value): value is string => typeof value === 'string',
            )
          : []),
        ...(legacyNotes ? [legacyNotes] : []),
      ]);

      if (version === 2) {
        return {
          lbOrderMode: LEGACY_LB_ORDER_MODE,
          weekStart,
          weekEnd,
          submittedDates,
          contributors,
          noteLines,
          inPersonPurchases: [],
          notes: noteLines.join('\n'),
        };
      }

      if (version === 3 || version === 4 || version === 5) {
        const inPersonPurchases = this.normalizeStoredInPersonPurchases(
          Array.isArray(parsed.inPersonPurchases)
            ? parsed.inPersonPurchases
                .filter(
                  (
                    value,
                  ): value is {
                    nameEs?: string;
                    nameEn?: string;
                    purchasedQuantity?: number;
                    purchasedWeightLb?: number | null;
                    unitPrice?: number | null;
                    price?: number | null;
                    companyUnitPrice?: number | null;
                    companyPrice?: number | null;
                  } =>
                    Boolean(value) &&
                    typeof value === 'object' &&
                    !Array.isArray(value),
                )
                .map((value) => ({
                  nameEs:
                    typeof value.nameEs === 'string' ? value.nameEs : '',
                  nameEn:
                    typeof value.nameEn === 'string' ? value.nameEn : '',
                  purchasedQuantity:
                    typeof value.purchasedQuantity === 'number'
                      ? value.purchasedQuantity
                      : 0,
                  purchasedWeightLb:
                    typeof value.purchasedWeightLb === 'number'
                      ? value.purchasedWeightLb
                      : null,
                  unitPrice:
                    typeof value.unitPrice === 'number'
                      ? value.unitPrice
                      : typeof value.price === 'number'
                        ? value.price
                        : null,
                  companyUnitPrice:
                    typeof value.companyUnitPrice === 'number'
                      ? value.companyUnitPrice
                      : typeof value.companyPrice === 'number'
                        ? value.companyPrice
                        : null,
                }))
            : [],
        );

        return {
          lbOrderMode:
            version >= 5 && parsed.lbOrderMode === DEFAULT_LB_ORDER_MODE
              ? DEFAULT_LB_ORDER_MODE
              : LEGACY_LB_ORDER_MODE,
          weekStart,
          weekEnd,
          submittedDates,
          contributors,
          noteLines,
          inPersonPurchases,
          notes: noteLines.join('\n'),
        };
      }

      return {
        lbOrderMode: LEGACY_LB_ORDER_MODE,
        weekStart: '',
        weekEnd: '',
        submittedDates: [],
        contributors: [],
        noteLines: legacyNotes ? [legacyNotes] : [],
        inPersonPurchases: [],
        notes: legacyNotes,
      };
    } catch {
      return {
        lbOrderMode: LEGACY_LB_ORDER_MODE,
        weekStart: '',
        weekEnd: '',
        submittedDates: [],
        contributors: [],
        noteLines: source ? [source] : [],
        inPersonPurchases: [],
        notes: source,
      };
    }
  }

  private toDateKey(value: Date) {
    return this.toCompanyOrderDateKey(value);
  }

  private getWeekBounds(value: Date) {
    const base = dateKeyToUtc(this.toCompanyOrderDateKey(value));
    const day = base.getUTCDay();
    const distanceToMonday = (day + 6) % 7;

    const weekStartKeyDate = new Date(base);
    weekStartKeyDate.setUTCDate(base.getUTCDate() - distanceToMonday);
    const weekStartKey = weekStartKeyDate.toISOString().slice(0, 10);

    const weekEndKeyDate = new Date(weekStartKeyDate);
    weekEndKeyDate.setUTCDate(weekStartKeyDate.getUTCDate() + 6);
    const weekEndKey = weekEndKeyDate.toISOString().slice(0, 10);

    return {
      weekStart: this.companyOrderDateTimeToUtc(weekStartKey, 0, 0, 0, 0),
      weekEnd: this.companyOrderDateTimeToUtc(weekEndKey, 23, 59, 59, 999),
      weekStartKey,
      weekEndKey,
    };
  }

  private toCompanyOrderDateKey(value: Date) {
    const parts = COMPANY_ORDER_DATE_FORMATTER.formatToParts(value);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    if (!year || !month || !day) {
      return value.toISOString().slice(0, 10);
    }
    return `${year}-${month}-${day}`;
  }

  private companyOrderDateTimeToUtc(
    dateKey: string,
    hour: number,
    minute: number,
    second: number,
    millisecond: number,
  ) {
    const [year, month, day] = dateKey.split('-').map(Number);
    const desiredUtcMs = Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      second,
      millisecond,
    );
    let utcMs = desiredUtcMs;

    for (let index = 0; index < 3; index += 1) {
      const parts = this.companyOrderDateTimeParts(new Date(utcMs));
      const actualUtcMs = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second,
        millisecond,
      );
      const diff = desiredUtcMs - actualUtcMs;
      if (diff === 0) {
        break;
      }
      utcMs += diff;
    }

    return new Date(utcMs);
  }

  private companyOrderDateTimeParts(value: Date) {
    const values = new Map(
      COMPANY_ORDER_DATE_TIME_FORMATTER.formatToParts(value).map((part) => [
        part.type,
        part.value,
      ]),
    );
    return {
      year: Number(values.get('year') || value.getUTCFullYear()),
      month: Number(values.get('month') || value.getUTCMonth() + 1),
      day: Number(values.get('day') || value.getUTCDate()),
      hour: Number(values.get('hour') || 0),
      minute: Number(values.get('minute') || 0),
      second: Number(values.get('second') || 0),
    };
  }

  private accumulateOrderItem(
    bucket: Map<string, { nameEs: string; nameEn: string; quantity: number }>,
    nameEs: string,
    nameEn: string,
    rawQuantity: number,
  ) {
    const key = catalogItemKey(nameEs, nameEn);
    const quantity = Number(rawQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return;
    }

    const existing = bucket.get(key);
    if (existing) {
      existing.quantity = Number((existing.quantity + quantity).toFixed(2));
      return;
    }

    bucket.set(key, {
      nameEs,
      nameEn,
      quantity: Number(quantity.toFixed(2)),
    });
  }

  private buildOrdersPdf(
    orders: SerializedCompanyOrder[],
    catalogSettingsLookup: CatalogSettingsLookup,
    options: {
      weekStartDate: string;
      weekEndDate: string;
      locationLabel: string;
      supplierLabel?: string | null;
      generatedAt: Date;
    },
  ) {
    const PAGE_WIDTH = 595;
    const PAGE_HEIGHT = 842;
    const LEFT = 58;
    const TOP = 790;
    const BOTTOM = 56;
    const TABLE_WIDTH = 486;
    const TABLE_HEADER_HEIGHT = 20;
    const TABLE_ROW_HEIGHT = 18;
    const TABLE_BORDER_GRAY = 0.65098;
    const TABLE_HEADER_GRAY = 0;

    const tableX = LEFT;
    const colIndexRight = tableX + 20;
    const colItemRight = colIndexRight + 150;
    const colRequestedRight = colItemRight + 26;
    const colStoreRight = colRequestedRight + 26;
    const colNeedRight = colStoreRight + 26;
    const colLbsRight = colNeedRight + 34;
    const colOurPriceRight = colLbsRight + 42;
    const colSupplierPriceRight = colOurPriceRight + 42;
    const colOurTotalRight = colSupplierPriceRight + 46;
    const colSupplierTotalRight = colOurTotalRight + 46;
    const tableRight = colSupplierTotalRight + 28;
    const CONTENT_WIDTH = tableRight - LEFT;
    const POSITIVE_RGB: [number, number, number] = [0.063, 0.557, 0.196];
    const NEGATIVE_RGB: [number, number, number] = [0.753, 0.165, 0.184];
    const numberFormat = (value: number, precision = 2) =>
      Number(value.toFixed(precision)).toString();
    const grayValue = (value: number) => Number(value.toFixed(6)).toString();
    const grayTriplet = (value: number) =>
      `${grayValue(value)} ${grayValue(value)} ${grayValue(value)}`;

    const pages: string[] = [];
    let commands: string[] = [];
    let cursorY = TOP;

    const pushPage = () => {
      if (commands.length) {
        pages.push(commands.join('\n'));
      }
      commands = [];
      cursorY = TOP;
    };

    const drawText = (
      value: string,
      x: number,
      y: number,
      size: number,
      bold = false,
      gray = 0,
    ) => {
      const normalized = this.normalizePdfText(value);
      if (!normalized) {
        return;
      }
      commands.push(
        `${grayValue(gray)} g BT /${bold ? 'F2' : 'F1'} ${numberFormat(size)} Tf 1 0 0 1 ${numberFormat(x)} ${numberFormat(y)} Tm (${this.escapePdfText(normalized)}) Tj ET`,
      );
    };

    const drawTextRgb = (
      value: string,
      x: number,
      y: number,
      size: number,
      rgb: [number, number, number],
      bold = false,
    ) => {
      const normalized = this.normalizePdfText(value);
      if (!normalized) {
        return;
      }
      commands.push(
        `${numberFormat(rgb[0], 3)} ${numberFormat(rgb[1], 3)} ${numberFormat(rgb[2], 3)} rg BT /${bold ? 'F2' : 'F1'} ${numberFormat(size)} Tf 1 0 0 1 ${numberFormat(x)} ${numberFormat(y)} Tm (${this.escapePdfText(normalized)}) Tj ET`,
      );
    };

    const drawLine = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      width = 0.5,
      gray = TABLE_BORDER_GRAY,
    ) => {
      commands.push(
        `${numberFormat(width)} w ${grayTriplet(gray)} RG n ${numberFormat(x1)} ${numberFormat(y1)} m ${numberFormat(x2)} ${numberFormat(y2)} l S`,
      );
    };

    const fillRect = (
      x: number,
      y: number,
      width: number,
      height: number,
      gray: number,
    ) => {
      commands.push(
        `${grayTriplet(gray)} rg n ${numberFormat(x)} ${numberFormat(y)} ${numberFormat(width)} ${numberFormat(height)} re f*`,
      );
    };

    const ensureSpace = (height: number) => {
      if (cursorY - height < BOTTOM) {
        pushPage();
      }
    };

    const drawCenteredText = (
      value: string,
      left: number,
      width: number,
      y: number,
      size: number,
      bold = false,
      gray = 0,
    ) => {
      const normalized = this.normalizePdfText(value);
      if (!normalized) {
        return;
      }
      const textWidth = this.estimatePdfTextWidth(normalized, size, bold);
      drawText(
        normalized,
        left + Math.max(0, (width - textWidth) / 2),
        y,
        size,
        bold,
        gray,
      );
    };

    const drawCenteredTextRgb = (
      value: string,
      left: number,
      width: number,
      y: number,
      size: number,
      rgb: [number, number, number],
      bold = false,
    ) => {
      const normalized = this.normalizePdfText(value);
      if (!normalized) {
        return;
      }
      const textWidth = this.estimatePdfTextWidth(normalized, size, bold);
      drawTextRgb(
        normalized,
        left + Math.max(0, (width - textWidth) / 2),
        y,
        size,
        rgb,
        bold,
      );
    };

    if (!orders.length) {
      drawCenteredText(
        'COMPANY PURCHASE ORDERS',
        LEFT,
        CONTENT_WIDTH,
        cursorY,
        18,
        true,
      );
      cursorY -= 32;
      drawText('No supplier orders for this week.', LEFT, cursorY, 11);
      pages.push(commands.join('\n'));
      return this.buildPdfDocument(pages, PAGE_WIDTH, PAGE_HEIGHT);
    }

    orders.forEach((order, orderIndex) => {
      const submittedDates =
        order.submittedDates.length > 0
          ? order.submittedDates
          : [this.toDateKey(new Date(order.orderDate))];
      const submittedLabel = this.formatPdfSubmittedDates(submittedDates);
      const contributorLabel = this.normalizePdfText(
        order.contributors.length
          ? order.contributors.join(', ')
          : order.createdBy || 'N/A',
      );
      const combinedRows = this.buildPdfCombinedOrderRows(
        order,
        catalogSettingsLookup,
      );
      const remainingTotals = this.buildPdfRemainingOrderTotals(
        order,
        catalogSettingsLookup,
      );
      const inPersonSummary = this.buildPdfInPersonPurchaseSummary(
        order,
        catalogSettingsLookup,
      );

      let rowOffset = 0;
      let pageIndexForOrder = 0;
      while (rowOffset < combinedRows.length) {
        if (orderIndex > 0 || pageIndexForOrder > 0) {
          pushPage();
        }

        const titleSupplier = this.normalizePdfText(
          options.supplierLabel || order.supplierName || '',
        );
        drawCenteredText(
          titleSupplier
            ? `COMPANY PURCHASE ORDER - ${titleSupplier}`
            : 'COMPANY PURCHASE ORDERS',
          LEFT,
          CONTENT_WIDTH,
          cursorY,
          18,
          true,
        );
        cursorY -= 30;

        const locationLabel = this.normalizePdfText(
          order.officeName || options.locationLabel || 'All Locations',
        );
        drawText(
          `Week: ${this.formatPdfWeekLabelLong(
            options.weekStartDate,
            options.weekEndDate,
          )} | Location: ${locationLabel}`,
          LEFT,
          cursorY,
          10,
        );
        cursorY -= 16;
        drawText(
          `Generated: ${this.formatDateUs(options.generatedAt)} | Submitted: ${submittedLabel} | Contributor: ${contributorLabel}`,
          LEFT,
          cursorY,
          10,
        );
        cursorY -= 26;

        const summaryX = LEFT + 28;
        const summaryWidth = TABLE_WIDTH - 56;
        const summaryColWidth = summaryWidth / 3;
        const summaryTop = cursorY;
        const summaryHeaderBottom = summaryTop - 20;
        const summaryBottom = summaryTop - 44;

        fillRect(
          summaryX,
          summaryHeaderBottom,
          summaryWidth,
          TABLE_HEADER_HEIGHT,
          TABLE_HEADER_GRAY,
        );
        drawLine(summaryX, summaryTop, summaryX + summaryWidth, summaryTop);
        drawLine(
          summaryX,
          summaryHeaderBottom,
          summaryX + summaryWidth,
          summaryHeaderBottom,
        );
        drawLine(summaryX, summaryBottom, summaryX + summaryWidth, summaryBottom);
        drawLine(summaryX, summaryBottom, summaryX, summaryTop);
        drawLine(
          summaryX + summaryColWidth,
          summaryBottom,
          summaryX + summaryColWidth,
          summaryTop,
        );
        drawLine(
          summaryX + summaryColWidth * 2,
          summaryBottom,
          summaryX + summaryColWidth * 2,
          summaryTop,
        );
        drawLine(
          summaryX + summaryWidth,
          summaryBottom,
          summaryX + summaryWidth,
          summaryTop,
        );
        drawCenteredText('In-Person', summaryX, summaryColWidth, summaryTop - 14, 10, false, 1);
        drawCenteredText(
          'Supplier',
          summaryX + summaryColWidth,
          summaryColWidth,
          summaryTop - 14,
          10,
          false,
          1,
        );
        drawCenteredText(
          'Savings',
          summaryX + summaryColWidth * 2,
          summaryColWidth,
          summaryTop - 14,
          10,
          false,
          1,
        );
        drawCenteredText(
          this.formatPdfMoney(inPersonSummary.totalInPersonSpend),
          summaryX,
          summaryColWidth,
          summaryTop - 36,
          12,
        );
        drawCenteredText(
          this.formatPdfMoney(inPersonSummary.totalCompanySpend),
          summaryX + summaryColWidth,
          summaryColWidth,
          summaryTop - 36,
          12,
        );
        const topSavingsRgb =
          inPersonSummary.totalSavings > 0.005
            ? POSITIVE_RGB
            : inPersonSummary.totalSavings < -0.005
              ? NEGATIVE_RGB
              : null;
        if (topSavingsRgb) {
          drawCenteredTextRgb(
            this.formatPdfMoneySigned(inPersonSummary.totalSavings),
            summaryX + summaryColWidth * 2,
            summaryColWidth,
            summaryTop - 36,
            12,
            topSavingsRgb,
          );
        } else {
          drawCenteredText(
            this.formatPdfMoneySigned(inPersonSummary.totalSavings),
            summaryX + summaryColWidth * 2,
            summaryColWidth,
            summaryTop - 36,
            12,
          );
        }
        cursorY = summaryBottom - 34;

        drawText('Still Needed From Supplier', LEFT, cursorY, 11, true);
        cursorY -= 14;
        drawText(
          'Req = requested, Store = bought in person, Need = still to order',
          LEFT,
          cursorY,
          8,
        );
        cursorY -= 18;

        const tableTop = cursorY;
        const rowsRemaining = combinedRows.length - rowOffset;
        let rowsThatFit = Math.floor(
          (tableTop - BOTTOM - 28 - TABLE_HEADER_HEIGHT) / TABLE_ROW_HEIGHT,
        );
        rowsThatFit = Math.max(1, rowsThatFit);
        let rowsThisPage = Math.min(rowsRemaining, rowsThatFit);
        const tentativeFinalChunk = rowOffset + rowsThisPage >= combinedRows.length;
        if (tentativeFinalChunk) {
          const finalRowsThatFit = Math.floor(
            (tableTop - BOTTOM - 104 - TABLE_HEADER_HEIGHT) / TABLE_ROW_HEIGHT,
          );
          rowsThisPage = Math.min(rowsThisPage, Math.max(1, finalRowsThatFit));
        }
        if (rowsThisPage <= 0) {
          pageIndexForOrder += 1;
          continue;
        }

        const chunkRows = combinedRows.slice(rowOffset, rowOffset + rowsThisPage);
        fillRect(
          tableX,
          tableTop - TABLE_HEADER_HEIGHT,
          TABLE_WIDTH,
          TABLE_HEADER_HEIGHT,
          TABLE_HEADER_GRAY,
        );
        drawCenteredText('#', tableX, colIndexRight - tableX, tableTop - 14, 9, false, 1);
        drawText('Item', colIndexRight + 8, tableTop - 14, 9, false, 1);
        drawCenteredText('Req', colItemRight, colRequestedRight - colItemRight, tableTop - 14, 9, false, 1);
        drawCenteredText('Store', colRequestedRight, colStoreRight - colRequestedRight, tableTop - 14, 8, false, 1);
        drawCenteredText('Need', colStoreRight, colNeedRight - colStoreRight, tableTop - 14, 9, false, 1);
        drawCenteredText('Lbs', colNeedRight, colLbsRight - colNeedRight, tableTop - 14, 9, false, 1);
        drawCenteredText('Store $', colLbsRight, colOurPriceRight - colLbsRight, tableTop - 14, 8, false, 1);
        drawCenteredText('Sup $', colOurPriceRight, colSupplierPriceRight - colOurPriceRight, tableTop - 14, 9, false, 1);
        drawCenteredText('Store Tot', colSupplierPriceRight, colOurTotalRight - colSupplierPriceRight, tableTop - 14, 7, false, 1);
        drawCenteredText('Sup Tot', colOurTotalRight, colSupplierTotalRight - colOurTotalRight, tableTop - 14, 8, false, 1);
        drawCenteredText('Save', colSupplierTotalRight, tableRight - colSupplierTotalRight, tableTop - 14, 9, false, 1);

        chunkRows.forEach((row, rowIndex) => {
          const textY = tableTop - 14 - TABLE_ROW_HEIGHT * (rowIndex + 1);
          drawCenteredText(
            String(row.rowNumber),
            tableX,
            colIndexRight - tableX,
            textY,
            9,
          );
          drawText(
            this.truncatePdfText(row.itemLabel, 145, 9),
            colIndexRight + 6,
            textY,
            9,
          );
          drawCenteredText(row.requestedCount, colItemRight, colRequestedRight - colItemRight, textY, 9);
          drawCenteredText(row.storeCount, colRequestedRight, colStoreRight - colRequestedRight, textY, 9);
          drawCenteredText(row.needCount, colStoreRight, colNeedRight - colStoreRight, textY, 9);
          drawCenteredText(row.lbs, colNeedRight, colLbsRight - colNeedRight, textY, 9);
          drawCenteredText(row.ourPrice, colLbsRight, colOurPriceRight - colLbsRight, textY, 9);
          drawCenteredText(row.supplierPrice, colOurPriceRight, colSupplierPriceRight - colOurPriceRight, textY, 9);
          drawCenteredText(row.ourTotal, colSupplierPriceRight, colOurTotalRight - colSupplierPriceRight, textY, 9);
          drawCenteredText(row.supplierTotal, colOurTotalRight, colSupplierTotalRight - colOurTotalRight, textY, 9);
          const saveRgb =
            row.saveValue !== null && row.saveValue > 0.005
              ? POSITIVE_RGB
              : row.saveValue !== null && row.saveValue < -0.005
                ? NEGATIVE_RGB
                : null;
          if (saveRgb) {
            drawCenteredTextRgb(
              row.save,
              colSupplierTotalRight,
              tableRight - colSupplierTotalRight,
              textY,
              9,
              saveRgb,
            );
          } else {
            drawCenteredText(
              row.save,
              colSupplierTotalRight,
              tableRight - colSupplierTotalRight,
              textY,
              9,
            );
          }
        });

        const tableHeight =
          TABLE_HEADER_HEIGHT + TABLE_ROW_HEIGHT * chunkRows.length;
        const tableBottom = tableTop - tableHeight;
        drawLine(tableX, tableTop, tableRight, tableTop);
        for (let row = 1; row <= chunkRows.length + 1; row += 1) {
          const y = tableTop - TABLE_ROW_HEIGHT * row;
          drawLine(tableX, y, tableRight, y);
        }
        drawLine(tableX, tableBottom, tableX, tableTop);
        drawLine(colIndexRight, tableBottom, colIndexRight, tableTop);
        drawLine(colItemRight, tableBottom, colItemRight, tableTop);
        drawLine(colRequestedRight, tableBottom, colRequestedRight, tableTop);
        drawLine(colStoreRight, tableBottom, colStoreRight, tableTop);
        drawLine(colNeedRight, tableBottom, colNeedRight, tableTop);
        drawLine(colLbsRight, tableBottom, colLbsRight, tableTop);
        drawLine(colOurPriceRight, tableBottom, colOurPriceRight, tableTop);
        drawLine(
          colSupplierPriceRight,
          tableBottom,
          colSupplierPriceRight,
          tableTop,
        );
        drawLine(colOurTotalRight, tableBottom, colOurTotalRight, tableTop);
        drawLine(
          colSupplierTotalRight,
          tableBottom,
          colSupplierTotalRight,
          tableTop,
        );
        drawLine(tableRight, tableBottom, tableRight, tableTop);

        cursorY = tableBottom - 20;
        rowOffset += rowsThisPage;
        const isFinalChunk = rowOffset >= combinedRows.length;
        if (isFinalChunk) {
          const summaryBoxX = LEFT + 40;
          const summaryBoxWidth = TABLE_WIDTH - 80;
          const summaryLabelRight = summaryBoxX + 190;
          const summaryRowHeight = 26;
          const summaryTableTop = cursorY;
          const summaryTableBottom = summaryTableTop - summaryRowHeight * 3;
          const remainingWeightLabel =
            remainingTotals.totalRemainingWeightLb > 0
              ? this.formatPdfWeightLabel(remainingTotals.totalRemainingWeightLb)
              : '0 lb';
          const summaryRows = [
            ['Items To Order', this.formatPdfQuantity(remainingTotals.itemCount)],
            [
              'To Order Qty',
              this.formatOrderQuantitySummaryByUnit(remainingTotals.quantitiesByUnit),
            ],
            ['To Order Weight', remainingWeightLabel],
          ];

          drawLine(
            summaryBoxX,
            summaryTableTop,
            summaryBoxX + summaryBoxWidth,
            summaryTableTop,
          );
          for (let row = 1; row <= summaryRows.length; row += 1) {
            const y = summaryTableTop - summaryRowHeight * row;
            drawLine(summaryBoxX, y, summaryBoxX + summaryBoxWidth, y);
          }
          drawLine(summaryBoxX, summaryTableBottom, summaryBoxX, summaryTableTop);
          drawLine(
            summaryLabelRight,
            summaryTableBottom,
            summaryLabelRight,
            summaryTableTop,
          );
          drawLine(
            summaryBoxX + summaryBoxWidth,
            summaryTableBottom,
            summaryBoxX + summaryBoxWidth,
            summaryTableTop,
          );

          summaryRows.forEach((summaryRow, index) => {
            const textY = summaryTableTop - 18 - summaryRowHeight * index;
            drawText(summaryRow[0], summaryBoxX + 10, textY, 10);
            drawText(summaryRow[1], summaryLabelRight + 12, textY, 10);
          });
          cursorY = summaryTableBottom - 16;
        }

        pageIndexForOrder += 1;
      }
    });

    if (commands.length === 0) {
      drawCenteredText('COMPANY PURCHASE ORDERS', LEFT, CONTENT_WIDTH, TOP, 18, true);
    }
    pages.push(commands.join('\n'));
    return this.buildPdfDocument(pages, PAGE_WIDTH, PAGE_HEIGHT);
  }

  private formatPdfWeekLabel(weekStartDate: string, weekEndDate: string) {
    return `${this.formatDateKeyUs(weekStartDate)} - ${this.formatDateKeyUs(weekEndDate)}`;
  }

  private formatPdfWeekLabelLong(weekStartDate: string, weekEndDate: string) {
    const weekStart = dateKeyToUtc(weekStartDate);
    const weekEnd = dateKeyToUtc(weekEndDate);
    if (
      Number.isNaN(weekStart.getTime()) ||
      Number.isNaN(weekEnd.getTime())
    ) {
      return this.formatPdfWeekLabel(weekStartDate, weekEndDate);
    }
    const startLabel = weekStart.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
    const endLabel = weekEnd.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
    return `${startLabel} - ${endLabel}`;
  }

  private formatPdfSubmittedDates(dateKeys: string[]) {
    const normalized = this.normalizeDateKeys(dateKeys);
    if (!normalized.length) {
      return 'N/A';
    }
    return normalized
      .map((dateKey) => this.formatDateKeyUs(dateKey))
      .join(', ');
  }

  private formatPdfQuantity(value: number) {
    if (!Number.isFinite(value)) {
      return '0';
    }
    return Number(value.toFixed(2)).toString();
  }

  private formatPdfMoney(value: number) {
    if (!Number.isFinite(value)) {
      return '$0.00';
    }
    return `$${value.toFixed(2)}`;
  }

  private formatPdfMoneySigned(value: number) {
    if (!Number.isFinite(value) || Math.abs(value) < 0.005) {
      return '$0.00';
    }
    if (value < 0) {
      return `-${this.formatPdfMoney(Math.abs(value))}`;
    }
    return this.formatPdfMoney(value);
  }

  private formatPdfCompactMoney(value: number | null) {
    if (value === null || !Number.isFinite(value) || value <= 0) {
      return '-';
    }
    return value.toFixed(2);
  }

  private formatPdfCompactDifference(value: number | null) {
    if (value === null || !Number.isFinite(value)) {
      return '-';
    }
    if (Math.abs(value) < 0.005) {
      return '0.00';
    }
    return value < 0 ? `-${Math.abs(value).toFixed(2)}` : value.toFixed(2);
  }

  private formatPdfWeightLabel(value: number) {
    return `${this.formatPdfQuantity(value)} lb`;
  }

  private formatPdfSavingsLabel(value: number) {
    if (!Number.isFinite(value) || Math.abs(value) < 0.005) {
      return 'Difference $0.00';
    }
    if (value > 0) {
      return `Saved ${this.formatPdfMoney(value)}`;
    }
    return `Over ${this.formatPdfMoney(Math.abs(value))}`;
  }

  private normalizePdfText(value: string) {
    if (!value) {
      return '';
    }
    return value
      .normalize('NFKD')
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private estimatePdfTextWidth(value: string, fontSize: number, bold = false) {
    const widthFactor = bold ? 0.55 : 0.5;
    return this.normalizePdfText(value).length * fontSize * widthFactor;
  }

  private truncatePdfText(
    value: string,
    maxWidth: number,
    fontSize: number,
    bold = false,
  ) {
    const normalized = this.normalizePdfText(value);
    if (!normalized) {
      return '';
    }
    if (this.estimatePdfTextWidth(normalized, fontSize, bold) <= maxWidth) {
      return normalized;
    }
    const suffix = '...';
    let end = normalized.length;
    while (end > 0) {
      const candidate = `${normalized.slice(0, end)}${suffix}`;
      if (this.estimatePdfTextWidth(candidate, fontSize, bold) <= maxWidth) {
        return candidate;
      }
      end -= 1;
    }
    return suffix;
  }

  private wrapPdfText(
    value: string,
    maxWidth: number,
    fontSize: number,
    bold = false,
  ) {
    const normalized = this.normalizePdfText(value);
    if (!normalized) {
      return [];
    }
    const words = normalized.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';
    words.forEach((word) => {
      const proposal = current ? `${current} ${word}` : word;
      if (this.estimatePdfTextWidth(proposal, fontSize, bold) <= maxWidth) {
        current = proposal;
        return;
      }
      if (current) {
        lines.push(current);
      }
      current = word;
    });
    if (current) {
      lines.push(current);
    }
    return lines;
  }

  private escapePdfText(value: string) {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  private buildPdfDocument(pages: string[], pageWidth = 595, pageHeight = 842) {
    const pageCount = pages.length;
    const pageObjectStart = 5;
    const objectCount = 4 + pageCount * 2;
    const pageRefs = pages
      .map((_, index) => `${pageObjectStart + index * 2} 0 R`)
      .join(' ');
    const objects: string[] = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      `2 0 obj\n<< /Type /Pages /Kids [${pageRefs}] /Count ${pageCount} >>\nendobj\n`,
      '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    ];

    pages.forEach((content, index) => {
      const pageId = pageObjectStart + index * 2;
      const contentId = pageId + 1;
      const length = Buffer.byteLength(content, 'utf8');
      objects.push(
        `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
      );
      objects.push(
        `${contentId} 0 obj\n<< /Length ${length} >>\nstream\n${content}\nendstream\nendobj\n`,
      );
    });

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (const obj of objects) {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += obj;
    }
    const xrefStart = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objectCount + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i <= objectCount; i += 1) {
      pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return Buffer.from(pdf, 'utf8');
  }

  private normalizeItems(
    rawItems: CreateCompanyOrderDto['items'],
    supplier: CatalogSupplierWithComparisonUnit,
  ) {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return [];
    }
    const supplierItems = new Set(
      supplier.items.map((item) => catalogItemKey(item.nameEs, item.nameEn)),
    );
    const byKey = new Map<
      string,
      { nameEs: string; nameEn: string; quantity: number }
    >();

    rawItems.forEach((item) => {
      const nameEs = item.nameEs?.trim() || '';
      const nameEn = item.nameEn?.trim() || '';
      if (!nameEs || !nameEn) {
        throw new BadRequestException(
          'Each order item requires Spanish and English labels.',
        );
      }
      const key = catalogItemKey(nameEs, nameEn);
      if (!supplierItems.has(key)) {
        throw new BadRequestException(
          `Item "${nameEs}" is not valid for supplier ${supplier.supplierName}.`,
        );
      }
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return;
      }
      const existing = byKey.get(key);
      if (existing) {
        existing.quantity = Number((existing.quantity + quantity).toFixed(2));
      } else {
        byKey.set(key, {
          nameEs,
          nameEn,
          quantity: Number(quantity.toFixed(2)),
        });
      }
    });

    return Array.from(byKey.values());
  }
}
