import { NextResponse } from "next/server";
import { clockinFetch } from "../../../lib/clockin-api";

const fallbackGroups = [
  { id: "1", name: "Servers" },
  { id: "2", name: "Cooks" },
  { id: "3", name: "Managers" },
];

export async function GET() {
  try {
    const response = await clockinFetch("/groups");
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ groups: fallbackGroups });
}

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const response = await clockinFetch("/groups", {
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
