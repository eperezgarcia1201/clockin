import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../../../lib/clockin-api";
import { excelResponse } from "../../../../../../lib/excel-export";
import {
  companyMetaRows,
  getCompanyExportProfile,
} from "../../../../../../lib/company-export";

export const runtime = "nodejs";

type SalesReportRow = {
  id: string;
  date: string;
  foodSales: number;
  liquorSales: number;
  totalSales: number;
  bankDepositBatch: string;
  totalPayments: number;
  balance: number;
  notes: string;
  submittedBy: string | null;
};

type SalesReportResponse = {
  range: { from: string; to: string };
  reports: SalesReportRow[];
};

const formatMoney = (value: number) => `$${Number(value || 0).toFixed(2)}`;

const escapeCsvCell = (value: unknown) => {
  const raw = String(value ?? "");
  if (raw.includes(",") || raw.includes('"') || raw.includes("\n")) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
};

const toCsv = (rows: unknown[][]) =>
  rows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\n");

const escapePdfText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const buildPdfDocument = (pages: string[]) => {
  const pageCount = pages.length;
  const pageObjectStart = 5;
  const objectCount = 4 + pageCount * 2;

  const pageRefs = pages
    .map((_, index) => `${pageObjectStart + index * 2} 0 R`)
    .join(" ");

  const objects: string[] = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    `2 0 obj\n<< /Type /Pages /Kids [${pageRefs}] /Count ${pageCount} >>\nendobj\n`,
    "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
  ];

  pages.forEach((content, index) => {
    const pageId = pageObjectStart + index * 2;
    const contentId = pageId + 1;
    const length = Buffer.byteLength(content, "utf8");
    objects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
    );
    objects.push(
      `${contentId} 0 obj\n<< /Length ${length} >>\nstream\n${content}\nendstream\nendobj\n`,
    );
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objectCount + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objectCount; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
};

const drawText = (
  commands: string[],
  text: string,
  x: number,
  y: number,
  fontSize = 10,
  bold = false,
) => {
  commands.push(
    `0 g BT /${bold ? "F2" : "F1"} ${fontSize} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj ET`,
  );
};

const drawRect = (
  commands: string[],
  x: number,
  y: number,
  width: number,
  height: number,
  fillGray?: number,
) => {
  if (typeof fillGray === "number") {
    commands.push(`${fillGray} g ${x} ${y} ${width} ${height} re f`);
  }
  commands.push(`0 G ${x} ${y} ${width} ${height} re S`);
};

