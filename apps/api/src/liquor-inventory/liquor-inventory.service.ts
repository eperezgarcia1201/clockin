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
import { ApplyLiquorInvoiceDto } from './dto/apply-liquor-invoice.dto';
import { AnalyzeLiquorInvoiceDto } from './dto/analyze-liquor-invoice.dto';
import { AssistLiquorCatalogDto } from './dto/assist-liquor-catalog.dto';
import { CreateLiquorItemDto } from './dto/create-liquor-item.dto';
import { CreateLiquorKindDto } from './dto/create-liquor-kind.dto';
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
const defaultInvoiceVisionModel = 'gpt-4o-mini';
const defaultBottleScanLimit = 80;
const normalCostShockThresholdPct = 0.08;
const elevatedCostShockThresholdPct = 0.15;
const criticalCostShockThresholdPct = 0.3;

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

type InvoiceRowCandidate = {
  company: string | null;
  liquorName: string;
  kind: string | null;
  upc: string | null;
  ml: number | null;
  unitCost: number | null;
  quantity: number | null;
  lineTotal: number | null;
  confidence: number | null;
};

type CostShockResult = {
  isShock: boolean;
  severity: 'normal' | 'elevated' | 'critical';
  baselineCost: number;
  newCost: number;
  deltaCost: number;
  deltaPct: number;
};

type InvoiceCatalogItem = {
  id: string;
  name: string;
  brand: string | null;
  upc: string | null;
  supplierName: string | null;
  sizeMl: number | null;
  unitCost: number;
};

type CatalogAssistHeuristicMatch = {
  item: InvoiceCatalogItem;
  score: number;
  reason: string;
};

type InvoiceCatalogMatch = {
  item: InvoiceCatalogItem;
  score: number;
  matchedBy:
    | 'upc'
    | 'name-kind-company'
    | 'name-kind'
    | 'name-company'
    | 'name-only';
};

