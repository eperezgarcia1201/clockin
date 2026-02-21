import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../lib/clockin-api";
import {
  scopedQueryFromRequest,
  withQuery,
} from "../../../../lib/location-scope";

export async function GET(request: Request) {
  try {
    const query = await scopedQueryFromRequest(request);
    const response = await clockinFetch(withQuery("/reports/audit", query));
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 },
    );
  }
}
