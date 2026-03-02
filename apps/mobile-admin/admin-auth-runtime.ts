export type AdminDirectoryLoginResponse = {
  name?: string;
  slug?: string;
  authOrgId?: string;
  featurePermissions?: string[];
  managerEmployeeId?: string | null;
  error?: string;
  message?: string;
};

export const authenticateAdminTenantDirectory = async (params: {
  orderedBases: string[];
  tenantInput: string;
  username: string;
  password: string;
  resolvedApiBase: string | null;
  onUnresolvedBaseAttempt?: (apiBase: string) => void;
}): Promise<
  | {
      ok: true;
      verified: AdminDirectoryLoginResponse & { authOrgId: string };
      matchedBase: string;
    }
  | {
      ok: false;
      error: Error;
    }
> => {
  let lastError: Error | null = null;
  let verified: (AdminDirectoryLoginResponse & { authOrgId: string }) | null =
    null;
  let matchedBase: string | null = null;

  for (const apiBase of params.orderedBases) {
    try {
      const response = await fetch(`${apiBase}/tenant-directory/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant: params.tenantInput.trim(),
          username: params.username.trim(),
          password: params.password,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as
        | AdminDirectoryLoginResponse
        | Record<string, unknown>;

      if (
        !response.ok ||
        typeof data !== "object" ||
        data === null ||
        typeof (data as AdminDirectoryLoginResponse).authOrgId !== "string"
      ) {
        const typed = data as AdminDirectoryLoginResponse;
        const responseError = new Error(
          typed.message || typed.error || "Invalid credentials.",
        );
        if (!params.resolvedApiBase) {
          params.onUnresolvedBaseAttempt?.(apiBase);
        }
        if (response.status >= 500 || response.status === 429) {
          lastError = responseError;
          continue;
        }
        throw responseError;
      }

      verified = data as AdminDirectoryLoginResponse & { authOrgId: string };
      matchedBase = apiBase;
      break;
    } catch (error) {
      if (error instanceof Error) {
        lastError = error;
      } else {
        lastError = new Error("Unable to reach ClockIn API.");
      }
    }
  }

  if (!verified?.authOrgId || !matchedBase) {
    return { ok: false, error: lastError || new Error("Invalid credentials.") };
  }

  return {
    ok: true,
    verified,
    matchedBase,
  };
};

export const resolveLoginManagerEmployeeId = (
  value: string | null | undefined,
): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
};

export const resolveTenantForNextLogin = (
  verifiedSlug: string | undefined,
  tenantInput: string,
): string => (verifiedSlug || tenantInput).trim();

export const resolveActiveTenantLabel = (params: {
  name?: string;
  slug?: string;
  tenantInput: string;
}): string => (params.name || params.slug || params.tenantInput).trim();
