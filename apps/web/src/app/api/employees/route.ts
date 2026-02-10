import { NextResponse } from "next/server";
import { clockinFetch } from "../../../lib/clockin-api";

export async function GET() {
  try {
    const response = await clockinFetch("/employees");
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch {
    // Fall back to local list if API is unavailable.
  }

  return NextResponse.json({ employees: [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const response = await clockinFetch("/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
