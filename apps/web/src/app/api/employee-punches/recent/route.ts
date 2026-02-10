import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../lib/clockin-api";

export async function GET() {
  try {
    const response = await clockinFetch("/employee-punches/recent");
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ rows: [] });
}
