import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "crypto";
import {
  ADMIN_COOKIE_NAME,
  adminSessionTtlSeconds,
  createAdminSessionToken,
} from "../../../../lib/admin-session";

const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
};

export async function POST(request: Request) {
  const { username, password } = (await request.json()) as {
    username?: string;
    password?: string;
  };

  const expectedUsername = process.env.ADMIN_USERNAME || "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD || "1234qwer";

  if (
    !username ||
    !password ||
    !safeEqual(username, expectedUsername) ||
    !safeEqual(password, expectedPassword)
  ) {
    return NextResponse.json(
      { error: "Invalid administrator credentials." },
      { status: 401 },
    );
  }

  const token = createAdminSessionToken(username);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: adminSessionTtlSeconds(),
  });

  return NextResponse.json({ ok: true });
}
