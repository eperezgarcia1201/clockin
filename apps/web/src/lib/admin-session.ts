import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "clockin_admin";
const DEFAULT_TTL_HOURS = 12;

type AdminSessionPayload = {
  version: 2;
  username: string;
  tenantAuthOrgId: string;
  tenantSlug: string | null;
  tenantName: string | null;
  tenantSubdomain: string | null;
  issuedAt: number;
  expiresAt: number;
};

export type AdminSession = {
  username: string;
  tenantAuthOrgId: string | null;
  tenantSlug: string | null;
  tenantName: string | null;
  tenantSubdomain: string | null;
  expiresAt: number;
};

type CreateAdminSessionOptions = {
  tenantAuthOrgId: string;
  tenantSlug?: string | null;
  tenantName?: string | null;
  tenantSubdomain?: string | null;
};

const getSecret = () =>
  process.env.ADMIN_SESSION_SECRET || process.env.AUTH0_SECRET || "dev-secret";

const sign = (value: string) =>
  createHmac("sha256", getSecret()).update(value).digest("hex");

const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
};

export const ADMIN_COOKIE_NAME = COOKIE_NAME;

export const adminSessionTtlSeconds = () => {
  const ttlHours = Number(process.env.ADMIN_SESSION_TTL_HOURS);
  const hours =
    Number.isFinite(ttlHours) && ttlHours > 0 ? ttlHours : DEFAULT_TTL_HOURS;
  return Math.round(hours * 60 * 60);
};

export const createAdminSessionToken = (
  username: string,
  options: CreateAdminSessionOptions,
) => {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + adminSessionTtlSeconds() * 1000;
  const payload: AdminSessionPayload = {
    version: 2,
    username,
    tenantAuthOrgId: options.tenantAuthOrgId,
    tenantSlug: options.tenantSlug || null,
    tenantName: options.tenantName || null,
    tenantSubdomain: options.tenantSubdomain || null,
    issuedAt,
    expiresAt,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
};

export const verifyAdminSessionToken = (token: string): AdminSession | null => {
  if (token.includes(".")) {
    return verifyStructuredToken(token);
  }
  return verifyLegacyToken(token);
};

const verifyStructuredToken = (token: string): AdminSession | null => {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }

  const [encodedPayload, signature] = parts;
  const expected = sign(encodedPayload);
  if (!safeEqual(signature, expected)) {
    return null;
  }

  let payload: AdminSessionPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as AdminSessionPayload;
  } catch {
    return null;
  }

  if (
    payload.version !== 2 ||
    typeof payload.username !== "string" ||
    !payload.username ||
    typeof payload.tenantAuthOrgId !== "string" ||
    !payload.tenantAuthOrgId ||
    typeof payload.expiresAt !== "number"
  ) {
    return null;
  }

  if (!Number.isFinite(payload.expiresAt) || Date.now() > payload.expiresAt) {
    return null;
  }

  return {
    username: payload.username,
    tenantAuthOrgId: payload.tenantAuthOrgId,
    tenantSlug: payload.tenantSlug || null,
    tenantName: payload.tenantName || null,
    tenantSubdomain: payload.tenantSubdomain || null,
    expiresAt: payload.expiresAt,
  };
};

const verifyLegacyToken = (token: string): AdminSession | null => {
  const parts = token.split(":");
  if (parts.length !== 4) {
    return null;
  }

  const [username, issuedAtRaw, expiresAtRaw, signature] = parts;
  const payload = `${username}:${issuedAtRaw}:${expiresAtRaw}`;
  const expected = sign(payload);

  if (!safeEqual(signature, expected)) {
    return null;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return null;
  }

  return {
    username,
    tenantAuthOrgId: null,
    tenantSlug: null,
    tenantName: null,
    tenantSubdomain: null,
    expiresAt,
  };
};

export const getAdminSession = async () => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);
  if (!sessionCookie?.value) {
    return null;
  }

  return verifyAdminSessionToken(sessionCookie.value);
};
