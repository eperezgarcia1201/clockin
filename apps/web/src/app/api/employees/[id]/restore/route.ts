import { NextRequest, NextResponse } from "next/server";
import { clockinFetch } from "../../../../../lib/clockin-api";

const resolveEmployeeId = (
  request: NextRequest,
  params?: { id?: string | string[] },
) => {
  const raw = params?.id;
  if (typeof raw === "string" && raw.trim()) {
    return raw;
  }
  if (Array.isArray(raw) && raw[0]) {
    return raw[0];
  }
  const pathname = new URL(request.url).pathname;
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.indexOf("employees");
  if (index >= 0 && parts[index + 1]) {
    return parts[index + 1];
  }
  return "";
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
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
    const response = await clockinFetch(`/employees/${employeeId}/restore`, {
      method: "PATCH",
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
