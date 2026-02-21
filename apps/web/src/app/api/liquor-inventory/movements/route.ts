import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../lib/clockin-api";
import { scopedQueryFromRequest, withQuery } from "../../../../lib/location-scope";

export async function GET(request: Request) {
  const query = await scopedQueryFromRequest(request);
  try {
    const response = await clockinFetch(
      withQuery("/liquor-inventory/movements", query),
    );
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const query = await scopedQueryFromRequest(request);
    const scopedOfficeId = query.get("officeId")?.trim();
    if (scopedOfficeId && !String(body.officeId || "").trim()) {
      body.officeId = scopedOfficeId;
    }
    const response = await clockinFetch("/liquor-inventory/movements", {
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
