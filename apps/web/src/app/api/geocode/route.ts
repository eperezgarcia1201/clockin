import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const address = url.searchParams.get("address")?.trim() || "";
  if (!address) {
    return NextResponse.json(
      { error: "address is required" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`,
      {
        headers: {
          "User-Agent": "ClockIn/1.0 (admin geofence lookup)",
        },
        cache: "no-store",
      },
    );
    if (!response.ok) {
      return NextResponse.json(
        { error: "Unable to geocode address." },
        { status: 502 },
      );
    }

    const data = (await response.json()) as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
    }>;
    const top = data[0];
    if (!top?.lat || !top?.lon) {
      return NextResponse.json(
        { error: "No geocode match found for this address." },
        { status: 404 },
      );
    }

    const latitude = Number(top.lat);
    const longitude = Number(top.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        { error: "Invalid geocode coordinates returned." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      latitude,
      longitude,
      address: top.display_name || address,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to geocode address." },
      { status: 500 },
    );
  }
}
