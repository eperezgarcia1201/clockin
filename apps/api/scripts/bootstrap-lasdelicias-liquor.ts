import { MembershipStatus, PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';
import fs from 'fs';
import path from 'path';

type LiquorImportRow = {
  company: string;
  liquorName: string;
  kind?: string;
  upc?: string;
  price: number;
  qtyMl: number;
  bar: number | null;
  bodega: number | null;
  inventory: number;
  total?: number | null;
};

type Config = {
  dataPath: string;
  tenantName: string;
  tenantSlug: string;
  tenantAuthOrgId: string;
  ownerName: string;
  ownerEmail: string;
  ownerAuthUserId: string;
  adminUsername: string;
  adminPassword: string;
  officeName: string;
  countDate: string;
  timezone: string;
};

type UpsertStats = {
  catalogCreated: number;
  catalogUpdated: number;
  countsCreated: number;
  countsUpdated: number;
};

const prisma = new PrismaClient();

const defaultDataPath = path.resolve(
  __dirname,
  'data/lasdelicias-jan-inventory-2026.json',
);

function readArg(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  if (!hit) {
    return fallback;
  }
  const value = hit.slice(prefix.length).trim();
  return value || fallback;
}

function toMoney(value: number): number {
  return Number(value.toFixed(2));
}

function toQuantity(value: number): number {
  return Number(value.toFixed(3));
}

function parseCountDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid countDate "${value}". Use YYYY-MM-DD.`);
  }
  return new Date(`${value}T00:00:00.000Z`);
}

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function normalizeOptionalText(value: unknown): string | null {
  const text = normalizeText(value);
  return text ? text : null;
}

function normalizeOptionalUpc(value: unknown): string | null {
  const text = normalizeText(value).replace(/[^0-9A-Za-z-]/g, '');
  return text ? text : null;
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function loadRows(filePath: string): LiquorImportRow[] {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('Import file must be a JSON array.');
  }

  const rows: LiquorImportRow[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== 'object') {
      continue;
    }

    const company = normalizeText((row as LiquorImportRow).company);
    const liquorName = normalizeText((row as LiquorImportRow).liquorName);
    if (!company && !liquorName) {
      continue;
    }

    rows.push({
      company,
      liquorName,
      kind: normalizeText((row as LiquorImportRow).kind),
      upc: normalizeText((row as LiquorImportRow).upc),
      price: asNumber((row as LiquorImportRow).price),
      qtyMl: asNumber((row as LiquorImportRow).qtyMl),
      bar:
        (row as LiquorImportRow).bar === null
          ? null
          : asNumber((row as LiquorImportRow).bar),
      bodega:
        (row as LiquorImportRow).bodega === null
          ? null
          : asNumber((row as LiquorImportRow).bodega),
      inventory: asNumber((row as LiquorImportRow).inventory),
      total:
        (row as LiquorImportRow).total === null ||
        (row as LiquorImportRow).total === undefined
          ? null
          : asNumber((row as LiquorImportRow).total),
    });
  }

  return rows;
}

async function ensureTenant(config: Config) {
  const bySlug = await prisma.tenant.findUnique({
    where: { slug: config.tenantSlug },
    select: { id: true, slug: true, authOrgId: true },
  });
  const byAuthOrg = await prisma.tenant.findUnique({
    where: { authOrgId: config.tenantAuthOrgId },
    select: { id: true, slug: true, authOrgId: true },
  });

  if (bySlug && byAuthOrg && bySlug.id !== byAuthOrg.id) {
    throw new Error(
      `Tenant conflict: slug "${config.tenantSlug}" and authOrgId "${config.tenantAuthOrgId}" belong to different tenants.`,
    );
  }

  const existing = bySlug || byAuthOrg;
  if (!existing) {
    return prisma.tenant.create({
      data: {
        name: config.tenantName,
        slug: config.tenantSlug,
        authOrgId: config.tenantAuthOrgId,
        ownerEmail: config.ownerEmail,
        isActive: true,
      },
    });
  }

  return prisma.tenant.update({
    where: { id: existing.id },
    data: {
      name: config.tenantName,
      slug: config.tenantSlug,
      authOrgId: config.tenantAuthOrgId,
      ownerEmail: config.ownerEmail,
      isActive: true,
    },
  });
}

async function ensureTenantSettings(tenantId: string, config: Config) {
  const adminPasswordHash = await hash(config.adminPassword, 10);
  await prisma.tenantSettings.upsert({
    where: { tenantId },
    create: {
      tenantId,
      adminUsername: config.adminUsername,
      adminPasswordHash,
      timezone: config.timezone,
      roundingMinutes: 15,
      requirePin: true,
      reportsEnabled: true,
      allowManualTimeEdits: true,
      dailySalesReportingEnabled: true,
      companyOrdersEnabled: true,
      multiLocationEnabled: true,
      liquorInventoryEnabled: true,
      ipRestrictions: null,
    },
    update: {
      adminUsername: config.adminUsername,
      adminPasswordHash,
      timezone: config.timezone,
      roundingMinutes: 15,
      reportsEnabled: true,
      allowManualTimeEdits: true,
      dailySalesReportingEnabled: true,
      companyOrdersEnabled: true,
      multiLocationEnabled: true,
      liquorInventoryEnabled: true,
    },
  });
}

async function ensureOwnerMembership(tenantId: string, config: Config) {
  const user = await prisma.user.upsert({
    where: { authUserId: config.ownerAuthUserId },
    create: {
      authUserId: config.ownerAuthUserId,
      email: config.ownerEmail,
      name: config.ownerName,
    },
    update: {
      email: config.ownerEmail,
      name: config.ownerName,
    },
  });

  await prisma.membership.upsert({
    where: {
      tenantId_userId: {
        tenantId,
        userId: user.id,
      },
    },
    create: {
      tenantId,
      userId: user.id,
      role: Role.OWNER,
      status: MembershipStatus.ACTIVE,
    },
    update: {
      role: Role.OWNER,
      status: MembershipStatus.ACTIVE,
    },
  });
}

async function ensureDefaultStatuses(tenantId: string) {
  const statuses = [
    { label: 'IN', color: '#1f7a3d', isIn: true },
    { label: 'OUT', color: '#b23c2a', isIn: false },
    { label: 'BREAK', color: '#f0a202', isIn: false },
    { label: 'LUNCH', color: '#4a6fa5', isIn: false },
  ];

  for (const status of statuses) {
    await prisma.punchStatus.upsert({
      where: {
        tenantId_label: {
          tenantId,
          label: status.label,
        },
      },
      create: {
        tenantId,
        label: status.label,
        color: status.color,
        isIn: status.isIn,
      },
      update: {
        color: status.color,
        isIn: status.isIn,
      },
    });
  }
}

async function ensureOffice(tenantId: string, officeName: string) {
  return prisma.office.upsert({
    where: {
      tenantId_name: {
        tenantId,
        name: officeName,
      },
    },
    create: {
      tenantId,
      name: officeName,
    },
    update: {},
  });
}

async function upsertCatalogAndCounts(
  tenantId: string,
  officeId: string,
  countDate: Date,
  rows: LiquorImportRow[],
): Promise<UpsertStats> {
  const stats: UpsertStats = {
    catalogCreated: 0,
    catalogUpdated: 0,
    countsCreated: 0,
    countsUpdated: 0,
  };

  for (const row of rows) {
    const name = normalizeText(row.liquorName);
    if (!name) {
      continue;
    }

    const supplierName = normalizeOptionalText(row.company);
    const brand = normalizeOptionalText(row.kind);
    const upc = normalizeOptionalUpc(row.upc);

    const unitCost = toMoney(asNumber(row.price));
    const sizeMlRaw = asNumber(row.qtyMl);
    const sizeMl = sizeMlRaw > 0 ? toMoney(sizeMlRaw) : null;

    let item = upc
      ? await prisma.liquorInventoryItem.findUnique({
          where: {
            tenantId_upc: {
              tenantId,
              upc,
            },
          },
        })
      : null;

    if (!item) {
      item = await prisma.liquorInventoryItem.findFirst({
        where: {
          tenantId,
          name,
          supplierName,
        },
      });
    }

    if (item) {
      item = await prisma.liquorInventoryItem.update({
        where: { id: item.id },
        data: {
          name,
          brand,
          supplierName,
          upc,
          sizeMl,
          unitLabel: 'ml',
          unitCost,
          isActive: true,
        },
      });
      stats.catalogUpdated += 1;
    } else {
      item = await prisma.liquorInventoryItem.create({
        data: {
          tenantId,
          name,
          brand,
          supplierName,
          upc,
          sizeMl,
          unitLabel: 'ml',
          unitCost,
          isActive: true,
        },
      });
      stats.catalogCreated += 1;
    }

    const barQuantity =
      row.bar === null || row.bar === undefined ? null : toQuantity(row.bar);
    const bodegaQuantity =
      row.bodega === null || row.bodega === undefined
        ? null
        : toQuantity(row.bodega);

    const quantityFromInventory = toQuantity(asNumber(row.inventory));
    const quantityFromParts = toQuantity((barQuantity || 0) + (bodegaQuantity || 0));
    const quantity = quantityFromInventory > 0 ? quantityFromInventory : quantityFromParts;

    const existingCount = await prisma.liquorInventoryCount.findUnique({
      where: {
        tenantId_officeId_itemId_countDate: {
          tenantId,
          officeId,
          itemId: item.id,
          countDate,
        },
      },
      select: { id: true },
    });

    if (existingCount) {
      await prisma.liquorInventoryCount.update({
        where: { id: existingCount.id },
        data: {
          quantity,
          barQuantity,
          bodegaQuantity,
          notes: 'Imported from JAN INV LICOR ENERO 2026 (FEB 11).',
          createdByEmployeeId: null,
        },
      });
      stats.countsUpdated += 1;
    } else {
      await prisma.liquorInventoryCount.create({
        data: {
          tenantId,
          officeId,
          itemId: item.id,
          countDate,
          quantity,
          barQuantity,
          bodegaQuantity,
          notes: 'Imported from JAN INV LICOR ENERO 2026 (FEB 11).',
          createdByEmployeeId: null,
        },
      });
      stats.countsCreated += 1;
    }
  }

  return stats;
}

async function main() {
  const config: Config = {
    dataPath: readArg('dataPath', defaultDataPath),
    tenantName: readArg('tenantName', 'LasDelicias'),
    tenantSlug: readArg('tenantSlug', 'lasdelicias'),
    tenantAuthOrgId: readArg('tenantAuthOrgId', 'local-lasdelicias'),
    ownerName: readArg('ownerName', 'Alejandro'),
    ownerEmail: readArg('ownerEmail', 'alejandro@lasdelicias.local'),
    ownerAuthUserId: readArg('ownerAuthUserId', 'local-lasdelicias-owner'),
    adminUsername: readArg('adminUsername', 'alejandro'),
    adminPassword: readArg('adminPassword', '1234qwer'),
    officeName: readArg('officeName', 'LasDelicias'),
    countDate: readArg('countDate', '2026-02-11'),
    timezone: readArg('timezone', 'America/Chicago'),
  };

  const rows = loadRows(config.dataPath);
  if (rows.length === 0) {
    throw new Error('No rows found in the import dataset.');
  }

  const countDate = parseCountDate(config.countDate);

  const tenant = await ensureTenant(config);
  await ensureTenantSettings(tenant.id, config);
  await ensureOwnerMembership(tenant.id, config);
  await ensureDefaultStatuses(tenant.id);
  const office = await ensureOffice(tenant.id, config.officeName);

  const stats = await upsertCatalogAndCounts(tenant.id, office.id, countDate, rows);

  console.log('LasDelicias bootstrap completed.');
  console.log(`Tenant: ${tenant.name} (${tenant.slug}) [${tenant.id}]`);
  console.log(`Admin login: ${config.adminUsername} / ${config.adminPassword}`);
  console.log(`Office: ${office.name} [${office.id}]`);
  console.log(`Count date: ${config.countDate}`);
  console.log(`Rows processed: ${rows.length}`);
  console.log(
    `Catalog -> created: ${stats.catalogCreated}, updated: ${stats.catalogUpdated}`,
  );
  console.log(
    `Counts -> created: ${stats.countsCreated}, updated: ${stats.countsUpdated}`,
  );
}

main()
  .catch((error) => {
    console.error('LasDelicias bootstrap failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
