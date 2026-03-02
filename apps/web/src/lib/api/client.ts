export class ClientApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ClientApiError";
    this.status = status;
  }
}

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type JsonRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: JsonValue;
  headers?: HeadersInit;
};

function withJsonHeaders(headers?: HeadersInit, hasBody = false): Headers {
  const merged = new Headers(headers);
  if (!merged.has("Accept")) {
    merged.set("Accept", "application/json");
  }
  if (hasBody && !merged.has("Content-Type")) {
    merged.set("Content-Type", "application/json");
  }
  return merged;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function requestJson<T>(
  path: string,
  options: JsonRequestOptions = {},
): Promise<T> {
  const hasBody = options.body !== undefined;
  const headers = withJsonHeaders(options.headers, hasBody);
  const response = await fetch(path, {
    ...options,
    headers,
    cache: options.cache ?? "no-store",
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });

  const payload = await parseResponseBody(response);
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    if (
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof payload.message === "string"
    ) {
      message = payload.message;
    } else if (
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
    ) {
      message = payload.error;
    }
    throw new ClientApiError(message, response.status);
  }

  return payload as T;
}
