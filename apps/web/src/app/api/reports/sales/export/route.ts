import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../../lib/clockin-api";
import { excelResponse } from "../../../../../lib/excel-export";
import {
  companyMetaRows,
  getCompanyExportProfile,
} from "../../../../../lib/company-export";
import {
  scopedQueryFromRequest,
  withQuery,
} from "../../../../../lib/location-scope";

export const runtime = "nodejs";

type ExpensePaymentMethod = "CHECK" | "DEBIT_CARD" | "CASH";

type SalesReportRow = {
  id: string;
  date: string;
  foodSales: number;
  liquorSales: number;
  totalSales: number;
  cashPayments: number;
  bankDepositBatch: string;
  checkPayments: number;
  creditCardPayments: number;
  otherPayments: number;
  totalPayments: number;
  balance: number;
  notes: string;
  submittedBy: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
};

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
  totals: {
    foodSales: number;
    liquorSales: number;
    totalSales: number;
    cashPayments: number;
    checkPayments: number;
    creditCardPayments: number;
    otherPayments: number;
    totalPayments: number;
    balance: number;
  };
  reports: SalesReportRow[];
  expenseTotals: {
    totalExpenses: number;
    cashExpenses: number;
    debitCardExpenses: number;
    checkExpenses: number;
  };
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

const buildPdf = (pages: string[]) => {
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

const formatUsDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value || "").trim());
  if (!match) {
    return value;
  }
  return `${match[2]}/${match[3]}/${match[1]}`;
};

