import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../../lib/clockin-api";

type RouteParams = { id: string };

export async function GET(
  _request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { id } = await context.params;
  const normalizedId = id?.trim();
  if (!normalizedId) {
    return NextResponse.json({ error: "Order ID is required." }, { status: 400 });
  }

  try {
    const response = await clockinFetch(
      `/company-orders/${encodeURIComponent(normalizedId)}/pdf`,
      { headers: { Accept: "application/pdf" } },
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      return NextResponse.json(
        { error: payload.error || payload.message || "Unable to export PDF." },
        { status: response.status },
      );
    }

    const pdf = await response.arrayBuffer();
    const contentDisposition =
      response.headers.get("content-disposition") ||
      `attachment; filename="company-order-${normalizedId}.pdf"`;

    return new NextResponse(pdf, {
      status: response.status,
      headers: {
        "Content-Type": "application/pdf",
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
