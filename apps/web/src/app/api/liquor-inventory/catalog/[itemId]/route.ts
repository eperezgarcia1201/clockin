import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../../lib/clockin-api";

export async function PUT(
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await context.params;
  try {
    const body = await request.json().catch(() => ({}));
    const response = await clockinFetch(`/liquor-inventory/catalog/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 },
    );
  }
}