const formatLongDate = (value: string | Date) => {
  const date =
    value instanceof Date
      ? value
      : new Date(
          /^(\d{4})-(\d{2})-(\d{2})$/.test(value) ? `${value}T00:00:00` : value,
        );
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const truncate = (value: string | null | undefined, max = 36) => {
  const text = (value || "").trim();
  if (text.length <= max) {
    return text || "-";
  }
  return `${text.slice(0, max - 1)}…`;
};

const buildSalesPdf = (
  data: SalesReportResponse,
  companyRows: Array<[string, string]>,
) => {
  const pages: string[] = [];
  let commands: string[] = [];
  let y = 790;
  const tableX = 45;
  const tableWidth = 505;
  const tableHeaderHeight = 18;
  const tableRowHeight = 18;

  const addFooter = () => {
    commands.push(
      `0.55 g BT /F1 7 Tf 1 0 0 1 45 26 Tm (${escapePdfText(
        "Confidential - Internal Financial Report | WEBSYS Workforce Reporting System",
      )}) Tj ET`,
    );
  };

  const pushPage = () => {
    if (commands.length > 0) {
      addFooter();
      pages.push(commands.join("\n"));
    }
  };

  const addPage = () => {
    pushPage();
    commands = [];
    y = 790;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < 68) {
      addPage();
    }
  };

  const addLine = (
    text: string,
    bold = false,
    size = 10,
    step = 14,
    x = 45,
  ) => {
    ensureSpace(step + 4);
    drawText(commands, text, x, y, size, bold);
    y -= step;
  };

  const drawSummaryTable = (rows: Array<[string, string]>) => {
    const x = 75;
    const width = 430;
    const categoryWidth = 280;
    const headerHeight = 18;
    const rowHeight = 18;
    const tableHeight = headerHeight + rowHeight * rows.length;

    ensureSpace(tableHeight + 20);
    const top = y;

    drawRect(commands, x, top - headerHeight, width, headerHeight, 0.85);
    drawText(commands, "Category", x + 8, top - 12, 9, false);
    drawText(commands, "Amount", x + categoryWidth + 8, top - 12, 9, false);
    drawLine(
      commands,
      x + categoryWidth,
      top,
      x + categoryWidth,
      top - tableHeight,
    );

    rows.forEach((row, index) => {
      const rowTop = top - headerHeight - index * rowHeight;
      drawRect(commands, x, rowTop - rowHeight, width, rowHeight);
      drawText(commands, row[0], x + 8, rowTop - 12, 9, false);
      drawText(commands, row[1], x + categoryWidth + 8, rowTop - 12, 9, true);
    });

    y = top - tableHeight - 24;
  };

  type TableColumn = {
    label: string;
    width: number;
  };

  const drawTableHeader = (columns: TableColumn[]) => {
    drawRect(
      commands,
      tableX,
      y - tableHeaderHeight,
      tableWidth,
      tableHeaderHeight,
      0.9,
    );
    let offset = tableX;
    for (let index = 0; index < columns.length; index += 1) {
      const column = columns[index];
      drawText(commands, column.label, offset + 6, y - 12, 8, false);
      offset += column.width;
      if (index < columns.length - 1) {
        drawLine(commands, offset, y, offset, y - tableHeaderHeight);
      }
    }
    y -= tableHeaderHeight;
  };

  const drawTableRow = (columns: TableColumn[], cells: string[]) => {
    drawRect(commands, tableX, y - tableRowHeight, tableWidth, tableRowHeight);
    let offset = tableX;
    for (let index = 0; index < columns.length; index += 1) {
      drawText(
        commands,
        truncate(cells[index], 32),
        offset + 6,
        y - 12,
        8,
        false,
      );
      offset += columns[index].width;
      if (index < columns.length - 1) {
        drawLine(commands, offset, y, offset, y - tableRowHeight);
      }
    }
    y -= tableRowHeight;
  };

  addPage();

  addLine(companyRows[0]?.[1] || "WEBSYS WORKFORCE", true, 26, 34);
  companyRows.slice(1).forEach(([label, value]) => {
    if (!value) return;
    addLine(`${label}: ${value}`, false, 9, 12);
  });
  addLine("Monthly Sales & Expense Report", true, 13, 18);
  addLine(
    `Report Period: ${formatLongDate(data.range.from)} - ${formatLongDate(data.range.to)}`,
    false,
    9,
    12,
  );
  addLine(`Generated On: ${formatLongDate(new Date())}`, true, 9, 13);
  y -= 10;

  addLine("Financial Summary", true, 16, 22);
  drawSummaryTable([
    ["Total Sales", formatMoney(data.totals.totalSales)],
    ["Total Payments", formatMoney(data.totals.totalPayments)],
    ["Balance", formatMoney(data.totals.balance)],
    ["Total Expenses", formatMoney(data.expenseTotals.totalExpenses)],
    ["Cash Expenses", formatMoney(data.expenseTotals.cashExpenses)],
    ["Debit Card Expenses", formatMoney(data.expenseTotals.debitCardExpenses)],
    ["Check Expenses", formatMoney(data.expenseTotals.checkExpenses)],
  ]);

  addLine("Daily Sales Activity", true, 16, 22);
  const salesColumns: TableColumn[] = [
    { label: "Date", width: 68 },
    { label: "Food", width: 72 },
    { label: "Liquor", width: 72 },
    { label: "Batch", width: 110 },
    { label: "Total", width: 90 },
    { label: "Balance", width: 93 },
  ];

  if (!data.reports.length) {
    addLine(
      "No sales activity recorded during this reporting period.",
      false,
      9,
      14,
    );
  } else {
    ensureSpace(tableHeaderHeight + tableRowHeight + 12);
    drawTableHeader(salesColumns);
    for (const row of data.reports) {
      if (y - tableRowHeight < 68) {
        addPage();
        addLine("Daily Sales Activity (continued)", true, 12, 16);
        ensureSpace(tableHeaderHeight + tableRowHeight + 12);
        drawTableHeader(salesColumns);
      }
      drawTableRow(salesColumns, [
        formatUsDate(row.date),
        formatMoney(row.foodSales),
        formatMoney(row.liquorSales),
        row.bankDepositBatch || "-",
        formatMoney(row.totalSales),
        formatMoney(row.balance),
      ]);
    }
    y -= 12;
  }

  addLine("Expense Activity", true, 16, 22);
  const expenseColumns: TableColumn[] = [
    { label: "Date", width: 74 },
    { label: "Company", width: 145 },
    { label: "Method", width: 78 },
    { label: "Invoice #", width: 84 },
    { label: "Amount", width: 72 },
    { label: "Receipt", width: 52 },
  ];

  if (!data.expenses.length) {
    addLine(
      "No expense transactions recorded during this reporting period.",
      false,
      9,
      14,
    );
  } else {
    ensureSpace(tableHeaderHeight + tableRowHeight + 12);
    drawTableHeader(expenseColumns);
    for (const row of data.expenses) {
      if (y - tableRowHeight < 68) {
        addPage();
        addLine("Expense Activity (continued)", true, 12, 16);
        ensureSpace(tableHeaderHeight + tableRowHeight + 12);
        drawTableHeader(expenseColumns);
      }
      drawTableRow(expenseColumns, [
        formatUsDate(row.date),
        row.companyName,
        row.paymentMethod.replace("_", " "),
        row.invoiceNumber,
        formatMoney(row.amount),
        row.hasReceipt ? "Yes" : "No",
      ]);
    }
  }

  pushPage();
  return buildPdf(pages);
};

