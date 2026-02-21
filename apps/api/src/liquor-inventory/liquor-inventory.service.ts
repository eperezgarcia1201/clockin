import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LiquorInventoryMovementType, Prisma } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { AnalyzeBottleScanDto } from './dto/analyze-bottle-scan.dto';
import { CreateLiquorItemDto } from './dto/create-liquor-item.dto';
import { CreateLiquorMovementDto } from './dto/create-liquor-movement.dto';
import { UpdateLiquorItemDto } from './dto/update-liquor-item.dto';
import { UpsertLiquorCountDto } from './dto/upsert-liquor-count.dto';

const incomingMovementTypes = new Set<LiquorInventoryMovementType>([
  LiquorInventoryMovementType.PURCHASE,
  LiquorInventoryMovementType.ADJUSTMENT_IN,
  LiquorInventoryMovementType.TRANSFER_IN,
]);

const outgoingMovementTypes = new Set<LiquorInventoryMovementType>([
  LiquorInventoryMovementType.SALE,
  LiquorInventoryMovementType.WASTE,
  LiquorInventoryMovementType.ADJUSTMENT_OUT,
  LiquorInventoryMovementType.TRANSFER_OUT,
]);

const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
const yearRegex = /^\d{4}$/;
const dateKeyRegex = /^\d{4}-\d{2}-\d{2}$/;
const isoDateRegex =
  /^\d{4}-\d{2}-\d{2}(?:[tT]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:[zZ]|[+-]\d{2}:\d{2})?)?$/;
const allowedImageMimeTypes = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const maxImageDataUrlLength = 30_000_000;
const defaultVisionModel = 'gpt-4o-mini';
const defaultBottleScanLimit = 80;

const toMoney = (value: number) => Number(value.toFixed(2));
const toQuantity = (value: number) => Number(value.toFixed(3));
const toPercent = (value: number) => Number(value.toFixed(2));

type MonthlyItemTotals = {
  receivedUnits: number;
  issuedUnits: number;
  purchasedUnits: number;
  salesUnits: number;
  wasteUnits: number;
  adjustmentInUnits: number;
  adjustmentOutUnits: number;
  transferInUnits: number;
  transferOutUnits: number;
};

