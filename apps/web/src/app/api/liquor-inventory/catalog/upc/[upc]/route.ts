import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../../../lib/clockin-api";

export async function GET(
  request: Request,
  context: { params: Promise<{ upc: string }> },
) {
  const { upc } = await context.params;
  try {
    const response = await clockinFetch(`/liquor-inventory/catalog/upc/${upc}`);
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 },
    );
  }
}
