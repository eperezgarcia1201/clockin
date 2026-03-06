import type { Lang } from "./copy";
import { encodeText } from "./liquor-analytics-export-utils";
import { countUniqueEmployees, reportConfigs, type ReportRow } from "./report-export-pdf-config";
import type { ReportType } from "./types";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MAX_ROWS_PER_PAGE = 26;
const HEADER_HEIGHT = 25;
const ROW_HEIGHT = 18;
const TABLE_TOP_Y = 646.4;
const SUMMARY_X = 78;
const SUMMARY_ROW_ONE_Y = 121.8;
const SUMMARY_ROW_TWO_Y = 109.8;
const DEFAULT_BODY_GRAY = 0.960784;
const DEFAULT_GRID_GRAY = 0.501961;

const safeUnicodeNormalize = (value: string) => {
  const maybeNormalize = (value as { normalize?: (form?: string) => string })
    .normalize;
  if (typeof maybeNormalize !== "function") {
    return value;
  }
  try {
    return maybeNormalize.call(value, "NFKD");
  } catch {
    return value;
  }
};

const normalizeText = (value: string) =>
  safeUnicodeNormalize(value)
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const escapePdfText = (value: string) =>
  normalizeText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const estimateTextWidth = (value: string, fontSize: number) =>
  value.length * fontSize * 0.52;

const truncateToFit = (value: string, width: number, fontSize: number) => {
  const normalized = normalizeText(value || "") || "-";
  if (estimateTextWidth(normalized, fontSize) <= width) {
    return normalized;
  }
  const maxChars = Math.max(3, Math.floor(width / (fontSize * 0.52)));
  return `${normalized.slice(0, Math.max(1, maxChars - 3))}...`;
};

const asRgb = (color: [number, number, number]) =>
  `${color[0].toFixed(6)} ${color[1].toFixed(6)} ${color[2].toFixed(6)}`;

const asGray = (value: number) => value.toFixed(6);

const drawText = (params: {
  commands: string[];
  text: string;
  x: number;
  y: number;
  fontSize?: number;
  bold?: boolean;
  gray?: number;
  rgb?: [number, number, number];
}) => {
  const {
    commands,
    text,
    x,
    y,
    fontSize = 10,
    bold = false,
    gray,
    rgb,
  } = params;
  const safe = escapePdfText(text || " ");
  if (rgb) {
    commands.push(`${asRgb(rgb)} rg`);
  } else {
    commands.push(`${asGray(gray ?? 0)} rg`);
  }
  commands.push(
    `BT /${bold ? "F2" : "F1"} ${fontSize} Tf 1 0 0 1 ${x.toFixed(3)} ${y.toFixed(3)} Tm (${safe}) Tj ET`,
  );
};

const drawRect = (params: {
  commands: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  fillGray?: number;
  fillRgb?: [number, number, number];
  strokeGray?: number;
}) => {
  const {
    commands,
    x,
    y,
    width,
    height,
    fillGray,
    fillRgb,
    strokeGray = DEFAULT_GRID_GRAY,
  } = params;
  if (fillRgb) {
    commands.push(`${asRgb(fillRgb)} rg ${x} ${y} ${width} ${height} re f`);
  } else if (typeof fillGray === "number") {
    commands.push(
      `${asGray(fillGray)} rg ${x.toFixed(3)} ${y.toFixed(3)} ${width.toFixed(3)} ${height.toFixed(3)} re f`,
    );
  }
  commands.push(
    `${asGray(strokeGray)} G ${x.toFixed(3)} ${y.toFixed(3)} ${width.toFixed(3)} ${height.toFixed(3)} re S`,
  );
};

