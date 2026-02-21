import { NextRequest, NextResponse } from "next/server";
import { clockinFetch } from "../../../../../lib/clockin-api";
import { getOwnerSession } from "../../../../../lib/owner-session";

const ownerDevHeaders = () => ({
  "x-dev-user-id": process.env.OWNER_DEV_USER_ID || process.env.DEV_USER_ID || "dev-user",
  "x-dev-tenant-id":
    process.env.OWNER_DEV_TENANT_ID || process.env.DEV_TENANT_ID || "dev-tenant",
  "x-dev-email":
    process.env.OWNER_DEV_EMAIL || process.env.DEV_USER_EMAIL || "dev@clockin.local",
  "x-dev-name":
    process.env.OWNER_DEV_NAME || process.env.DEV_USER_NAME || "Dev Owner",
});

const resolveTenantId = (
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
  const segments = pathname.split("/").filter(Boolean);
  const fallback =
    segments.length >= 2 && segments[segments.length - 1] === "deletion-report"
      ? segments[segments.length - 2]
      : segments[segments.length - 1] || "";
  return fallback || "";
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await getOwnerSession())) {
    return NextResponse.json(
      { error: "Owner authentication required." },
      { status: 401 },
    );
  }

  const params = await context.params;
  const tenantId = resolveTenantId(request, params);
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  }

  try {
    const response = await clockinFetch(`/tenant-accounts/${tenantId}/deletion-report`, {
      headers: ownerDevHeaders(),
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
