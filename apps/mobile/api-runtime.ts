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

    // Keep production API as a fallback when local/dev hosts are unreachable.
    pushCandidate(DEFAULT_API_BASE);
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

export const extractPendingTipsWorkDate = (message: string) => {
  const match = /pending tips required for work date (\d{4}-\d{2}-\d{2})/i.exec(
    message,
  );
  return match?.[1] || null;
};