const drawLine = (
  commands: string[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  strokeGray = DEFAULT_GRID_GRAY,
) => {
  commands.push(
    `${asGray(strokeGray)} G ${x1.toFixed(3)} ${y1.toFixed(3)} m ${x2.toFixed(3)} ${y2.toFixed(3)} l S`,
  );
};

const buildPdfDocument = (pageContents: string[]) => {
  const pageObjectStart = 5;
  const objectCount = 4 + pageContents.length * 2;
  const pageRefs = pageContents
    .map((_, index) => `${pageObjectStart + index * 2} 0 R`)
    .join(" ");
  const objects: string[] = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    `2 0 obj\n<< /Type /Pages /Kids [${pageRefs}] /Count ${pageContents.length} >>\nendobj\n`,
    "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
  ];
  pageContents.forEach((content, index) => {
    const pageId = pageObjectStart + index * 2;
    const contentId = pageId + 1;
    const length = encodeText(content).length;
    objects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
    );
    objects.push(
      `${contentId} 0 obj\n<< /Length ${length} >>\nstream\n${content}\nendstream\nendobj\n`,
    );
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((objectValue) => {
    offsets.push(encodeText(pdf).length);
    pdf += objectValue;
  });
  const xrefStart = encodeText(pdf).length;
  pdf += `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objectCount; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return encodeText(pdf);
};

const splitRows = (rows: ReportRow[]) =>
  rows.length
    ? Array.from({ length: Math.ceil(rows.length / MAX_ROWS_PER_PAGE) }, (_, index) =>
        rows.slice(index * MAX_ROWS_PER_PAGE, (index + 1) * MAX_ROWS_PER_PAGE),
      )
    : [[]];

export const buildReportLayoutPdf = (params: {
  reportType: ReportType;
  fromDate: string;
  toDate: string;
  rows: ReportRow[];
  language: Lang;
}) => {
  const { reportType, fromDate, toDate, rows, language } = params;
  const config = reportConfigs[reportType];
  const tableWidth = config.columns.reduce((sum, column) => sum + column.width, 0);
  const tableX = (PAGE_WIDTH - tableWidth) / 2;
  const tableBottom = TABLE_TOP_Y - (HEADER_HEIGHT + MAX_ROWS_PER_PAGE * ROW_HEIGHT);
  const chunks = splitRows(rows);

  const pageContents = chunks.map((chunkRows, chunkIndex) => {
    const commands: string[] = [];
    const continued = chunkIndex > 0;
    const titleText = continued ? `${config.title} (CONTINUED)` : config.title;
    const titleX = (PAGE_WIDTH - estimateTextWidth(titleText, 18)) / 2;
    const periodText = `Reporting Period: ${fromDate} - ${toDate}`;
    const periodX = (PAGE_WIDTH - estimateTextWidth(periodText, 10)) / 2;

    drawText({ commands, text: titleText, x: titleX, y: 696, fontSize: 18, bold: true });
    drawText({ commands, text: periodText, x: periodX, y: 670, fontSize: 10, gray: 0.5 });

    drawRect({
      commands,
      x: tableX,
      y: TABLE_TOP_Y - HEADER_HEIGHT,
      width: tableWidth,
      height: HEADER_HEIGHT,
      fillRgb: config.headerColor,
      strokeGray: DEFAULT_GRID_GRAY,
    });
    drawRect({
      commands,
      x: tableX,
      y: tableBottom,
      width: tableWidth,
      height: MAX_ROWS_PER_PAGE * ROW_HEIGHT,
      fillGray: DEFAULT_BODY_GRAY,
      strokeGray: DEFAULT_GRID_GRAY,
    });

    let columnX = tableX;
    config.columns.forEach((column, columnIndex) => {
      drawText({
        commands,
        text: truncateToFit(column.header, column.width - 10, 9),
        x: columnX + 6,
        y: TABLE_TOP_Y - 12,
        fontSize: 9,
        bold: true,
        rgb: [1, 1, 1],
      });
      columnX += column.width;
      if (columnIndex < config.columns.length - 1) {
        drawLine(commands, columnX, TABLE_TOP_Y, columnX, tableBottom, DEFAULT_GRID_GRAY);
      }
    });

    for (let rowIndex = 0; rowIndex <= MAX_ROWS_PER_PAGE; rowIndex += 1) {
      const y = TABLE_TOP_Y - HEADER_HEIGHT - rowIndex * ROW_HEIGHT;
      drawLine(commands, tableX, y, tableX + tableWidth, y, DEFAULT_GRID_GRAY);
    }

    chunkRows.forEach((row, rowIndex) => {
      let cellX = tableX;
      config.columns.forEach((column) => {
        const text = truncateToFit(column.value(row), column.width - 12, 9);
        const y = TABLE_TOP_Y - HEADER_HEIGHT - 13 - rowIndex * ROW_HEIGHT;
        if (column.align === "right") {
          const width = estimateTextWidth(text, 9);
          drawText({
            commands,
            text,
            x: cellX + column.width - width - 6,
            y,
            fontSize: 9,
          });
        } else {
          drawText({ commands, text, x: cellX + 6, y, fontSize: 9 });
        }
        cellX += column.width;
      });
    });

    if (chunkIndex === chunks.length - 1) {
      drawText({
        commands,
        text: `${language === "es" ? "Total de empleados" : "Total Employees"}: ${countUniqueEmployees(rows)}`,
        x: SUMMARY_X,
        y: SUMMARY_ROW_ONE_Y,
        fontSize: 10,
      });
      drawText({
        commands,
        text: `${config.summaryLabel(language)}: ${config.summaryValue(rows)}`,
        x: SUMMARY_X,
        y: SUMMARY_ROW_TWO_Y,
        fontSize: 10,
      });
    }

    return commands.join("\n");
  });

  return buildPdfDocument(pageContents);
};
