import type { TenantContext, TenantOffice } from "./types";

type TenantDirectoryOfficeCandidate = {
  id?: string;
  name?: string;
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadiusMeters?: number | null;
};

type TenantEmployeeContextPayload = {
  offices?: TenantDirectoryOfficeCandidate[];
  companyOrdersEnabled?: boolean;
  liquorInventoryEnabled?: boolean;
  premiumFeaturesEnabled?: boolean;
  employees?: unknown[];
  message?: string;
  error?: string;
};

type TenantResolvePayload = {
  id?: string;
  name?: string;
  slug?: string;
  subdomain?: string;
  authOrgId?: string;
  error?: string;
  message?: string;
};

const TENANT_DIRECTORY_TIMEOUT_MS = 5000;

const fetchJsonWithTimeout = async <T>(
  url: string,
): Promise<{ response: Response; data: T }> => {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), TENANT_DIRECTORY_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => ({}))) as T;
    return { response, data };
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") {
      throw new Error("Request timeout while loading tenant data.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
};

export type TenantEmployeeContextResult = {
  payload: TenantEmployeeContextPayload;
  resolvedBase: string | null;
};

export const fetchTenantEmployeeContext = async ({
  orderedBases,
  tenantLookupValue,
  unableToLoadLocationsMessage,
}: {
  orderedBases: string[];
  tenantLookupValue: string;
  unableToLoadLocationsMessage: string;
}): Promise<TenantEmployeeContextResult> => {
  let resolvedBase: string | null = null;
  let payload: TenantEmployeeContextPayload | null = null;
  let lastError: Error | null = null;

  for (const apiBase of orderedBases) {
    try {
      const endpoint = new URL(`${apiBase}/tenant-directory/employee-context`);
      endpoint.searchParams.set("tenant", tenantLookupValue);
      const { response, data } =
        await fetchJsonWithTimeout<TenantEmployeeContextPayload>(
          endpoint.toString(),
        );

      if (!response.ok) {
        lastError = new Error(
          data.message || data.error || unableToLoadLocationsMessage,
        );
        continue;
      }

      payload = data;
      resolvedBase = apiBase;
      break;
    } catch (error) {
      if (error instanceof Error) {
        lastError = error;
      } else {
        lastError = new Error(unableToLoadLocationsMessage);
      }
    }
  }

  if (!payload) {
    throw lastError || new Error(unableToLoadLocationsMessage);
  }

  return { payload, resolvedBase };
};

export const normalizeTenantOffices = (
  payload: TenantEmployeeContextPayload,
): TenantOffice[] =>
  (payload.offices || [])
    .filter(
      (
        office,
      ): office is Required<Pick<TenantOffice, "id" | "name">> & TenantOffice =>
        Boolean(office) &&
        typeof office.id === "string" &&
        typeof office.name === "string",
    )
    .map((office) => ({
      id: office.id,
      name: office.name,
      latitude:
        typeof office.latitude === "number" && Number.isFinite(office.latitude)
          ? office.latitude
          : null,
      longitude:
        typeof office.longitude === "number" &&
        Number.isFinite(office.longitude)
          ? office.longitude
          : null,
      geofenceRadiusMeters:
        typeof office.geofenceRadiusMeters === "number" &&
        Number.isFinite(office.geofenceRadiusMeters)
          ? office.geofenceRadiusMeters
          : null,
    }));

export const pickPreferredTenantOfficeId = (
  offices: TenantOffice[],
  savedOfficeId: string | null,
): string | null => {
  if (offices.length === 0) {
    return null;
  }
  const officeIds = new Set(offices.map((office) => office.id));
  if (savedOfficeId && officeIds.has(savedOfficeId)) {
    return savedOfficeId;
  }
  return offices[0].id;
};

export const parseStoredTenantContext = (raw: string): TenantContext | null => {
  const parsed = JSON.parse(raw) as TenantContext;
  if (
    parsed &&
    typeof parsed.authOrgId === "string" &&
    typeof parsed.slug === "string" &&
    typeof parsed.name === "string"
  ) {
    return parsed;
  }
  return null;
};

export const resolveTenantContext = async ({
  orderedBases,
  tenantInput,
  tenantNotFoundMessage,
  unableToValidateTenantMessage,
}: {
  orderedBases: string[];
  tenantInput: string;
  tenantNotFoundMessage: string;
  unableToValidateTenantMessage: string;
}): Promise<{ tenant: TenantContext; resolvedBase: string | null }> => {
  let data: TenantResolvePayload | null = null;
  let resolvedBase: string | null = null;
  let lastError: Error | null = null;

  for (const apiBase of orderedBases) {
    try {
      const endpoint = new URL(`${apiBase}/tenant-directory/resolve`);
      endpoint.searchParams.set("tenant", tenantInput);
      const { response, data: payload } =
        await fetchJsonWithTimeout<TenantResolvePayload>(endpoint.toString());

      if (!response.ok || !payload.authOrgId || !payload.slug) {
        lastError = new Error(
          payload.message || payload.error || tenantNotFoundMessage,
        );
        continue;
      }

      data = payload;
      resolvedBase = apiBase;
      break;
    } catch (error) {
      if (error instanceof Error) {
        lastError = error;
      } else {
        lastError = new Error(unableToValidateTenantMessage);
      }
    }
  }

  if (!data || !data.authOrgId || !data.slug) {
    throw lastError || new Error(unableToValidateTenantMessage);
  }

  return {
    tenant: {
      input: tenantInput,
      name: data.name || tenantInput,
      slug: data.slug,
      subdomain: data.subdomain || data.slug,
      authOrgId: data.authOrgId,
    },
    resolvedBase,
  };
};
