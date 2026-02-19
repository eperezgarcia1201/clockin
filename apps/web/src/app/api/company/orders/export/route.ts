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

type CompanyOrderItem = {
  id: string;
  nameEs: string;
  nameEn: string;
  quantity: number;
};

type CompanyOrderRow = {
  id: string;
  supplierName: string;
  orderDate: string;
  orderLabel?: string;
  contributors?: string[];
  notes: string;
  officeName: string | null;
  createdBy: string | null;
  totalQuantity: number;
  itemCount: number;
  items: CompanyOrderItem[];
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

const formatDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const parseDateQuery = (value: string | null) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return value;
};

const wrapText = (value: string, maxChars: number) => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    const proposal = current ? `${current} ${word}` : word;
    if (proposal.length <= maxChars) {
      current = proposal;
      return;
    }
    if (current) {
      lines.push(current);
    }
    current = word;
  });
  if (current) {
    lines.push(current);
  }
  return lines;
};

const readErrorMessage = async (response: Response, fallback: string) => {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };
  return payload.error || payload.message || fallback;
};

const lineToCommand = (text: string, y: number, size = 10, bold = false) =>
  `0 g BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 48 ${y} Tm (${escapePdfText(text)}) Tj ET`;

const buildOrdersPdf = (
  orders: CompanyOrderRow[],
  reportDate: string,
  companyRows: Array<[string, string]>,
) => {
  const lines: Array<{
    text: string;
    bold?: boolean;
    size?: number;
    gap?: number;
  }> = [];
  lines.push({ text: "Company Orders", bold: true, size: 16, gap: 22 });
  lines.push({
    text: `Order Date: ${formatDate(reportDate)} (${reportDate})`,
    bold: true,
    size: 11,
    gap: 16,
  });
  companyRows.forEach(([label, value]) => {
    lines.push({ text: `${label}: ${value}`, size: 10, gap: 13 });
  });
  lines.push({ text: "", gap: 8 });

  if (orders.length === 0) {
    lines.push({ text: "No orders found for this date.", size: 11, gap: 16 });
  } else {
    orders.forEach((order) => {
      lines.push({
        text: `Supplier: ${order.supplierName}`,
        bold: true,
        gap: 14,
      });
      if (order.orderLabel?.trim()) {
        lines.push({ text: order.orderLabel.trim(), gap: 13 });
      }
      lines.push({
        text: `Items: ${order.itemCount} | Qty: ${order.totalQuantity}`,
        gap: 13,
      });
      lines.push({
        text: `Location: ${order.officeName || "All locations"}${
          order.createdBy ? ` | By: ${order.createdBy}` : ""
        }`,
        gap: 13,
      });
      if (Array.isArray(order.contributors) && order.contributors.length) {
        lines.push({
          text: `Contributors: ${order.contributors.join(", ")}`,
          gap: 13,
        });
      }
      (order.items || []).forEach((item) => {
        const itemLabel = `- ${item.nameEs || item.nameEn} x ${item.quantity}`;
        wrapText(itemLabel, 92).forEach((line) =>
          lines.push({ text: line, gap: 12 }),
        );
      });
      if (order.notes?.trim()) {
        lines.push({ text: "Notes:", bold: true, gap: 13 });
        wrapText(order.notes, 92).forEach((line) =>
          lines.push({ text: line, gap: 12 }),
        );
      }
      lines.push({ text: "", gap: 10 });
    });
  }

  const pages: string[] = [];
  let commands: string[] = [];
  let y = 800;
  lines.forEach((line) => {
    const gap = line.gap || 13;
    const size = line.size || 10;
    if (y < 54) {
      pages.push(commands.join("\n"));
      commands = [];
      y = 800;
    }
    commands.push(lineToCommand(line.text, y, size, Boolean(line.bold)));
    y -= gap;
  });
  if (commands.length === 0) {
    commands.push(lineToCommand("Company Orders", 800, 16, true));
  }
  pages.push(commands.join("\n"));

  return buildPdfDocument(pages);
};

export async function GET(request: Request) {
  const requestedDate = parseDateQuery(
    new URL(request.url).searchParams.get("date"),
  );
  const query = await scopedQueryFromRequest(request);
  query.set("from", requestedDate);
  query.set("to", requestedDate);
  query.set("limit", "300");

  try {
    const response = await clockinFetch(withQuery("/company-orders", query));
    if (!response.ok) {
      return NextResponse.json(
        {
          error: await readErrorMessage(
            response,
            "Unable to load company orders for export.",
          ),
        },
        { status: response.status },
      );
    }

    const payload = (await response.json()) as { orders?: CompanyOrderRow[] };
    const orders = Array.isArray(payload.orders) ? payload.orders : [];
    const companyProfile = await getCompanyExportProfile();
    const pdf = buildOrdersPdf(
      orders,
      requestedDate,
      companyMetaRows(companyProfile),
    );

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="company-orders-${requestedDate}.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to export company orders.",
      },
      { status: 500 },
    );
  }
}
