import { NextResponse } from "next/server";
import { clockinFetch } from "../../../../lib/clockin-api";

export async function GET(
  _request: Request,
  context: { params: { id: string } },
) {
  try {
    const response = await clockinFetch(`/employees/${context.params.id}`);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const response = await clockinFetch(`/employees/${context.params.id}`, {
      method: "PATCH",
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

export async function DELETE(
  _request: Request,
  context: { params: { id: string } },
) {
  try {
    const response = await clockinFetch(`/employees/${context.params.id}`, {
      method: "DELETE",
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
