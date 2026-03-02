import { requestJson } from "./client";

export type Status = {
  id: string;
  label: string;
  color: string;
  isIn: boolean;
};

type StatusesResponse = { statuses?: Status[] };

export async function listStatuses(): Promise<Status[]> {
  const payload = await requestJson<StatusesResponse>("/api/statuses");
  return payload.statuses ?? [];
}

export async function createStatus(input: {
  label: string;
  color: string;
  isIn: boolean;
}): Promise<void> {
  await requestJson<unknown>("/api/statuses", {
    method: "POST",
    body: input,
  });
}
