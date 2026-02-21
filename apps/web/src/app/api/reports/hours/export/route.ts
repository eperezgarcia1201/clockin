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

type DayHours = {
  date: string;
  minutes: number;
  hoursDecimal: number;
  hoursFormatted: string;
};

type EmployeeReport = {
  id: string;
  name: string;
  totalMinutes: number;
  totalHoursDecimal: number;
  totalHoursFormatted: string;
  days: DayHours[];
};

type ReportResponse = {
  range: { from: string; to: string };
  employees: EmployeeReport[];
};

type ExportFormat = "excel" | "csv" | "pdf";

const OVERTIME_MINUTES_PER_WEEK = 40 * 60;

const parseIsoDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const parsed = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getWeekStartIso = (isoDate: string, weekStartsOn = 1) => {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) return isoDate;
  const day = parsed.getUTCDay();
  const offset = (day - weekStartsOn + 7) % 7;
  parsed.setUTCDate(parsed.getUTCDate() - offset);
  return parsed.toISOString().slice(0, 10);
};

const buildWeeklyOvertime = (days: DayHours[]) => {
  const weeklyTotals = new Map<string, number>();
  for (const day of days) {
    const weekStart = getWeekStartIso(day.date);
    const minutes =
      typeof day.minutes === "number"
        ? day.minutes
        : Math.round((day.hoursDecimal || 0) * 60);
    weeklyTotals.set(weekStart, (weeklyTotals.get(weekStart) || 0) + minutes);
  }

  const weeklyRows = Array.from(weeklyTotals.entries())
    .map(([weekStart, totalMinutes]) => {
      const overtimeMinutes = Math.max(
        0,
        totalMinutes - OVERTIME_MINUTES_PER_WEEK,
      );
      return {
        weekStart,
        totalMinutes,
        totalHours: totalMinutes / 60,
        overtimeMinutes,
        overtimeHours: overtimeMinutes / 60,
      };
    })
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));

  const byDate = new Map<string, { weekStart: string; overtimeHours: number }>();
  days.forEach((day) => {
    const weekStart = getWeekStartIso(day.date);
    const week = weeklyRows.find((row) => row.weekStart === weekStart);
    byDate.set(day.date, {
      weekStart,
      overtimeHours: week?.overtimeHours || 0,
    });
  });

  return {
    weeklyRows,
    byDate,
    totalOvertimeHours: weeklyRows.reduce(
      (sum, row) => sum + row.overtimeHours,
      0,
    ),
  };
};

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
  const max = Math.max(4, Math.floor((width - 8) / 4.2));
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1)}…`;
};

const formatUsDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value || "").trim());
  if (!match) {
    return value;
  }
  return `${match[2]}/${match[3]}/${match[1]}`;
};

const formatUsShortDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value || "").trim());
  if (!match) {
    return value;
  }
  return `${match[2]}/${match[3]}`;
};

const formatLongDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatShortMonthDay = (value: string) => {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return formatUsDate(value);
  }
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  });
};

const formatReportPeriod = (from: string, to: string) => {
  const fromDate = parseIsoDate(from);
  const toDate = parseIsoDate(to);
  if (!fromDate || !toDate) {
    return `${formatUsDate(from)} - ${formatUsDate(to)}`;
  }
  if (fromDate.getUTCFullYear() === toDate.getUTCFullYear()) {
    return `${formatShortMonthDay(from)} - ${formatShortMonthDay(to)}, ${toDate.getUTCFullYear()}`;
  }
  return `${formatUsDate(from)} - ${formatUsDate(to)}`;
};

const buildPdf = (
  data: ReportResponse,
  companyRows: Array<[string, string]>,
) => {
  type FlatRow = {
    employeeName: string;
    date: string;
    weekStart: string;
    hoursFormatted: string;
    hoursDecimal: string;
    weeklyOvertimeHours: string;
  };

  const flatRows: FlatRow[] = [];
  let totalHours = 0;
  let totalOvertimeHours = 0;

  for (const employee of data.employees || []) {
    totalHours += employee.totalHoursDecimal || 0;
    const weekly = buildWeeklyOvertime(employee.days || []);
    totalOvertimeHours += weekly.totalOvertimeHours || 0;
    for (const day of employee.days || []) {
      const weekInfo = weekly.byDate.get(day.date);
      flatRows.push({
        employeeName: employee.name || "-",
        date: day.date,
        weekStart: weekInfo?.weekStart || day.date,
        hoursFormatted: day.hoursFormatted || "-",
        hoursDecimal: Number(day.hoursDecimal || 0).toFixed(2),
        weeklyOvertimeHours: Number(weekInfo?.overtimeHours || 0).toFixed(2),
      });
    }
  }

  flatRows.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.employeeName.localeCompare(b.employeeName);
  });

  const periodLabel = formatReportPeriod(data.range.from, data.range.to);
  const generatedOn = formatLongDate(new Date());
  const summaryLabels = ["Total Employees", "Total Hours", "Overtime Hours"];
  const summaryValues = [
    String(data.employees?.length || 0),
    Number(totalHours).toFixed(2),
    Number(totalOvertimeHours).toFixed(2),
  ];

  const pageLeft = 60;
  const pageRight = 525;
  const tableX = 60;
  const tableWidth = pageRight - tableX;
  const headerHeight = 18;
  const rowHeight = 17;
  const textWidth = (text: string, size: number) => text.length * size * 0.5;

  const detailColumns: Array<{
    label: string;
    width: number;
    align?: "left" | "right";
  }> = [
    { label: "Employee", width: 160 },
    { label: "Date", width: 56 },
    { label: "Week Start", width: 74 },
    { label: "Hours", width: 56 },
    { label: "Decimal", width: 56, align: "right" },
    { label: "OT (Week)", width: 63, align: "right" },
  ];

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

  const pages: string[] = [];
  let commands: string[] = [];
  let y = 780;

  const drawDetailHeader = () => {
    drawRect(commands, tableX, y - headerHeight, tableWidth, headerHeight, 0.12, 0.2);
    let x = tableX;
    detailColumns.forEach((column, index) => {
      drawCellText(column.label, x, y - 12, column.width, 8, "left", true, 1);
      x += column.width;
      if (index < detailColumns.length - 1) {
        drawLine(commands, x, y, x, y - headerHeight, 0.35);
      }
    });
    y -= headerHeight;
  };

  const drawTop = (continued = false, includeSummary = false) => {
    y = 780;
    drawText(
      commands,
      companyRows[0]?.[1] || "WEBSYS WORKFORCE",
      pageLeft,
      y,
      24,
      true,
    );
    y -= 34;
    companyRows.slice(1).forEach(([label, value]) => {
      if (!value) return;
      drawText(commands, `${label}: ${value}`, pageLeft, y, 8);
      y -= 11;
    });
    y -= 4;
    drawText(
      commands,
      continued ? "Hours Worked Report (continued)" : "Hours Worked Report",
      pageLeft,
      y,
      12,
      true,
    );
    y -= 18;
    drawText(commands, `Report Period: ${periodLabel}`, pageLeft, y, 10);
    y -= 13;
    drawText(commands, `Generated On: ${generatedOn}`, pageLeft, y, 10);
    y -= 16;
    drawLine(commands, pageLeft, y, pageRight, y, 0.55);
    y -= 18;

    if (includeSummary) {
      const summaryWidth = tableWidth / 3;
      const summaryRowHeight = 20;
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
      for (let idx = 1; idx < 3; idx += 1) {
        const x = tableX + summaryWidth * idx;
        drawLine(commands, x, y, x, y - summaryRowHeight * 2, 0.35);
      }
      summaryLabels.forEach((label, index) => {
        const x = tableX + summaryWidth * index;
        drawCellText(label, x, y - 13, summaryWidth, 9, "center", true, 1);
        drawCellText(summaryValues[index], x, y - 33, summaryWidth, 10, "center", true, 1);
      });
      y -= summaryRowHeight * 2 + 28;
    }

    drawText(commands, "Hours Details", pageLeft, y, 11, true);
    y -= 15;
    drawDetailHeader();
  };

  const addPage = (continued = false, includeSummary = false) => {
    if (commands.length) {
      pages.push(commands.join("\n"));
    }
    commands = [];
    drawTop(continued, includeSummary);
  };

  addPage(false, true);

  if (!flatRows.length) {
    drawText(
      commands,
      "No hours activity recorded during this reporting period.",
      tableX,
      y - 16,
      10,
    );
    y -= 24;
  } else {
    flatRows.forEach((row, rowIndex) => {
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
        row.employeeName,
        formatUsShortDate(row.date),
        formatUsShortDate(row.weekStart),
        row.hoursFormatted,
        row.hoursDecimal,
        row.weeklyOvertimeHours,
      ];

      let x = tableX;
      detailColumns.forEach((column, index) => {
        drawCellText(
          cells[index],
          x,
          y - 11.5,
          column.width,
          8.5,
          column.align || "left",
        );
        x += column.width;
        if (index < detailColumns.length - 1) {
          drawLine(commands, x, y, x, y - rowHeight, 0.88);
        }
      });

      y -= rowHeight;
    });
  }

  const footerTop = Math.max(y - 14, 70);
  drawLine(commands, pageLeft, footerTop + 16, pageRight, footerTop + 16, 0.55);
  drawText(commands, `Total Records: ${flatRows.length}`, pageLeft, footerTop, 10);
  drawText(
    commands,
    "Confidential - Internal Use Only",
    pageLeft,
    footerTop - 14,
    9,
    false,
    0.35,
  );

  if ((data.employees || []).length > 0) {
    let secondaryY = footerTop - 30;
    const employeeSummaries = (data.employees || []).map((employee) => {
      const weekly = buildWeeklyOvertime(employee.days || []);
      return `${employee.name}: ${Number(employee.totalHoursDecimal || 0).toFixed(2)} hrs | OT ${Number(weekly.totalOvertimeHours || 0).toFixed(2)} hrs`;
    });
    for (const summary of employeeSummaries) {
      if (secondaryY < 48) {
        break;
      }
      drawText(commands, truncateByWidth(summary, pageRight - pageLeft), pageLeft, secondaryY, 8, false, 0.35);
      secondaryY -= 10;
    }
  }

  pages.push(commands.join("\n"));
  return buildPdfDocument(pages);
};

export async function GET(request: Request) {
  const scopedQuery = await scopedQueryFromRequest(request);
  const format =
    ((scopedQuery.get("format") || "excel").toLowerCase() as ExportFormat) ||
    "excel";

  if (!["excel", "csv", "pdf"].includes(format)) {
    return NextResponse.json(
      { error: "format must be excel, csv, or pdf" },
      { status: 400 },
    );
  }

  const params = new URLSearchParams(scopedQuery);
  params.delete("format");
  const response = await clockinFetch(withQuery("/reports/hours", params));
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return new Response(JSON.stringify(error), { status: response.status });
  }

  const data = (await response.json()) as ReportResponse;
  const company = await getCompanyExportProfile();
  const companyRows = companyMetaRows(company);
  const from = data.range?.from || "from";
  const to = data.range?.to || "to";
  const fileLabel = `${from}-to-${to}`;

  if (format === "excel") {
    return excelResponse("hours-report.xlsx", (workbook) => {
      const sheet = workbook.addWorksheet("Hours Worked");
      sheet.addRow([company.displayName]);
      sheet.addRow(["Report", "Hours Worked"]);
      if (data.range?.from && data.range?.to) {
        sheet.addRow(["Range", `${data.range.from} - ${data.range.to}`]);
      }
      companyRows.slice(1).forEach(([label, value]) => {
        sheet.addRow([label, value]);
      });
      sheet.addRow([]);
      sheet.columns = [
        { header: "Employee", key: "employee", width: 26 },
        { header: "Date", key: "date", width: 14 },
        { header: "Week Start", key: "weekStart", width: 14 },
        { header: "Hours (hh:mm)", key: "hours", width: 14 },
        { header: "Decimal", key: "decimal", width: 10 },
        { header: "Minutes", key: "minutes", width: 10 },
        { header: "OT (week hrs)", key: "weeklyOtHours", width: 14 },
      ];

      (data.employees || []).forEach((employee) => {
        const weekly = buildWeeklyOvertime(employee.days || []);
        (employee.days || []).forEach((day) => {
          const weekInfo = weekly.byDate.get(day.date);
          sheet.addRow({
            employee: employee.name,
            date: day.date,
            weekStart: weekInfo?.weekStart || day.date,
            hours: day.hoursFormatted,
            decimal: day.hoursDecimal,
            minutes: day.minutes,
            weeklyOtHours: Number((weekInfo?.overtimeHours || 0).toFixed(2)),
          });
        });
        sheet.addRow({
          employee: `${employee.name} TOTAL`,
          date: "",
          weekStart: "",
          hours: employee.totalHoursFormatted,
          decimal: employee.totalHoursDecimal,
          minutes: employee.totalMinutes,
          weeklyOtHours: Number(weekly.totalOvertimeHours.toFixed(2)),
        });
        sheet.addRow({
          employee: `${employee.name} OT TOTAL`,
          date: "",
          weekStart: "",
          hours: "",
          decimal: "",
          minutes: "",
          weeklyOtHours: Number(weekly.totalOvertimeHours.toFixed(2)),
        });
        sheet.addRow({});
      });

      const weeklySheet = workbook.addWorksheet("Weekly Overtime");
      weeklySheet.columns = [
        { header: "Employee", key: "employee", width: 26 },
        { header: "Week Start", key: "weekStart", width: 14 },
        { header: "Week Total (hrs)", key: "weekHours", width: 14 },
        { header: "OT Hours", key: "otHours", width: 14 },
      ];
      (data.employees || []).forEach((employee) => {
        const weekly = buildWeeklyOvertime(employee.days || []);
        weekly.weeklyRows.forEach((row) => {
          weeklySheet.addRow({
            employee: employee.name,
            weekStart: row.weekStart,
            weekHours: Number(row.totalHours.toFixed(2)),
            otHours: Number(row.overtimeHours.toFixed(2)),
          });
        });
      });
    });
  }

  if (format === "csv") {
    const rows: unknown[][] = [
      [company.displayName],
      ["Hours Worked Report"],
      [`Range: ${from} to ${to}`],
      ...companyRows.slice(1).map(([label, value]) => [`${label}:`, value]),
      [],
      [
        "Employee",
        "Date",
        "Week Start",
        "Hours (hh:mm)",
        "Decimal",
        "Minutes",
        "OT (week hrs)",
      ],
    ];

    (data.employees || []).forEach((employee) => {
      const weekly = buildWeeklyOvertime(employee.days || []);
      (employee.days || []).forEach((day) => {
        const weekInfo = weekly.byDate.get(day.date);
        rows.push([
          employee.name,
          day.date,
          weekInfo?.weekStart || day.date,
          day.hoursFormatted,
          day.hoursDecimal,
          day.minutes,
          Number((weekInfo?.overtimeHours || 0).toFixed(2)),
        ]);
      });
      rows.push([
        `${employee.name} TOTAL`,
        "",
        "",
        employee.totalHoursFormatted,
        employee.totalHoursDecimal,
        employee.totalMinutes,
        Number(weekly.totalOvertimeHours.toFixed(2)),
      ]);
      rows.push([]);
    });

    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"hours-report-${fileLabel}.csv\"`,
      },
    });
  }

  const pdf = buildPdf(data, companyRows);
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"hours-report-${fileLabel}.pdf\"`,
    },
  });
}
