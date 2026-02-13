import { NextRequest, NextResponse } from "next/server";
import { clockinFetch } from "../../../../lib/clockin-api";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string }> },
) {
  try {
    const body = await request.json();
    const { employeeId } = await context.params;
    const response = await clockinFetch(
      `/employee-punches/${employeeId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 },
    );
  }
}
