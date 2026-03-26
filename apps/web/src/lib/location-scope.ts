import { cookies } from "next/headers";

export const ACTIVE_LOCATION_COOKIE = "clockin_active_location_id";

const cleanOfficeId = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const scopedOfficeIdFromRequest = async (request: Request) => {
  const url = new URL(request.url);
  const explicitOfficeId = cleanOfficeId(url.searchParams.get("officeId"));
  if (explicitOfficeId) {
    return explicitOfficeId;
  }

  const cookieStore = await cookies();
  return cleanOfficeId(cookieStore.get(ACTIVE_LOCATION_COOKIE)?.value);
};

export const scopedJsonBodyFromRequest = async (request: Request) => {
  const body = (await request.json()) as Record<string, unknown>;
  const explicitBodyOfficeId = cleanOfficeId(
    typeof body.officeId === "string" ? body.officeId : undefined,
  );
  if (explicitBodyOfficeId) {
    return { ...body, officeId: explicitBodyOfficeId };
  }

  const officeId = await scopedOfficeIdFromRequest(request);
  if (!officeId) {
    return body;
  }

  return {
    ...body,
    officeId,
  };
};

export const scopedQueryFromRequest = async (request: Request) => {
  const url = new URL(request.url);
  const query = new URLSearchParams(url.searchParams);

  const explicitOfficeId = cleanOfficeId(query.get("officeId"));
  if (explicitOfficeId) {
    query.set("officeId", explicitOfficeId);
    return query;
  }

  const cookieOfficeId = await scopedOfficeIdFromRequest(request);
  if (cookieOfficeId) {
    query.set("officeId", cookieOfficeId);
  }

  return query;
};

export const withQuery = (path: string, query: URLSearchParams) => {
  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
};
