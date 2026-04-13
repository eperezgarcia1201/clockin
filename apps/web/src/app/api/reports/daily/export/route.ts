import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../../lib/clockin-api";
import {
  companyMetaRows,
  getCompanyExportProfile,
} from "../../../../../lib/company-export";
import { excelResponse } from "../../../../../lib/excel-export";
import {
  scopedQueryFromRequest,
  withQuery,
} from "../../../../../lib/location-scope";

export const runtime = "nodejs";

type DailyReportDay = {
  date?: string;
  firstIn?: string;
  lastOut?: string;
  hoursFormatted?: string;
  hoursDecimal?: number;
  scheduledPaidMinutes?: number;
  overScheduleMinutes?: number;
  photoCount?: number;
  photoPunches?: Array<{
    punchId?: string;
    type?: string;
    occurredAt?: string;
  }>;
};

type DailyReportEmployee = {
  name?: string;
  days?: DailyReportDay[];
  totalHoursFormatted?: string;
  totalHoursDecimal?: number;
};

type DailyReportResponse = {
  range?: { from?: string; to?: string };
  employees?: DailyReportEmployee[];
};

type ExportFormat = "excel" | "pdf";

const formatDuration = (minutes?: number) => {
  const safeMinutes =
    typeof minutes === "number" && Number.isFinite(minutes)
      ? Math.max(0, Math.round(minutes))
      : 0;
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${hours}:${String(mins).padStart(2, "0")}`;
};

const parseIsoDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const parsed = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatUsDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value || "").trim());
  if (!match) {
    return value;
  }
  return `${match[2]}/${match[3]}/${match[1]}`;
};

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

const formatLongDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

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

const formatPunchTime = (value?: string) => {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const buildPdf = (
  data: DailyReportResponse,
  companyRows: Array<[string, string]>,
) => {
  type FlatRow = {
    employeeName: string;
    date: string;
    firstIn: string;
    lastOut: string;
    totalHours: string;
    decimal: string;
    scheduledPaid: string;
    overSchedule: string;
    isTotal: boolean;
  };

  const flatRows: FlatRow[] = [];
  let totalHours = 0;
  let totalDayRows = 0;
  let totalOverScheduleMinutes = 0;

  for (const employee of data.employees || []) {
    totalHours += employee.totalHoursDecimal || 0;
    for (const day of employee.days || []) {
      totalDayRows += 1;
      totalOverScheduleMinutes += Math.max(0, day.overScheduleMinutes || 0);
      flatRows.push({
        employeeName: employee.name || "-",
        date: day.date || "",
        firstIn: formatPunchTime(day.firstIn),
        lastOut: formatPunchTime(day.lastOut),
        totalHours: day.hoursFormatted || "-",
        decimal: Number(day.hoursDecimal || 0).toFixed(2),
        scheduledPaid:
          typeof day.scheduledPaidMinutes === "number"
            ? formatDuration(day.scheduledPaidMinutes)
            : "-",
        overSchedule:
          typeof day.overScheduleMinutes === "number" &&
          day.overScheduleMinutes > 0
            ? formatDuration(day.overScheduleMinutes)
            : "-",
        isTotal: false,
      });
    }

    flatRows.push({
      employeeName: `${employee.name || "-"} TOTAL`,
      date: "",
      firstIn: "",
      lastOut: "",
      totalHours: employee.totalHoursFormatted || "-",
      decimal: Number(employee.totalHoursDecimal || 0).toFixed(2),
      scheduledPaid: "",
      overSchedule: "",
      isTotal: true,
    });
  }

  const periodLabel = formatReportPeriod(
    data.range?.from || "from",
    data.range?.to || "to",
  );
  const generatedOn = formatLongDate(new Date());
  const summaryLabels = [
    "Employees",
    "Day Rows",
    "Total Hours",
    "Over Schedule",
  ];
  const summaryValues = [
    String(data.employees?.length || 0),
    String(totalDayRows),
    Number(totalHours).toFixed(2),
    formatDuration(totalOverScheduleMinutes),
  ];

  const pageLeft = 52;
  const pageRight = 543;
  const tableX = 52;
  const tableWidth = pageRight - tableX;
  const headerHeight = 18;
  const rowHeight = 17;
  const textWidth = (text: string, size: number) => text.length * size * 0.5;

  const detailColumns: Array<{
    label: string;
    width: number;
    align?: "left" | "right";
  }> = [
    { label: "Employee", width: 126 },
    { label: "Date", width: 50 },
    { label: "First In", width: 58 },
    { label: "Last Out", width: 58 },
    { label: "Total", width: 46 },
    { label: "Decimal", width: 46, align: "right" },
    { label: "Scheduled", width: 54 },
    { label: "Over", width: 53 },
  ];

  let commands: string[] = [];
  let y = 780;
  const pages: string[] = [];

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

  const drawDetailHeader = () => {
    drawRect(
      commands,
      tableX,
      y - headerHeight,
      tableWidth,
      headerHeight,
      0.12,
      0.2,
    );
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
      continued ? "Daily Time Report (continued)" : "Daily Time Report",
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
      const summaryWidth = tableWidth / 4;
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
      for (let idx = 1; idx < 4; idx += 1) {
        const x = tableX + summaryWidth * idx;
        drawLine(commands, x, y, x, y - summaryRowHeight * 2, 0.35);
      }
      summaryLabels.forEach((label, index) => {
        const x = tableX + summaryWidth * index;
        drawCellText(label, x, y - 13, summaryWidth, 9, "center", true, 1);
        drawCellText(
          summaryValues[index],
          x,
          y - 33,
          summaryWidth,
          10,
          "center",
          true,
          1,
        );
      });
      y -= summaryRowHeight * 2 + 28;
    }

    drawText(commands, "Daily Details", pageLeft, y, 11, true);
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
      "No daily time activity recorded during this reporting period.",
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

      const fillGray = row.isTotal ? 0.86 : rowIndex % 2 === 0 ? 0.97 : 0.93;
      drawRect(
        commands,
        tableX,
        y - rowHeight,
        tableWidth,
        rowHeight,
        fillGray,
        0.85,
      );

      const cells = [
        row.employeeName,
        row.date ? formatUsDate(row.date) : "",
        row.firstIn,
        row.lastOut,
        row.totalHours,
        row.decimal,
        row.scheduledPaid,
        row.overSchedule,
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
          row.isTotal,
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
  drawText(
    commands,
    `Total Records: ${flatRows.length}`,
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

  if ((data.employees || []).length > 0) {
    let secondaryY = footerTop - 30;
    const employeeSummaries = (data.employees || []).map((employee) => {
      const name = employee.name || "-";
      const hours = Number(employee.totalHoursDecimal || 0).toFixed(2);
      return `${name}: ${hours} hrs | ${employee.totalHoursFormatted || "-"}`;
    });
    for (const summary of employeeSummaries) {
      if (secondaryY < 48) {
        break;
      }
      drawText(
        commands,
        truncateByWidth(summary, pageRight - pageLeft),
        pageLeft,
        secondaryY,
        8,
        false,
        0.35,
      );
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

  if (!["excel", "pdf"].includes(format)) {
    return NextResponse.json(
      { error: "format must be excel or pdf" },
      { status: 400 },
    );
  }

  const params = new URLSearchParams(scopedQuery);
  params.delete("format");
  const response = await clockinFetch(withQuery("/reports/daily", params));
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return new Response(JSON.stringify(error), { status: response.status });
  }

  const data = (await response.json()) as DailyReportResponse;
  const company = await getCompanyExportProfile();
  const companyRows = companyMetaRows(company);
  const from = data.range?.from || "from";
  const to = data.range?.to || "to";
  const fileLabel = `${from}-to-${to}`;

  if (format === "excel") {
    return excelResponse(`daily-report-${fileLabel}.xlsx`, (workbook) => {
      const sheet = workbook.addWorksheet("Daily Report");
      sheet.addRow([company.displayName]);
      sheet.addRow(["Report", "Daily Time Report"]);
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
        { header: "First In", key: "firstIn", width: 14 },
        { header: "Last Out", key: "lastOut", width: 14 },
        { header: "Hours (hh:mm)", key: "hours", width: 14 },
        { header: "Decimal", key: "decimal", width: 10 },
        { header: "Scheduled Paid (hh:mm)", key: "scheduledPaid", width: 18 },
        { header: "Over Schedule (hh:mm)", key: "overSchedule", width: 18 },
        { header: "Photo Count", key: "photoCount", width: 12 },
        { header: "Photo Punches", key: "photoPunches", width: 28 },
      ];

      data.employees?.forEach((employee) => {
        employee.days?.forEach((day) => {
          sheet.addRow({
            employee: employee.name || "",
            date: day.date || "",
            firstIn: day.firstIn
              ? new Date(day.firstIn).toLocaleTimeString()
              : "",
            lastOut: day.lastOut
              ? new Date(day.lastOut).toLocaleTimeString()
              : "",
            hours: day.hoursFormatted || "",
            decimal: day.hoursDecimal ?? "",
            scheduledPaid:
              typeof day.scheduledPaidMinutes === "number"
                ? formatDuration(day.scheduledPaidMinutes)
                : "",
            overSchedule:
              typeof day.overScheduleMinutes === "number" &&
              day.overScheduleMinutes > 0
                ? formatDuration(day.overScheduleMinutes)
                : "",
            photoCount: day.photoCount ?? 0,
            photoPunches:
              day.photoPunches
                ?.map((punch) => {
                  const occurredAt = punch.occurredAt
                    ? new Date(punch.occurredAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "";
                  return `${punch.type || ""} ${occurredAt}`.trim();
                })
                .join("; ") || "",
          });
        });
        sheet.addRow({
          employee: `${employee.name || ""} TOTAL`,
          date: "",
          firstIn: "",
          lastOut: "",
          hours: employee.totalHoursFormatted || "",
          decimal: employee.totalHoursDecimal ?? "",
          scheduledPaid: "",
          overSchedule: "",
          photoCount: "",
          photoPunches: "",
        });
        sheet.addRow({});
      });
    });
  }

  const pdf = buildPdf(data, companyRows);
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"daily-report-${fileLabel}.pdf\"`,
    },
  });
}
