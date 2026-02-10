import { NextResponse } from "next/server";
import { clockinFetch } from "../../../lib/clockin-api";

const fallbackStatuses = [
  { id: "1", label: "IN", color: "#2a4d8f", isIn: true },
  { id: "2", label: "OUT", color: "#8b1e1e", isIn: false },
  { id: "3", label: "BREAK", color: "#d0832a", isIn: false },
  { id: "4", label: "LUNCH", color: "#1a335f", isIn: false },
];

export async function GET() {
  try {
    const response = await clockinFetch("/statuses");
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ statuses: fallbackStatuses });
}

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const response = await clockinFetch("/statuses", {
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
