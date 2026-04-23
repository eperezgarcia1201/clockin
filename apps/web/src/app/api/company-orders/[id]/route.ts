import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../lib/clockin-api";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const normalizedId = typeof id === "string" ? id.trim() : "";
    if (!normalizedId) {
      return NextResponse.json(
        { error: "Order id is required." },
        { status: 400 },
      );
    }

    const response = await clockinFetch(
      `/company-orders/${encodeURIComponent(normalizedId)}`,
      {
        method: "DELETE",
      },
    );
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 },
    );
  }
}
