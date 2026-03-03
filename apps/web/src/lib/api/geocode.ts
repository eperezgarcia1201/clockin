import { requestJson } from "./client";

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  address?: string;
};

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const value = address.trim();
  if (!value) {
    throw new Error("Address is required.");
  }
  return requestJson<GeocodeResult>(
    `/api/geocode?address=${encodeURIComponent(value)}`,
  );
}

