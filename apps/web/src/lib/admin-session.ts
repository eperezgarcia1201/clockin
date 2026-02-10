import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "clockin_admin";
const DEFAULT_TTL_HOURS = 12;

type AdminSession = {
  username: string;
  expiresAt: number;
};

const getSecret = () =>
  process.env.ADMIN_SESSION_SECRET ||
  process.env.AUTH0_SECRET ||
  "dev-secret";

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
  const hours = Number.isFinite(ttlHours) && ttlHours > 0 ? ttlHours : DEFAULT_TTL_HOURS;
  return Math.round(hours * 60 * 60);
};

export const createAdminSessionToken = (username: string) => {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + adminSessionTtlSeconds() * 1000;
  const payload = `${username}:${issuedAt}:${expiresAt}`;
  const signature = sign(payload);
  return `${payload}:${signature}`;
};

export const verifyAdminSessionToken = (token: string): AdminSession | null => {
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

  return { username, expiresAt };
};

export const getAdminSession = async () => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);
  if (!sessionCookie?.value) {
    return null;
  }

  return verifyAdminSessionToken(sessionCookie.value);
};
