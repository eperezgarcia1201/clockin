import { cookies } from "next/headers";

export const ACTIVE_LOCATION_COOKIE = "clockin_active_location_id";

const cleanOfficeId = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const scopedQueryFromRequest = async (request: Request) => {
  const url = new URL(request.url);
  const query = new URLSearchParams(url.searchParams);

  const explicitOfficeId = cleanOfficeId(query.get("officeId"));
  if (explicitOfficeId) {
    query.set("officeId", explicitOfficeId);
    return query;
  }

  const cookieStore = await cookies();
  const cookieOfficeId = cleanOfficeId(
    cookieStore.get(ACTIVE_LOCATION_COOKIE)?.value,
  );
  if (cookieOfficeId) {
    query.set("officeId", cookieOfficeId);
  }

  return query;
};

export const withQuery = (path: string, query: URLSearchParams) => {
  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
};

