import * as Location from "expo-location";
import { Alert } from "react-native";
import { shouldRetryPunchWithoutOptionalFields } from "./punch-runtime";
import type { FetchJson, PunchTipsText } from "./punch-tip-action-types";

type PunchPayload = Record<string, unknown>;

export type PunchResponse = {
  managerMessage?: {
    subject?: string;
    message?: string;
    fromName?: string | null;
  } | null;
} | null;

export const getClockInCoordinates = async (params: {
  locationPermissionRequired: string;
  unableToReadLocation: string;
}) => {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) {
    throw new Error(params.locationPermissionRequired);
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const { latitude, longitude } = position.coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(params.unableToReadLocation);
  }

  return { latitude, longitude };
};

export const submitPunchWithOptionalRetry = async (params: {
  fetchJson: FetchJson;
  employeeId: string;
  basePayload: PunchPayload;
  payloadWithGeo: PunchPayload;
}): Promise<PunchResponse> => {
  try {
    return (await params.fetchJson(`/employee-punches/${params.employeeId}`, {
      method: "POST",
      body: JSON.stringify(params.payloadWithGeo),
    })) as PunchResponse;
  } catch (submitError) {
    const message = submitError instanceof Error ? submitError.message.toLowerCase() : "";
    if (
      shouldRetryPunchWithoutOptionalFields({
        basePayload: params.basePayload,
        payloadWithGeo: params.payloadWithGeo,
        errorMessage: message,
      })
    ) {
      return (await params.fetchJson(`/employee-punches/${params.employeeId}`, {
        method: "POST",
        body: JSON.stringify(params.basePayload),
      })) as PunchResponse;
    }
    throw submitError;
  }
};

export const showManagerPunchMessage = (params: {
  punchResponse: PunchResponse;
  punchType: string;
  t: PunchTipsText;
}) => {
  if (params.punchType !== "IN" || !params.punchResponse?.managerMessage) {
    return;
  }
  const messageSubject =
    typeof params.punchResponse.managerMessage.subject === "string" &&
    params.punchResponse.managerMessage.subject.trim()
      ? params.punchResponse.managerMessage.subject
      : params.t.managerMessageFallbackSubject;
  const messageBody =
    typeof params.punchResponse.managerMessage.message === "string"
      ? params.punchResponse.managerMessage.message.trim()
      : "";
  const fromName =
    typeof params.punchResponse.managerMessage.fromName === "string" &&
    params.punchResponse.managerMessage.fromName.trim()
      ? params.punchResponse.managerMessage.fromName
      : "";
  const fromLine = fromName ? `\n\n${params.t.managerMessageFrom}: ${fromName}` : "";
  const alertBody = `${messageBody}${fromLine}`.trim();
  Alert.alert(messageSubject, alertBody || params.t.managerMessageFallbackSubject);
};
