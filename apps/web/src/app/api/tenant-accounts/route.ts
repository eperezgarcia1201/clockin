import { NextResponse } from "next/server";
import { clockinFetch } from "../../../lib/clockin-api";
import { getAdminSession } from "../../../lib/admin-session";
import { getOwnerSession } from "../../../lib/owner-session";

const ownerDevHeaders = () => ({
  "x-dev-user-id": process.env.OWNER_DEV_USER_ID || process.env.DEV_USER_ID || "dev-user",
  "x-dev-tenant-id":
    process.env.OWNER_DEV_TENANT_ID || process.env.DEV_TENANT_ID || "dev-tenant",
  "x-dev-email":
    process.env.OWNER_DEV_EMAIL || process.env.DEV_USER_EMAIL || "dev@clockin.local",
  "x-dev-name":
    process.env.OWNER_DEV_NAME || process.env.DEV_USER_NAME || "Dev Owner",
});

export async function GET() {
  const ownerSession = await getOwnerSession();
  const adminSession = await getAdminSession();
  const firstTenantAdminUsername =
    process.env.FIRST_TENANT_ADMIN_USERNAME ||
    process.env.ADMIN_USERNAME ||
    "elmer";
  const firstTenantAdminSession =
    adminSession && adminSession.username === firstTenantAdminUsername;

  if (!ownerSession && !firstTenantAdminSession) {
    return NextResponse.json(
      { error: "Owner or first-tenant admin authentication required." },
      { status: 401 },
    );
  }

  try {
    const response = await clockinFetch("/tenant-accounts", {
      headers: ownerDevHeaders(),
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

export async function POST(request: Request) {
  const ownerSession = await getOwnerSession();
  const adminSession = await getAdminSession();
  const firstTenantAdminUsername =
    process.env.FIRST_TENANT_ADMIN_USERNAME ||
    process.env.ADMIN_USERNAME ||
    "elmer";
  const firstTenantAdminSession =
    adminSession && adminSession.username === firstTenantAdminUsername;

  if (!ownerSession && !firstTenantAdminSession) {
    return NextResponse.json(
      { error: "Owner or first-tenant admin authentication required." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const response = await clockinFetch("/tenant-accounts", {
      method: "POST",
      headers: {
        ...ownerDevHeaders(),
        "Content-Type": "application/json",
      },
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
