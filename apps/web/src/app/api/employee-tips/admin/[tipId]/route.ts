import { NextRequest, NextResponse } from "next/server";
import { clockinFetch } from "../../../../../lib/clockin-api";

const resolveTipId = (
  request: NextRequest,
  params?: { tipId?: string | string[] },
) => {
  const raw = params?.tipId;
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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tipId: string }> },
) {
  const params = await context.params;
  const tipId = resolveTipId(request, params);
  if (!tipId) {
    return NextResponse.json({ error: "tipId is required" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const response = await clockinFetch(`/employee-tips/admin/${tipId}`, {
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
  request: NextRequest,
  context: { params: Promise<{ tipId: string }> },
) {
  const params = await context.params;
  const tipId = resolveTipId(request, params);
  if (!tipId) {
    return NextResponse.json({ error: "tipId is required" }, { status: 400 });
  }

  try {
    const response = await clockinFetch(`/employee-tips/admin/${tipId}`, {
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
