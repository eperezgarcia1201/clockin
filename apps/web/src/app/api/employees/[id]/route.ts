import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../lib/clockin-api";

const resolveEmployeeId = (
  request: Request,
  context?: { params?: { id?: string | string[] } },
) => {
  const raw = context?.params?.id;
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

export async function GET(
  request: Request,
  context: { params?: { id?: string | string[] } },
) {
  const employeeId = resolveEmployeeId(request, context);
  if (!employeeId) {
    return NextResponse.json(
      { error: "employeeId is required" },
      { status: 400 },
    );
  }
  try {
    const response = await clockinFetch(`/employees/${employeeId}`);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params?: { id?: string | string[] } },
) {
  const employeeId = resolveEmployeeId(request, context);
  if (!employeeId) {
    return NextResponse.json(
      { error: "employeeId is required" },
      { status: 400 },
    );
  }
  try {
    const body = await request.json();
    const response = await clockinFetch(`/employees/${employeeId}`, {
      method: "PATCH",
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

export async function DELETE(
  request: Request,
  context: { params?: { id?: string | string[] } },
) {
  const employeeId = resolveEmployeeId(request, context);
  if (!employeeId) {
    return NextResponse.json(
      { error: "employeeId is required" },
      { status: 400 },
    );
  }
  try {
    const response = await clockinFetch(`/employees/${employeeId}`, {
      method: "DELETE",
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
