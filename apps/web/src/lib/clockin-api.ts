import { auth0, authConfigured } from "./auth0";
import { getAdminSession } from "./admin-session";

export async function clockinFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const apiUrl = process.env.CLOCKIN_API_URL;
  if (!apiUrl) {
    throw new Error("CLOCKIN_API_URL not set");
  }

  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (authConfigured && auth0) {
    try {
      const session = await auth0.getSession();
      if (session) {
        const { token } = await auth0.getAccessToken({
          audience: process.env.AUTH0_AUDIENCE,
        });
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }
      }
    } catch {
      // If auth isn't configured or session unavailable, continue without token.
    }
  }

  if (!headers.has("Authorization")) {
    let adminSession = null;
    try {
      adminSession = await getAdminSession();
    } catch {
      adminSession = null;
    }

    const adminUsername = adminSession?.username?.trim() || "";
    const normalizedAdminId = adminUsername
      ? `tenant-admin:${adminUsername.toLowerCase().replace(/\s+/g, "-")}`
      : "";

    if (!headers.has("x-dev-user-id")) {
      headers.set(
        "x-dev-user-id",
        normalizedAdminId || process.env.DEV_USER_ID || "dev-user",
      );
    }

    if (!headers.has("x-dev-tenant-id")) {
      headers.set(
        "x-dev-tenant-id",
        adminSession?.tenantAuthOrgId ||
          process.env.DEV_TENANT_ID ||
          "dev-tenant",
      );
    }

    if (!headers.has("x-dev-email")) {
      const fallbackAdminEmail = adminUsername
        ? `${adminUsername.toLowerCase().replace(/\s+/g, ".")}@clockin.local`
        : "";
      headers.set(
        "x-dev-email",
        fallbackAdminEmail || process.env.DEV_USER_EMAIL || "dev@clockin.local",
      );
    }

    if (!headers.has("x-dev-name")) {
      headers.set(
        "x-dev-name",
        adminSession?.username || process.env.DEV_USER_NAME || "Dev User",
      );
    }
  }

  return fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}
