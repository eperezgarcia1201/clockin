import { NextRequest, NextResponse } from "next/server";
import { clockinFetch } from "../../../../lib/clockin-api";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string }> },
) {
  const body = await request.json();
  const { employeeId } = await context.params;
  if (!employeeId) {
    return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
  }
  try {
    const response = await clockinFetch(`/employee-schedules/${employeeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 },
    );
  }
}
