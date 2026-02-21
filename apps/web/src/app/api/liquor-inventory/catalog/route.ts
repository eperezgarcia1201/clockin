import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../lib/clockin-api";

const withQuery = (path: string, query: URLSearchParams) => {
  const value = query.toString();
  return value ? `${path}?${value}` : path;
};

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    const response = await clockinFetch(
      withQuery("/liquor-inventory/catalog", query),
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
    const body = await request.json().catch(() => ({}));
    const response = await clockinFetch("/liquor-inventory/catalog", {
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