export async function GET(request: Request) {
  const scopedQuery = await scopedQueryFromRequest(request);
  const format = (scopedQuery.get("format") || "excel").toLowerCase();

  if (!["excel", "csv", "pdf"].includes(format)) {
    return NextResponse.json(
      { error: "format must be excel, csv, or pdf" },
      { status: 400 },
    );
  }

  const reportParams = new URLSearchParams(scopedQuery);
  reportParams.delete("format");
  const response = await clockinFetch(withQuery("/reports/sales", reportParams));
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return new NextResponse(JSON.stringify(error), { status: response.status });
  }

  const data = (await response.json()) as SalesReportResponse;
  const company = await getCompanyExportProfile();
  const companyRows = companyMetaRows(company);
  const rangeLabel = `${data.range.from}-to-${data.range.to}`;

  if (format === "excel") {
    return excelResponse(`sales-report-${rangeLabel}.xlsx`, (workbook) => {
      const summary = workbook.addWorksheet("Summary");
      summary.addRow([company.displayName]);
      summary.addRow(["Report", "Monthly Sales & Expense Report"]);
      summary.addRow(["Range", `${data.range.from} - ${data.range.to}`]);
      companyRows.slice(1).forEach(([label, value]) => {
        summary.addRow([label, value]);
      });
      summary.addRow([]);
      summary.columns = [
        { header: "Metric", key: "metric", width: 36 },
        { header: "Amount", key: "amount", width: 18 },
      ];
      summary.addRows([
        { metric: "Total Sales", amount: data.totals.totalSales },
        { metric: "Total Payments", amount: data.totals.totalPayments },
        { metric: "Balance", amount: data.totals.balance },
        { metric: "Total Expenses", amount: data.expenseTotals.totalExpenses },
        { metric: "Cash Expenses", amount: data.expenseTotals.cashExpenses },
        {
          metric: "Debit Card Expenses",
          amount: data.expenseTotals.debitCardExpenses,
        },
        { metric: "Check Expenses", amount: data.expenseTotals.checkExpenses },
      ]);
      summary.getColumn("amount").numFmt = "$#,##0.00";

      const sales = workbook.addWorksheet("Sales Entries");
      sales.columns = [
        { header: "Date", key: "date", width: 14 },
        { header: "Food Sales", key: "foodSales", width: 14 },
        { header: "Liquor Sales", key: "liquorSales", width: 14 },
        { header: "Total Sales", key: "totalSales", width: 14 },
        { header: "Bank Deposit Batch", key: "bankDepositBatch", width: 22 },
        { header: "Total Payments", key: "totalPayments", width: 14 },
        { header: "Balance", key: "balance", width: 12 },
        { header: "Submitted By", key: "submittedBy", width: 24 },
        { header: "Notes", key: "notes", width: 42 },
      ];
      data.reports.forEach((row) => sales.addRow(row));
      [
        "foodSales",
        "liquorSales",
        "totalSales",
        "totalPayments",
        "balance",
      ].forEach((key) => {
        sales.getColumn(key).numFmt = "$#,##0.00";
      });

      const expenses = workbook.addWorksheet("Expense Entries");
      expenses.columns = [
        { header: "Date", key: "date", width: 14 },
        { header: "Company", key: "companyName", width: 28 },
        { header: "Method", key: "paymentMethod", width: 14 },
        { header: "Amount", key: "amount", width: 14 },
        { header: "Invoice #", key: "invoiceNumber", width: 18 },
        { header: "Check #", key: "checkNumber", width: 18 },
        { header: "Check Pay To", key: "payToCompany", width: 26 },
        { header: "Submitted By", key: "submittedBy", width: 24 },
        { header: "Has Receipt", key: "hasReceipt", width: 14 },
        { header: "Notes", key: "notes", width: 42 },
      ];
      data.expenses.forEach((row) =>
        expenses.addRow({
          ...row,
          hasReceipt: row.hasReceipt ? "Yes" : "No",
        }),
      );
      expenses.getColumn("amount").numFmt = "$#,##0.00";
    });
  }

  if (format === "csv") {
    const csvRows: unknown[][] = [
      [company.displayName],
      ["Daily Sales Report"],
      [`Range: ${data.range.from} to ${data.range.to}`],
      ...companyRows.slice(1).map(([label, value]) => [`${label}:`, value]),
      [],
      ["Summary"],
      ["Metric", "Amount"],
      ["Total Sales", data.totals.totalSales],
      ["Total Payments", data.totals.totalPayments],
      ["Balance", data.totals.balance],
      ["Total Expenses", data.expenseTotals.totalExpenses],
      ["Cash Expenses", data.expenseTotals.cashExpenses],
      ["Debit Card Expenses", data.expenseTotals.debitCardExpenses],
      ["Check Expenses", data.expenseTotals.checkExpenses],
      [],
      ["Sales Entries"],
      [
        "Date",
        "Food Sales",
        "Liquor Sales",
        "Total Sales",
        "Bank Deposit Batch",
        "Total Payments",
        "Balance",
        "Submitted By",
        "Notes",
      ],
      ...data.reports.map((row) => [
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
      [],
      ["Expense Entries"],
      [
        "Date",
        "Company",
        "Method",
        "Amount",
        "Invoice #",
        "Check #",
        "Check Pay To",
        "Submitted By",
        "Has Receipt",
        "Notes",
      ],
      ...data.expenses.map((row) => [
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

    return new NextResponse(toCsv(csvRows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sales-report-${rangeLabel}.csv"`,
      },
    });
  }

  const pdf = buildSalesPdf(data, companyRows);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="sales-report-${rangeLabel}.pdf"`,
    },
  });
}
