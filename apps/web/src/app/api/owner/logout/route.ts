import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  OWNER_COOKIE_NAME,
  ownerSessionTtlSeconds,
} from "../../../../lib/owner-session";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(OWNER_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json({ ok: true, expiresIn: ownerSessionTtlSeconds() });
}