const drawLine = (
  commands: string[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) => {
  commands.push(`0 G ${x1} ${y1} m ${x2} ${y2} l S`);
};

const truncateByWidth = (value: string | null | undefined, width: number) => {
  const text = (value || "").trim() || "-";
  const max = Math.max(4, Math.floor((width - 8) / 4.4));
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1)}…`;
};

const formatUsDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value || "").trim());
  if (!match) return value;
  return `${match[2]}/${match[3]}/${match[1]}`;
};

const parseIsoDateOnly = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }
  return parsed;
};

const buildPdf = (
  rows: SalesReportRow[],
  range: { from: string; to: string },
  companyRows: Array<[string, string]>,
) => {
  const pages: string[] = [];
  let commands: string[] = [];
  let y = 790;
  const tableX = 45;
  const tableWidth = 505;
  const headerHeight = 16;
  const rowHeight = 16;
  const columns: Array<{ label: string; width: number }> = [
    { label: "Date", width: 52 },
    { label: "Food", width: 46 },
    { label: "Liquor", width: 46 },
    { label: "Total", width: 56 },
    { label: "Batch", width: 56 },
    { label: "Payments", width: 56 },
    { label: "Balance", width: 46 },
    { label: "Submitted By", width: 68 },
    { label: "Notes", width: 79 },
  ];

  const drawHeader = (continued = false) => {
    drawText(commands, companyRows[0]?.[1] || "WEBSYS WORKFORCE", 45, y, 17, true);
    y -= 22;
    companyRows.slice(1).forEach(([label, value]) => {
      if (!value) return;
      drawText(commands, `${label}: ${value}`, 45, y, 8, false);
      y -= 11;
    });
    y -= 2;
    drawText(
      commands,
      `Daily Sales Entries Report${continued ? " (continued)" : ""}`,
      45,
      y,
      12,
      true,
    );
    y -= 16;
    drawText(
      commands,
      `Range: ${formatUsDate(range.from)} - ${formatUsDate(range.to)}`,
      45,
      y,
      9,
      false,
    );
    y -= 14;
    drawRect(commands, tableX, y - headerHeight, tableWidth, headerHeight, 0.9);
    let offset = tableX;
    for (let index = 0; index < columns.length; index += 1) {
      const column = columns[index];
      drawText(commands, column.label, offset + 4, y - 11, 7, false);
      offset += column.width;
      if (index < columns.length - 1) {
        drawLine(commands, offset, y, offset, y - headerHeight);
      }
    }
    y -= headerHeight;
  };

  const addPage = (continued = false) => {
    if (commands.length) {
      pages.push(commands.join("\n"));
    }
    commands = [];
    y = 790;
    drawHeader(continued);
  };

  addPage(false);

  if (!rows.length) {
    drawText(
      commands,
      "No daily sales entries found in selected range.",
      45,
      y - 14,
      9,
    );
    y -= 20;
  } else {
    for (const row of rows) {
      if (y - rowHeight < 42) {
        addPage(true);
      }
      drawRect(commands, tableX, y - rowHeight, tableWidth, rowHeight);
      const cells = [
        formatUsDate(row.date),
        formatMoney(row.foodSales),
        formatMoney(row.liquorSales),
        formatMoney(row.totalSales),
        row.bankDepositBatch || "-",
        formatMoney(row.totalPayments),
        formatMoney(row.balance),
        row.submittedBy || "-",
        row.notes || "-",
      ];
      let offset = tableX;
      for (let index = 0; index < columns.length; index += 1) {
        drawText(
          commands,
          truncateByWidth(cells[index], columns[index].width),
          offset + 4,
          y - 11,
          7,
        );
        offset += columns[index].width;
        if (index < columns.length - 1) {
          drawLine(commands, offset, y, offset, y - rowHeight);
        }
      }
      y -= rowHeight;
    }
  }

  pages.push(commands.join("\n"));
  return buildPdfDocument(pages);
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") || "excel").toLowerCase();
  const from = (searchParams.get("from") || "").trim();
  const to = (searchParams.get("to") || "").trim();

  if (!["excel", "csv", "pdf"].includes(format)) {
    return NextResponse.json(
      { error: "format must be excel, csv, or pdf" },
      { status: 400 },
    );
  }
  if (!from || !to) {
    return NextResponse.json(
      { error: "from and to are required (YYYY-MM-DD)." },
      { status: 400 },
    );
  }
  if (!parseIsoDateOnly(from) || !parseIsoDateOnly(to)) {
    return NextResponse.json(
      { error: "from and to must be valid dates in YYYY-MM-DD format." },
      { status: 400 },
    );
  }
  if (from > to) {
    return NextResponse.json(
      { error: '"from" must be before or equal to "to".' },
      { status: 400 },
    );
  }

  const query = new URLSearchParams({ from, to });
  const response = await clockinFetch(`/reports/sales?${query.toString()}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return new NextResponse(JSON.stringify(error), { status: response.status });
  }

  const data = (await response.json()) as SalesReportResponse;
  const rows = data.reports || [];
  const fileLabel = `${from}-to-${to}`;
  const company = await getCompanyExportProfile();
  const companyRows = companyMetaRows(company);

  if (format === "excel") {
    return excelResponse(
      `daily-sales-entries-${fileLabel}.xlsx`,
      (workbook) => {
        const sheet = workbook.addWorksheet("Daily Sales Entries");
        sheet.addRow([company.displayName]);
        sheet.addRow(["Report", "Daily Sales Entries"]);
        sheet.addRow(["Range", `${from} - ${to}`]);
        companyRows.slice(1).forEach(([label, value]) => {
          sheet.addRow([label, value]);
        });
        sheet.addRow([]);
        sheet.columns = [
          { header: "Date", key: "date", width: 14 },
          { header: "Food Sales", key: "foodSales", width: 14 },
          { header: "Liquor Sales", key: "liquorSales", width: 14 },
          { header: "Total Sales", key: "totalSales", width: 14 },
          { header: "Bank Deposit Batch", key: "bankDepositBatch", width: 20 },
          { header: "Payments", key: "totalPayments", width: 14 },
          { header: "Balance", key: "balance", width: 14 },
          { header: "Submitted By", key: "submittedBy", width: 24 },
          { header: "Notes", key: "notes", width: 40 },
        ];
        rows.forEach((row) => sheet.addRow(row));
        [
          "foodSales",
          "liquorSales",
          "totalSales",
          "totalPayments",
          "balance",
        ].forEach((key) => {
          sheet.getColumn(key).numFmt = "$#,##0.00";
        });
      },
    );
  }

  if (format === "csv") {
    const csvRows: unknown[][] = [
      [company.displayName],
      ["Daily Sales Entries Report"],
      [`Range: ${from} to ${to}`],
      ...companyRows.slice(1).map(([label, value]) => [`${label}:`, value]),
      [],
      [
        "Date",
        "Food Sales",
        "Liquor Sales",
        "Total Sales",
        "Bank Deposit Batch",
        "Payments",
        "Balance",
        "Submitted By",
        "Notes",
      ],
      ...rows.map((row) => [
        row.date,
        row.foodSales,
        row.liquorSales,
        row.totalSales,
        row.bankDepositBatch || "",
        row.totalPayments,
        row.balance,
        row.submittedBy || "",
        row.notes || "",
      ]),
    ];

    return new NextResponse(toCsv(csvRows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"daily-sales-entries-${fileLabel}.csv\"`,
      },
    });
  }

  const pdf = buildPdf(rows, { from, to }, companyRows);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"daily-sales-entries-${fileLabel}.pdf\"`,
    },
  });
}
