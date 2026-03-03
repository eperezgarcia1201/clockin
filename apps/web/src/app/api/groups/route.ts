import { NextResponse } from "next/server";
import { clockinFetch } from "../../../lib/clockin-api";
import { scopedQueryFromRequest, withQuery } from "../../../lib/location-scope";

export async function GET(request: Request) {
  const query = await scopedQueryFromRequest(request);
  try {
    const response = await clockinFetch(withQuery("/groups", query));
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        data && typeof data === "object" && "error" in data
          ? String((data as { error?: unknown }).error || "")
          : "";
      return NextResponse.json(
        { error: message || "Unable to load groups for this tenant." },
        { status: response.status },
      );
    }
    return NextResponse.json(data ?? { groups: [] });
  } catch {
    return NextResponse.json(
      { error: "Unable to load groups for this tenant." },
      { status: 502 },
    );
  }
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
