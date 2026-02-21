import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../lib/clockin-api";
import {
  scopedQueryFromRequest,
  withQuery,
} from "../../../../lib/location-scope";

export async function GET(request: Request) {
  const query = await scopedQueryFromRequest(request);
  try {
    const response = await clockinFetch(
      withQuery("/liquor-inventory/bottle-scans", query),
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
