import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../lib/clockin-api";
import { scopedQueryFromRequest, withQuery } from "../../../../lib/location-scope";

const normalizeFormat = (value: string | null) => {
  const normalized = (value || "pdf").trim().toLowerCase();
  if (normalized === "pdf" || normalized === "csv" || normalized === "excel") {
    return normalized;
  }
  return "pdf";
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = await scopedQueryFromRequest(request);
  query.set("format", normalizeFormat(url.searchParams.get("format")));

  const weekStart = (url.searchParams.get("weekStart") || "").trim();
  if (weekStart) {
    query.set("weekStart", weekStart);
  }

  try {
    const response = await clockinFetch(withQuery("/company-orders/export", query), {
      headers: { Accept: "*/*" },
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      return NextResponse.json(
        { error: payload.error || payload.message || "Unable to export company orders." },
        { status: response.status },
      );
    }

    const file = await response.arrayBuffer();
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const contentDisposition =
      response.headers.get("content-disposition") ||
      'attachment; filename="company-orders-export"';

    return new NextResponse(file, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 },
    );
  }
}
