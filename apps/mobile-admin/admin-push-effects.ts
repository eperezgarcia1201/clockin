import { useCallback, useEffect } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import {
  registerAdminPushDevice,
  resolveExpoProjectIdFromConstants,
} from "./push-runtime";
import type { AdminPushDevice } from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const useAdminPushEffects = (params: {
  loggedIn: boolean;
  activeTenant: string;
  pushRegisteredTenant: string;
  fetchJson: FetchJson;
  setPushRegisteredTenant: (value: string) => void;
  setCurrentAdminPushDevice: (value: AdminPushDevice | null) => void;
  setDataSyncError: (value: string | null) => void;
}) => {
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

  const registerForPush = useCallback(async () => {
    const result = await registerAdminPushDevice({
      loggedIn: params.loggedIn,
      activeTenant: params.activeTenant,
      pushRegisteredTenant: params.pushRegisteredTenant,
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
      params.setPushRegisteredTenant(result.tenantKey);
      params.setCurrentAdminPushDevice(result.device);
    } else if (result.kind === "error") {
      params.setDataSyncError(result.message);
    }
  }, [
    params.activeTenant,
    params.fetchJson,
    params.loggedIn,
    params.pushRegisteredTenant,
    params.setCurrentAdminPushDevice,
  ]);

  useEffect(() => {
    if (!params.loggedIn || !params.activeTenant.trim()) {
      return;
    }
    void registerForPush();
  }, [params.activeTenant, params.loggedIn, registerForPush]);
};
