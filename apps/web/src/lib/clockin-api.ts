import { auth0, authConfigured } from "./auth0";

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
    headers.set(
      "x-dev-user-id",
      process.env.DEV_USER_ID || "dev-user",
    );
    headers.set(
      "x-dev-tenant-id",
      process.env.DEV_TENANT_ID || "dev-tenant",
    );
    headers.set(
      "x-dev-email",
      process.env.DEV_USER_EMAIL || "dev@clockin.local",
    );
    headers.set(
      "x-dev-name",
      process.env.DEV_USER_NAME || "Dev User",
    );
  }

  return fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}
