import { getScheduleOverrideStatusMessage } from "./schedule-override-helpers";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const sendEmployeeMessageRequest = async (params: {
  fetchJson: FetchJson;
  payload: { employeeId: string; subject: string; message: string };
}): Promise<string> => {
  await params.fetchJson("/notifications/employee-message", {
    method: "POST",
    body: JSON.stringify(params.payload),
  });
  return "Message sent. It will pop up when the employee clocks in.";
};

export const applyScheduleOverrideDecisionRequest = async (params: {
  fetchJson: FetchJson;
  requestId: string;
  approve: boolean;
}): Promise<string> => {
  const data = (await params.fetchJson(
    `/employee-punches/schedule-overrides/${params.requestId}/${params.approve ? "approve" : "reject"}`,
    { method: "PATCH" },
  )) as {
    autoClockIn?: { clockedIn?: boolean; alreadyActive?: boolean };
  };
  return getScheduleOverrideStatusMessage({
    approve: params.approve,
    autoClockIn: data.autoClockIn,
  });
};

export const resolveNotificationListenerErrorMessage = (error: unknown): string =>
  error instanceof Error
    ? `Notification listener error: ${error.message}`
    : "Notification listener failed to start.";
