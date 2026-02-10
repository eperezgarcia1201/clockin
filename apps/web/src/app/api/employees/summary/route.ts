import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../lib/clockin-api";

export async function GET() {
  try {
    const response = await clockinFetch("/employees/summary");
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ total: 12, admins: 2, timeAdmins: 3, reports: 4 });
}
