import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../lib/clockin-api";
import {
  scopedQueryFromRequest,
  withQuery,
} from "../../../../lib/location-scope";

export async function GET(request: Request) {
  try {
    const query = await scopedQueryFromRequest(request);
    const response = await clockinFetch(
      withQuery("/employee-punches/records", query),
    );
    const data = await response.json();
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
    const body = await request.json();
    const response = await clockinFetch("/employee-punches/records", {
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