@Injectable()
export class LiquorInventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  async listKinds(authUser: AuthUser) {
    const access = await this.requireLiquorAccess(authUser);
    return {
      kinds: await this.buildLiquorKindList(access.tenant.id),
    };
  }

  async upsertKind(authUser: AuthUser, dto: CreateLiquorKindDto) {
    const access = await this.requireLiquorAccess(authUser);
    const tenantId = access.tenant.id;
    const name = this.normalizeLiquorKindName(dto.name);

    const existing = await this.prisma.liquorInventoryKind.findFirst({
      where: {
        tenantId,
        name: { equals: name, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existing) {
      await this.prisma.liquorInventoryKind.update({
        where: { id: existing.id },
        data: { name, isHidden: false },
      });
    } else {
      await this.prisma.liquorInventoryKind.create({
        data: { tenantId, name, isHidden: false },
      });
    }

    return {
      kinds: await this.buildLiquorKindList(tenantId),
    };
  }

  async hideKind(authUser: AuthUser, rawName: string) {
    const access = await this.requireLiquorAccess(authUser);
    const tenantId = access.tenant.id;
    const decoded = this.safeDecodeURIComponent(rawName);
    const name = this.normalizeLiquorKindName(decoded);

    const existing = await this.prisma.liquorInventoryKind.findFirst({
      where: {
        tenantId,
        name: { equals: name, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existing) {
      await this.prisma.liquorInventoryKind.update({
        where: { id: existing.id },
        data: { isHidden: true },
      });
    } else {
      await this.prisma.liquorInventoryKind.create({
        data: { tenantId, name, isHidden: true },
      });
    }

    return {
      kinds: await this.buildLiquorKindList(tenantId),
    };
  }

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

  async assistCatalog(authUser: AuthUser, dto: AssistLiquorCatalogDto) {
    const access = await this.requireLiquorPremiumAccess(authUser);
    const tenantId = access.tenant.id;
    const query = this.normalizeRequiredText(dto.query, 'query', 280);
    const limit = Math.min(20, Math.max(3, dto.limit ?? 12));

    const catalog = await this.prisma.liquorInventoryItem.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: [{ name: 'asc' }, { brand: 'asc' }],
      take: 600,
    });

    if (!catalog.length) {
      return {
        source: 'none',
        query,
        summary: 'No liquor items are available in this catalog yet.',
        searchHint: '',
        matches: [],
      };
    }

    const rankingCatalog: InvoiceCatalogItem[] = catalog.map((item) => ({
      id: item.id,
      name: item.name,
      brand: item.brand,
      upc: item.upc,
      supplierName: item.supplierName,
      sizeMl: item.sizeMl,
      unitCost: item.unitCost,
    }));
    const catalogById = new Map(catalog.map((item) => [item.id, item]));
    const serializeAssistMatch = (
      match: CatalogAssistHeuristicMatch,
      index: number,
    ) => ({
      rank: index + 1,
      score: toPercent(match.score * 100),
      reason: match.reason,
      item: this.serializeItem(catalogById.get(match.item.id)!),
    });
    const heuristicMatches = this.rankCatalogAssistMatches(
      rankingCatalog,
      query,
      limit,
    );
    const heuristicSearchHint = this.buildCatalogAssistSearchHint(query);
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return {
        source: 'heuristic',
        query,
        summary:
          'AI assist is not configured on this server. Showing smart local matches.',
        searchHint: heuristicSearchHint,
        matches: heuristicMatches.map(serializeAssistMatch),
      };
    }

    const model =
      process.env.OPENAI_CATALOG_MODEL?.trim() ||
      process.env.OPENAI_INVOICE_MODEL?.trim() ||
      process.env.OPENAI_VISION_MODEL?.trim() ||
      defaultInvoiceVisionModel;
    const candidatePool = this.rankCatalogAssistMatches(
      rankingCatalog,
      query,
      140,
    ).map((entry) => ({
      id: entry.item.id,
      name: entry.item.name,
      brand: entry.item.brand,
      supplierName: entry.item.supplierName,
      upc: entry.item.upc,
      sizeMl: entry.item.sizeMl,
      unitCost: toMoney(entry.item.unitCost),
    }));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
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
                  'You help restaurant managers find liquor catalog items quickly. Return strict JSON with keys: summary (string), searchHint (string), matches (array of max 20). Each match must have id (string from provided candidates), score (0-1 number), reason (short string). Only use provided candidate ids.',
              },
              {
                role: 'user',
                content: `Find best liquor catalog matches for this request: "${query}". Return at most ${limit} items.

Candidates JSON:
${JSON.stringify(candidatePool)}`,
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new BadRequestException(
          payload.error?.message ||
            'AI catalog assistant failed while ranking catalog items.',
        );
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const rawContent = payload.choices?.[0]?.message?.content?.trim() || '';
      if (!rawContent) {
        throw new BadRequestException(
          'AI catalog assistant returned an empty response.',
        );
      }

      const parsed = JSON.parse(rawContent) as {
        summary?: unknown;
        searchHint?: unknown;
        matches?: unknown;
      };
      const aiMatchesRaw = Array.isArray(parsed.matches) ? parsed.matches : [];
      const aiMatches: Array<{
        item: (typeof catalog)[number];
        score: number;
        reason: string;
      }> = [];
      for (const entry of aiMatchesRaw) {
        if (aiMatches.length >= limit) {
          break;
        }
        const row = (entry || {}) as Record<string, unknown>;
        const id = typeof row.id === 'string' ? row.id.trim() : '';
        const item = id ? catalogById.get(id) : undefined;
        if (!item) {
          continue;
        }
        const rawScore =
          typeof row.score === 'number' ? row.score : Number(row.score);
        const score = Number.isFinite(rawScore)
          ? Math.min(1, Math.max(0, rawScore))
          : 0.5;
        const reason =
          typeof row.reason === 'string' && row.reason.trim().length > 0
            ? row.reason.trim().slice(0, 180)
            : 'Strong catalog match for your request.';
        aiMatches.push({
          item,
          score,
          reason,
        });
      }

      if (!aiMatches.length) {
        return {
          source: 'heuristic',
          query,
          summary:
            'AI found no strong matches. Showing smart local matches instead.',
          searchHint: heuristicSearchHint,
          matches: heuristicMatches.map(serializeAssistMatch),
        };
      }

      return {
        source: 'ai',
        model,
        query,
        summary:
          typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
            ? parsed.summary.trim().slice(0, 240)
            : 'AI matched the best catalog options for your request.',
        searchHint:
          typeof parsed.searchHint === 'string' &&
          parsed.searchHint.trim().length > 0
            ? parsed.searchHint.trim().slice(0, 140)
            : heuristicSearchHint,
        matches: aiMatches.map((match, index) => ({
          rank: index + 1,
          score: toPercent(match.score * 100),
          reason: match.reason,
          item: this.serializeItem(match.item),
        })),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        return {
          source: 'heuristic',
          query,
          summary: `${error.message} Showing smart local matches instead.`,
          searchHint: heuristicSearchHint,
          matches: heuristicMatches.map(serializeAssistMatch),
        };
      }
      return {
        source: 'heuristic',
        query,
        summary:
          'AI catalog assistant is temporarily unavailable. Showing smart local matches.',
        searchHint: heuristicSearchHint,
        matches: heuristicMatches.map(serializeAssistMatch),
      };
    } finally {
      clearTimeout(timeout);
    }
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
        item: {
          select: {
            id: true,
            name: true,
            brand: true,
            upc: true,
            sizeMl: true,
          },
        },
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
        item: {
          select: {
            id: true,
            name: true,
            brand: true,
            upc: true,
            sizeMl: true,
          },
        },
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
        item: {
          select: {
            id: true,
            name: true,
            brand: true,
            upc: true,
            sizeMl: true,
          },
        },
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
    const item = await this.assertItemExists(tenantId, itemId);

    const barQuantity =
      dto.barQuantity !== undefined ? toQuantity(dto.barQuantity) : null;
    const bodegaBottleCount =
      dto.bodegaBottleCount !== undefined
        ? toQuantity(dto.bodegaBottleCount)
        : null;
    let bodegaQuantity =
      dto.bodegaQuantity !== undefined ? toQuantity(dto.bodegaQuantity) : null;
    if (bodegaBottleCount !== null) {
      if (!item.sizeMl || item.sizeMl <= 0) {
        throw new BadRequestException(
          'Item size ml is required to convert bodega bottle count.',
        );
      }
      bodegaQuantity = toQuantity(bodegaBottleCount * item.sizeMl);
    }
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
            item: {
              select: {
                id: true,
                name: true,
                brand: true,
                upc: true,
                sizeMl: true,
              },
            },
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
            item: {
              select: {
                id: true,
                name: true,
                brand: true,
                upc: true,
                sizeMl: true,
              },
            },
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
    const access = await this.requireLiquorPremiumAccess(authUser);
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

    const limit = Math.min(
      200,
      Math.max(1, options.limit || defaultBottleScanLimit),
    );
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
    const access = await this.requireLiquorPremiumAccess(authUser);
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
        spentMlClamped:
          spentMl === null ? null : toQuantity(Math.max(0, spentMl)),
        daysBetween,
      },
    };
  }

  async analyzeInvoice(authUser: AuthUser, dto: AnalyzeLiquorInvoiceDto) {
    const access = await this.requireLiquorPremiumAccess(authUser);
    const tenantId = access.tenant.id;
    const officeId = dto.officeId?.trim() || undefined;
    if (officeId) {
      await this.assertOfficeExists(tenantId, officeId);
    }

    const imageDataUrl = this.resolveImageDataUrl(dto, 'invoice analysis');
    const analysis = await this.extractInvoiceRowsFromImage(imageDataUrl);
    const catalog = await this.prisma.liquorInventoryItem.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        brand: true,
        upc: true,
        supplierName: true,
        sizeMl: true,
        unitCost: true,
      },
      orderBy: [{ name: 'asc' }, { brand: 'asc' }],
    });

    const rows = analysis.rows.map((candidate, index) => {
      const normalized = this.normalizeInvoiceRowCandidate(candidate);
      const match = this.findCatalogMatchForInvoiceRow(catalog, normalized);
      const baselineCost = match ? toMoney(match.item.unitCost) : null;
      const costShock =
        baselineCost !== null && normalized.unitCost !== null
          ? this.calculateCostShock(baselineCost, normalized.unitCost)
          : null;
      const confidence =
        normalized.confidence === null
          ? match
            ? toPercent(Math.max(0.5, match.score))
            : null
          : toPercent(normalized.confidence);
      return {
        rowNumber: index + 1,
        company: normalized.company,
        liquorName: normalized.liquorName,
        kind: normalized.kind,
        upc: normalized.upc,
        ml: normalized.ml,
        unitCost: normalized.unitCost,
        quantity: normalized.quantity,
        lineTotal: normalized.lineTotal,
        confidence,
        matchedItem: match
          ? {
              id: match.item.id,
              name: match.item.name,
              brand: match.item.brand,
              upc: match.item.upc,
              supplierName: match.item.supplierName,
              sizeMl: match.item.sizeMl,
              unitCost: toMoney(match.item.unitCost),
            }
          : null,
        matchScore: match ? toPercent(match.score * 100) : null,
        matchedBy: match?.matchedBy || null,
        suggestedAction: match ? 'update' : 'create',
        costShock,
      };
    });

    const matchedCount = rows.filter((row) => row.matchedItem !== null).length;
    const shockCount = rows.filter((row) => row.costShock?.isShock).length;
    const lowConfidenceCount = rows.filter(
      (row) => row.confidence !== null && row.confidence < 0.6,
    ).length;
    const unresolvedRows = rows.filter((row) => !row.liquorName.trim()).length;

    const resolvedInvoiceDate = this.parseInvoiceDateMaybe(
      dto.invoiceDate || analysis.invoiceDate,
    );

    return {
      officeId: officeId || null,
      invoice: {
        supplierName:
          this.normalizeOptionalText(dto.supplierName, 140) ||
          analysis.supplierName,
        invoiceNumber:
          this.normalizeOptionalText(dto.invoiceNumber, 80) ||
          analysis.invoiceNumber,
        invoiceDate: resolvedInvoiceDate
          ? resolvedInvoiceDate.toISOString().slice(0, 10)
          : null,
        notes:
          this.normalizeOptionalText(dto.notes, 2000) ||
          analysis.summary ||
          null,
      },
      analysis: {
        model: analysis.model,
        summary: analysis.summary,
        totalExtractedRows: rows.length,
        matchedCount,
        newItemCandidates: rows.length - matchedCount,
        costShockCount: shockCount,
        lowConfidenceCount,
        unresolvedRows,
      },
      rows,
    };
  }

  async applyInvoiceRows(authUser: AuthUser, dto: ApplyLiquorInvoiceDto) {
    const access = await this.requireLiquorPremiumAccess(authUser);
    const tenantId = access.tenant.id;
    const officeId = dto.officeId?.trim() || undefined;
    const createPurchaseMovements = Boolean(dto.createPurchaseMovements);

    if (createPurchaseMovements && !officeId) {
      throw new BadRequestException(
        'officeId is required when createPurchaseMovements is enabled.',
      );
    }
    if (officeId) {
      await this.assertOfficeExists(tenantId, officeId);
    }

    const invoiceDate =
      this.parseInvoiceDateMaybe(dto.invoiceDate) || new Date();
    const supplierName = this.normalizeOptionalText(dto.supplierName, 140);
    const invoiceNumber = this.normalizeOptionalText(dto.invoiceNumber, 80);
    const invoiceNotes = this.normalizeOptionalText(dto.notes, 2000);

    const catalog = await this.prisma.liquorInventoryItem.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        brand: true,
        upc: true,
        supplierName: true,
        sizeMl: true,
        unitCost: true,
      },
      orderBy: [{ name: 'asc' }, { brand: 'asc' }],
    });
    const catalogById = new Map(catalog.map((item) => [item.id, item]));

    let createdItems = 0;
    let updatedItems = 0;
    let purchaseMovementsCreated = 0;
    let skippedRows = 0;

    const rowResults: Array<{
      rowNumber: number;
      action: 'created' | 'updated' | 'skipped';
      itemId: string | null;
      itemName: string | null;
      quantity: number | null;
      movementCreated: boolean;
      costShock: CostShockResult | null;
      reason?: string;
    }> = [];

    for (let index = 0; index < dto.rows.length; index += 1) {
      const row = dto.rows[index];
      if (row.apply === false) {
        skippedRows += 1;
        rowResults.push({
          rowNumber: index + 1,
          action: 'skipped',
          itemId: null,
          itemName: null,
          quantity: null,
          movementCreated: false,
          costShock: null,
          reason: 'Marked as skip.',
        });
        continue;
      }

      const normalized = this.normalizeInvoiceRowCandidate({
        company: row.company,
        liquorName: row.liquorName,
        kind: row.kind,
        upc: row.upc,
        ml: row.ml,
        unitCost: row.unitCost,
        quantity: row.quantity,
      });
      if (!normalized.liquorName) {
        skippedRows += 1;
        rowResults.push({
          rowNumber: index + 1,
          action: 'skipped',
          itemId: null,
          itemName: null,
          quantity: normalized.quantity,
          movementCreated: false,
          costShock: null,
          reason: 'Missing liquor name.',
        });
        continue;
      }

      const explicitItemId = this.normalizeOptionalText(row.existingItemId, 60);
      let match: InvoiceCatalogMatch | null = null;
      if (explicitItemId && catalogById.has(explicitItemId)) {
        match = {
          item: catalogById.get(explicitItemId)!,
          score: 1,
          matchedBy: 'upc',
        };
      } else {
        match = this.findCatalogMatchForInvoiceRow(catalog, normalized);
      }

      const effectiveSupplier = normalized.company || supplierName || null;
      const baselineCost = match ? toMoney(match.item.unitCost) : null;
      const costShock =
        baselineCost !== null && normalized.unitCost !== null
          ? this.calculateCostShock(baselineCost, normalized.unitCost)
          : null;

      let itemRecord: InvoiceCatalogItem;
      let action: 'created' | 'updated' = 'created';

      if (match) {
        action = 'updated';
        const nextUpc = normalized.upc;
        if (nextUpc && nextUpc !== match.item.upc) {
          await this.assertUpcNotTaken(tenantId, nextUpc, match.item.id);
        }
        const updated = await this.prisma.liquorInventoryItem.update({
          where: { id: match.item.id },
          data: {
            name: normalized.liquorName,
            brand: normalized.kind ?? match.item.brand,
            upc: nextUpc ?? match.item.upc,
            sizeMl: normalized.ml ?? match.item.sizeMl,
            supplierName: effectiveSupplier ?? match.item.supplierName,
            unitCost:
              normalized.unitCost === null
                ? toMoney(match.item.unitCost)
                : normalized.unitCost,
          },
          select: {
            id: true,
            name: true,
            brand: true,
            upc: true,
            supplierName: true,
            sizeMl: true,
            unitCost: true,
          },
        });
        updatedItems += 1;
        itemRecord = updated;
      } else {
        if (normalized.upc) {
          await this.assertUpcNotTaken(tenantId, normalized.upc);
        }
        const created = await this.prisma.liquorInventoryItem.create({
          data: {
            tenantId,
            name: normalized.liquorName,
            brand: normalized.kind,
            upc: normalized.upc,
            sizeMl: normalized.ml,
            unitLabel: 'ml',
            supplierName: effectiveSupplier,
            unitCost: normalized.unitCost ?? 0,
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            brand: true,
            upc: true,
            supplierName: true,
            sizeMl: true,
            unitCost: true,
          },
        });
        createdItems += 1;
        itemRecord = created;
        catalog.push(created);
      }

      catalogById.set(itemRecord.id, itemRecord);

      let movementCreated = false;
      if (
        createPurchaseMovements &&
        officeId &&
        normalized.quantity !== null &&
        normalized.quantity > 0
      ) {
        const movementNotesParts = [
          'Imported from invoice OCR',
          invoiceNumber ? `Invoice ${invoiceNumber}` : null,
          supplierName ? `Supplier ${supplierName}` : null,
          invoiceNotes,
          costShock?.isShock
            ? `Cost shock ${toPercent(costShock.deltaPct * 100)}%`
            : null,
        ].filter((part): part is string => Boolean(part && part.trim()));
        await this.prisma.liquorInventoryMovement.create({
          data: {
            tenantId,
            officeId,
            itemId: itemRecord.id,
            type: LiquorInventoryMovementType.PURCHASE,
            quantity: toQuantity(normalized.quantity),
            unitCostOverride: normalized.unitCost,
            occurredAt: invoiceDate,
            notes: movementNotesParts.join(' | ').slice(0, 2000),
            createdByEmployeeId: access.employeeId || null,
          },
        });
        movementCreated = true;
        purchaseMovementsCreated += 1;
      }

      rowResults.push({
        rowNumber: index + 1,
        action,
        itemId: itemRecord.id,
        itemName: itemRecord.name,
        quantity: normalized.quantity,
        movementCreated,
        costShock,
      });
    }

    const shockCount = rowResults.filter(
      (row) => row.costShock?.isShock,
    ).length;

    return {
      summary: {
        processedRows: rowResults.length - skippedRows,
        skippedRows,
        createdItems,
        updatedItems,
        purchaseMovementsCreated,
        costShockCount: shockCount,
      },
      rows: rowResults,
    };
  }

  async monthlyReport(
    authUser: AuthUser,
    options: { month?: string; officeId?: string; targetCostPct?: number },
  ) {
    const access = await this.requireLiquorAccess(authUser);
    const premiumFeaturesEnabled = access.settings.premiumFeaturesEnabled;
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
          row.adjustmentOutUnits = toQuantity(
            row.adjustmentOutUnits + quantity,
          );
          break;
        case LiquorInventoryMovementType.TRANSFER_IN:
          row.transferInUnits = toQuantity(row.transferInUnits + quantity);
          break;
        case LiquorInventoryMovementType.TRANSFER_OUT:
          row.transferOutUnits = toQuantity(row.transferOutUnits + quantity);
          break;
      }

      movementTotals.set(movement.itemId, row);
      if (
        movement.unitCostOverride !== null &&
        movement.unitCostOverride >= 0
      ) {
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
            ? openingCountByItem
                .get(itemId)
                ?.countDate.toISOString()
                .slice(0, 10)
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
    const topVarianceItems = rows
      .filter((row) => row.varianceUnits !== null)
      .map((row) => ({
        itemId: row.itemId,
        name: row.name,
        supplierName: row.supplierName,
        varianceUnits: row.varianceUnits as number,
        varianceAbsUnits: toQuantity(Math.abs(row.varianceUnits as number)),
        actualUsageUnits: row.actualUsageUnits,
        issuedUnits: row.issuedUnits,
        usageCost: row.actualUsageCost,
      }))
      .sort((a, b) => b.varianceAbsUnits - a.varianceAbsUnits)
      .slice(0, 10);

    const topUsageCostItems = rows
      .filter((row) => row.actualUsageCost !== null)
      .map((row) => ({
        itemId: row.itemId,
        name: row.name,
        supplierName: row.supplierName,
        actualUsageUnits: row.actualUsageUnits,
        actualUsageCost: row.actualUsageCost as number,
      }))
      .sort((a, b) => b.actualUsageCost - a.actualUsageCost)
      .slice(0, 10);

    const supplierRollup = new Map<
      string,
      {
        supplierName: string;
        itemCount: number;
        usageCost: number;
        varianceUnits: number;
      }
    >();
    for (const row of rows) {
      const supplierName = row.supplierName || 'Unspecified supplier';
      const aggregate = supplierRollup.get(supplierName) || {
        supplierName,
        itemCount: 0,
        usageCost: 0,
        varianceUnits: 0,
      };
      aggregate.itemCount += 1;
      if (row.actualUsageCost !== null) {
        aggregate.usageCost += row.actualUsageCost;
      }
      if (row.varianceUnits !== null) {
        aggregate.varianceUnits += row.varianceUnits;
      }
      supplierRollup.set(supplierName, aggregate);
    }
    const supplierVariance = Array.from(supplierRollup.values())
      .map((supplier) => ({
        supplierName: supplier.supplierName,
        itemCount: supplier.itemCount,
        usageCost: toMoney(supplier.usageCost),
        varianceUnits: toQuantity(supplier.varianceUnits),
        varianceAbsUnits: toQuantity(Math.abs(supplier.varianceUnits)),
      }))
      .sort((a, b) => b.varianceAbsUnits - a.varianceAbsUnits)
      .slice(0, 10);

    const topRiskItems = rows
      .map((row) => {
        const totalsForItem = movementTotals.get(row.itemId) || {
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
        const varianceMagnitude = Math.abs(row.varianceUnits || 0);
        const usageBase = Math.max(
          1,
          row.actualUsageUnits || row.issuedUnits || 0,
        );
        const varianceRatio = varianceMagnitude / usageBase;
        const wasteRatio =
          totalsForItem.issuedUnits > 0
            ? totalsForItem.wasteUnits / totalsForItem.issuedUnits
            : 0;
        const adjustmentTotal =
          totalsForItem.adjustmentInUnits + totalsForItem.adjustmentOutUnits;
        const adjustmentBase = Math.max(
          1,
          totalsForItem.receivedUnits + totalsForItem.issuedUnits,
        );
        const adjustmentRatio = adjustmentTotal / adjustmentBase;
        const riskScore = toPercent(
          Math.min(
            100,
            varianceRatio * 45 + wasteRatio * 30 + adjustmentRatio * 25,
          ),
        );

        const reasons: string[] = [];
        if (varianceMagnitude > 0) {
          reasons.push(
            `Variance ${toQuantity(row.varianceUnits || 0)} units vs theoretical close.`,
          );
        }
        if (totalsForItem.wasteUnits > 0) {
          reasons.push(
            `Waste movement ${toQuantity(totalsForItem.wasteUnits)} units this month.`,
          );
        }
        if (adjustmentTotal > 0) {
          reasons.push(
            `Adjustments ${toQuantity(adjustmentTotal)} units this month.`,
          );
        }

        return {
          itemId: row.itemId,
          name: row.name,
          supplierName: row.supplierName,
          riskScore,
          varianceUnits: row.varianceUnits,
          wasteUnits: toQuantity(totalsForItem.wasteUnits),
          adjustmentUnits: toQuantity(adjustmentTotal),
          reasons,
        };
      })
      .filter((row) => row.riskScore > 0)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    const costShockItems = rows
      .map((row) => {
        const baselineCost = toMoney(itemMap.get(row.itemId)?.unitCost || 0);
        const movementCostSamples = movementCostByItem.get(row.itemId) || [];
        if (!movementCostSamples.length || baselineCost <= 0) {
          return null;
        }
        const averageOverrideCost = toMoney(
          movementCostSamples.reduce((sum, value) => sum + value, 0) /
            movementCostSamples.length,
        );
        const costShock = this.calculateCostShock(
          baselineCost,
          averageOverrideCost,
        );
        return {
          itemId: row.itemId,
          name: row.name,
          supplierName: row.supplierName,
          sampleCount: movementCostSamples.length,
          baselineCost: costShock.baselineCost,
          averageOverrideCost: costShock.newCost,
          deltaCost: costShock.deltaCost,
          deltaPct: toPercent(costShock.deltaPct * 100),
          severity: costShock.severity,
          isShock: costShock.isShock,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => b.deltaPct - a.deltaPct)
      .slice(0, 10);

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
        inventoryValueDelta: toMoney(
          closingInventoryValue - openingInventoryValue,
        ),
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
      intelligence: premiumFeaturesEnabled
        ? {
            generatedAt: new Date().toISOString(),
            topVarianceItems,
            topUsageCostItems,
            supplierVariance,
            topRiskItems,
            costShockItems,
          }
        : undefined,
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

    const office =
      snapshots.find((snapshot) => snapshot.office)?.office || null;

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

  private async requireLiquorPremiumAccess(authUser: AuthUser) {
    const access = await this.requireLiquorAccess(authUser);
    if (!access.settings.premiumFeaturesEnabled) {
      throw new ForbiddenException(
        'Premium liquor features are disabled for this tenant.',
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
      select: { id: true, sizeMl: true },
    });
    if (!item) {
      throw new BadRequestException('Liquor inventory item not found.');
    }
    return item;
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
      throw new BadRequestException(
        'UPC already exists in this tenant catalog.',
      );
    }
  }

  private async buildLiquorKindList(tenantId: string) {
    const [kindRows, catalogRows] = await Promise.all([
      this.prisma.liquorInventoryKind.findMany({
        where: { tenantId },
        select: { name: true, isHidden: true },
      }),
      this.prisma.liquorInventoryItem.findMany({
        where: { tenantId, brand: { not: null } },
        select: { brand: true },
        distinct: ['brand'],
      }),
    ]);

    const hiddenKeys = new Set(
      kindRows
        .filter((row) => row.isHidden)
        .map((row) => this.normalizeLiquorKindKey(row.name)),
    );
    const merged = new Map<string, string>();

    for (const row of kindRows.filter((entry) => !entry.isHidden)) {
      const normalized = this.normalizeLiquorKindName(row.name);
      const key = this.normalizeLiquorKindKey(normalized);
      if (!key || hiddenKeys.has(key) || merged.has(key)) {
        continue;
      }
      merged.set(key, normalized);
    }

    for (const row of catalogRows) {
      const rawBrand = typeof row.brand === 'string' ? row.brand : '';
      if (!rawBrand.trim()) {
        continue;
      }
      const normalized = this.normalizeLiquorKindName(rawBrand);
      const key = this.normalizeLiquorKindKey(normalized);
      if (!key || hiddenKeys.has(key) || merged.has(key)) {
        continue;
      }
      merged.set(key, normalized);
    }

    return Array.from(merged.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );
  }

  private normalizeLiquorKindName(value: string) {
    return this.normalizeRequiredText(value, 'name', 80).replace(/\s+/g, ' ');
  }

  private normalizeLiquorKindKey(value: string) {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private safeDecodeURIComponent(value: string) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
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

  private resolveImageDataUrl(
    dto: { imageDataUrl?: string; imageBase64?: string; mimeType?: string },
    contextLabel = 'image analysis',
  ) {
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
        `imageDataUrl or imageBase64 is required for ${contextLabel}.`,
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
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
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
        },
      );

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

  private parseInvoiceDateMaybe(value?: string | null) {
    if (!value) {
      return null;
    }
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    if (isoDateRegex.test(normalized) || dateKeyRegex.test(normalized)) {
      try {
        return this.parseFlexibleIsoDate(normalized, 'invoiceDate');
      } catch {
        return null;
      }
    }

    const slashDateMatch = normalized.match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/,
    );
    if (slashDateMatch) {
      const month = Number(slashDateMatch[1]);
      const day = Number(slashDateMatch[2]);
      const yearRaw = Number(slashDateMatch[3]);
      const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
      if (
        Number.isFinite(month) &&
        Number.isFinite(day) &&
        Number.isFinite(year) &&
        month >= 1 &&
        month <= 12 &&
        day >= 1 &&
        day <= 31
      ) {
        return new Date(
          `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(
            day,
          ).padStart(2, '0')}T00:00:00.000Z`,
        );
      }
    }

    return null;
  }

  private async extractInvoiceRowsFromImage(imageDataUrl: string) {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new BadRequestException(
        'Invoice OCR is not configured. Set OPENAI_API_KEY on the API server.',
      );
    }
    const model =
      process.env.OPENAI_INVOICE_MODEL?.trim() ||
      process.env.OPENAI_VISION_MODEL?.trim() ||
      defaultInvoiceVisionModel;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
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
                  'Extract liquor invoice tables from images. Respond with strict JSON. Keys: supplierName (string|null), invoiceNumber (string|null), invoiceDate (string|null), summary (string), rows (array). Row keys: company, liquorName, kind, upc, ml, unitCost, quantity, lineTotal, confidence (0-1). Keep rows only for liquor products.',
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Read this liquor invoice image and extract a normalized item table with costs. If a field is unknown, return null.',
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
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new BadRequestException(
          payload.error?.message ||
            'Invoice OCR failed while reading the uploaded image.',
        );
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const rawContent = payload.choices?.[0]?.message?.content?.trim() || '';
      if (!rawContent) {
        throw new BadRequestException(
          'Invoice OCR returned an empty response.',
        );
      }

      const parsed = JSON.parse(rawContent) as {
        supplierName?: unknown;
        invoiceNumber?: unknown;
        invoiceDate?: unknown;
        summary?: unknown;
        rows?: unknown;
      };
      const rows = this.parseInvoiceCandidateRows(parsed.rows);

      return {
        model,
        supplierName:
          typeof parsed.supplierName === 'string'
            ? parsed.supplierName.trim() || null
            : null,
        invoiceNumber:
          typeof parsed.invoiceNumber === 'string'
            ? parsed.invoiceNumber.trim() || null
            : null,
        invoiceDate:
          typeof parsed.invoiceDate === 'string'
            ? parsed.invoiceDate.trim() || null
            : null,
        summary:
          typeof parsed.summary === 'string'
            ? parsed.summary.trim()
            : 'Invoice OCR extraction complete.',
        rows,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Unable to analyze invoice image. Please try again with a clearer photo.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseInvoiceCandidateRows(value: unknown): InvoiceRowCandidate[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .slice(0, 250)
      .map((entry) => this.normalizeInvoiceRowCandidate(entry))
      .filter((row) => row.liquorName.length > 0);
  }

  private normalizeInvoiceRowCandidate(value: unknown): InvoiceRowCandidate {
    const row = (value || {}) as Record<string, unknown>;
    const liquorName = this.looseText(
      typeof row.liquorName === 'string'
        ? row.liquorName
        : typeof row.name === 'string'
          ? row.name
          : '',
      140,
    );
    const upc = this.normalizeInvoiceUpcMaybe(
      typeof row.upc === 'string'
        ? row.upc
        : typeof row.code === 'string'
          ? row.code
          : undefined,
    );

    return {
      company: this.looseText(
        typeof row.company === 'string'
          ? row.company
          : typeof row.supplierName === 'string'
            ? row.supplierName
            : '',
        140,
      ),
      liquorName: liquorName || '',
      kind: this.looseText(
        typeof row.kind === 'string'
          ? row.kind
          : typeof row.brand === 'string'
            ? row.brand
            : '',
        140,
      ),
      upc,
      ml: this.normalizePositiveNumberMaybe(row.ml, 2),
      unitCost: this.normalizeNonNegativeNumberMaybe(
        row.unitCost !== undefined ? row.unitCost : row.price,
        2,
      ),
      quantity: this.normalizeNonNegativeNumberMaybe(row.quantity, 3),
      lineTotal: this.normalizeNonNegativeNumberMaybe(
        row.lineTotal !== undefined ? row.lineTotal : row.total,
        2,
      ),
      confidence: this.normalizeConfidenceMaybe(row.confidence),
    };
  }

  private looseText(value: string, maxLength: number) {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    return normalized.slice(0, maxLength);
  }

  private normalizeInvoiceUpcMaybe(value: string | undefined) {
    if (value === undefined) {
      return null;
    }
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length < 8 || digitsOnly.length > 14) {
      return null;
    }
    return digitsOnly;
  }

  private normalizePositiveNumberMaybe(value: unknown, decimalPlaces: number) {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return null;
    }
    return Number(numeric.toFixed(decimalPlaces));
  }

  private normalizeNonNegativeNumberMaybe(
    value: unknown,
    decimalPlaces: number,
  ) {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
      return null;
    }
    return Number(numeric.toFixed(decimalPlaces));
  }

  private normalizeConfidenceMaybe(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return null;
    }
    return Number(Math.min(1, Math.max(0, numeric)).toFixed(4));
  }

  private normalizeMatchToken(value: string | null | undefined) {
    return (value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private findCatalogMatchForInvoiceRow(
    catalog: InvoiceCatalogItem[],
    row: {
      liquorName: string;
      kind: string | null;
      company: string | null;
      upc: string | null;
    },
  ): InvoiceCatalogMatch | null {
    if (row.upc) {
      const exactUpc = catalog.find((item) => item.upc && item.upc === row.upc);
      if (exactUpc) {
        return { item: exactUpc, score: 0.99, matchedBy: 'upc' };
      }
    }

    const rowName = this.normalizeMatchToken(row.liquorName);
    if (!rowName) {
      return null;
    }
    const rowKind = this.normalizeMatchToken(row.kind);
    const rowCompany = this.normalizeMatchToken(row.company);

    const scored: InvoiceCatalogMatch[] = [];
    for (const item of catalog) {
      const itemName = this.normalizeMatchToken(item.name);
      const itemKind = this.normalizeMatchToken(item.brand);
      const itemCompany = this.normalizeMatchToken(item.supplierName);

      let score = 0;
      let matchedBy: InvoiceCatalogMatch['matchedBy'] = 'name-only';
      if (itemName === rowName) {
        score += 0.72;
      } else if (itemName.includes(rowName) || rowName.includes(itemName)) {
        score += 0.58;
      } else {
        continue;
      }

      if (rowKind && itemKind) {
        if (rowKind === itemKind) {
          score += 0.18;
          matchedBy = 'name-kind';
        } else if (rowKind.includes(itemKind) || itemKind.includes(rowKind)) {
          score += 0.1;
          matchedBy = 'name-kind';
        }
      }
      if (rowCompany && itemCompany) {
        if (rowCompany === itemCompany) {
          score += 0.1;
          matchedBy =
            matchedBy === 'name-kind' ? 'name-kind-company' : 'name-company';
        } else if (
          rowCompany.includes(itemCompany) ||
          itemCompany.includes(rowCompany)
        ) {
          score += 0.06;
          matchedBy =
            matchedBy === 'name-kind' ? 'name-kind-company' : 'name-company';
        }
      }

      scored.push({ item, score: Number(score.toFixed(4)), matchedBy });
    }
    scored.sort((a, b) => b.score - a.score);

    if (!scored.length || scored[0].score < 0.58) {
      return null;
    }
    return scored[0];
  }

  private rankCatalogAssistMatches(
    catalog: InvoiceCatalogItem[],
    query: string,
    limit: number,
  ) {
    const normalizedQuery = this.normalizeMatchToken(query);
    const tokens = normalizedQuery
      .split(' ')
      .map((value) => value.trim())
      .filter((value) => value.length >= 2)
      .slice(0, 12);
    const constraints = this.parseCatalogAssistConstraints(query);

    const scored: CatalogAssistHeuristicMatch[] = [];
    for (const item of catalog) {
      const itemName = this.normalizeMatchToken(item.name) || '';
      const itemKind = this.normalizeMatchToken(item.brand) || '';
      const itemCompany = this.normalizeMatchToken(item.supplierName) || '';
      const itemUpc = (item.upc || '').trim();
      let score = 0;
      const reasons: string[] = [];

      if (normalizedQuery) {
        if (itemName.startsWith(normalizedQuery)) {
          score += 8;
          reasons.push('name starts with query');
        } else if (itemName.includes(normalizedQuery)) {
          score += 6;
          reasons.push('name matches query');
        } else if (itemCompany.includes(normalizedQuery)) {
          score += 5;
          reasons.push('company matches query');
        } else if (itemKind.includes(normalizedQuery)) {
          score += 4;
          reasons.push('kind matches query');
        }
      }

      for (const token of tokens) {
        if (itemName.includes(token)) {
          score += 3;
        }
        if (itemKind.includes(token)) {
          score += 2;
        }
        if (itemCompany.includes(token)) {
          score += 2;
        }
        if (itemUpc.startsWith(token)) {
          score += 4;
          reasons.push('UPC prefix match');
        } else if (itemUpc.includes(token)) {
          score += 2;
        }
      }

      if (constraints.ml !== null && item.sizeMl !== null) {
        const mlDelta = Math.abs(item.sizeMl - constraints.ml);
        if (mlDelta <= 1) {
          score += 5;
          reasons.push(`size ${constraints.ml}ml exact`);
        } else if (mlDelta <= 25) {
          score += 3;
          reasons.push(`size near ${constraints.ml}ml`);
        }
      }

      if (constraints.maxCost !== null) {
        if (item.unitCost <= constraints.maxCost) {
          score += 3;
          reasons.push(`within $${constraints.maxCost.toFixed(2)} budget`);
        } else {
          score -= 1.5;
        }
      }

      if (
        constraints.companyToken &&
        itemCompany.includes(constraints.companyToken)
      ) {
        score += 4;
        reasons.push('company requested');
      }
      if (constraints.kindToken && itemKind.includes(constraints.kindToken)) {
        score += 4;
        reasons.push('kind requested');
      }

      if (score <= 0) {
        continue;
      }
      scored.push({
        item,
        score,
        reason: reasons[0] || 'Strong catalog match for your request.',
      });
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.item.name.localeCompare(b.item.name);
    });

    if (!scored.length) {
      return catalog.slice(0, Math.max(1, limit)).map((item, index) => ({
        item,
        score: Math.max(0.1, 0.4 - index * 0.02),
        reason: 'Closest alphabetical catalog fallback.',
      }));
    }

    const maxScore = Math.max(1, scored[0].score);
    return scored.slice(0, Math.max(1, limit)).map((entry) => ({
      item: entry.item,
      score: Number((entry.score / maxScore).toFixed(4)),
      reason: entry.reason,
    }));
  }

  private parseCatalogAssistConstraints(query: string) {
    const normalized = query.trim().toLowerCase();
    const mlMatch = normalized.match(/(\d{2,4}(?:\.\d+)?)\s*ml\b/);
    const litersMatch = normalized.match(/(\d+(?:\.\d+)?)\s*l\b/);
    const maxCostMatch = normalized.match(
      /(?:under|below|less than|up to|hasta|menos de|<=|<)\s*\$?\s*(\d+(?:\.\d+)?)/,
    );

    const companyHints = [
      'lipman',
      'athens',
      'empire',
      'best brands',
      'merrill',
      'sysco',
      'reinhart',
      'jolivette',
      'nstar',
    ];
    const kindHints = [
      'tequila',
      'vodka',
      'mezcal',
      'whiskey',
      'rum',
      'gin',
      'brandy',
      'cognac',
      'liqueur',
      'licor',
    ];
    const companyToken =
      companyHints.find((hint) => normalized.includes(hint)) || null;
    const kindToken =
      kindHints.find((hint) => normalized.includes(hint)) || null;
    const ml = mlMatch
      ? Number(mlMatch[1])
      : litersMatch
        ? Number(litersMatch[1]) * 1000
        : null;
    const maxCost = maxCostMatch ? Number(maxCostMatch[1]) : null;

    return {
      ml:
        typeof ml === 'number' && Number.isFinite(ml) && ml > 0
          ? Number(ml.toFixed(2))
          : null,
      maxCost:
        typeof maxCost === 'number' && Number.isFinite(maxCost) && maxCost >= 0
          ? Number(maxCost.toFixed(2))
          : null,
      companyToken,
      kindToken,
    };
  }

  private buildCatalogAssistSearchHint(query: string) {
    const normalized = query.trim();
    if (!normalized) {
      return '';
    }
    const constraints = this.parseCatalogAssistConstraints(query);
    const parts: string[] = [];
    if (constraints.companyToken) {
      parts.push(constraints.companyToken);
    }
    if (constraints.kindToken) {
      parts.push(constraints.kindToken);
    }
    if (constraints.ml !== null) {
      parts.push(String(Math.round(constraints.ml)));
    }
    if (!parts.length) {
      return normalized
        .replace(/[^\w\s$.-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120);
    }
    return parts.join(' ').slice(0, 120);
  }

  private calculateCostShock(
    baselineCostRaw: number,
    newCostRaw: number,
  ): CostShockResult {
    const baselineCost = toMoney(Math.max(0, baselineCostRaw));
    const newCost = toMoney(Math.max(0, newCostRaw));
    const deltaCost = toMoney(newCost - baselineCost);
    const deltaPct =
      baselineCost > 0 ? Number((deltaCost / baselineCost).toFixed(4)) : 0;

    const absDeltaPct = Math.abs(deltaPct);
    let severity: CostShockResult['severity'] = 'normal';
    if (absDeltaPct >= criticalCostShockThresholdPct) {
      severity = 'critical';
    } else if (absDeltaPct >= elevatedCostShockThresholdPct) {
      severity = 'elevated';
    }

    return {
      isShock: absDeltaPct >= normalCostShockThresholdPct,
      severity,
      baselineCost,
      newCost,
      deltaCost,
      deltaPct,
    };
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
    item: {
      id: string;
      name: string;
      brand: string | null;
      upc: string | null;
    };
    createdByEmployee: {
      id: string;
      fullName: string;
      displayName: string | null;
    } | null;
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
    item: {
      id: string;
      name: string;
      brand: string | null;
      upc: string | null;
      sizeMl: number | null;
    };
    createdByEmployee: {
      id: string;
      fullName: string;
      displayName: string | null;
    } | null;
  }) {
    const itemSizeMl =
      count.item.sizeMl === null ? null : toQuantity(count.item.sizeMl);
    const bodegaQuantity =
      count.bodegaQuantity === null ? null : toQuantity(count.bodegaQuantity);
    const bodegaBottleCount =
      bodegaQuantity !== null && itemSizeMl !== null && itemSizeMl > 0
        ? toQuantity(bodegaQuantity / itemSizeMl)
        : null;

    return {
      id: count.id,
      officeId: count.officeId,
      officeName: count.office.name,
      itemId: count.itemId,
      itemName: count.item.name,
      itemBrand: count.item.brand,
      itemUpc: count.item.upc,
      itemSizeMl,
      countDate: count.countDate.toISOString().slice(0, 10),
      quantity: toQuantity(count.quantity),
      barQuantity:
        count.barQuantity === null ? null : toQuantity(count.barQuantity),
      bodegaQuantity,
      bodegaBottleCount,
      notes: count.notes || '',
      createdBy: count.createdByEmployee
        ? count.createdByEmployee.displayName ||
          count.createdByEmployee.fullName
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
    item: {
      id: string;
      name: string;
      brand: string | null;
      sizeMl: number | null;
    };
    createdByEmployee: {
      id: string;
      fullName: string;
      displayName: string | null;
    } | null;
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
      estimatedMl:
        scan.estimatedMl === null ? null : toQuantity(scan.estimatedMl),
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
