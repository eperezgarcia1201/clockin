import { Prisma, PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

type CompletedIntervalRow = {
  tenantId: string;
  tenantName: string | null;
  employeeId: string;
  employeeName: string | null;
  officeName: string | null;
  startPunchId: string;
  startAt: Date;
  endPunchId: string;
  endAt: Date;
  shiftHours: Prisma.Decimal;
};

type OpenChainRow = {
  tenantId: string;
  tenantName: string | null;
  employeeId: string;
  employeeName: string | null;
  officeName: string | null;
  startPunchId: string;
  startAt: Date;
  latestPunchId: string;
  latestAt: Date;
  hoursOpen: Prisma.Decimal;
};

type CleanupCsvRow = {
  iteration: number;
  recordKind: 'completed_interval' | 'open_chain';
  tenantName: string;
  employeeName: string;
  officeName: string;
  startPunchId: string;
  startAt: string;
  endPunchId: string;
  endAt: string;
  metricHours: string;
  deletePunchIds: string;
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

function parsePositiveNumberArg(name: string, fallback: number): number {
  const raw = readArg(name);
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid --${name} value "${raw}". Use a positive number.`);
  }
  return parsed;
}

function resolveOutputPath(rawPath: string): string | null {
  const trimmed = rawPath.trim();
  if (!trimmed) {
    return null;
  }
  return path.isAbsolute(trimmed)
    ? trimmed
    : path.resolve(process.cwd(), trimmed);
}

function toPlainNumber(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : value.toNumber();
}

function formatTimestamp(value: Date | null): string {
  return value ? value.toISOString() : '';
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function writeCsv(rows: CleanupCsvRow[], outputPath: string) {
  const header = [
    'iteration',
    'recordKind',
    'tenantName',
    'employeeName',
    'officeName',
    'startPunchId',
    'startAt',
    'endPunchId',
    'endAt',
    'metricHours',
    'deletePunchIds',
  ];
  const lines = [header.join(',')];

  for (const row of rows) {
    lines.push(
      [
        String(row.iteration),
        row.recordKind,
        row.tenantName,
        row.employeeName,
        row.officeName,
        row.startPunchId,
        row.startAt,
        row.endPunchId,
        row.endAt,
        row.metricHours,
        row.deletePunchIds,
      ]
        .map(csvEscape)
        .join(','),
    );
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
}

function printUsage() {
  console.log(
    [
      'Usage: ts-node scripts/cleanup-overlong-employee-punches.ts [options]',
      '',
      'Options:',
      '  --hours=12            Threshold for a straight shift or open IN-chain.',
      '  --apply               Delete the matching punch rows. Default is dry-run.',
      '  --max-iterations=10   Repeat cleanup until no matches remain or the limit is hit.',
      '  --output=./file.csv   Optional CSV backup/output path for matched records.',
      '  --help                Show this help message.',
      '',
      'The script removes:',
      '  1. completed IN -> non-IN intervals longer than the threshold',
      '  2. stale open IN chains older than the threshold',
    ].join('\n'),
  );
}

async function findCompletedIntervals(
  hoursThreshold: number,
): Promise<CompletedIntervalRow[]> {
  return prisma.$queryRaw<CompletedIntervalRow[]>(Prisma.sql`
    WITH ordered AS (
      SELECT
        ep.id,
        ep."tenantId",
        ep."employeeId",
        ep.type,
        ep."occurredAt",
        LAG(ep.type) OVER (
          PARTITION BY ep."tenantId", ep."employeeId"
          ORDER BY ep."occurredAt", ep.id
        ) AS prev_type
      FROM "EmployeePunch" ep
    ),
    interval_starts AS (
      SELECT *
      FROM ordered
      WHERE type = 'IN'
        AND COALESCE(prev_type::text, '') <> 'IN'
    )
    SELECT
      s."tenantId" AS "tenantId",
      t.name AS "tenantName",
      s."employeeId" AS "employeeId",
      COALESCE(e."displayName", e."fullName") AS "employeeName",
      o.name AS "officeName",
      s.id AS "startPunchId",
      s."occurredAt" AS "startAt",
      c.id AS "endPunchId",
      c."occurredAt" AS "endAt",
      ROUND(
        (EXTRACT(EPOCH FROM (c."occurredAt" - s."occurredAt")) / 3600)::numeric,
        2
      ) AS "shiftHours"
    FROM interval_starts s
    JOIN LATERAL (
      SELECT ep2.id, ep2."occurredAt"
      FROM "EmployeePunch" ep2
      WHERE ep2."tenantId" = s."tenantId"
        AND ep2."employeeId" = s."employeeId"
        AND (
          ep2."occurredAt" > s."occurredAt"
          OR (ep2."occurredAt" = s."occurredAt" AND ep2.id > s.id)
        )
        AND ep2.type <> 'IN'
      ORDER BY ep2."occurredAt", ep2.id
      LIMIT 1
    ) c ON true
    LEFT JOIN "Employee" e ON e.id = s."employeeId"
    LEFT JOIN "Tenant" t ON t.id = s."tenantId"
    LEFT JOIN "Office" o ON o.id = e."officeId"
    WHERE EXTRACT(EPOCH FROM (c."occurredAt" - s."occurredAt")) / 3600 > ${hoursThreshold}
    ORDER BY t.name, COALESCE(e."displayName", e."fullName"), s."occurredAt"
  `);
}

async function findOpenChains(hoursThreshold: number): Promise<OpenChainRow[]> {
  return prisma.$queryRaw<OpenChainRow[]>(Prisma.sql`
    WITH ordered AS (
      SELECT
        ep.id,
        ep."tenantId",
        ep."employeeId",
        ep.type,
        ep."occurredAt",
        LAG(ep.type) OVER (
          PARTITION BY ep."tenantId", ep."employeeId"
          ORDER BY ep."occurredAt", ep.id
        ) AS prev_type
      FROM "EmployeePunch" ep
    ),
    interval_starts AS (
      SELECT *
      FROM ordered
      WHERE type = 'IN'
        AND COALESCE(prev_type::text, '') <> 'IN'
    )
    SELECT
      s."tenantId" AS "tenantId",
      t.name AS "tenantName",
      s."employeeId" AS "employeeId",
      COALESCE(e."displayName", e."fullName") AS "employeeName",
      o.name AS "officeName",
      s.id AS "startPunchId",
      s."occurredAt" AS "startAt",
      latest.id AS "latestPunchId",
      latest."occurredAt" AS "latestAt",
      ROUND(
        (EXTRACT(EPOCH FROM (NOW() - s."occurredAt")) / 3600)::numeric,
        2
      ) AS "hoursOpen"
    FROM interval_starts s
    LEFT JOIN LATERAL (
      SELECT ep2.id
      FROM "EmployeePunch" ep2
      WHERE ep2."tenantId" = s."tenantId"
        AND ep2."employeeId" = s."employeeId"
        AND (
          ep2."occurredAt" > s."occurredAt"
          OR (ep2."occurredAt" = s."occurredAt" AND ep2.id > s.id)
        )
        AND ep2.type <> 'IN'
      ORDER BY ep2."occurredAt", ep2.id
      LIMIT 1
    ) closed ON true
    JOIN LATERAL (
      SELECT ep3.id, ep3.type, ep3."occurredAt"
      FROM "EmployeePunch" ep3
      WHERE ep3."tenantId" = s."tenantId"
        AND ep3."employeeId" = s."employeeId"
      ORDER BY ep3."occurredAt" DESC, ep3.id DESC
      LIMIT 1
    ) latest ON latest.type = 'IN'
    LEFT JOIN "Employee" e ON e.id = s."employeeId"
    LEFT JOIN "Tenant" t ON t.id = s."tenantId"
    LEFT JOIN "Office" o ON o.id = e."officeId"
    WHERE closed.id IS NULL
      AND EXTRACT(EPOCH FROM (NOW() - s."occurredAt")) / 3600 > ${hoursThreshold}
    ORDER BY t.name, COALESCE(e."displayName", e."fullName"), s."occurredAt"
  `);
}

async function findOpenChainPunchIds(row: OpenChainRow): Promise<string[]> {
  const records = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT ep.id
    FROM "EmployeePunch" ep
    WHERE ep."tenantId" = ${row.tenantId}
      AND ep."employeeId" = ${row.employeeId}
      AND (
        ep."occurredAt" > ${row.startAt}
        OR (ep."occurredAt" = ${row.startAt} AND ep.id >= ${row.startPunchId})
      )
    ORDER BY ep."occurredAt", ep.id
  `);

  return records.map((record) => record.id);
}

async function run() {
  if (readFlag('help')) {
    printUsage();
    return;
  }

  const hoursThreshold = parsePositiveNumberArg('hours', 12);
  const apply = readFlag('apply');
  const maxIterations = Math.trunc(parsePositiveNumberArg('max-iterations', 10));
  const outputPath = resolveOutputPath(readArg('output'));
  const csvRows: CleanupCsvRow[] = [];
  let totalDeletedPunches = 0;
  let iterationsRun = 0;

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const completedIntervals = await findCompletedIntervals(hoursThreshold);
    const openChains = await findOpenChains(hoursThreshold);

    if (completedIntervals.length === 0 && openChains.length === 0) {
      break;
    }

    iterationsRun = iteration;

    const idsToDelete = new Set<string>();
    for (const row of completedIntervals) {
      idsToDelete.add(row.startPunchId);
      idsToDelete.add(row.endPunchId);
      csvRows.push({
        iteration,
        recordKind: 'completed_interval',
        tenantName: row.tenantName || '',
        employeeName: row.employeeName || '',
        officeName: row.officeName || '',
        startPunchId: row.startPunchId,
        startAt: formatTimestamp(row.startAt),
        endPunchId: row.endPunchId,
        endAt: formatTimestamp(row.endAt),
        metricHours: toPlainNumber(row.shiftHours).toFixed(2),
        deletePunchIds: [row.startPunchId, row.endPunchId].join(';'),
      });
    }

    for (const row of openChains) {
      const chainPunchIds = await findOpenChainPunchIds(row);
      chainPunchIds.forEach((id) => idsToDelete.add(id));
      csvRows.push({
        iteration,
        recordKind: 'open_chain',
        tenantName: row.tenantName || '',
        employeeName: row.employeeName || '',
        officeName: row.officeName || '',
        startPunchId: row.startPunchId,
        startAt: formatTimestamp(row.startAt),
        endPunchId: row.latestPunchId,
        endAt: formatTimestamp(row.latestAt),
        metricHours: toPlainNumber(row.hoursOpen).toFixed(2),
        deletePunchIds: chainPunchIds.join(';'),
      });
    }

    console.log(
      [
        `Iteration ${iteration}`,
        `  completed intervals > ${hoursThreshold}h: ${completedIntervals.length}`,
        `  open IN chains > ${hoursThreshold}h: ${openChains.length}`,
        `  punch rows matched: ${idsToDelete.size}`,
      ].join('\n'),
    );

    if (!apply) {
      break;
    }

    const deleteIds = [...idsToDelete];
    if (deleteIds.length === 0) {
      break;
    }

    const result = await prisma.employeePunch.deleteMany({
      where: { id: { in: deleteIds } },
    });
    totalDeletedPunches += result.count;

    console.log(`  deleted punch rows: ${result.count}`);
  }

  const remainingCompletedIntervals = await findCompletedIntervals(hoursThreshold);
  const remainingOpenChains = await findOpenChains(hoursThreshold);

  if (outputPath && csvRows.length > 0) {
    writeCsv(csvRows, outputPath);
    console.log(`CSV written to ${outputPath}`);
  }

  console.log(
    [
      '',
      `Mode: ${apply ? 'apply' : 'dry-run'}`,
      `Threshold hours: ${hoursThreshold}`,
      `Iterations run: ${iterationsRun}`,
      `Deleted punch rows: ${totalDeletedPunches}`,
      `Remaining completed intervals > ${hoursThreshold}h: ${remainingCompletedIntervals.length}`,
      `Remaining open IN chains > ${hoursThreshold}h: ${remainingOpenChains.length}`,
    ].join('\n'),
  );

  if (!apply && (remainingCompletedIntervals.length > 0 || remainingOpenChains.length > 0)) {
    console.log('\nRe-run with --apply to delete the matched punch rows.');
  }

  if (
    apply &&
    iterationsRun === maxIterations &&
    (remainingCompletedIntervals.length > 0 || remainingOpenChains.length > 0)
  ) {
    console.warn(
      `Reached --max-iterations=${maxIterations}. Re-run if you still need another pass.`,
    );
  }
}

run()
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
