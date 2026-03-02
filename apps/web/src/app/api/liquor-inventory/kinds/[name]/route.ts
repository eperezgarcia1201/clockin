import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../../lib/clockin-api";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  try {
    const response = await clockinFetch(
      `/liquor-inventory/kinds/${encodeURIComponent(name)}`,
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
