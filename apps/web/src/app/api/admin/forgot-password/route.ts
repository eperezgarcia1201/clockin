import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
  };

  if (!body.email) {
    return NextResponse.json(
      { error: "Email address is required." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
