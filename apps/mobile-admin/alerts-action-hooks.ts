import { useCallback } from "react";
import {
  applyScheduleOverrideDecisionRequest,
  sendEmployeeMessageRequest,
} from "./alerts-runtime";
import {
  buildEmployeeMessagePayload,
  validateEmployeeMessageDraft,
} from "./employee-message-helpers";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const useAlertsActions = (params: {
  fetchJson: FetchJson;
  employeeMessageEmployeeId: string;
  employeeMessageSubject: string;
  employeeMessageBody: string;
  setEmployeeMessageStatus: (value: string | null) => void;
  setEmployeeMessageSending: (value: boolean) => void;
  setEmployeeMessageSubject: (value: string) => void;
  setEmployeeMessageBody: (value: string) => void;
  loadNotifications: () => Promise<void>;
  loadActiveNow: () => Promise<void>;
  setAlertsStatus: (value: string | null) => void;
  setScheduleOverrideLoadingId: (value: string | null) => void;
}) => {
  const sendEmployeeMessage = useCallback(async () => {
    const validationError = validateEmployeeMessageDraft({
      employeeId: params.employeeMessageEmployeeId,
      subject: params.employeeMessageSubject,
      message: params.employeeMessageBody,
    });
    if (validationError) {
      params.setEmployeeMessageStatus(validationError);
      return;
    }

    const payload = buildEmployeeMessagePayload({
      employeeId: params.employeeMessageEmployeeId,
      subject: params.employeeMessageSubject,
      message: params.employeeMessageBody,
    });

    params.setEmployeeMessageSending(true);
    params.setEmployeeMessageStatus(null);
    try {
      const successStatus = await sendEmployeeMessageRequest({
        fetchJson: params.fetchJson,
        payload,
      });
      params.setEmployeeMessageSubject("");
      params.setEmployeeMessageBody("");
      params.setEmployeeMessageStatus(successStatus);
      await params.loadNotifications();
    } catch (error) {
      params.setEmployeeMessageStatus(
        error instanceof Error ? error.message : "Unable to send message.",
      );
    } finally {
      params.setEmployeeMessageSending(false);
    }
  }, [
    params.employeeMessageBody,
    params.employeeMessageEmployeeId,
    params.employeeMessageSubject,
    params.fetchJson,
    params.loadNotifications,
  ]);

  const handleScheduleOverrideDecision = useCallback(
    async (requestId: string, approve: boolean) => {
      params.setAlertsStatus(null);
      params.setScheduleOverrideLoadingId(requestId);
      try {
        const status = await applyScheduleOverrideDecisionRequest({
          fetchJson: params.fetchJson,
          requestId,
          approve,
        });
        params.setAlertsStatus(status);
        await params.loadNotifications();
        await params.loadActiveNow();
      } catch (error) {
        params.setAlertsStatus(
          error instanceof Error
            ? error.message
            : "Unable to update schedule override request.",
        );
      } finally {
        params.setScheduleOverrideLoadingId(null);
      }
    },
    [params.fetchJson, params.loadActiveNow, params.loadNotifications],
  );

  return { sendEmployeeMessage, handleScheduleOverrideDecision };
};
