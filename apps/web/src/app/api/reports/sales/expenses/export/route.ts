import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../../../lib/clockin-api";
import { excelResponse } from "../../../../../../lib/excel-export";
import {
  companyMetaRows,
  getCompanyExportProfile,
} from "../../../../../../lib/company-export";
import {
  scopedQueryFromRequest,
  withQuery,
} from "../../../../../../lib/location-scope";

export const runtime = "nodejs";

type ExpensePaymentMethod = "CHECK" | "DEBIT_CARD" | "CASH";
type ExpenseExportFormat = "excel" | "csv" | "pdf";
type ExpenseExportPeriod = "day" | "week" | "month";

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
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
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

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const addUtcDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const resolveRange = (period: ExpenseExportPeriod, date: Date) => {
  if (period === "day") {
    const key = formatDate(date);
    return { from: key, to: key };
  }

  if (period === "week") {
    const day = date.getUTCDay();
    const mondayOffset = (day + 6) % 7;
    const fromDate = addUtcDays(date, -mondayOffset);
    const toDate = addUtcDays(fromDate, 6);
    return { from: formatDate(fromDate), to: formatDate(toDate) };
  }

  const fromDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
  );
  const toDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  );
  return { from: formatDate(fromDate), to: formatDate(toDate) };
};

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
    return `${formatShortMonthDay(from)} – ${formatShortMonthDay(to)}, ${toDate.getUTCFullYear()}`;
  }
  return `${formatUsDate(from)} - ${formatUsDate(to)}`;
};

const methodLabel = (method: ExpensePaymentMethod) => {
  if (method === "DEBIT_CARD") return "Debit Card";
  if (method === "CHECK") return "Check";
  return "Cash";
};

