import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "crypto";
import {
  ADMIN_COOKIE_NAME,
  adminSessionTtlSeconds,
  createAdminSessionToken,
} from "../../../../lib/admin-session";

type ResolveTenantResult = {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  authOrgId: string;
  isActive: boolean;
};

const readErrorMessage = (value: unknown, fallback: string) => {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const maybeMessage = (value as { message?: unknown }).message;
  if (typeof maybeMessage === "string" && maybeMessage.trim()) {
    return maybeMessage;
  }
  if (Array.isArray(maybeMessage)) {
    const first = maybeMessage.find(
      (entry) => typeof entry === "string" && entry.trim(),
    );
    if (typeof first === "string") {
      return first;
    }
  }

  const maybeError = (value as { error?: unknown }).error;
  if (typeof maybeError === "string" && maybeError.trim()) {
    return maybeError;
  }

  return fallback;
};

const resolveTenant = async (tenant: string, hostHeader: string | null) => {
  const apiUrl = process.env.CLOCKIN_API_URL;
  if (!apiUrl) {
    return {
      ok: false as const,
      status: 500,
      error: "CLOCKIN_API_URL is not configured.",
    };
  }

  const endpoint = new URL(
    `${apiUrl.replace(/\/$/, "")}/tenant-directory/resolve`,
  );
  endpoint.searchParams.set("tenant", tenant);
  if (hostHeader) {
    endpoint.searchParams.set("host", hostHeader);
  }

  try {
    const response = await fetch(endpoint.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const data = (await response.json().catch(() => null)) as
      | ResolveTenantResult
      | Record<string, unknown>
      | null;

    if (!response.ok) {
      return {
        ok: false as const,
        status: response.status,
        error: readErrorMessage(data, "Unable to resolve tenant."),
      };
    }

    return {
      ok: true as const,
      tenant: data as ResolveTenantResult,
    };
  } catch {
    return {
      ok: false as const,
      status: 502,
      error: "Unable to reach tenant directory.",
    };
  }
};

const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
};

export async function POST(request: Request) {
  const { tenant, username, password } = (await request.json()) as {
    tenant?: string;
    username?: string;
    password?: string;
  };
  const tenantInput = tenant?.trim() || "";

  const expectedUsername = process.env.ADMIN_USERNAME || "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD || "1234qwer";

  if (
    !tenantInput ||
    !username ||
    !password ||
    !safeEqual(username, expectedUsername) ||
    !safeEqual(password, expectedPassword)
  ) {
    return NextResponse.json(
      { error: "Invalid administrator credentials." },
      { status: 401 },
    );
  }

  const resolvedTenant = await resolveTenant(
    tenantInput,
    request.headers.get("host"),
  );
  if (!resolvedTenant.ok) {
    return NextResponse.json(
      { error: resolvedTenant.error },
      { status: resolvedTenant.status },
    );
  }

  const token = createAdminSessionToken(username, {
    tenantAuthOrgId: resolvedTenant.tenant.authOrgId,
    tenantSlug: resolvedTenant.tenant.slug,
    tenantName: resolvedTenant.tenant.name,
    tenantSubdomain: resolvedTenant.tenant.subdomain,
  });
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: adminSessionTtlSeconds(),
  });

  return NextResponse.json({
    ok: true,
    tenant: {
      name: resolvedTenant.tenant.name,
      slug: resolvedTenant.tenant.slug,
      subdomain: resolvedTenant.tenant.subdomain,
    },
  });
}
