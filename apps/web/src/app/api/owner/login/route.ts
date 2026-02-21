import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createOwnerSessionToken,
  OWNER_COOKIE_NAME,
  ownerSessionTtlSeconds,
} from "../../../../lib/owner-session";

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

  const expectedUsername = process.env.OWNER_USERNAME || "elmer";
  const expectedPassword = process.env.OWNER_PASSWORD || "1234qwer";

  if (
    !username ||
    !password ||
    !safeEqual(username, expectedUsername) ||
    !safeEqual(password, expectedPassword)
  ) {
    return NextResponse.json(
      { error: "Invalid owner credentials." },
      { status: 401 },
    );
  }

  const token = createOwnerSessionToken(username);
  const cookieStore = await cookies();
  cookieStore.set(OWNER_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ownerSessionTtlSeconds(),
  });

  return NextResponse.json({ ok: true });
}
