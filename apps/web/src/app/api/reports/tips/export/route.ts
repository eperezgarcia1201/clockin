import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../../lib/clockin-api";
import {
  companyMetaRows,
  getCompanyExportProfile,
} from "../../../../../lib/company-export";
import {
  scopedQueryFromRequest,
  withQuery,
} from "../../../../../lib/location-scope";

export const runtime = "nodejs";

type DayTip = {
  date: string;
  cashTips: number;
  creditCardTips: number;
  totalTips: number;
};

type EmployeeTipReport = {
  id: string;
  name: string;
  totalCashTips: number;
  totalCreditCardTips: number;
  totalTips: number;
  days: DayTip[];
};

type TipsReportResponse = {
  range: { from: string; to: string };
  employees: EmployeeTipReport[];
};

const formatMoney = (value: number) => `$${Number(value || 0).toFixed(2)}`;

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
  w: number,
  h: number,
  fillGray?: number,
) => {
  if (typeof fillGray === "number") {
    commands.push(`${fillGray} g ${x} ${y} ${w} ${h} re f`);
  }
  commands.push(`0 G ${x} ${y} ${w} ${h} re S`);
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

export async function GET(request: Request) {
  const query = await scopedQueryFromRequest(request);
  const response = await clockinFetch(withQuery("/reports/tips", query));
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return new NextResponse(JSON.stringify(error), { status: response.status });
  }

  const data = (await response.json()) as TipsReportResponse;
  const company = await getCompanyExportProfile();
  const companyRows = companyMetaRows(company);
  const pages: string[] = [];
  let commands: string[] = [];
  let y = 790;

  const addPage = () => {
    if (commands.length > 0) {
      pages.push(commands.join("\n"));
    }
    commands = [];
    y = 790;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < 40) {
      addPage();
    }
  };

  addPage();

  const grandTotals = data.employees.reduce(
    (acc, employee) => {
      acc.total += employee.totalTips;
      acc.cash += employee.totalCashTips;
      acc.credit += employee.totalCreditCardTips;
      return acc;
    },
    { total: 0, cash: 0, credit: 0 },
  );

  drawText(commands, company.displayName, 45, y, 34, true);
  y -= 56;
  companyRows.slice(1).forEach(([label, value]) => {
    if (!value) return;
    drawText(commands, `${label}: ${value}`, 45, y, 9);
    y -= 12;
  });
  y -= 8;
  drawText(commands, "Tips Report", 45, y, 18, true);
  y -= 28;
  drawText(commands, `Report Range: ${data.range.from} - ${data.range.to}`, 45, y, 10);
  y -= 14;
  drawText(commands, `Total Employees: ${data.employees.length}`, 45, y, 10);
  y -= 28;

  const tableX = 75;
  const tableW = 445;
  const headerH = 20;
  const rowH = 20;
  const metricW = 325;
  const summaryTop = y;
  const summaryRows = [
    ["Total Tips (All Employees)", formatMoney(grandTotals.total)],
    ["Total Cash", formatMoney(grandTotals.cash)],
    ["Total Credit Card", formatMoney(grandTotals.credit)],
  ];

  drawRect(commands, tableX, summaryTop - headerH, tableW, headerH, 0.85);
  drawText(commands, "Metric", tableX + 8, summaryTop - 14, 10);
  drawText(commands, "Amount", tableX + metricW + 8, summaryTop - 14, 10);
  drawLine(commands, tableX + metricW, summaryTop, tableX + metricW, summaryTop - (headerH + rowH * summaryRows.length));

  summaryRows.forEach((row, index) => {
    const rowTop = summaryTop - headerH - index * rowH;
    drawRect(commands, tableX, rowTop - rowH, tableW, rowH);
    drawText(commands, row[0], tableX + 8, rowTop - 14, 10);
    drawText(commands, row[1], tableX + metricW + 8, rowTop - 14, 10);
  });
  y = summaryTop - headerH - rowH * summaryRows.length - 56;

  const activeEmployees = data.employees.filter((employee) => employee.days.length > 0);
  const inactiveEmployees = data.employees.filter((employee) => employee.days.length === 0);

  for (const employee of activeEmployees) {
    const employeeBlockHeight = 110 + Math.max(employee.days.length, 1) * 20;
    ensureSpace(employeeBlockHeight);

    drawText(commands, employee.name, 45, y, 22, true);
    y -= 28;
    drawText(commands, `Total Tips: ${formatMoney(employee.totalTips)}`, 45, y, 11);
    y -= 14;
    drawText(commands, `Cash: ${formatMoney(employee.totalCashTips)}`, 45, y, 11);
    y -= 14;
    drawText(commands, `Credit Card: ${formatMoney(employee.totalCreditCardTips)}`, 45, y, 11);
    y -= 24;

    const empTableX = 110;
    const empTableW = 380;
    const colDate = 120;
    const colCash = 80;
    const colCredit = 100;
    const empHeaderY = y;

    drawRect(commands, empTableX, empHeaderY - 18, empTableW, 18, 0.9);
    drawText(commands, "Date", empTableX + 6, empHeaderY - 13, 9);
    drawText(commands, "Cash", empTableX + colDate + 6, empHeaderY - 13, 9);
    drawText(commands, "Credit Card", empTableX + colDate + colCash + 6, empHeaderY - 13, 9);
    drawText(commands, "Total", empTableX + colDate + colCash + colCredit + 6, empHeaderY - 13, 9);

    const split1 = empTableX + colDate;
    const split2 = split1 + colCash;
    const split3 = split2 + colCredit;
    const tableBottom = empHeaderY - 18 - Math.max(employee.days.length, 1) * 18;
    drawLine(commands, split1, empHeaderY, split1, tableBottom);
    drawLine(commands, split2, empHeaderY, split2, tableBottom);
    drawLine(commands, split3, empHeaderY, split3, tableBottom);

    if (employee.days.length === 0) {
      drawRect(commands, empTableX, empHeaderY - 36, empTableW, 18);
      drawText(commands, "No entries", empTableX + 6, empHeaderY - 31, 9);
    } else {
      employee.days.forEach((day, index) => {
        const rowTop = empHeaderY - 18 - index * 18;
        drawRect(commands, empTableX, rowTop - 18, empTableW, 18);
        drawText(commands, day.date, empTableX + 6, rowTop - 13, 9);
        drawText(commands, formatMoney(day.cashTips), split1 + 6, rowTop - 13, 9);
        drawText(commands, formatMoney(day.creditCardTips), split2 + 6, rowTop - 13, 9);
        drawText(commands, formatMoney(day.totalTips), split3 + 6, rowTop - 13, 9);
      });
    }

    y = tableBottom - 52;
  }

  ensureSpace(60 + inactiveEmployees.length * 14);
  drawText(commands, "Employees Without Activity", 45, y, 22, true);
  y -= 26;
  if (!inactiveEmployees.length) {
    drawText(commands, "None", 45, y, 11);
  } else {
    for (const employee of inactiveEmployees) {
      ensureSpace(16);
      drawText(commands, `- ${employee.name}`, 45, y, 11);
      y -= 14;
    }
  }

  y -= 36;
  ensureSpace(120);
  drawText(commands, "Final Totals Summary", 45, y, 18, true);
  y -= 24;

  const finalTableX = 75;
  const finalTableW = 445;
  const finalHeaderH = 20;
  const finalRowH = 20;
  const finalMetricW = 325;
  const finalSummaryTop = y;
  const finalRows = [
    ["Final Total Tips", formatMoney(grandTotals.total)],
    ["Final Total Cash", formatMoney(grandTotals.cash)],
    ["Final Total Credit Card", formatMoney(grandTotals.credit)],
  ];

  drawRect(commands, finalTableX, finalSummaryTop - finalHeaderH, finalTableW, finalHeaderH, 0.85);
  drawText(commands, "Metric", finalTableX + 8, finalSummaryTop - 14, 10);
  drawText(commands, "Amount", finalTableX + finalMetricW + 8, finalSummaryTop - 14, 10);
  drawLine(
    commands,
    finalTableX + finalMetricW,
    finalSummaryTop,
    finalTableX + finalMetricW,
    finalSummaryTop - (finalHeaderH + finalRowH * finalRows.length),
  );

  finalRows.forEach((row, index) => {
    const rowTop = finalSummaryTop - finalHeaderH - index * finalRowH;
    drawRect(commands, finalTableX, rowTop - finalRowH, finalTableW, finalRowH);
    drawText(commands, row[0], finalTableX + 8, rowTop - 14, 10);
    drawText(commands, row[1], finalTableX + finalMetricW + 8, rowTop - 14, 10);
  });

  pages.push(commands.join("\n"));
  const bytes = buildPdf(pages);

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="tips-report-${data.range.from}-to-${data.range.to}.pdf"`,
    },
  });
}
