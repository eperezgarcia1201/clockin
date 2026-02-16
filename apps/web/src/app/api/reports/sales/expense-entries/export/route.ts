import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../../../lib/clockin-api";
import { excelResponse } from "../../../../../../lib/excel-export";
import {
  companyMetaRows,
  getCompanyExportProfile,
} from "../../../../../../lib/company-export";

export const runtime = "nodejs";

type ExpensePaymentMethod = "CHECK" | "DEBIT_CARD" | "CASH";

type DailyExpenseRow = {
  id: string;
  date: string;
  companyName: string;
  paymentMethod: ExpensePaymentMethod;
  invoiceNumber: string;
  amount: number;
  checkNumber: string | null;
  payToCompany: string | null;
  hasReceipt: boolean;
  notes: string;
  submittedBy: string | null;
};

type SalesReportResponse = {
  range: { from: string; to: string };
  expenses: DailyExpenseRow[];
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

const buildPdfDocument = (pages: string[]): ArrayBuffer => {
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
  const bytes = Buffer.from(pdf, "utf8");
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
};

const drawText = (
  commands: string[],
  text: string,
  x: number,
  y: number,
  fontSize = 10,
  bold = false,
  gray = 0,
) => {
  commands.push(
    `${gray} g BT /${bold ? "F2" : "F1"} ${fontSize} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj ET`,
  );
};

const drawRect = (
  commands: string[],
  x: number,
  y: number,
  width: number,
  height: number,
  fillGray?: number,
  strokeGray = 0,
) => {
  if (typeof fillGray === "number") {
    commands.push(`${fillGray} g ${x} ${y} ${width} ${height} re f`);
  }
  commands.push(`${strokeGray} G ${x} ${y} ${width} ${height} re S`);
};

const drawLine = (
  commands: string[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  strokeGray = 0,
) => {
  commands.push(`${strokeGray} G ${x1} ${y1} m ${x2} ${y2} l S`);
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

const formatUsShortDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value || "").trim());
  if (!match) return value;
  return `${match[2]}/${match[3]}`;
};

const formatShortMonthDay = (value: string) => {
  const parsed = parseIsoDateOnly(value);
  if (!parsed) {
    return value;
  }
  return parsed.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
};

const formatLongDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatReportPeriod = (from: string, to: string) => {
  const fromDate = parseIsoDateOnly(from);
  const toDate = parseIsoDateOnly(to);
  if (!fromDate || !toDate) {
    return `${formatUsDate(from)} - ${formatUsDate(to)}`;
  }
  if (fromDate.getUTCFullYear() === toDate.getUTCFullYear()) {
    return `${formatShortMonthDay(from)} - ${formatShortMonthDay(to)}, ${toDate.getUTCFullYear()}`;
  }
  return `${formatUsDate(from)} - ${formatUsDate(to)}`;
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

const methodLabel = (method: ExpensePaymentMethod) => {
  if (method === "DEBIT_CARD") return "Debit Card";
  if (method === "CHECK") return "Check";
  return "Cash";
};

const buildPdf = (
  rows: DailyExpenseRow[],
  range: { from: string; to: string },
  companyRows: Array<[string, string]>,
) => {
  const pages: string[] = [];
  let commands: string[] = [];
  let y = 780;
  const pageLeft = 70;
  const pageRight = 525;
  const tableX = 70;
  const tableWidth = pageRight - tableX;
  const detailHeaderHeight = 18;
  const rowHeight = 18;

  const detailColumns: Array<{
    label: string;
    width: number;
    align?: "left" | "right";
  }> = [
    { label: "Date", width: 50 },
    { label: "Vendor", width: 123 },
    { label: "Payment", width: 70 },
    { label: "Invoice", width: 95 },
    { label: "Check #", width: 57 },
    { label: "Amount", width: 60, align: "right" },
  ];

  const headerLabels = ["Total Expenses", "Cash", "Debit Card", "Check"];
  const totals = rows.reduce(
    (acc, row) => {
      acc.total += row.amount;
      if (row.paymentMethod === "CASH") acc.cash += row.amount;
      if (row.paymentMethod === "DEBIT_CARD") acc.debit += row.amount;
      if (row.paymentMethod === "CHECK") acc.check += row.amount;
      return acc;
    },
    { total: 0, cash: 0, debit: 0, check: 0 },
  );
  const headerValues = [
    formatMoney(totals.total),
    formatMoney(totals.cash),
    formatMoney(totals.debit),
    formatMoney(totals.check),
  ];

  const preparedBy =
    rows.find((row) => (row.submittedBy || "").trim())?.submittedBy?.trim() ||
    "Admin";
  const periodLabel = formatReportPeriod(range.from, range.to);
  const generatedOn = formatLongDate(new Date());

  const textWidth = (text: string, size: number) => text.length * size * 0.5;

  const drawCellText = (
    text: string,
    x: number,
    yValue: number,
    width: number,
    fontSize: number,
    align: "left" | "right" | "center" = "left",
    bold = false,
    gray = 0,
  ) => {
    const value = truncateByWidth(text, width);
    if (align === "right") {
      const tw = textWidth(value, fontSize);
      drawText(
        commands,
        value,
        x + width - tw - 4,
        yValue,
        fontSize,
        bold,
        gray,
      );
      return;
    }
    if (align === "center") {
      const tw = textWidth(value, fontSize);
      drawText(
        commands,
        value,
        x + Math.max((width - tw) / 2, 4),
        yValue,
        fontSize,
        bold,
        gray,
      );
      return;
    }
    drawText(commands, value, x + 4, yValue, fontSize, bold, gray);
  };

  const drawDetailTableHeader = () => {
    drawRect(
      commands,
      tableX,
      y - detailHeaderHeight,
      tableWidth,
      detailHeaderHeight,
      0.12,
      0.2,
    );
    let offset = tableX;
    detailColumns.forEach((column, index) => {
      drawCellText(
        column.label,
        offset,
        y - 12,
        column.width,
        8,
        "left",
        true,
        1,
      );
      offset += column.width;
      if (index < detailColumns.length - 1) {
        drawLine(commands, offset, y, offset, y - detailHeaderHeight, 0.35);
      }
    });
    y -= detailHeaderHeight;
  };

  const drawTopSection = (continued = false, includeSummary = false) => {
    y = 780;
    drawText(commands, companyRows[0]?.[1] || "WEBSYS WORKFORCE", pageLeft, y, 38, true);
    y -= 56;
    companyRows.slice(1).forEach(([label, value]) => {
      if (!value) return;
      drawText(commands, `${label}: ${value}`, pageLeft, y, 9);
      y -= 12;
    });
    y -= 4;
    drawText(
      commands,
      continued ? "Daily Expense Report (continued)" : "Daily Expense Report",
      pageLeft,
      y,
      12,
      true,
    );
    y -= 26;
    drawText(commands, `Report Period: ${periodLabel}`, pageLeft, y, 10);
    y -= 13;
    drawText(commands, `Generated On: ${generatedOn}`, pageLeft, y, 10);
    y -= 13;
    drawText(commands, `Prepared By: ${preparedBy}`, pageLeft, y, 10);
    y -= 16;
    drawLine(commands, pageLeft, y, pageRight, y, 0.55);
    y -= 20;

    if (includeSummary) {
      const summaryRowHeight = 20;
      const summaryCellWidth = tableWidth / 4;
      drawRect(
        commands,
        tableX,
        y - summaryRowHeight,
        tableWidth,
        summaryRowHeight,
        0.12,
        0.2,
      );
      drawRect(
        commands,
        tableX,
        y - summaryRowHeight * 2,
        tableWidth,
        summaryRowHeight,
        0.2,
        0.2,
      );
      for (let index = 1; index < 4; index += 1) {
        const x = tableX + summaryCellWidth * index;
        drawLine(commands, x, y, x, y - summaryRowHeight * 2, 0.35);
      }
      headerLabels.forEach((label, index) => {
        const x = tableX + summaryCellWidth * index;
        drawCellText(label, x, y - 13, summaryCellWidth, 9, "center", true, 1);
        drawCellText(
          headerValues[index],
          x,
          y - 33,
          summaryCellWidth,
          10,
          "center",
          true,
          1,
        );
      });
      y -= summaryRowHeight * 2 + 36;
    }

    drawText(commands, "Expense Details", pageLeft, y, 11, true);
    y -= 16;
    drawDetailTableHeader();
  };

  const addPage = (continued = false, includeSummary = false) => {
    if (commands.length) {
      pages.push(commands.join("\n"));
    }
    commands = [];
    drawTopSection(continued, includeSummary);
  };

  addPage(false, true);

  if (!rows.length) {
    drawText(
      commands,
      "No expense transactions recorded during this period.",
      tableX,
      y - 16,
      10,
    );
    y -= 26;
  } else {
    rows.forEach((row, rowIndex) => {
      if (y - rowHeight < 78) {
        addPage(true, false);
      }

      drawRect(
        commands,
        tableX,
        y - rowHeight,
        tableWidth,
        rowHeight,
        rowIndex % 2 === 0 ? 0.97 : 0.93,
        0.85,
      );

      const cells = [
        formatUsShortDate(row.date),
        row.companyName,
        methodLabel(row.paymentMethod),
        row.invoiceNumber,
        row.checkNumber || "-",
        formatMoney(row.amount),
      ];

      let offset = tableX;
      detailColumns.forEach((column, index) => {
        drawCellText(
          cells[index],
          offset,
          y - 12,
          column.width,
          8.5,
          column.align || "left",
        );
        offset += column.width;
        if (index < detailColumns.length - 1) {
          drawLine(commands, offset, y, offset, y - rowHeight, 0.88);
        }
      });

      y -= rowHeight;
    });
  }

  const footerTop = Math.max(y - 14, 70);
  drawLine(commands, pageLeft, footerTop + 16, pageRight, footerTop + 16, 0.55);
  drawText(commands, `Total Records: ${rows.length}`, pageLeft, footerTop, 10);
  drawText(
    commands,
    "Confidential - Internal Use Only",
    pageLeft,
    footerTop - 14,
    9,
    false,
    0.35,
  );

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
  const rows = data.expenses || [];
  const fileLabel = `${from}-to-${to}`;
  const company = await getCompanyExportProfile();
  const companyRows = companyMetaRows(company);

  if (format === "excel") {
    return excelResponse(
      `daily-expense-entries-${fileLabel}.xlsx`,
      (workbook) => {
        const sheet = workbook.addWorksheet("Daily Expense Entries");
        sheet.addRow([company.displayName]);
        sheet.addRow(["Report", "Daily Expense Entries"]);
        sheet.addRow(["Range", `${from} - ${to}`]);
        companyRows.slice(1).forEach(([label, value]) => {
          sheet.addRow([label, value]);
        });
        sheet.addRow([]);
        sheet.columns = [
          { header: "Date", key: "date", width: 14 },
          { header: "Company Name", key: "companyName", width: 28 },
          { header: "Method", key: "paymentMethod", width: 14 },
          { header: "Amount", key: "amount", width: 14 },
          { header: "Invoice Number", key: "invoiceNumber", width: 18 },
          { header: "Check Number", key: "checkNumber", width: 16 },
          {
            header: "Company Check Is Going To",
            key: "payToCompany",
            width: 26,
          },
          { header: "Submitted By", key: "submittedBy", width: 24 },
          { header: "Receipt", key: "hasReceipt", width: 12 },
          { header: "Notes", key: "notes", width: 32 },
        ];
        rows.forEach((row) =>
          sheet.addRow({
            ...row,
            paymentMethod: methodLabel(row.paymentMethod),
            hasReceipt: row.hasReceipt ? "Yes" : "No",
          }),
        );
        sheet.getColumn("amount").numFmt = "$#,##0.00";
      },
    );
  }

  if (format === "csv") {
    const csvRows: unknown[][] = [
      [company.displayName],
      ["Daily Expense Entries Report"],
      [`Range: ${from} to ${to}`],
      ...companyRows.slice(1).map(([label, value]) => [`${label}:`, value]),
      [],
      [
        "Date",
        "Company Name",
        "Method",
        "Amount",
        "Invoice Number",
        "Check Number",
        "Company Check Is Going To",
        "Submitted By",
        "Receipt",
        "Notes",
      ],
      ...rows.map((row) => [
        row.date,
        row.companyName,
        methodLabel(row.paymentMethod),
        row.amount,
        row.invoiceNumber,
        row.checkNumber || "",
        row.payToCompany || "",
        row.submittedBy || "",
        row.hasReceipt ? "Yes" : "No",
        row.notes || "",
      ]),
    ];

    return new NextResponse(toCsv(csvRows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"daily-expense-entries-${fileLabel}.csv\"`,
      },
    });
  }

  const pdf = buildPdf(rows, { from, to }, companyRows);
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"daily-expense-entries-${fileLabel}.pdf\"`,
    },
  });
}
