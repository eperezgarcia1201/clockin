import type { CompanyOrderRow } from "./types";

export const buildCompanyOrdersQueryString = (
  officeId: string | null,
  limit: number,
): string => {
  const query = new URLSearchParams();
  query.set("limit", String(limit));
  if (officeId) {
    query.set("officeId", officeId);
  }
  return query.toString();
};

export const normalizeCompanyOrderRows = (payload: {
  orders?: CompanyOrderRow[];
}): CompanyOrderRow[] => (Array.isArray(payload.orders) ? payload.orders : []);
