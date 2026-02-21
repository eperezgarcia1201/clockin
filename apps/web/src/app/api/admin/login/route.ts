import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE_NAME,
  adminSessionTtlSeconds,
  createAdminSessionToken,
} from "../../../../lib/admin-session";

type TenantAdminLoginResult = {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  authOrgId: string;
  isActive: boolean;
  adminUsername: string;
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

const verifyTenantAdminLogin = async (
  payload: { tenant: string; username: string; password: string },
  hostHeader: string | null,
) => {
  const apiUrl = process.env.CLOCKIN_API_URL;
  if (!apiUrl) {
    return {
      ok: false as const,
      status: 500,
      error: "CLOCKIN_API_URL is not configured.",
    };
  }

  const endpoint = `${apiUrl.replace(/\/$/, "")}/tenant-directory/admin-login`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        host: hostHeader || undefined,
      }),
      cache: "no-store",
    });

    const data = (await response.json().catch(() => null)) as
      | TenantAdminLoginResult
      | Record<string, unknown>
      | null;

    if (!response.ok) {
      return {
        ok: false as const,
        status: response.status,
        error: readErrorMessage(data, "Invalid administrator credentials."),
      };
    }

    return {
      ok: true as const,
      tenant: data as TenantAdminLoginResult,
    };
  } catch {
    return {
      ok: false as const,
      status: 502,
      error: "Unable to reach tenant directory.",
    };
  }
};

export async function POST(request: Request) {
  const { tenant, username, password } = (await request.json()) as {
    tenant?: string;
    username?: string;
    password?: string;
  };

  const tenantInput = tenant?.trim() || "";
  const usernameInput = username?.trim() || "";
  const passwordInput = password || "";

  if (!tenantInput || !usernameInput || !passwordInput) {
    return NextResponse.json(
      { error: "Invalid administrator credentials." },
      { status: 401 },
    );
  }

  const verified = await verifyTenantAdminLogin(
    {
      tenant: tenantInput,
      username: usernameInput,
      password: passwordInput,
    },
    request.headers.get("host"),
  );

  if (!verified.ok) {
    return NextResponse.json(
      { error: verified.error },
      { status: verified.status },
    );
  }

  const token = createAdminSessionToken(usernameInput, {
    tenantAuthOrgId: verified.tenant.authOrgId,
    tenantSlug: verified.tenant.slug,
    tenantName: verified.tenant.name,
    tenantSubdomain: verified.tenant.subdomain,
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
      name: verified.tenant.name,
      slug: verified.tenant.slug,
      subdomain: verified.tenant.subdomain,
    },
  });
}
