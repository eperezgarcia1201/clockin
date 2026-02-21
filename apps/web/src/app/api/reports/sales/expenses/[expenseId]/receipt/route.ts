import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../../../../lib/clockin-api";

type RouteParams = {
  params: Promise<{ expenseId: string }>;
};

export async function POST(request: Request, context: RouteParams) {
  try {
    const { expenseId } = await context.params;
    const formData = await request.formData();
    const response = await clockinFetch(
      `/reports/sales/expenses/${encodeURIComponent(expenseId)}/receipt`,
      {
        method: "POST",
        body: formData,
      },
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

export async function GET(_request: Request, context: RouteParams) {
  try {
    const { expenseId } = await context.params;
    const response = await clockinFetch(
      `/reports/sales/expenses/${encodeURIComponent(expenseId)}/receipt`,
    );

    if (!response.ok) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    const data = await response.arrayBuffer();
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const contentDisposition =
      response.headers.get("content-disposition") || "inline";

    return new NextResponse(data, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 },
    );
  }
}
