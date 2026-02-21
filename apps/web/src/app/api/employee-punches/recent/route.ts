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
      withQuery("/employee-punches/recent", query),
    );
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ rows: [] });
}
