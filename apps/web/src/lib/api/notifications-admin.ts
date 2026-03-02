import { requestJson } from "./client";

export type NotificationRow = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  employeeId?: string | null;
  employeeName?: string | null;
};

type NotificationsResponse = {
  notifications?: NotificationRow[];
};

type SendEmployeeMessageInput = {
  employeeId: string;
  subject: string;
  message: string;
};

export async function listNotifications(options?: {
  limit?: number;
  unreadOnly?: boolean;
}): Promise<NotificationRow[]> {
  const params = new URLSearchParams();
  params.set("limit", String(options?.limit ?? 50));
  if (options?.unreadOnly) {
    params.set("unread", "1");
  }

  const payload = await requestJson<NotificationsResponse>(
    `/api/notifications?${params.toString()}`,
  );
  return payload.notifications ?? [];
}

export async function markNotificationRead(id: string): Promise<void> {
  await requestJson<unknown>(
    `/api/notifications/${encodeURIComponent(id)}/read`,
    {
      method: "PATCH",
    },
  );
}

export async function markAllNotificationsRead(): Promise<void> {
  await requestJson<unknown>("/api/notifications/read-all", {
    method: "POST",
  });
}

export async function sendEmployeeMessage(
  payload: SendEmployeeMessageInput,
): Promise<void> {
  await requestJson<unknown>("/api/notifications/employee-message", {
    method: "POST",
    body: payload,
  });
}
