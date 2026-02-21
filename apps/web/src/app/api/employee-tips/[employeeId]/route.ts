import { NextRequest, NextResponse } from "next/server";
import { clockinFetch } from "../../../../lib/clockin-api";

const resolveEmployeeId = (
  request: NextRequest,
  params?: { employeeId?: string | string[] },
) => {
  const raw = params?.employeeId;
  if (typeof raw === "string" && raw.trim()) {
    return raw;
  }
  if (Array.isArray(raw) && raw[0]) {
    return raw[0];
  }
  const pathname = new URL(request.url).pathname;
  const fallback = pathname.split("/").pop();
  return fallback || "";
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string }> },
) {
  const params = await context.params;
  const employeeId = resolveEmployeeId(request, params);
  if (!employeeId) {
    return NextResponse.json(
      { error: "employeeId is required" },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const response = await clockinFetch(`/employee-tips/${employeeId}`, {
      method: "POST",
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string }> },
) {
  const params = await context.params;
  const employeeId = resolveEmployeeId(request, params);
  if (!employeeId) {
    return NextResponse.json(
      { error: "employeeId is required" },
      { status: 400 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const response = await clockinFetch(
      `/employee-tips/${employeeId}${query ? `?${query}` : ""}`,
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
