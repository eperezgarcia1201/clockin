import { requestJson } from "./client";

export type AccessMe = {
  multiLocationEnabled?: boolean;
  [key: string]: unknown;
};

export async function getAccessMe(): Promise<AccessMe> {
  return requestJson<AccessMe>("/api/access/me");
}
