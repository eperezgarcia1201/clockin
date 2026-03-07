import { requestJson } from "./client";

export type AdminNotificationPreferences = {
  notifyPunchActivity: boolean;
  notifyNoBreakAlerts: boolean;
  notifyLateClockInReminders: boolean;
  notifyScheduleOverrides: boolean;
  notifyTipSummaries: boolean;
  notifyDailySalesReminders: boolean;
};

export type AdminNotificationPreferenceKey =
  keyof AdminNotificationPreferences;

export type AdminPushDevice = {
  id: string;
  label?: string | null;
  platform?: string | null;
  timeZone?: string | null;
  tokenPreview?: string | null;
  createdAt: string;
  updatedAt: string;
  notifications: AdminNotificationPreferences;
};

type AdminDevicesResponse = {
  devices?: AdminPushDevice[];
};

type AdminDeviceResponse = {
  device?: AdminPushDevice | null;
};

export async function listAdminDevices(): Promise<AdminPushDevice[]> {
  const payload = await requestJson<AdminDevicesResponse>("/api/admin-devices");
  return payload.devices ?? [];
}

export async function updateAdminDevice(
  id: string,
  payload: Partial<AdminNotificationPreferences> & {
    timeZone?: string;
    label?: string | null;
    platform?: string | null;
  },
): Promise<AdminPushDevice> {
  const response = await requestJson<AdminDeviceResponse>(
    `/api/admin-devices/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: payload,
    },
  );
  if (!response.device) {
    throw new Error("Unable to save notification settings.");
  }
  return response.device;
}

export async function removeAdminDevice(id: string): Promise<void> {
  await requestJson<unknown>(`/api/admin-devices/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
