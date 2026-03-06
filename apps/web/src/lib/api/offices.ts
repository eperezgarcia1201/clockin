import { requestJson } from "./client";

export type Office = {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadiusMeters?: number | null;
};

type OfficesResponse = { offices?: Office[] };

export async function listOffices(): Promise<Office[]> {
  const payload = await requestJson<OfficesResponse>("/api/offices");
  return payload.offices ?? [];
}

export async function createOffice(input: {
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadiusMeters?: number | null;
}): Promise<Office | null> {
  const payload = await requestJson<Office | null>("/api/offices", {
    method: "POST",
    body: input,
  });
  return payload ?? null;
}

export async function updateOffice(
  officeId: string,
  input: {
    name?: string;
    latitude?: number | null;
    longitude?: number | null;
    geofenceRadiusMeters?: number | null;
  },
): Promise<void> {
  await requestJson<unknown>(`/api/offices/${officeId}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteOffice(officeId: string): Promise<void> {
  await requestJson<unknown>(`/api/offices/${officeId}`, {
    method: "DELETE",
  });
}
