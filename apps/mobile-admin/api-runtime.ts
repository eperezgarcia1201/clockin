import * as Device from "expo-device";
import Constants from "expo-constants";

const normalizeApiBase = (value: string) => value.trim().replace(/\/$/, "");
const DEFAULT_API_BASE = "https://api.websysclockin.com/api";

const isLoopbackHost = (host: string) =>
  host === "localhost" ||
  host === "0.0.0.0" ||
  host === "::1" ||
  host.startsWith("127.");

const parseHostCandidate = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    if (/^[a-z]+:\/\//i.test(trimmed)) {
      return new URL(trimmed).hostname || null;
    }
    return new URL(`http://${trimmed}`).hostname || null;
  } catch {
    return null;
  }
};

const pickMetroHosts = () => {
  const runtimeConfig = Constants as unknown as {
    expoGoConfig?: { debuggerHost?: string | null };
    manifest2?: { extra?: { expoClient?: { hostUri?: string | null } } };
  };

  const hosts = [
    parseHostCandidate(Constants.expoConfig?.hostUri ?? null),
    parseHostCandidate(runtimeConfig.expoGoConfig?.debuggerHost ?? null),
    parseHostCandidate(
      runtimeConfig.manifest2?.extra?.expoClient?.hostUri ?? null,
    ),
    parseHostCandidate(Constants.linkingUri ?? null),
  ];

  return Array.from(
    new Set(hosts.filter((host): host is string => Boolean(host))),
  );
};

export const apiBaseCandidates = (() => {
  const values: string[] = [];
  const runningOnSimulator = !Device.isDevice;
  const runningInExpoGo = Constants.appOwnership === "expo";
  const preferLocalBase = __DEV__ || runningInExpoGo;

  const metroHosts = pickMetroHosts();
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  const pushCandidate = (candidate?: string | null) => {
    if (!candidate || !candidate.trim()) {
      return;
    }
    values.push(candidate);
  };

  if (fromEnv) {
    const fromEnvHost = parseHostCandidate(fromEnv);
    if (runningOnSimulator || !fromEnvHost || !isLoopbackHost(fromEnvHost)) {
      if (!preferLocalBase) {
        pushCandidate(fromEnv);
      }
    }
  }

  if (preferLocalBase) {
    metroHosts.forEach((host) => {
      if (!runningOnSimulator && isLoopbackHost(host)) {
        return;
      }
      pushCandidate(`http://${host}:4000/api`);
    });

    if (runningOnSimulator) {
      pushCandidate("http://localhost:4000/api");
      pushCandidate("http://127.0.0.1:4000/api");
    }

    if (fromEnv) {
      const fromEnvHost = parseHostCandidate(fromEnv);
      if (runningOnSimulator || !fromEnvHost || !isLoopbackHost(fromEnvHost)) {
        pushCandidate(fromEnv);
      }
    }
  } else {
    pushCandidate(DEFAULT_API_BASE);

    metroHosts.forEach((host) => {
      if (!runningOnSimulator && isLoopbackHost(host)) {
        return;
      }
      pushCandidate(`http://${host}:4000/api`);
    });

    if (runningOnSimulator) {
      pushCandidate("http://localhost:4000/api");
      pushCandidate("http://127.0.0.1:4000/api");
    }
  }

  return Array.from(new Set(values.map(normalizeApiBase).filter(Boolean)));
})();

export const bytesToBase64 = (bytes: Uint8Array) => {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0;
    const b = bytes[index + 1] ?? 0;
    const c = bytes[index + 2] ?? 0;
    const combined = (a << 16) | (b << 8) | c;

    output += alphabet[(combined >> 18) & 63];
    output += alphabet[(combined >> 12) & 63];
    output += index + 1 < bytes.length ? alphabet[(combined >> 6) & 63] : "=";
    output += index + 2 < bytes.length ? alphabet[combined & 63] : "=";
  }

  return output;
};

export const buildAdminDevHeaders = ({
  tenantHeader,
  activeLoginName,
}: {
  tenantHeader: string;
  activeLoginName: string;
}) => {
  const normalizedLoginName = activeLoginName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  return {
    "x-dev-user-id": normalizedLoginName
      ? `tenant-admin:${normalizedLoginName}`
      : "dev-user",
    "x-dev-email": normalizedLoginName
      ? `${normalizedLoginName}@clockin.local`
      : "dev@clockin.local",
    "x-dev-name": activeLoginName || "Dev User",
    "x-dev-tenant-id": tenantHeader,
  };
};

export const fetchAdminApiJson = async (params: {
  path: string;
  options?: RequestInit;
  resolvedApiBase: string | null;
  loggedIn: boolean;
  activeTenant: string;
  tenantInput: string;
  activeAdminUsername: string;
  username: string;
  defaultTenant: string;
  onResolvedApiBase: (apiBase: string) => void;
}): Promise<unknown> => {
  const orderedBases = params.resolvedApiBase
    ? [params.resolvedApiBase]
    : (Array.from(new Set(apiBaseCandidates.filter(Boolean))) as string[]);
  let lastError: Error | null = null;

  for (const apiBase of orderedBases) {
    try {
      const headers = new Headers(params.options?.headers);
      const tenantHeader =
        (params.loggedIn ? params.activeTenant : params.tenantInput).trim() ||
        params.defaultTenant;
      const activeLoginName = (
        (params.loggedIn ? params.activeAdminUsername : params.username) || ""
      ).trim();
      const devHeaders = buildAdminDevHeaders({
        tenantHeader,
        activeLoginName,
      });
      Object.entries(devHeaders).forEach(([key, value]) => {
        if (!headers.has(key)) {
          headers.set(key, value);
        }
      });
      const body = params.options?.body;
      const isFormData =
        typeof FormData !== "undefined" && body instanceof FormData;
      if (!isFormData && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      const response = await fetch(`${apiBase}${params.path}`, {
        ...params.options,
        headers,
      });

      if (!response.ok) {
        const raw = await response.text().catch(() => "");
        let message = "Request failed";
        if (raw) {
          try {
            const data = JSON.parse(raw);
            message = data?.message || data?.error || raw;
          } catch {
            message = raw;
          }
        }
        const responseError = new Error(`${message} (${response.status})`);
        if (!params.resolvedApiBase) {
          params.onResolvedApiBase(apiBase);
        }
        if (response.status >= 500 || response.status === 429) {
          lastError = responseError;
          continue;
        }
        throw responseError;
      }

      if (!params.resolvedApiBase) {
        params.onResolvedApiBase(apiBase);
      }

      const raw = await response.text();
      if (!raw) {
        return {};
      }
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    } catch (error) {
      if (error instanceof Error) {
        lastError = error;
        if (/network request failed|fetch failed|load failed/i.test(error.message)) {
          continue;
        }
        throw error;
      }
      lastError = new Error("Request failed");
      throw lastError;
    }
  }

  throw (
    lastError ||
    new Error(`Unable to reach ClockIn API. Tried: ${orderedBases.join(", ")}`)
  );
};

export const extractPendingTipsWorkDate = (message: string) => {
  const match = /pending tips required for work date (\d{4}-\d{2}-\d{2})/i.exec(
    message,
  );
  return match?.[1] || null;
};
