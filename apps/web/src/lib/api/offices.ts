import { requestJson } from "./client";

export type Office = { id: string; name: string };

type OfficesResponse = { offices?: Office[] };

export async function listOffices(): Promise<Office[]> {
  const payload = await requestJson<OfficesResponse>("/api/offices");
  return payload.offices ?? [];
}

export async function createOffice(input: {
  name: string;
}): Promise<Office | null> {
  const payload = await requestJson<Office | null>("/api/offices", {
    method: "POST",
    body: input,
  });
  return payload ?? null;
}
