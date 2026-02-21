import { NextResponse } from "next/server";
import { clockinFetch } from "../../../lib/clockin-api";
import { scopedQueryFromRequest, withQuery } from "../../../lib/location-scope";

const cleanOfficeId = (value: unknown) => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
};

export async function GET(request: Request) {
  const query = await scopedQueryFromRequest(request);
  try {
    const response = await clockinFetch(withQuery("/company-orders", query));
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
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const query = await scopedQueryFromRequest(request);
    const scopedOfficeId = cleanOfficeId(query.get("officeId"));
    const bodyOfficeId = cleanOfficeId(body.officeId);
    if (!bodyOfficeId && scopedOfficeId) {
      body.officeId = scopedOfficeId;
    }

    const response = await clockinFetch("/company-orders", {
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
