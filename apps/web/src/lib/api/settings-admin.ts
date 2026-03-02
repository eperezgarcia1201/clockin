import { requestJson } from "./client";

type SettingsPayload = Record<string, string | number | boolean | null>;

export async function getSettings<T extends object>(): Promise<Partial<T>> {
  return requestJson<Partial<T>>("/api/settings");
}

export async function updateSettings(payload: SettingsPayload): Promise<void> {
  await requestJson<unknown>("/api/settings", {
    method: "PUT",
    body: payload,
  });
}
