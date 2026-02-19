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
    segments.length >= 2 && segments[segments.length - 1] === "deletion-export"
      ? segments[segments.length - 2]
      : segments[segments.length - 1] || "";
  return fallback || "";
};

const normalizeFormat = (value: string | null) => {
  const normalized = (value || "summary").trim().toLowerCase();
  if (normalized === "summary" || normalized === "excel" || normalized === "sql") {
    return normalized;
  }
  return "summary";
};

const resolveAcceptHeader = (format: "summary" | "excel" | "sql") => {
  if (format === "excel") {
    return "application/vnd.ms-excel";
  }
  if (format === "sql") {
    return "application/sql";
  }
  return "text/plain";
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

  const requestUrl = new URL(request.url);
  const format = normalizeFormat(requestUrl.searchParams.get("format"));
  const path = `/tenant-accounts/${tenantId}/deletion-export?format=${format}`;

  try {
    const response = await clockinFetch(path, {
      headers: {
        ...ownerDevHeaders(),
        Accept: resolveAcceptHeader(format),
      },
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      return NextResponse.json(
        { error: payload.message || payload.error || "Unable to export tenant data." },
        { status: response.status },
      );
    }

    const file = await response.arrayBuffer();
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const contentDisposition =
      response.headers.get("content-disposition") ||
      `attachment; filename="tenant-data-${tenantId}"`;

    return new NextResponse(file, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 },
    );
  }
}
