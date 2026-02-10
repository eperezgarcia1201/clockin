import { NextResponse } from "next/server";
import { clockinFetch } from "../../../lib/clockin-api";

const fallbackOffices = [
  { id: "1", name: "MayaOfdepere" },
  { id: "2", name: "Downtown" },
];

export async function GET() {
  try {
    const response = await clockinFetch("/offices");
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch {
    // ignore and fall back
  }

  return NextResponse.json({ offices: fallbackOffices });
}

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const response = await clockinFetch("/offices", {
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
