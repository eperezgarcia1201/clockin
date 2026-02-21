import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import type { AuthUser } from '../auth/auth.types';
import type { CreateCompanyOrderDto } from './dto/create-company-order.dto';
import type {
  CompanyOrderCatalogSupplierDto,
  UpdateCompanyOrderCatalogDto,
} from './dto/update-company-order-catalog.dto';
import {
  COMPANY_ORDER_CATALOG,
  type CompanyOrderCatalogSupplier,
} from './company-order-catalog';

const catalogItemKey = (nameEs: string, nameEn: string) =>
  `${nameEs.trim().toLowerCase()}|${nameEn.trim().toLowerCase()}`;

const dateKeyToUtc = (value: string) => new Date(`${value}T00:00:00.000Z`);
const COMPANY_ORDER_META_PREFIX = '__company_order_meta__';
const MAX_SUBMITTED_DATES = 28;
const MAX_CONTRIBUTORS = 40;
const MAX_NOTE_LINES = 120;
type ExportFormat = 'pdf' | 'csv' | 'excel';

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

type StoredOrderMetadata = {
  version: 2;
  weekStart: string;
  weekEnd: string;
  submittedDates: string[];
  contributors: string[];
  noteLines: string[];
};

type ParsedStoredOrderNotes = {
  weekStart: string;
  weekEnd: string;
  submittedDates: string[];
  contributors: string[];
  noteLines: string[];
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
  createdAt: string;
  updatedAt: string;
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
      orderBy: [{ updatedAt: 'desc' }, { orderDate: 'desc' }, { createdAt: 'desc' }],
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

    const mergedOrders = this
      .aggregateOrdersForList(orders.map((order) => this.serializeOrder(order)))
      .slice(0, Math.min(200, limit));

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

    const actorName = this.normalizeContributor(access.displayName, 'Team Member');
    const submittedDateKey = this.toDateKey(submissionDate);
    const rawSubmissionNote = dto.notes?.trim() || '';
    const submissionNote = rawSubmissionNote
      ? `${submittedDateKey} - ${actorName}: ${rawSubmissionNote}`
      : '';

    const order = (await this.prisma.$transaction(async (tx) => {
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

      existingOrders.forEach((existingOrder) => {
        existingOrder.items.forEach((item) => {
          this.accumulateOrderItem(mergedItems, item.nameEs, item.nameEn, item.quantity);
        });

        const parsed = this.readStoredOrderNotes(existingOrder.notes);
        parsed.contributors.forEach((name) => contributors.add(name));
        parsed.submittedDates.forEach((dateKey) => submittedDates.add(dateKey));
        parsed.noteLines.forEach((line) => noteLines.add(line));

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
        this.accumulateOrderItem(mergedItems, item.nameEs, item.nameEn, item.quantity);
      });

      contributors.add(actorName);
      submittedDates.add(submittedDateKey);
      if (submissionNote) {
        noteLines.add(submissionNote);
      }

      const mergedItemsList = Array.from(mergedItems.values());
      if (!mergedItemsList.length) {
        throw new BadRequestException('At least one item quantity is required.');
      }

      const metadata: StoredOrderMetadata = {
        version: 2,
        weekStart: week.weekStartKey,
        weekEnd: week.weekEndKey,
        submittedDates: this.normalizeDateKeys(Array.from(submittedDates)),
        contributors: this.normalizeContributors(Array.from(contributors)),
        noteLines: this.normalizeNoteLines(Array.from(noteLines)),
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
    })) as CompanyOrderDbRow;

    return this.serializeOrder(order);
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
      orderBy: [{ supplierName: 'asc' }, { orderDate: 'desc' }, { createdAt: 'desc' }],
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
    const pdf = this.buildOrdersPdf(serializedOrders, {
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
    options: { format: ExportFormat; weekStart?: string; officeId?: string },
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
      orderBy: [{ supplierName: 'asc' }, { orderDate: 'desc' }, { createdAt: 'desc' }],
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

    if (options.format === 'csv') {
      const csv = this.buildWeeklyCsv(serializedOrders, week.weekStartKey);
      return {
        filename: `company-orders-week-${week.weekStartKey}.csv`,
        contentType: 'text/csv; charset=utf-8',
        content: Buffer.from(csv, 'utf8'),
      };
    }
    if (options.format === 'excel') {
      const excelHtml = this.buildWeeklyExcelHtml(
        serializedOrders,
        week.weekStartKey,
      );
      return {
        filename: `company-orders-week-${week.weekStartKey}.xls`,
        contentType: 'application/vnd.ms-excel; charset=utf-8',
        content: Buffer.from(excelHtml, 'utf8'),
      };
    }

    const pdf = this.buildOrdersPdf(serializedOrders, {
      weekStartDate: week.weekStartKey,
      weekEndDate: week.weekEndKey,
      locationLabel: this.resolvePdfLocationLabel(serializedOrders),
      generatedAt: new Date(),
    });
    return {
      filename: `company-orders-week-${week.weekStartKey}.pdf`,
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

  private buildWeeklyCsv(orders: SerializedCompanyOrder[], weekStartDate: string) {
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows: string[][] = [
      [
        'weekStart',
        'supplier',
        'orderLabel',
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
      rows.push([weekStartDate, '', '', '', '', '', '', '', '', '']);
    } else {
      orders.forEach((order) => {
        if (!order.items.length) {
          rows.push([
            weekStartDate,
            order.supplierName,
            order.orderLabel || '',
            order.officeName || '',
            order.submittedDates.join('; '),
            order.contributors.join('; '),
            '',
            '',
            '',
            order.notes || '',
          ]);
          return;
        }
        order.items.forEach((item) => {
          rows.push([
            weekStartDate,
            order.supplierName,
            order.orderLabel || '',
            order.officeName || '',
            order.submittedDates.join('; '),
            order.contributors.join('; '),
            item.nameEs,
            item.nameEn,
            String(item.quantity),
            order.notes || '',
          ]);
        });
      });
    }

    return rows.map((row) => row.map((cell) => escapeCsv(cell || '')).join(',')).join('\n');
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

    const header = [
      'Week Start',
      'Supplier',
      'Order Label',
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
        `<tr>${[
          weekStartDate,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ]
          .map((cell) => `<td>${escapeHtml(cell)}</td>`)
          .join('')}</tr>`,
      );
    } else {
      orders.forEach((order) => {
        const baseCells = [
          weekStartDate,
          order.supplierName,
          order.orderLabel || '',
          order.officeName || '',
          order.submittedDates.join('; '),
          order.contributors.join('; '),
        ];

        if (!order.items.length) {
          bodyRows.push(
            `<tr>${[
              ...baseCells,
              '',
              '',
              '',
              order.notes || '',
            ]
              .map((cell) => `<td>${escapeHtml(cell)}</td>`)
              .join('')}</tr>`,
          );
          return;
        }

        order.items.forEach((item) => {
          bodyRows.push(
            `<tr>${[
              ...baseCells,
              item.nameEs,
              item.nameEn,
              String(item.quantity),
              order.notes || '',
            ]
              .map((cell) => `<td>${escapeHtml(cell)}</td>`)
              .join('')}</tr>`,
          );
        });
      });
    }

    return `<!doctype html><html><head><meta charset="utf-8" /></head><body><table border="1"><thead><tr>${header
      .map((cell) => `<th>${escapeHtml(cell)}</th>`)
      .join('')}</tr></thead><tbody>${bodyRows.join('')}</tbody></table></body></html>`;
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
    const rows = await this.prisma.$queryRawUnsafe<Array<{ catalogJson: unknown }>>(
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
    suppliers: CompanyOrderCatalogSupplier[],
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

  private normalizeCatalogSuppliers(
    rawSuppliers: Array<
      | CompanyOrderCatalogSupplier
      | CompanyOrderCatalogSupplierDto
      | {
          supplierName?: string;
          items?: Array<{ nameEs?: string; nameEn?: string }>;
        }
    >,
  ) {
    const bySupplier = new Map<
      string,
      {
        supplierName: string;
        itemsByKey: Map<string, { nameEs: string; nameEn: string }>;
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
        itemsByKey: new Map<string, { nameEs: string; nameEn: string }>(),
      };
      if (!bySupplier.has(supplierKey)) {
        bySupplier.set(supplierKey, existing);
      }

      const rawItems = Array.isArray(rawSupplier?.items) ? rawSupplier.items : [];
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
        existing.itemsByKey.set(catalogItemKey(nameEs, nameEn), { nameEs, nameEn });
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
      submittedDates[submittedDates.length - 1] || this.toDateKey(order.orderDate);
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
      items: Map<string, { id: string; nameEs: string; nameEn: string; quantity: number }>;
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
      const safeOrderDateMs = Number.isFinite(orderDateMs) ? orderDateMs : nowMs;
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

      [order.supplierName, ...(order.supplierNames || [])].forEach((supplierName) => {
        const normalized = supplierName.trim();
        if (!normalized) {
          return;
        }
        const key = normalized.toLowerCase();
        if (!aggregate.supplierNames.has(key)) {
          aggregate.supplierNames.set(key, normalized);
        }
      });

      this.normalizeDateKeys(order.submittedDates || []).forEach((dateKey) => {
        aggregate.submittedDates.add(dateKey);
      });
      this.normalizeContributors(order.contributors || []).forEach((contributor) => {
        aggregate.contributors.add(contributor);
      });
      this.normalizeNoteLines((order.notes || '').split('\n')).forEach((line) => {
        aggregate.noteLines.add(line);
      });

      order.items.forEach((item) => {
        const key = `${order.supplierName.trim().toLowerCase()}|${catalogItemKey(item.nameEs, item.nameEn)}`;
        const existing = aggregate.items.get(key);
        if (existing) {
          existing.quantity = Number((existing.quantity + item.quantity).toFixed(2));
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
        const notes = this.normalizeNoteLines(Array.from(aggregate.noteLines.values())).join(
          '\n',
        );
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
          orderLabel: this.formatOrderLabel(aggregate.weekStartDate, lastSubmittedDate),
          submittedDates,
          contributors,
          notes,
          officeId: aggregate.officeId,
          officeName: aggregate.officeName,
          createdBy: aggregate.createdBy,
          totalQuantity,
          itemCount: items.length,
          items,
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

  private composeStoredOrderNotes(metadata: StoredOrderMetadata) {
    const payload: StoredOrderMetadata = {
      version: 2,
      weekStart: this.normalizeDateKey(metadata.weekStart),
      weekEnd: this.normalizeDateKey(metadata.weekEnd),
      submittedDates: this.normalizeDateKeys(metadata.submittedDates),
      contributors: this.normalizeContributors(metadata.contributors),
      noteLines: this.normalizeNoteLines(metadata.noteLines),
    };

    const serialized = JSON.stringify(payload);
    return `${COMPANY_ORDER_META_PREFIX}${serialized}`;
  }

  private readStoredOrderNotes(rawNotes?: string | null): ParsedStoredOrderNotes {
    const source = rawNotes?.trim() || '';
    if (!source.startsWith(COMPANY_ORDER_META_PREFIX)) {
      return {
        weekStart: '',
        weekEnd: '',
        submittedDates: [],
        contributors: [],
        noteLines: source ? [source] : [],
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
      if (version === 2) {
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

        return {
          weekStart,
          weekEnd,
          submittedDates,
          contributors,
          noteLines,
          notes: noteLines.join('\n'),
        };
      }

      return {
        weekStart: '',
        weekEnd: '',
        submittedDates: [],
        contributors: [],
        noteLines: legacyNotes ? [legacyNotes] : [],
        notes: legacyNotes,
      };
    } catch {
      return {
        weekStart: '',
        weekEnd: '',
        submittedDates: [],
        contributors: [],
        noteLines: source ? [source] : [],
        notes: source,
      };
    }
  }

  private toDateKey(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private getWeekBounds(value: Date) {
    const base = new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
    const day = base.getUTCDay();
    const distanceToMonday = (day + 6) % 7;

    const weekStart = new Date(base);
    weekStart.setUTCDate(base.getUTCDate() - distanceToMonday);
    weekStart.setUTCHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);

    return {
      weekStart,
      weekEnd,
      weekStartKey: this.toDateKey(weekStart),
      weekEndKey: this.toDateKey(weekEnd),
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
    options: {
      weekStartDate: string;
      weekEndDate: string;
      locationLabel: string;
      generatedAt: Date;
    },
  ) {
    const PAGE_WIDTH = 595;
    const PAGE_HEIGHT = 842;
    const LEFT = 78;
    const TOP = 800;
    const BOTTOM = 56;
    const CONTENT_WIDTH = 439.2;
    const TABLE_WIDTH = 403.2;
    const TABLE_HEADER_HEIGHT = 18;
    const TABLE_ROW_HEIGHT = 18;
    const TABLE_BORDER_GRAY = 0.501961;
    const TABLE_HEADER_GRAY = 0.827451;

    const tableX = LEFT;
    const tableRight = tableX + TABLE_WIDTH;
    const colIndexRight = tableX + 36;
    const colItemRight = tableX + 194.4;
    const colDescriptionRight = tableX + 352.8;
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

    const drawDocumentHeader = () => {
      drawText('COMPANY PURCHASE ORDERS', LEFT, cursorY, 18, true);
      cursorY -= 24;
      drawText(
        `Week: ${this.formatPdfWeekLabel(
          options.weekStartDate,
          options.weekEndDate,
        )}`,
        LEFT,
        cursorY,
        10,
      );
      cursorY -= 14;
      drawText(
        `Location: ${options.locationLabel || 'All locations'}`,
        LEFT,
        cursorY,
        10,
      );
      cursorY -= 14;
      drawText(
        `Generated: ${this.formatDateUs(options.generatedAt)}`,
        LEFT,
        cursorY,
        10,
      );
      cursorY -= 16;
      drawLine(LEFT, cursorY, LEFT + CONTENT_WIDTH, cursorY, 1, TABLE_BORDER_GRAY);
      cursorY -= 18;
    };

    drawDocumentHeader();

    if (!orders.length) {
      drawText('No supplier orders for this week.', LEFT, cursorY, 11);
      cursorY -= 16;
    }

    orders.forEach((order) => {
      const submittedDates =
        order.submittedDates.length > 0
          ? order.submittedDates
          : [this.toDateKey(new Date(order.orderDate))];
      const submittedLabel = this.formatPdfSubmittedDates(submittedDates);
      const contributorLabel = order.contributors.length
        ? order.contributors.join(', ')
        : order.createdBy || 'N/A';
      const rows = order.items.length
        ? order.items.map((item, index) => ({
            rowNumber: index + 1,
            nameEs: item.nameEs || item.nameEn || '-',
            nameEn: item.nameEn || item.nameEs || '-',
            quantity: this.formatPdfQuantity(item.quantity),
          }))
        : [
            {
              rowNumber: 1,
              nameEs: 'No items submitted',
              nameEn: '',
              quantity: '-',
            },
          ];

      let rowOffset = 0;
      while (rowOffset < rows.length) {
        ensureSpace(140);

        const supplierLabel = `SUPPLIER: ${this.normalizePdfText(order.supplierName).toUpperCase()}${rowOffset > 0 ? ' (CONTINUED)' : ''}`;
        drawText(supplierLabel, LEFT, cursorY, 14, true);
        cursorY -= 20;
        drawText(`Submitted: ${submittedLabel}`, LEFT, cursorY, 10);
        cursorY -= 14;
        drawText(`Contributors: ${contributorLabel}`, LEFT, cursorY, 10);
        cursorY -= 16;

        const tableTop = cursorY;
        const rowsRemaining = rows.length - rowOffset;
        let rowsThatFit = Math.floor(
          (tableTop - BOTTOM - 22 - TABLE_HEADER_HEIGHT) / TABLE_ROW_HEIGHT,
        );
        rowsThatFit = Math.max(1, rowsThatFit);
        let rowsThisPage = Math.min(rowsRemaining, rowsThatFit);

        const tentativeFinalChunk = rowOffset + rowsThisPage >= rows.length;
        if (tentativeFinalChunk) {
          const finalRowsThatFit = Math.floor(
            (tableTop - BOTTOM - 52 - TABLE_HEADER_HEIGHT) / TABLE_ROW_HEIGHT,
          );
          rowsThisPage = Math.min(
            rowsThisPage,
            Math.max(1, finalRowsThatFit),
          );
        }
        if (rowsThisPage <= 0) {
          pushPage();
          continue;
        }

        const chunkRows = rows.slice(rowOffset, rowOffset + rowsThisPage);
        fillRect(
          tableX,
          tableTop - TABLE_HEADER_HEIGHT,
          TABLE_WIDTH,
          TABLE_HEADER_HEIGHT,
          TABLE_HEADER_GRAY,
        );
        drawText('#', tableX + 6, tableTop - 13, 10);
        drawText('Item Name', tableX + 42, tableTop - 13, 10);
        drawText('Description', tableX + 200.4, tableTop - 13, 10);
        drawText('Qty', tableX + 358.8, tableTop - 13, 10);

        chunkRows.forEach((row, rowIndex) => {
          const textY =
            tableTop - 13 - TABLE_ROW_HEIGHT * (rowIndex + 1);
          drawText(String(row.rowNumber), tableX + 6, textY, 10);
          drawText(
            this.truncatePdfText(row.nameEs, 146, 10),
            tableX + 42,
            textY,
            10,
          );
          drawText(
            this.truncatePdfText(row.nameEn, 146, 10),
            tableX + 200.4,
            textY,
            10,
          );
          const qtyText = this.truncatePdfText(row.quantity, 44, 10);
          const qtyWidth = this.estimatePdfTextWidth(qtyText, 10);
          const qtyX = Math.max(colDescriptionRight + 6, tableRight - 6 - qtyWidth);
          drawText(qtyText, qtyX, textY, 10);
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
        drawLine(
          colDescriptionRight,
          tableBottom,
          colDescriptionRight,
          tableTop,
        );
        drawLine(tableRight, tableBottom, tableRight, tableTop);

        cursorY = tableBottom - 10;
        rowOffset += rowsThisPage;
        const isFinalChunk = rowOffset >= rows.length;
        if (isFinalChunk) {
          drawText(
            `Total Items: ${this.formatPdfQuantity(order.itemCount)}`,
            LEFT,
            cursorY,
            10,
            true,
          );
          cursorY -= 14;
          drawText(
            `Total Quantity Ordered: ${this.formatPdfQuantity(
              order.totalQuantity,
            )}`,
            LEFT,
            cursorY,
            10,
            true,
          );
          cursorY -= 14;
          const notes = this.normalizePdfText(order.notes || '');
          if (notes) {
            drawText(
              `Notes: ${this.truncatePdfText(notes, CONTENT_WIDTH - 12, 10)}`,
              LEFT,
              cursorY,
              10,
            );
            cursorY -= 14;
          }
          drawLine(
            LEFT,
            cursorY,
            LEFT + CONTENT_WIDTH,
            cursorY,
            0.5,
            TABLE_BORDER_GRAY,
          );
          cursorY -= 16;
        } else {
          pushPage();
        }
      }
    });

    if (commands.length === 0) {
      drawText('COMPANY PURCHASE ORDERS', LEFT, TOP, 18, true);
    }
    pages.push(commands.join('\n'));
    return this.buildPdfDocument(pages, PAGE_WIDTH, PAGE_HEIGHT);
  }

  private formatPdfWeekLabel(weekStartDate: string, weekEndDate: string) {
    return `${this.formatDateKeyUs(weekStartDate)} - ${this.formatDateKeyUs(weekEndDate)}`;
  }

  private formatPdfSubmittedDates(dateKeys: string[]) {
    const normalized = this.normalizeDateKeys(dateKeys);
    if (!normalized.length) {
      return 'N/A';
    }
    return normalized.map((dateKey) => this.formatDateKeyUs(dateKey)).join(', ');
  }

  private formatPdfQuantity(value: number) {
    if (!Number.isFinite(value)) {
      return '0';
    }
    return Number(value.toFixed(2)).toString();
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
      if (
        this.estimatePdfTextWidth(candidate, fontSize, bold) <= maxWidth
      ) {
        return candidate;
      }
      end -= 1;
    }
    return suffix;
  }

  private escapePdfText(value: string) {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  private buildPdfDocument(
    pages: string[],
    pageWidth = 595,
    pageHeight = 842,
  ) {
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
    supplier: CompanyOrderCatalogSupplier,
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
