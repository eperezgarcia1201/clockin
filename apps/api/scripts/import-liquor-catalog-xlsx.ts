import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const ExcelJS = require('exceljs') as typeof import('exceljs');

type SpreadsheetRow = {
  company: string | null;
  liquorName: string;
  price: number;
  qtyMl: number | null;
};

type ImportSummary = {
  rowsRead: number;
  created: number;
  updated: number;
  skipped: number;
};

const prisma = new PrismaClient();

function readArg(name: string, fallback = ''): string {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  if (!match) {
    return fallback;
  }
  return match.slice(prefix.length).trim() || fallback;
}

function readFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function requireArg(name: string): string {
  const value = readArg(name);
  if (!value) {
    throw new Error(`Missing required argument --${name}=...`);
  }
  return value;
}

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function normalizeOptionalText(value: unknown): string | null {
  const text = normalizeText(value);
  return text || null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value && typeof value === 'object' && 'result' in value) {
    return parseNumber((value as { result?: unknown }).result);
  }
  return null;
}

function toMoney(value: number): number {
  return Number(value.toFixed(2));
}

function toQuantity(value: number): number {
  return Number(value.toFixed(3));
}

function rowKey(row: SpreadsheetRow): string {
  const supplier = normalizeText(row.company ?? '').toLowerCase();
  const name = normalizeText(row.liquorName).toLowerCase();
  return `${supplier}::${name}`;
}

async function loadWorkbookRows(
  workbookPath: string,
  sheetName?: string,
): Promise<SpreadsheetRow[]> {
  if (!fs.existsSync(workbookPath)) {
    throw new Error(`Workbook not found: ${workbookPath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);

  const worksheet = sheetName
    ? workbook.getWorksheet(sheetName)
    : workbook.worksheets[0];

  if (!worksheet) {
    throw new Error(
      sheetName
        ? `Worksheet "${sheetName}" not found in workbook.`
        : 'Workbook has no worksheets.',
    );
  }

  const deduped = new Map<string, SpreadsheetRow>();

  for (let rowNumber = 3; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const company = normalizeOptionalText(row.getCell(1).text);
    const liquorName = normalizeText(row.getCell(2).text);
    if (!company && !liquorName) {
      continue;
    }
    if (!liquorName) {
      continue;
    }

    const price = parseNumber(row.getCell(3).value) ?? 0;
    const qtyMlRaw = parseNumber(row.getCell(4).value);

    const parsedRow: SpreadsheetRow = {
      company,
      liquorName,
      price: toMoney(price),
      qtyMl: qtyMlRaw && qtyMlRaw > 0 ? toQuantity(qtyMlRaw) : null,
    };

    deduped.set(rowKey(parsedRow), parsedRow);
  }

  return [...deduped.values()];
}

async function upsertCatalogRows(input: {
  tenantSlug: string;
  rows: SpreadsheetRow[];
  dryRun: boolean;
}): Promise<ImportSummary & { tenantId: string; tenantSlug: string }> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: input.tenantSlug },
    select: { id: true, slug: true, name: true },
  });

  if (!tenant) {
    throw new Error(`Tenant slug "${input.tenantSlug}" not found.`);
  }

  const summary: ImportSummary = {
    rowsRead: input.rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
  };

  for (const row of input.rows) {
    const supplierName = normalizeOptionalText(row.company);
    const name = normalizeText(row.liquorName);

    if (!name) {
      summary.skipped += 1;
      continue;
    }

    const existing = await prisma.liquorInventoryItem.findFirst({
      where: {
        tenantId: tenant.id,
        name: { equals: name, mode: 'insensitive' },
        supplierName: supplierName
          ? { equals: supplierName, mode: 'insensitive' }
          : null,
      },
      select: { id: true },
    });

    if (existing) {
      summary.updated += 1;
      if (!input.dryRun) {
        await prisma.liquorInventoryItem.update({
          where: { id: existing.id },
          data: {
            name,
            supplierName,
            brand: null,
            upc: null,
            sizeMl: row.qtyMl,
            unitLabel: row.qtyMl ? 'ml' : null,
            unitCost: row.price,
            isActive: true,
          },
        });
      }
      continue;
    }

    summary.created += 1;
    if (!input.dryRun) {
      await prisma.liquorInventoryItem.create({
        data: {
          tenantId: tenant.id,
          name,
          supplierName,
          brand: null,
          upc: null,
          sizeMl: row.qtyMl,
          unitLabel: row.qtyMl ? 'ml' : null,
          unitCost: row.price,
          isActive: true,
        },
      });
    }
  }

  return {
    ...summary,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
  };
}

async function main() {
  const workbookPath = path.resolve(requireArg('workbook'));
  const tenantSlug = readArg('tenantSlug');
  const sheetName = readArg('sheetName');
  const dryRun = readFlag('dry-run');
  const parseOnly = readFlag('parse-only');

  const rows = await loadWorkbookRows(workbookPath, sheetName || undefined);
  if (rows.length === 0) {
    throw new Error('No liquor catalog rows were found in the workbook.');
  }

  if (parseOnly) {
    console.log(
      JSON.stringify(
        {
          workbookPath,
          parseOnly: true,
          rowsRead: rows.length,
          sample: rows.slice(0, 5),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (!tenantSlug) {
    throw new Error(
      'Missing required argument --tenantSlug=... unless --parse-only is used.',
    );
  }

  const result = await upsertCatalogRows({
    tenantSlug,
    rows,
    dryRun,
  });

  console.log(
    JSON.stringify(
      {
        workbookPath,
        tenantSlug: result.tenantSlug,
        tenantId: result.tenantId,
        dryRun,
        rowsRead: result.rowsRead,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error('Liquor catalog XLSX import failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
