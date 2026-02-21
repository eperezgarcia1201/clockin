import { NextResponse } from "next/server";
import { clockinFetch } from "../../../lib/clockin-api";
import { scopedQueryFromRequest, withQuery } from "../../../lib/location-scope";

export async function GET(request: Request) {
  const query = await scopedQueryFromRequest(request);
  const scope = query.get("scope");
  if (scope !== "deleted") {
    query.delete("scope");
  }

  try {
    const response = await clockinFetch(withQuery("/employees", query));
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