const buildPdf = (
  expenses: DailyExpenseRow[],
  totals: {
    totalExpenses: number;
    cashExpenses: number;
    debitCardExpenses: number;
    checkExpenses: number;
  },
  meta: {
    from: string;
    to: string;
    periodLabel: string;
  },
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
  const periodLabel = formatReportPeriod(meta.from, meta.to);
  const generatedOn = formatLongDate(new Date());
  const preparedBy =
    expenses
      .find((row) => (row.submittedBy || "").trim())
      ?.submittedBy?.trim() || "Admin";

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

  const summaryLabels = ["Total Expenses", "Cash", "Debit Card", "Check"];
  const summaryValues = [
    formatMoney(totals.totalExpenses),
    formatMoney(totals.cashExpenses),
    formatMoney(totals.debitCardExpenses),
    formatMoney(totals.checkExpenses),
  ];

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

  const drawDetailsHeader = () => {
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

  const drawPageScaffold = (continued = false, includeSummary = false) => {
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
      const cellWidth = tableWidth / 4;
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
        const x = tableX + cellWidth * index;
        drawLine(commands, x, y, x, y - summaryRowHeight * 2, 0.35);
      }
      summaryLabels.forEach((label, index) => {
        const x = tableX + cellWidth * index;
        drawCellText(label, x, y - 13, cellWidth, 9, "center", true, 1);
        drawCellText(
          summaryValues[index],
          x,
          y - 33,
          cellWidth,
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
    drawDetailsHeader();
  };

  const addPage = (continued = false, includeSummary = false) => {
    if (commands.length) {
      pages.push(commands.join("\n"));
    }
    commands = [];
    drawPageScaffold(continued, includeSummary);
  };

  addPage(false, true);

  if (!expenses.length) {
    drawText(
      commands,
      "No expense transactions recorded during this period.",
      tableX,
      y - 16,
      10,
    );
    y -= 26;
  } else {
    expenses.forEach((row, index) => {
      if (y - rowHeight < 78) {
        addPage(true, false);
      }

      drawRect(
        commands,
        tableX,
        y - rowHeight,
        tableWidth,
        rowHeight,
        index % 2 === 0 ? 0.97 : 0.93,
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
      detailColumns.forEach((column, columnIndex) => {
        drawCellText(
          cells[columnIndex],
          offset,
          y - 12,
          column.width,
          8.5,
          column.align || "left",
        );
        offset += column.width;
        if (columnIndex < detailColumns.length - 1) {
          drawLine(commands, offset, y, offset, y - rowHeight, 0.88);
        }
      });

      y -= rowHeight;
    });
  }

  const footerTop = Math.max(y - 14, 70);
  drawLine(commands, pageLeft, footerTop + 16, pageRight, footerTop + 16, 0.55);
  drawText(
    commands,
    `Total Records: ${expenses.length}`,
    pageLeft,
    footerTop,
    10,
  );
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
  const scopedQuery = await scopedQueryFromRequest(request);
  const format = (scopedQuery.get("format") || "excel").toLowerCase();
  const fromParam = (scopedQuery.get("from") || "").trim();
  const toParam = (scopedQuery.get("to") || "").trim();
  const period = (scopedQuery.get("period") || "day").toLowerCase();
  const dateParam =
    (scopedQuery.get("date") || "").trim() ||
    new Date().toISOString().slice(0, 10);

  if (!["excel", "csv", "pdf"].includes(format)) {
    return NextResponse.json(
      { error: "format must be excel, csv, or pdf" },
      { status: 400 },
    );
  }
  let resolved: { from: string; to: string };
  let periodLabel = "CUSTOM";
  if (fromParam || toParam) {
    if (!fromParam || !toParam) {
      return NextResponse.json(
        { error: "from and to are required together (YYYY-MM-DD)." },
        { status: 400 },
      );
    }
    if (!parseIsoDateOnly(fromParam) || !parseIsoDateOnly(toParam)) {
      return NextResponse.json(
        { error: "from and to must be valid dates in YYYY-MM-DD format." },
        { status: 400 },
      );
    }
    if (fromParam > toParam) {
      return NextResponse.json(
        { error: '"from" must be before or equal to "to".' },
        { status: 400 },
      );
    }
    resolved = { from: fromParam, to: toParam };
  } else {
    if (!["day", "week", "month"].includes(period)) {
      return NextResponse.json(
        { error: "period must be day, week, or month" },
        { status: 400 },
      );
    }
    const date = parseIsoDateOnly(dateParam);
    if (!date) {
      return NextResponse.json(
        { error: "date must be in YYYY-MM-DD format" },
        { status: 400 },
      );
    }
    resolved = resolveRange(period as ExpenseExportPeriod, date);
    periodLabel = (period as ExpenseExportPeriod).toUpperCase();
  }

  const reportQuery = new URLSearchParams({
    from: resolved.from,
    to: resolved.to,
  });
  const officeId = (scopedQuery.get("officeId") || "").trim();
  if (officeId) {
    reportQuery.set("officeId", officeId);
  }

  const response = await clockinFetch(withQuery("/reports/sales", reportQuery));
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return new NextResponse(JSON.stringify(error), { status: response.status });
  }

  const data = (await response.json()) as SalesReportResponse;
  const company = await getCompanyExportProfile();
  const companyRows = companyMetaRows(company);
  const expenses = data.expenses || [];
  const totals = expenses.reduce(
    (acc, row) => {
      acc.totalExpenses += row.amount;
      if (row.paymentMethod === "CASH") {
        acc.cashExpenses += row.amount;
      } else if (row.paymentMethod === "DEBIT_CARD") {
        acc.debitCardExpenses += row.amount;
      } else if (row.paymentMethod === "CHECK") {
        acc.checkExpenses += row.amount;
      }
      return acc;
    },
    {
      totalExpenses: 0,
      cashExpenses: 0,
      debitCardExpenses: 0,
      checkExpenses: 0,
    },
  );

  const fileLabel =
    periodLabel === "CUSTOM"
      ? `${resolved.from}-to-${resolved.to}`
      : `${period.toLowerCase()}-${resolved.from}-to-${resolved.to}`;
  const normalizedFormat = format as ExpenseExportFormat;

  if (normalizedFormat === "excel") {
    return excelResponse(`daily-expenses-${fileLabel}.xlsx`, (workbook) => {
      const summary = workbook.addWorksheet("Summary");
      summary.addRow([company.displayName]);
      summary.addRow(["Report", "Daily Expense Report"]);
      summary.addRow(["Range", `${resolved.from} - ${resolved.to}`]);
      companyRows.slice(1).forEach(([label, value]) => {
        summary.addRow([label, value]);
      });
      summary.addRow([]);
      summary.columns = [
        { header: "Metric", key: "metric", width: 34 },
        { header: "Amount", key: "amount", width: 18 },
      ];
      summary.addRows([
        { metric: "Period", amount: periodLabel },
        { metric: "From", amount: resolved.from },
        { metric: "To", amount: resolved.to },
        { metric: "Total Expenses", amount: totals.totalExpenses },
        { metric: "Cash Expenses", amount: totals.cashExpenses },
        { metric: "Debit Card Expenses", amount: totals.debitCardExpenses },
        { metric: "Check Expenses", amount: totals.checkExpenses },
      ]);

      const sheet = workbook.addWorksheet("Expenses");
      sheet.columns = [
        { header: "Date", key: "date", width: 14 },
        { header: "Company", key: "companyName", width: 28 },
        { header: "Method", key: "paymentMethod", width: 14 },
        { header: "Amount", key: "amount", width: 14 },
        { header: "Invoice #", key: "invoiceNumber", width: 18 },
        { header: "Check #", key: "checkNumber", width: 18 },
        { header: "Pay To Company", key: "payToCompany", width: 26 },
        { header: "Submitted By", key: "submittedBy", width: 24 },
        { header: "Has Receipt", key: "hasReceipt", width: 14 },
        { header: "Notes", key: "notes", width: 42 },
      ];
      expenses.forEach((row) =>
        sheet.addRow({
          ...row,
          hasReceipt: row.hasReceipt ? "Yes" : "No",
        }),
      );
      sheet.getColumn("amount").numFmt = "$#,##0.00";
    });
  }

  if (normalizedFormat === "csv") {
    const rows: unknown[][] = [
      [company.displayName],
      ["Daily Expenses Report"],
      [`Period: ${periodLabel}`],
      [`Range: ${resolved.from} to ${resolved.to}`],
      ...companyRows.slice(1).map(([label, value]) => [`${label}:`, value]),
      [],
      ["Summary"],
      ["Metric", "Amount"],
      ["Total Expenses", totals.totalExpenses],
      ["Cash Expenses", totals.cashExpenses],
      ["Debit Card Expenses", totals.debitCardExpenses],
      ["Check Expenses", totals.checkExpenses],
      [],
      ["Expense Entries"],
      [
        "Date",
        "Company",
        "Method",
        "Amount",
        "Invoice #",
        "Check #",
        "Pay To Company",
        "Submitted By",
        "Has Receipt",
        "Notes",
      ],
      ...expenses.map((row) => [
        row.date,
        row.companyName,
        row.paymentMethod,
        row.amount,
        row.invoiceNumber,
        row.checkNumber || "",
        row.payToCompany || "",
        row.submittedBy || "",
        row.hasReceipt ? "Yes" : "No",
        row.notes || "",
      ]),
    ];

    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="daily-expenses-${fileLabel}.csv"`,
      },
    });
  }

  const pdf = buildPdf(expenses, totals, {
    from: resolved.from,
    to: resolved.to,
    periodLabel,
  }, companyRows);
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="daily-expenses-${fileLabel}.pdf"`,
    },
  });
}
