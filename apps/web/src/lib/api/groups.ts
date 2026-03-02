import { requestJson } from "./client";
import { listOffices, type Office } from "./offices";

export type Group = { id: string; name: string; officeId?: string | null };

type GroupsResponse = { groups?: Group[] };

export async function listGroups(): Promise<Group[]> {
  const payload = await requestJson<GroupsResponse>("/api/groups");
  return payload.groups ?? [];
}

export { listOffices, type Office };

export async function createGroup(input: {
  name: string;
  officeId?: string;
}): Promise<void> {
  await requestJson<unknown>("/api/groups", {
    method: "POST",
    body: input,
  });
}
