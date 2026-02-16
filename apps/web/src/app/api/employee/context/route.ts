import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createEmployeeSessionToken,
  EMPLOYEE_COOKIE_NAME,
  employeeSessionTtlSeconds,
} from "../../../../lib/employee-session";
import { ACTIVE_LOCATION_COOKIE } from "../../../../lib/location-scope";

type OfficeSummary = {
  id: string;
  name: string;
};

type TenantEmployeeContext = {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  authOrgId: string;
  isActive: boolean;
  adminUsername: string;
  multiLocationEnabled: boolean;
  offices: OfficeSummary[];
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

const resolveTenantContext = async (payload: { tenant: string; host?: string }) => {
  const apiUrl = process.env.CLOCKIN_API_URL;
  if (!apiUrl) {
    return {
      ok: false as const,
      status: 500,
      error: "CLOCKIN_API_URL is not configured.",
    };
  }

  const query = new URLSearchParams();
  query.set("tenant", payload.tenant);
  if (payload.host) {
    query.set("host", payload.host);
  }
  const endpoint = `${apiUrl.replace(/\/$/, "")}/tenant-directory/employee-context?${query.toString()}`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const data = (await response.json().catch(() => null)) as
      | TenantEmployeeContext
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
      context: data as TenantEmployeeContext,
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
  const { tenant, officeId } = (await request.json()) as {
    tenant?: string;
    officeId?: string;
  };

  const tenantInput = tenant?.trim() || "";
  const officeInput = officeId?.trim() || "";

  if (!tenantInput) {
    return NextResponse.json({ error: "Tenant is required." }, { status: 400 });
  }

  const resolved = await resolveTenantContext({
    tenant: tenantInput,
    host: request.headers.get("host") || undefined,
  });

  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error },
      { status: resolved.status },
    );
  }

  const offices = resolved.context.offices || [];
  const requiresLocationSelection = offices.length > 1;
  const selectedOffice = officeInput
    ? offices.find((office) => office.id === officeInput)
    : undefined;

  if (officeInput && !selectedOffice) {
    return NextResponse.json(
      { error: "Selected location is invalid for this tenant." },
      { status: 400 },
    );
  }

  if (requiresLocationSelection && !selectedOffice) {
    return NextResponse.json({
      requiresLocationSelection: true,
      tenant: {
        name: resolved.context.name,
        slug: resolved.context.slug,
        subdomain: resolved.context.subdomain,
        authOrgId: resolved.context.authOrgId,
      },
      offices,
      multiLocationEnabled: resolved.context.multiLocationEnabled,
      selectedOfficeId: "",
    });
  }

  const selectedOfficeId = selectedOffice?.id || offices[0]?.id || "";
  const token = createEmployeeSessionToken(resolved.context.adminUsername, {
    tenantAuthOrgId: resolved.context.authOrgId,
    tenantSlug: resolved.context.slug,
    tenantName: resolved.context.name,
  });

  const cookieStore = await cookies();
  cookieStore.set(EMPLOYEE_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: employeeSessionTtlSeconds(),
  });

  if (selectedOfficeId) {
    cookieStore.set(ACTIVE_LOCATION_COOKIE, selectedOfficeId, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: employeeSessionTtlSeconds(),
    });
  } else {
    cookieStore.delete(ACTIVE_LOCATION_COOKIE);
  }

  return NextResponse.json({
    ok: true,
    requiresLocationSelection: false,
    tenant: {
      name: resolved.context.name,
      slug: resolved.context.slug,
      subdomain: resolved.context.subdomain,
      authOrgId: resolved.context.authOrgId,
    },
    offices,
    multiLocationEnabled: resolved.context.multiLocationEnabled,
    selectedOfficeId,
  });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(EMPLOYEE_COOKIE_NAME);
  cookieStore.delete(ACTIVE_LOCATION_COOKIE);

  return NextResponse.json({ ok: true });
}
