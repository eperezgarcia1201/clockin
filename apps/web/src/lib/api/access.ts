import { requestJson } from "./client";

export type AccessMe = {
  multiLocationEnabled?: boolean;
  tenantName?: string;
  tenantSlug?: string;
  tenantOwnerEmail?: string | null;
  adminUsername?: string;
  mainAdminUsername?: string;
  [key: string]: unknown;
};

export async function getAccessMe(): Promise<AccessMe> {
  return requestJson<AccessMe>("/api/access/me");
}
