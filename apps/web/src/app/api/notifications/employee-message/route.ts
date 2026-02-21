import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../lib/clockin-api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await clockinFetch("/notifications/employee-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 },
    );
  }
}
