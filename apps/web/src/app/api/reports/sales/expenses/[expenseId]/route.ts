import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../../../lib/clockin-api";
import { scopedJsonBodyFromRequest } from "../../../../../../lib/location-scope";

type RouteParams = {
  params: Promise<{ expenseId: string }>;
};

export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { expenseId } = await context.params;
    const body = await scopedJsonBodyFromRequest(request);
    const response = await clockinFetch(
      `/reports/sales/expenses/${encodeURIComponent(expenseId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

export async function DELETE(_request: Request, context: RouteParams) {
  try {
    const { expenseId } = await context.params;
    const response = await clockinFetch(
      `/reports/sales/expenses/${encodeURIComponent(expenseId)}`,
      {
        method: "DELETE",
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