@Injectable()
export class LiquorInventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  async listCatalog(
    authUser: AuthUser,
    options: { search?: string; includeInactive?: boolean },
  ) {
    const access = await this.requireLiquorAccess(authUser);
    const tenantId = access.tenant.id;
    const search = options.search?.trim() || '';

    const where: Prisma.LiquorInventoryItemWhereInput = {
      tenantId,
      isActive: options.includeInactive ? undefined : true,
      OR: search
        ? [
            { name: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
            { upc: { contains: search } },
            { supplierName: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const items = await this.prisma.liquorInventoryItem.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }, { brand: 'asc' }],
      take: 400,
    });

    return {
      items: items.map((item) => this.serializeItem(item)),
    };
  }

  async createCatalogItem(authUser: AuthUser, dto: CreateLiquorItemDto) {
    const access = await this.requireLiquorAccess(authUser);
    const tenantId = access.tenant.id;

    const name = this.normalizeRequiredText(dto.name, 'name', 140);
    const brand = this.normalizeOptionalText(dto.brand, 140);
    const upc = this.normalizeUpc(dto.upc);
    const unitLabel = this.normalizeOptionalText(dto.unitLabel, 60);
    const supplierName = this.normalizeOptionalText(dto.supplierName, 140);
    const sizeMl = dto.sizeMl !== undefined ? toMoney(dto.sizeMl) : null;
    const unitCost = dto.unitCost !== undefined ? toMoney(dto.unitCost) : 0;

    if (upc) {
      await this.assertUpcNotTaken(tenantId, upc);
    }

    const created = await this.prisma.liquorInventoryItem.create({
      data: {
        tenantId,
        name,
        brand,
        upc,
        sizeMl,
        unitLabel,
        supplierName,
        unitCost,
        isActive: dto.isActive ?? true,
      },
    });

    return {
      item: this.serializeItem(created),
    };
  }

  async updateCatalogItem(
    authUser: AuthUser,
    itemId: string,
    dto: UpdateLiquorItemDto,
  ) {
    const access = await this.requireLiquorAccess(authUser);
    const tenantId = access.tenant.id;

    const existing = await this.prisma.liquorInventoryItem.findFirst({
      where: { id: itemId, tenantId },
      select: { id: true, upc: true },
    });
    if (!existing) {
      throw new NotFoundException('Liquor catalog item not found.');
    }

    const data: Prisma.LiquorInventoryItemUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = this.normalizeRequiredText(dto.name, 'name', 140);
    }
    if (dto.brand !== undefined) {
      data.brand = this.normalizeOptionalText(dto.brand, 140);
    }
    if (dto.unitLabel !== undefined) {
      data.unitLabel = this.normalizeOptionalText(dto.unitLabel, 60);
    }
    if (dto.supplierName !== undefined) {
      data.supplierName = this.normalizeOptionalText(dto.supplierName, 140);
    }
    if (dto.sizeMl !== undefined) {
      data.sizeMl = toMoney(dto.sizeMl);
    }
    if (dto.unitCost !== undefined) {
      data.unitCost = toMoney(dto.unitCost);
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }
    if (dto.upc !== undefined) {
      const upc = this.normalizeUpc(dto.upc);
      if (upc && upc !== existing.upc) {
        await this.assertUpcNotTaken(tenantId, upc, existing.id);
      }
      data.upc = upc;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No changes were provided.');
    }

    const updated = await this.prisma.liquorInventoryItem.update({
      where: { id: existing.id },
      data,
    });

    return {
      item: this.serializeItem(updated),
    };
  }

  async lookupByUpc(authUser: AuthUser, rawUpc: string) {
    const access = await this.requireLiquorAccess(authUser);
    const tenantId = access.tenant.id;
    const upc = this.normalizeUpc(rawUpc);
    if (!upc) {
      throw new BadRequestException('UPC is required.');
    }

    const local = await this.prisma.liquorInventoryItem.findFirst({
      where: { tenantId, upc },
    });
    if (local) {
      return {
        source: 'local',
        item: this.serializeItem(local),
      };
    }

    const candidate = await this.lookupExternalUpc(upc);
    if (!candidate) {
      return {
        source: 'none',
        upc,
      };
    }

    return {
      source: 'external',
      upc,
      candidate,
    };
  }

  async listMovements(
    authUser: AuthUser,
    options: {
      officeId?: string;
      itemId?: string;
      from?: string;
      to?: string;
      limit?: number;
    },
  ) {
    const access = await this.requireLiquorAccess(authUser);
    const tenantId = access.tenant.id;

    const officeId = options.officeId?.trim() || undefined;
    if (officeId) {
      await this.assertOfficeExists(tenantId, officeId);
    }

    const where: Prisma.LiquorInventoryMovementWhereInput = {
      tenantId,
      officeId,
      itemId: options.itemId?.trim() || undefined,
      occurredAt: this.buildRangeWhere(options.from, options.to),
    };

    const limit = Math.min(200, Math.max(1, options.limit || 60));
    const movements = await this.prisma.liquorInventoryMovement.findMany({
      where,
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      include: {
        office: { select: { id: true, name: true } },
        item: { select: { id: true, name: true, brand: true, upc: true } },
        createdByEmployee: {
          select: { id: true, fullName: true, displayName: true },
        },
      },
    });

    return {
      movements: movements.map((movement) => this.serializeMovement(movement)),
    };
  }

  async createMovement(authUser: AuthUser, dto: CreateLiquorMovementDto) {
    const access = await this.requireLiquorAccess(authUser);
    const tenantId = access.tenant.id;
    const officeId = dto.officeId.trim();
    const itemId = dto.itemId.trim();
    if (!officeId) {
      throw new BadRequestException('officeId is required.');
    }
    if (!itemId) {
      throw new BadRequestException('itemId is required.');
    }

    await this.assertOfficeExists(tenantId, officeId);
    await this.assertItemExists(tenantId, itemId);

    const occurredAt = dto.occurredAt
      ? this.parseIsoDate(dto.occurredAt, 'occurredAt')
      : new Date();
    const movement = await this.prisma.liquorInventoryMovement.create({
      data: {
        tenantId,
        officeId,
        itemId,
        type: dto.type,
        quantity: toQuantity(dto.quantity),
        unitCostOverride:
          dto.unitCostOverride !== undefined
            ? toMoney(dto.unitCostOverride)
            : null,
        occurredAt,
        notes: this.normalizeOptionalText(dto.notes, 2000),
        createdByEmployeeId: access.employeeId || null,
      },
      include: {
        office: { select: { id: true, name: true } },
        item: { select: { id: true, name: true, brand: true, upc: true } },
        createdByEmployee: {
          select: { id: true, fullName: true, displayName: true },
        },
      },
    });

    return {
      movement: this.serializeMovement(movement),
    };
  }

  async listCounts(
    authUser: AuthUser,
    options: {
      officeId?: string;
      itemId?: string;
      from?: string;
      to?: string;
      limit?: number;
    },
  ) {
    const access = await this.requireLiquorAccess(authUser);
    const tenantId = access.tenant.id;

    const officeId = options.officeId?.trim() || undefined;
    if (officeId) {
      await this.assertOfficeExists(tenantId, officeId);
    }

    const where: Prisma.LiquorInventoryCountWhereInput = {
      tenantId,
      officeId,
      itemId: options.itemId?.trim() || undefined,
      countDate: this.buildRangeWhere(options.from, options.to),
    };

    const limit = Math.min(400, Math.max(1, options.limit || 90));
    const counts = await this.prisma.liquorInventoryCount.findMany({
      where,
      orderBy: [{ countDate: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
      include: {
        office: { select: { id: true, name: true } },
        item: { select: { id: true, name: true, brand: true, upc: true } },
        createdByEmployee: {
          select: { id: true, fullName: true, displayName: true },
        },
      },
    });

    return {
      counts: counts.map((count) => this.serializeCount(count)),
    };
  }

  async upsertCount(authUser: AuthUser, dto: UpsertLiquorCountDto) {
    const access = await this.requireLiquorAccess(authUser);
    const tenantId = access.tenant.id;
    const officeId = dto.officeId.trim();
    const itemId = dto.itemId.trim();
    if (!officeId) {
      throw new BadRequestException('officeId is required.');
    }
    if (!itemId) {
      throw new BadRequestException('itemId is required.');
    }

    await this.assertOfficeExists(tenantId, officeId);
    await this.assertItemExists(tenantId, itemId);

    const barQuantity =
      dto.barQuantity !== undefined ? toQuantity(dto.barQuantity) : null;
    const bodegaQuantity =
      dto.bodegaQuantity !== undefined ? toQuantity(dto.bodegaQuantity) : null;
    const hasSplitCount = barQuantity !== null || bodegaQuantity !== null;
    const resolvedQuantity = hasSplitCount
      ? toQuantity((barQuantity || 0) + (bodegaQuantity || 0))
      : dto.quantity !== undefined
        ? toQuantity(dto.quantity)
        : null;
    if (resolvedQuantity === null) {
      throw new BadRequestException(
        'quantity is required when bar/bodega quantities are not provided.',
      );
    }

    const countDate = this.parseDateKey(dto.countDate, 'countDate');
    const existing = await this.prisma.liquorInventoryCount.findUnique({
      where: {
        tenantId_officeId_itemId_countDate: {
          tenantId,
          officeId,
          itemId,
          countDate,
        },
      },
      select: { id: true },
    });

    const count = existing
      ? await this.prisma.liquorInventoryCount.update({
          where: { id: existing.id },
          data: {
            quantity: resolvedQuantity,
            barQuantity,
            bodegaQuantity,
            notes: this.normalizeOptionalText(dto.notes, 2000),
            createdByEmployeeId: access.employeeId || null,
          },
          include: {
            office: { select: { id: true, name: true } },
            item: { select: { id: true, name: true, brand: true, upc: true } },
            createdByEmployee: {
              select: { id: true, fullName: true, displayName: true },
            },
          },
        })
      : await this.prisma.liquorInventoryCount.create({
          data: {
            tenantId,
            officeId,
            itemId,
            countDate,
            quantity: resolvedQuantity,
            barQuantity,
            bodegaQuantity,
            notes: this.normalizeOptionalText(dto.notes, 2000),
            createdByEmployeeId: access.employeeId || null,
          },
          include: {
            office: { select: { id: true, name: true } },
            item: { select: { id: true, name: true, brand: true, upc: true } },
            createdByEmployee: {
              select: { id: true, fullName: true, displayName: true },
            },
          },
        });

    return {
      count: this.serializeCount(count),
    };
  }

  async listBottleScans(
    authUser: AuthUser,
    options: {
      officeId?: string;
      itemId?: string;
      containerKey?: string;
      limit?: number;
    },
  ) {
    const access = await this.requireLiquorAccess(authUser);
    const tenantId = access.tenant.id;
    const officeId = options.officeId?.trim() || undefined;
    const itemId = options.itemId?.trim() || undefined;
    const containerKey = this.normalizeOptionalText(options.containerKey, 80);

    if (officeId) {
      await this.assertOfficeExists(tenantId, officeId);
    }
    if (itemId) {
      await this.assertItemExists(tenantId, itemId);
    }

    const limit = Math.min(200, Math.max(1, options.limit || defaultBottleScanLimit));
    const scans = await this.prisma.liquorBottleScan.findMany({
      where: {
        tenantId,
        officeId,
        itemId,
        containerKey: containerKey || undefined,
      },
      orderBy: [{ measuredAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      include: {
        office: { select: { id: true, name: true } },
        item: { select: { id: true, name: true, brand: true, sizeMl: true } },
        createdByEmployee: {
          select: { id: true, fullName: true, displayName: true },
        },
      },
    });

    return {
      scans: scans.map((scan) => this.serializeBottleScan(scan)),
    };
  }

  async analyzeBottleScan(authUser: AuthUser, dto: AnalyzeBottleScanDto) {
    const access = await this.requireLiquorAccess(authUser);
    const tenantId = access.tenant.id;
    const officeId = dto.officeId.trim();
    const itemId = dto.itemId.trim();
    if (!officeId) {
      throw new BadRequestException('officeId is required.');
    }
    if (!itemId) {
      throw new BadRequestException('itemId is required.');
    }

    const [office, item] = await Promise.all([
      this.assertOfficeExists(tenantId, officeId),
      this.getItemForBottleScan(tenantId, itemId),
    ]);

    const measuredAt = dto.measuredAt
      ? this.parseFlexibleIsoDate(dto.measuredAt, 'measuredAt')
      : new Date();
    const containerKey = this.normalizeOptionalText(dto.containerKey, 80);
    const notes = this.normalizeOptionalText(dto.notes, 2000);
    const imageDataUrl = this.resolveImageDataUrl(dto);

    const aiEstimate = await this.estimateBottleFillPercent(imageDataUrl, item);
    const estimatedMl =
      item.sizeMl !== null
        ? toQuantity((aiEstimate.fillPercent / 100) * item.sizeMl)
        : null;

    const previousScan = await this.prisma.liquorBottleScan.findFirst({
      where: {
        tenantId,
        officeId,
        itemId,
        containerKey: containerKey || undefined,
        measuredAt: { lt: measuredAt },
      },
      orderBy: [{ measuredAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        office: { select: { id: true, name: true } },
        item: { select: { id: true, name: true, brand: true, sizeMl: true } },
        createdByEmployee: {
          select: { id: true, fullName: true, displayName: true },
        },
      },
    });

    const scan = await this.prisma.liquorBottleScan.create({
      data: {
        tenantId,
        officeId,
        itemId,
        containerKey,
        measuredAt,
        fillPercent: aiEstimate.fillPercent,
        estimatedMl,
        confidence: aiEstimate.confidence,
        source: aiEstimate.model,
        notes,
        createdByEmployeeId: access.employeeId || null,
      },
      include: {
        office: { select: { id: true, name: true } },
        item: { select: { id: true, name: true, brand: true, sizeMl: true } },
        createdByEmployee: {
          select: { id: true, fullName: true, displayName: true },
        },
      },
    });

    const previousEstimatedMl = previousScan?.estimatedMl ?? null;
    const currentEstimatedMl = scan.estimatedMl ?? null;
    const spentMl =
      previousEstimatedMl !== null && currentEstimatedMl !== null
        ? toQuantity(previousEstimatedMl - currentEstimatedMl)
        : null;
    const daysBetween =
      previousScan !== null
        ? toQuantity(
            (scan.measuredAt.getTime() - previousScan.measuredAt.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : null;

    return {
      office: { id: office.id, name: office.name },
      item: {
        id: item.id,
        name: item.name,
        brand: item.brand,
        sizeMl: item.sizeMl,
      },
      analysis: {
        fillPercent: aiEstimate.fillPercent,
        confidence: aiEstimate.confidence,
        summary: aiEstimate.summary,
        model: aiEstimate.model,
      },
      scan: this.serializeBottleScan(scan),
      comparison: {
        previousScan: previousScan
          ? this.serializeBottleScan(previousScan)
          : null,
        previousEstimatedMl,
        currentEstimatedMl,
        spentMl,
        spentMlClamped: spentMl === null ? null : toQuantity(Math.max(0, spentMl)),
        daysBetween,
      },
    };
  }

  async monthlyReport(
    authUser: AuthUser,
    options: { month?: string; officeId?: string; targetCostPct?: number },
  ) {
    const access = await this.requireLiquorAccess(authUser);
    const tenantId = access.tenant.id;
    const monthKey = options.month
      ? this.parseMonthKey(options.month)
      : new Date().toISOString().slice(0, 7);

    const monthStart = new Date(`${monthKey}-01T00:00:00.000Z`);
    const monthEndExclusive = this.shiftMonth(monthStart, 1);
    const monthEndDisplay = new Date(monthEndExclusive.getTime() - 1);

    const officeId = options.officeId?.trim() || undefined;
    const office = officeId
      ? await this.assertOfficeExists(tenantId, officeId)
      : null;
    const targetCostPct = this.normalizeTargetCostPct(options.targetCostPct);

    const [items, movements, counts, salesTotals] = await Promise.all([
      this.prisma.liquorInventoryItem.findMany({
        where: { tenantId },
        orderBy: [{ name: 'asc' }, { brand: 'asc' }],
      }),
      this.prisma.liquorInventoryMovement.findMany({
        where: {
          tenantId,
          officeId,
          occurredAt: {
            gte: monthStart,
            lt: monthEndExclusive,
          },
        },
        select: {
          itemId: true,
          type: true,
          quantity: true,
          unitCostOverride: true,
        },
      }),
      this.prisma.liquorInventoryCount.findMany({
        where: {
          tenantId,
          officeId,
          countDate: {
            lt: monthEndExclusive,
          },
        },
        orderBy: [{ countDate: 'asc' }, { updatedAt: 'asc' }],
        select: {
          itemId: true,
          countDate: true,
          quantity: true,
        },
      }),
      this.prisma.dailySalesReport.aggregate({
        where: {
          tenantId,
          reportDate: {
            gte: monthStart,
            lt: monthEndExclusive,
          },
        },
        _sum: {
          liquorSales: true,
        },
      }),
    ]);

    const itemMap = new Map(items.map((item) => [item.id, item]));
    const movementTotals = new Map<string, MonthlyItemTotals>();
    const movementCostByItem = new Map<string, number[]>();
    const relevantItemIds = new Set<string>();

    for (const movement of movements) {
      relevantItemIds.add(movement.itemId);
      const row = movementTotals.get(movement.itemId) || {
        receivedUnits: 0,
        issuedUnits: 0,
        purchasedUnits: 0,
        salesUnits: 0,
        wasteUnits: 0,
        adjustmentInUnits: 0,
        adjustmentOutUnits: 0,
        transferInUnits: 0,
        transferOutUnits: 0,
      };

      const quantity = toQuantity(movement.quantity);
      if (incomingMovementTypes.has(movement.type)) {
        row.receivedUnits = toQuantity(row.receivedUnits + quantity);
      }
      if (outgoingMovementTypes.has(movement.type)) {
        row.issuedUnits = toQuantity(row.issuedUnits + quantity);
      }

      switch (movement.type) {
        case LiquorInventoryMovementType.PURCHASE:
          row.purchasedUnits = toQuantity(row.purchasedUnits + quantity);
          break;
        case LiquorInventoryMovementType.SALE:
          row.salesUnits = toQuantity(row.salesUnits + quantity);
          break;
        case LiquorInventoryMovementType.WASTE:
          row.wasteUnits = toQuantity(row.wasteUnits + quantity);
          break;
        case LiquorInventoryMovementType.ADJUSTMENT_IN:
          row.adjustmentInUnits = toQuantity(row.adjustmentInUnits + quantity);
          break;
        case LiquorInventoryMovementType.ADJUSTMENT_OUT:
          row.adjustmentOutUnits = toQuantity(row.adjustmentOutUnits + quantity);
          break;
        case LiquorInventoryMovementType.TRANSFER_IN:
          row.transferInUnits = toQuantity(row.transferInUnits + quantity);
          break;
        case LiquorInventoryMovementType.TRANSFER_OUT:
          row.transferOutUnits = toQuantity(row.transferOutUnits + quantity);
          break;
      }

      movementTotals.set(movement.itemId, row);
      if (movement.unitCostOverride !== null && movement.unitCostOverride >= 0) {
        const costs = movementCostByItem.get(movement.itemId) || [];
        costs.push(movement.unitCostOverride);
        movementCostByItem.set(movement.itemId, costs);
      }
    }

    const openingCountByItem = new Map<
      string,
      { countDate: Date; quantity: number }
    >();
    const closingCountByItem = new Map<
      string,
      { countDate: Date; quantity: number }
    >();
    for (const count of counts) {
      relevantItemIds.add(count.itemId);
      if (count.countDate.getTime() <= monthStart.getTime()) {
        openingCountByItem.set(count.itemId, count);
      }
      closingCountByItem.set(count.itemId, count);
    }

    const rows = Array.from(relevantItemIds)
      .map((itemId) => {
        const item = itemMap.get(itemId);
        if (!item) {
          return null;
        }
        const totals = movementTotals.get(itemId) || {
          receivedUnits: 0,
          issuedUnits: 0,
          purchasedUnits: 0,
          salesUnits: 0,
          wasteUnits: 0,
          adjustmentInUnits: 0,
          adjustmentOutUnits: 0,
          transferInUnits: 0,
          transferOutUnits: 0,
        };
        const opening = openingCountByItem.get(itemId)?.quantity ?? 0;
        const closingCount = closingCountByItem.get(itemId);
        const theoreticalClosing = toQuantity(
          opening + totals.receivedUnits - totals.issuedUnits,
        );
        const closingUnits = closingCount?.quantity ?? null;
        const varianceUnits =
          closingUnits === null
            ? null
            : toQuantity(closingUnits - theoreticalClosing);
        const actualUsageUnits =
          closingUnits === null
            ? null
            : toQuantity(opening + totals.receivedUnits - closingUnits);

        const costSamples = movementCostByItem.get(itemId) || [];
        const averageOverrideCost = costSamples.length
          ? costSamples.reduce((sum, value) => sum + value, 0) /
            costSamples.length
          : null;
        const unitCost = toMoney(
          averageOverrideCost !== null ? averageOverrideCost : item.unitCost,
        );
        const actualUsageCost =
          actualUsageUnits === null
            ? null
            : toMoney(actualUsageUnits * unitCost);

        return {
          itemId: item.id,
          name: item.name,
          brand: item.brand,
          upc: item.upc,
          supplierName: item.supplierName,
          unitLabel: item.unitLabel,
          sizeMl: item.sizeMl,
          unitCost,
          openingUnits: toQuantity(opening),
          receivedUnits: totals.receivedUnits,
          issuedUnits: totals.issuedUnits,
          theoreticalClosingUnits: theoreticalClosing,
          closingUnits,
          varianceUnits,
          actualUsageUnits,
          actualUsageCost,
          purchasedUnits: totals.purchasedUnits,
          salesUnits: totals.salesUnits,
          wasteUnits: totals.wasteUnits,
          adjustmentInUnits: totals.adjustmentInUnits,
          adjustmentOutUnits: totals.adjustmentOutUnits,
          transferInUnits: totals.transferInUnits,
          transferOutUnits: totals.transferOutUnits,
          openingCountDate: openingCountByItem.get(itemId)?.countDate
            ? openingCountByItem.get(itemId)?.countDate.toISOString().slice(0, 10)
            : null,
          closingCountDate: closingCount?.countDate
            ? closingCount.countDate.toISOString().slice(0, 10)
            : null,
        };
      })
      .filter((row) => row !== null)
      .sort((a, b) => a.name.localeCompare(b.name)) as Array<{
      itemId: string;
      name: string;
      brand: string | null;
      upc: string | null;
      supplierName: string | null;
      unitLabel: string | null;
      sizeMl: number | null;
      unitCost: number;
      openingUnits: number;
      receivedUnits: number;
      issuedUnits: number;
      theoreticalClosingUnits: number;
      closingUnits: number | null;
      varianceUnits: number | null;
      actualUsageUnits: number | null;
      actualUsageCost: number | null;
      purchasedUnits: number;
      salesUnits: number;
      wasteUnits: number;
      adjustmentInUnits: number;
      adjustmentOutUnits: number;
      transferInUnits: number;
      transferOutUnits: number;
      openingCountDate: string | null;
      closingCountDate: string | null;
    }>;

    const totals = rows.reduce(
      (acc, row) => {
        acc.openingUnits += row.openingUnits;
        acc.receivedUnits += row.receivedUnits;
        acc.issuedUnits += row.issuedUnits;
        acc.theoreticalClosingUnits += row.theoreticalClosingUnits;
        acc.openingInventoryValue += row.openingUnits * row.unitCost;
        if (row.closingUnits !== null) {
          acc.closingUnits += row.closingUnits;
          acc.closingInventoryValue += row.closingUnits * row.unitCost;
        } else {
          acc.itemsMissingClosingCount += 1;
        }
        if (row.varianceUnits !== null) {
          acc.varianceUnits += row.varianceUnits;
        }
        if (row.actualUsageUnits !== null) {
          acc.actualUsageUnits += row.actualUsageUnits;
        }
        if (row.actualUsageCost !== null) {
          acc.actualUsageCost += row.actualUsageCost;
        }
        return acc;
      },
      {
        openingUnits: 0,
        receivedUnits: 0,
        issuedUnits: 0,
        theoreticalClosingUnits: 0,
        closingUnits: 0,
        openingInventoryValue: 0,
        closingInventoryValue: 0,
        varianceUnits: 0,
        actualUsageUnits: 0,
        actualUsageCost: 0,
        itemsMissingClosingCount: 0,
      },
    );

    const liquorSales = toMoney(salesTotals._sum.liquorSales || 0);
    const expectedUsageCost = toMoney(liquorSales * targetCostPct);
    const actualUsageCost = toMoney(totals.actualUsageCost);
    const usageCostVariance = toMoney(actualUsageCost - expectedUsageCost);
    const openingInventoryValue = toMoney(totals.openingInventoryValue);
    const closingInventoryValue = toMoney(totals.closingInventoryValue);
    const actualUsageCostPercent =
      liquorSales > 0 ? toMoney((actualUsageCost / liquorSales) * 100) : null;
    const expectedUsageCostPercent = toMoney(targetCostPct * 100);

    return {
      month: monthKey,
      office: office ? { id: office.id, name: office.name } : null,
      window: {
        startDate: monthStart.toISOString().slice(0, 10),
        endDate: monthEndDisplay.toISOString().slice(0, 10),
      },
      assumptions: {
        targetLiquorCostPercent: toMoney(targetCostPct * 100),
        formula:
          'Expected usage cost = liquor sales * target cost percent. Actual usage cost comes from inventory count deltas and unit cost.',
      },
      summary: {
        itemCount: rows.length,
        itemsMissingClosingCount: totals.itemsMissingClosingCount,
        openingUnits: toQuantity(totals.openingUnits),
        receivedUnits: toQuantity(totals.receivedUnits),
        issuedUnits: toQuantity(totals.issuedUnits),
        theoreticalClosingUnits: toQuantity(totals.theoreticalClosingUnits),
        closingUnits: toQuantity(totals.closingUnits),
        openingInventoryValue,
        closingInventoryValue,
        inventoryValueDelta: toMoney(closingInventoryValue - openingInventoryValue),
        varianceUnits: toQuantity(totals.varianceUnits),
        actualUsageUnits: toQuantity(totals.actualUsageUnits),
        liquorSales,
        expectedUsageCost,
        actualUsageCost,
        usageCostVariance,
        expectedUsageCostPercent,
        actualUsageCostPercent,
      },
      controlSheet: {
        openingInventoryValue,
        closingInventoryValue,
        liquorSales,
        expectedUsageCost,
        actualUsageCost,
        usageCostVariance,
        expectedUsageCostPercent,
        actualUsageCostPercent,
      },
      rows,
    };
  }

  async yearlyControlSheet(
    authUser: AuthUser,
    options: { year?: string; officeId?: string; targetCostPct?: number },
  ) {
    const resolvedYear = this.parseYearKey(options.year);
    const targetCostPct = this.normalizeTargetCostPct(options.targetCostPct);

    const monthKeys = Array.from({ length: 12 }, (_, index) => {
      const month = String(index + 1).padStart(2, '0');
      return `${resolvedYear}-${month}`;
    });

    const snapshots = await Promise.all(
      monthKeys.map((month) =>
        this.monthlyReport(authUser, {
          month,
          officeId: options.officeId,
          targetCostPct,
        }),
      ),
    );

    const months = snapshots.map((snapshot) => ({
      month: snapshot.month,
      openingInventoryValue: snapshot.summary.openingInventoryValue,
      closingInventoryValue: snapshot.summary.closingInventoryValue,
      liquorSales: snapshot.summary.liquorSales,
      expectedUsageCost: snapshot.summary.expectedUsageCost,
      actualUsageCost: snapshot.summary.actualUsageCost,
      usageCostVariance: snapshot.summary.usageCostVariance,
      expectedUsageCostPercent: snapshot.summary.expectedUsageCostPercent,
      actualUsageCostPercent: snapshot.summary.actualUsageCostPercent,
      itemCount: snapshot.summary.itemCount,
      itemsMissingClosingCount: snapshot.summary.itemsMissingClosingCount,
    }));

    const totals = months.reduce(
      (acc, row) => {
        acc.openingInventoryValue += row.openingInventoryValue;
        acc.closingInventoryValue += row.closingInventoryValue;
        acc.liquorSales += row.liquorSales;
        acc.expectedUsageCost += row.expectedUsageCost;
        acc.actualUsageCost += row.actualUsageCost;
        acc.usageCostVariance += row.usageCostVariance;
        return acc;
      },
      {
        openingInventoryValue: 0,
        closingInventoryValue: 0,
        liquorSales: 0,
        expectedUsageCost: 0,
        actualUsageCost: 0,
        usageCostVariance: 0,
      },
    );

    const totalLiquorSales = toMoney(totals.liquorSales);
    const totalActualUsageCost = toMoney(totals.actualUsageCost);
    const totalActualUsageCostPercent =
      totalLiquorSales > 0
        ? toMoney((totalActualUsageCost / totalLiquorSales) * 100)
        : null;

    const office = snapshots.find((snapshot) => snapshot.office)?.office || null;

    return {
      year: resolvedYear,
      office,
      assumptions: {
        targetLiquorCostPercent: toMoney(targetCostPct * 100),
      },
      months,
      totals: {
        openingInventoryValue: toMoney(totals.openingInventoryValue),
        closingInventoryValue: toMoney(totals.closingInventoryValue),
        liquorSales: totalLiquorSales,
        expectedUsageCost: toMoney(totals.expectedUsageCost),
        actualUsageCost: totalActualUsageCost,
        usageCostVariance: toMoney(totals.usageCostVariance),
        expectedUsageCostPercent: toMoney(targetCostPct * 100),
        actualUsageCostPercent: totalActualUsageCostPercent,
      },
    };
  }

  private async requireLiquorAccess(authUser: AuthUser) {
    const access = await this.tenancy.requireFeature(authUser, 'reports');
    if (!access.settings.liquorInventoryEnabled) {
      throw new ForbiddenException(
        'Liquor inventory is disabled for this tenant.',
      );
    }
    return access;
  }

  private async assertOfficeExists(tenantId: string, officeId: string) {
    const office = await this.prisma.office.findFirst({
      where: { tenantId, id: officeId },
      select: { id: true, name: true },
    });
    if (!office) {
      throw new BadRequestException('Invalid location for this tenant.');
    }
    return office;
  }

  private async assertItemExists(tenantId: string, itemId: string) {
    const item = await this.prisma.liquorInventoryItem.findFirst({
      where: { tenantId, id: itemId },
      select: { id: true },
    });
    if (!item) {
      throw new BadRequestException('Liquor inventory item not found.');
    }
  }

  private async getItemForBottleScan(tenantId: string, itemId: string) {
    const item = await this.prisma.liquorInventoryItem.findFirst({
      where: { tenantId, id: itemId },
      select: {
        id: true,
        name: true,
        brand: true,
        sizeMl: true,
      },
    });
    if (!item) {
      throw new BadRequestException('Liquor inventory item not found.');
    }
    return item;
  }

  private async assertUpcNotTaken(
    tenantId: string,
    upc: string,
    excludeId?: string,
  ) {
    const duplicate = await this.prisma.liquorInventoryItem.findFirst({
      where: {
        tenantId,
        upc,
        id: excludeId ? { not: excludeId } : undefined,
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new BadRequestException('UPC already exists in this tenant catalog.');
    }
  }

  private buildRangeWhere(from?: string, to?: string) {
    if (!from && !to) {
      return undefined;
    }
    const fromDate = from ? this.parseDateKey(from, 'from') : undefined;
    const toDateExclusive = to
      ? this.shiftDate(this.parseDateKey(to, 'to'), 1)
      : undefined;
    if (
      fromDate &&
      toDateExclusive &&
      fromDate.getTime() >= toDateExclusive.getTime()
    ) {
      throw new BadRequestException('from must be before or equal to to.');
    }
    return {
      gte: fromDate,
      lt: toDateExclusive,
    };
  }

  private normalizeTargetCostPct(value?: number) {
    if (value === undefined || Number.isNaN(value)) {
      return 0.3;
    }
    if (value < 0 || value > 1) {
      throw new BadRequestException(
        'targetCostPct must be between 0 and 1 (example: 0.30).',
      );
    }
    return Number(value.toFixed(4));
  }

  private parseMonthKey(value: string) {
    const normalized = value.trim();
    if (!monthRegex.test(normalized)) {
      throw new BadRequestException('month must use YYYY-MM format.');
    }
    return normalized;
  }

  private parseYearKey(value?: string) {
    const normalized = (value || `${new Date().getUTCFullYear()}`).trim();
    if (!yearRegex.test(normalized)) {
      throw new BadRequestException('year must use YYYY format.');
    }
    return normalized;
  }

  private shiftMonth(base: Date, months: number) {
    const next = new Date(base.getTime());
    next.setUTCMonth(next.getUTCMonth() + months);
    return next;
  }

  private shiftDate(base: Date, days: number) {
    const next = new Date(base.getTime());
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  private parseDateKey(value: string, field: string) {
    const normalized = value.trim();
    if (!dateKeyRegex.test(normalized)) {
      throw new BadRequestException(
        `${field} must use YYYY-MM-DD date format.`,
      );
    }
    return new Date(`${normalized}T00:00:00.000Z`);
  }

  private parseIsoDate(value: string, field: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${field} must be a valid ISO date.`);
    }
    return parsed;
  }

  private parseFlexibleIsoDate(value: string, field: string) {
    const normalized = value.trim();
    if (!isoDateRegex.test(normalized)) {
      throw new BadRequestException(`${field} must be a valid ISO date.`);
    }
    if (dateKeyRegex.test(normalized)) {
      return this.parseDateKey(normalized, field);
    }
    return this.parseIsoDate(normalized, field);
  }

  private resolveImageDataUrl(dto: AnalyzeBottleScanDto) {
    const inlineDataUrl = dto.imageDataUrl?.trim();
    if (inlineDataUrl) {
      if (!inlineDataUrl.startsWith('data:image/')) {
        throw new BadRequestException(
          'imageDataUrl must be a valid image data URL.',
        );
      }
      if (inlineDataUrl.length > maxImageDataUrlLength) {
        throw new BadRequestException('Image is too large for analysis.');
      }
      return inlineDataUrl;
    }

    const rawBase64 = (dto.imageBase64 || '').trim();
    if (!rawBase64) {
      throw new BadRequestException(
        'imageDataUrl or imageBase64 is required for bottle scan analysis.',
      );
    }
    const mimeType = (dto.mimeType || 'image/jpeg').trim().toLowerCase();
    if (!allowedImageMimeTypes.has(mimeType)) {
      throw new BadRequestException(
        'Unsupported image type. Use JPEG, PNG, WebP, or HEIC.',
      );
    }
    const normalizedBase64 = rawBase64.replace(/\s+/g, '');
    if (!/^[A-Za-z0-9+/=]+$/.test(normalizedBase64)) {
      throw new BadRequestException('imageBase64 is not valid base64 data.');
    }
    const dataUrl = `data:${mimeType};base64,${normalizedBase64}`;
    if (dataUrl.length > maxImageDataUrlLength) {
      throw new BadRequestException('Image is too large for analysis.');
    }
    return dataUrl;
  }

  private async estimateBottleFillPercent(
    imageDataUrl: string,
    item: { name: string; brand: string | null; sizeMl: number | null },
  ) {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new BadRequestException(
        'AI scan is not configured. Set OPENAI_API_KEY on the API server.',
      );
    }

    const model = process.env.OPENAI_VISION_MODEL?.trim() || defaultVisionModel;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'You estimate bottle liquid fill level from an image. Reply as strict JSON with keys: fillPercent (0-100 number), confidence (0-1 number), summary (string).',
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Estimate the current fill level of this bottle. Item: ${item.name}${item.brand ? ` (${item.brand})` : ''}. Bottle size ml: ${item.sizeMl ?? 'unknown'}.`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageDataUrl,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        const message =
          payload.error?.message ||
          'AI scan failed while estimating bottle fill.';
        throw new BadRequestException(message);
      }

      const payload = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      };
      const rawContent = payload.choices?.[0]?.message?.content?.trim() || '';
      if (!rawContent) {
        throw new BadRequestException('AI scan returned an empty response.');
      }

      let parsed: {
        fillPercent?: unknown;
        confidence?: unknown;
        summary?: unknown;
      };
      try {
        parsed = JSON.parse(rawContent) as {
          fillPercent?: unknown;
          confidence?: unknown;
          summary?: unknown;
        };
      } catch {
        throw new BadRequestException(
          'AI scan returned an invalid JSON response.',
        );
      }

      const rawFillPercent =
        typeof parsed.fillPercent === 'number'
          ? parsed.fillPercent
          : Number(parsed.fillPercent);
      if (!Number.isFinite(rawFillPercent)) {
        throw new BadRequestException(
          'AI scan could not determine bottle fill level.',
        );
      }
      const fillPercent = toPercent(Math.min(100, Math.max(0, rawFillPercent)));
      const rawConfidence =
        typeof parsed.confidence === 'number'
          ? parsed.confidence
          : Number(parsed.confidence);
      const confidence = Number.isFinite(rawConfidence)
        ? toPercent(Math.min(1, Math.max(0, rawConfidence)))
        : null;
      const summary =
        typeof parsed.summary === 'string' ? parsed.summary.trim() : '';

      return {
        fillPercent,
        confidence,
        summary,
        model,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Unable to analyze bottle image. Please try again with a clearer photo.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeRequiredText(
    value: string,
    label: string,
    maxLength: number,
  ) {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(`${label} is required.`);
    }
    if (normalized.length > maxLength) {
      throw new BadRequestException(
        `${label} cannot exceed ${maxLength} characters.`,
      );
    }
    return normalized;
  }

  private normalizeOptionalText(value: string | undefined, maxLength: number) {
    if (value === undefined) {
      return null;
    }
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    if (normalized.length > maxLength) {
      throw new BadRequestException(
        `Text cannot exceed ${maxLength} characters.`,
      );
    }
    return normalized;
  }

  private normalizeUpc(value: string | undefined) {
    if (value === undefined) {
      return null;
    }
    const digitsOnly = value.replace(/\D/g, '');
    if (!digitsOnly) {
      return null;
    }
    if (digitsOnly.length < 8 || digitsOnly.length > 14) {
      throw new BadRequestException('UPC must be between 8 and 14 digits.');
    }
    return digitsOnly;
  }

  private serializeItem(item: {
    id: string;
    name: string;
    brand: string | null;
    upc: string | null;
    sizeMl: number | null;
    unitLabel: string | null;
    supplierName: string | null;
    unitCost: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: item.id,
      name: item.name,
      brand: item.brand,
      upc: item.upc,
      sizeMl: item.sizeMl,
      unitLabel: item.unitLabel,
      supplierName: item.supplierName,
      unitCost: toMoney(item.unitCost),
      isActive: item.isActive,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private serializeMovement(movement: {
    id: string;
    officeId: string;
    itemId: string;
    type: LiquorInventoryMovementType;
    quantity: number;
    unitCostOverride: number | null;
    occurredAt: Date;
    notes: string | null;
    createdAt: Date;
    office: { id: string; name: string };
    item: { id: string; name: string; brand: string | null; upc: string | null };
    createdByEmployee: { id: string; fullName: string; displayName: string | null } | null;
  }) {
    return {
      id: movement.id,
      officeId: movement.officeId,
      officeName: movement.office.name,
      itemId: movement.itemId,
      itemName: movement.item.name,
      itemBrand: movement.item.brand,
      itemUpc: movement.item.upc,
      type: movement.type,
      quantity: toQuantity(movement.quantity),
      unitCostOverride:
        movement.unitCostOverride === null
          ? null
          : toMoney(movement.unitCostOverride),
      occurredAt: movement.occurredAt.toISOString(),
      notes: movement.notes || '',
      createdBy: movement.createdByEmployee
        ? movement.createdByEmployee.displayName ||
          movement.createdByEmployee.fullName
        : null,
      createdAt: movement.createdAt.toISOString(),
    };
  }

  private serializeCount(count: {
    id: string;
    officeId: string;
    itemId: string;
    countDate: Date;
    quantity: number;
    barQuantity: number | null;
    bodegaQuantity: number | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    office: { id: string; name: string };
    item: { id: string; name: string; brand: string | null; upc: string | null };
    createdByEmployee: { id: string; fullName: string; displayName: string | null } | null;
  }) {
    return {
      id: count.id,
      officeId: count.officeId,
      officeName: count.office.name,
      itemId: count.itemId,
      itemName: count.item.name,
      itemBrand: count.item.brand,
      itemUpc: count.item.upc,
      countDate: count.countDate.toISOString().slice(0, 10),
      quantity: toQuantity(count.quantity),
      barQuantity:
        count.barQuantity === null ? null : toQuantity(count.barQuantity),
      bodegaQuantity:
        count.bodegaQuantity === null ? null : toQuantity(count.bodegaQuantity),
      notes: count.notes || '',
      createdBy: count.createdByEmployee
        ? count.createdByEmployee.displayName || count.createdByEmployee.fullName
        : null,
      createdAt: count.createdAt.toISOString(),
      updatedAt: count.updatedAt.toISOString(),
    };
  }

  private serializeBottleScan(scan: {
    id: string;
    officeId: string;
    itemId: string;
    containerKey: string | null;
    measuredAt: Date;
    fillPercent: number;
    estimatedMl: number | null;
    confidence: number | null;
    source: string;
    notes: string | null;
    createdAt: Date;
    office: { id: string; name: string };
    item: { id: string; name: string; brand: string | null; sizeMl: number | null };
    createdByEmployee: { id: string; fullName: string; displayName: string | null } | null;
  }) {
    return {
      id: scan.id,
      officeId: scan.officeId,
      officeName: scan.office.name,
      itemId: scan.itemId,
      itemName: scan.item.name,
      itemBrand: scan.item.brand,
      itemSizeMl: scan.item.sizeMl,
      containerKey: scan.containerKey,
      measuredAt: scan.measuredAt.toISOString(),
      fillPercent: toPercent(scan.fillPercent),
      estimatedMl: scan.estimatedMl === null ? null : toQuantity(scan.estimatedMl),
      confidence: scan.confidence === null ? null : toPercent(scan.confidence),
      source: scan.source,
      notes: scan.notes || '',
      createdBy: scan.createdByEmployee
        ? scan.createdByEmployee.displayName || scan.createdByEmployee.fullName
        : null,
      createdAt: scan.createdAt.toISOString(),
    };
  }

  private async lookupExternalUpc(upc: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${upc}.json`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent': 'clockin-liquor-inventory/1.0',
          },
        },
      );
      if (!response.ok) {
        return null;
      }
      const data = (await response.json()) as {
        status?: number;
        product?: {
          product_name?: string;
          brands?: string;
          quantity?: string;
          image_front_url?: string;
        };
      };
      if (data.status !== 1 || !data.product) {
        return null;
      }

      const name = data.product.product_name?.trim();
      if (!name) {
        return null;
      }
      const brand = data.product.brands?.split(',')[0]?.trim() || null;
      const parsedSizeMl = this.parseSizeMl(data.product.quantity);

      return {
        name,
        brand,
        upc,
        sizeMl: parsedSizeMl,
        sourceImageUrl: data.product.image_front_url || null,
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseSizeMl(rawQuantity: string | undefined) {
    if (!rawQuantity) {
      return null;
    }
    const normalized = rawQuantity.trim().toLowerCase();
    const match = normalized.match(/(\d+(?:[.,]\d+)?)\s*(ml|l)\b/);
    if (!match) {
      return null;
    }
    const numeric = Number(match[1].replace(',', '.'));
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return null;
    }
    if (match[2] === 'l') {
      return toMoney(numeric * 1000);
    }
    return toMoney(numeric);
  }
}
