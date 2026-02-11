import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../lib/clockin-api";

export async function POST() {
  try {
    const response = await clockinFetch("/notifications/read-all", {
      method: "POST",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 },
    );
  }
}
