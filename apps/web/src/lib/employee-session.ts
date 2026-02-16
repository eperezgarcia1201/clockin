import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "clockin_employee";
const DEFAULT_TTL_DAYS = 30;

type EmployeeSessionPayload = {
  version: 1;
  adminUsername: string;
  tenantAuthOrgId: string;
  tenantSlug: string | null;
  tenantName: string | null;
  issuedAt: number;
  expiresAt: number;
};

export type EmployeeSession = {
  adminUsername: string;
  tenantAuthOrgId: string;
  tenantSlug: string | null;
  tenantName: string | null;
  expiresAt: number;
};

type CreateEmployeeSessionOptions = {
  tenantAuthOrgId: string;
  tenantSlug?: string | null;
  tenantName?: string | null;
};

const getSecret = () =>
  process.env.EMPLOYEE_SESSION_SECRET ||
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

export const EMPLOYEE_COOKIE_NAME = COOKIE_NAME;

export const employeeSessionTtlSeconds = () => {
  const ttlDays = Number(process.env.EMPLOYEE_SESSION_TTL_DAYS);
  const days =
    Number.isFinite(ttlDays) && ttlDays > 0 ? ttlDays : DEFAULT_TTL_DAYS;
  return Math.round(days * 24 * 60 * 60);
};

export const createEmployeeSessionToken = (
  adminUsername: string,
  options: CreateEmployeeSessionOptions,
) => {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + employeeSessionTtlSeconds() * 1000;
  const payload: EmployeeSessionPayload = {
    version: 1,
    adminUsername,
    tenantAuthOrgId: options.tenantAuthOrgId,
    tenantSlug: options.tenantSlug || null,
    tenantName: options.tenantName || null,
    issuedAt,
    expiresAt,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
};

export const verifyEmployeeSessionToken = (
  token: string,
): EmployeeSession | null => {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }

  const [encodedPayload, signature] = parts;
  const expected = sign(encodedPayload);
  if (!safeEqual(signature, expected)) {
    return null;
  }

  let payload: EmployeeSessionPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as EmployeeSessionPayload;
  } catch {
    return null;
  }

  if (
    payload.version !== 1 ||
    typeof payload.adminUsername !== "string" ||
    !payload.adminUsername ||
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
    adminUsername: payload.adminUsername,
    tenantAuthOrgId: payload.tenantAuthOrgId,
    tenantSlug: payload.tenantSlug || null,
    tenantName: payload.tenantName || null,
    expiresAt: payload.expiresAt,
  };
};

export const getEmployeeSession = async () => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);
  if (!sessionCookie?.value) {
    return null;
  }

  return verifyEmployeeSessionToken(sessionCookie.value);
};
