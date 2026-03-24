import { useCallback, useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import {
  registerEmployeePushDevice,
  resolveExpoProjectIdFromConstants,
} from "./employee-push-runtime";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const useEmployeePushEffects = (params: {
  tenantAuthOrgId: string | null;
  selectedEmployeeId: string | null;
  fetchJson: FetchJson;
}) => {
  const lastRegisteredKeyRef = useRef("");

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }
    void Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#3a7bd5",
    });
  }, []);

  useEffect(() => {
    if (!params.tenantAuthOrgId) {
      lastRegisteredKeyRef.current = "";
    }
  }, [params.tenantAuthOrgId]);

  const registerForPush = useCallback(async () => {
    const tenantKey = params.tenantAuthOrgId?.trim() || "";
    const employeeId = params.selectedEmployeeId?.trim() || "";
    const registrationKey = `${tenantKey}:${employeeId}`;
    const result = await registerEmployeePushDevice({
      tenantKey,
      employeeId,
      registrationKey,
      lastRegisteredKey: lastRegisteredKeyRef.current,
      isDevice: Device.isDevice,
      getPermissions: () => Notifications.getPermissionsAsync(),
      requestPermissions: () => Notifications.requestPermissionsAsync(),
      resolveProjectId: () => resolveExpoProjectIdFromConstants(Constants),
      getExpoPushToken: async (projectId) =>
        (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data,
      fetchJson: params.fetchJson,
      platform: Device.osName,
    });
    if (result.kind === "success") {
      lastRegisteredKeyRef.current = result.registrationKey;
    } else if (result.kind === "error") {
      console.warn(result.message);
    }
  }, [params.fetchJson, params.selectedEmployeeId, params.tenantAuthOrgId]);

  useEffect(() => {
    if (!params.tenantAuthOrgId || !params.selectedEmployeeId) {
      return;
    }
    void registerForPush();
  }, [params.selectedEmployeeId, params.tenantAuthOrgId, registerForPush]);
};
