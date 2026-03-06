import { useCallback, useEffect, useMemo } from "react";
import {
  loadAdminTenantTimeZone,
  resolveDeviceTimeZone,
  toggleAdminNotificationPreference,
  updateAdminPushDeviceRequest,
  updateTenantTimeZoneRequest,
} from "./admin-notification-settings-runtime";
import type {
  AdminNotificationPreferenceKey,
  AdminPushDevice,
} from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const useAdminNotificationSettingsActions = (params: {
  loggedIn: boolean;
  fetchJson: FetchJson;
  currentAdminPushDevice: AdminPushDevice | null;
  loadNotifications: () => Promise<void>;
  setCurrentAdminPushDevice: (value: AdminPushDevice | null) => void;
  setTenantTimeZone: (value: string) => void;
  setAdminNotificationStatus: (value: string | null) => void;
  setAdminNotificationSaving: (value: boolean) => void;
}) => {
  const deviceTimeZone = useMemo(() => resolveDeviceTimeZone(), []);

  const loadAdminNotificationContext = useCallback(async () => {
    if (!params.loggedIn) {
      return;
    }
    try {
      params.setTenantTimeZone(
        await loadAdminTenantTimeZone({ fetchJson: params.fetchJson }),
      );
      params.setAdminNotificationStatus(null);
    } catch (error) {
      params.setAdminNotificationStatus(
        error instanceof Error
          ? error.message
          : "Unable to load tenant timezone.",
      );
    }
  }, [
    params.fetchJson,
    params.loggedIn,
    params.setAdminNotificationStatus,
    params.setTenantTimeZone,
  ]);

  useEffect(() => {
    if (!params.loggedIn) {
      return;
    }
    void loadAdminNotificationContext();
  }, [loadAdminNotificationContext, params.loggedIn]);

  const handleToggleAdminNotificationPreference = useCallback(
    async (key: AdminNotificationPreferenceKey) => {
      const device = params.currentAdminPushDevice;
      if (!device) {
        params.setAdminNotificationStatus(
          "Enable push notifications on this device first.",
        );
        return;
      }

      params.setAdminNotificationSaving(true);
      params.setAdminNotificationStatus(null);

      try {
        const nextPreferences = toggleAdminNotificationPreference({
          preferences: device.notifications,
          key,
        });
        const updated = await updateAdminPushDeviceRequest({
          fetchJson: params.fetchJson,
          deviceId: device.id,
          payload: {
            [key]: nextPreferences[key],
            timeZone: deviceTimeZone,
          } as Record<string, boolean | string>,
        });
        params.setCurrentAdminPushDevice(updated);
        params.setAdminNotificationStatus(
          "Push notification preferences updated for this device.",
        );
      } catch (error) {
        params.setAdminNotificationStatus(
          error instanceof Error
            ? error.message
            : "Unable to save push notification preferences.",
        );
      } finally {
        params.setAdminNotificationSaving(false);
      }
    },
    [
      deviceTimeZone,
      params.currentAdminPushDevice,
      params.fetchJson,
      params.setAdminNotificationSaving,
      params.setAdminNotificationStatus,
      params.setCurrentAdminPushDevice,
    ],
  );

  const handleSyncTenantTimeZone = useCallback(async () => {
    params.setAdminNotificationSaving(true);
    params.setAdminNotificationStatus(null);
    try {
      const nextTimeZone = await updateTenantTimeZoneRequest({
        fetchJson: params.fetchJson,
        timeZone: deviceTimeZone,
      });
      params.setTenantTimeZone(nextTimeZone);
      params.setAdminNotificationStatus(
        `Tenant timezone updated to ${nextTimeZone}.`,
      );
    } catch (error) {
      params.setAdminNotificationStatus(
        error instanceof Error
          ? error.message
          : "Unable to update tenant timezone.",
      );
    } finally {
      params.setAdminNotificationSaving(false);
    }
  }, [
    deviceTimeZone,
    params.fetchJson,
    params.setAdminNotificationSaving,
    params.setAdminNotificationStatus,
    params.setTenantTimeZone,
  ]);

  const refreshAlertsPanel = useCallback(async () => {
    await Promise.all([params.loadNotifications(), loadAdminNotificationContext()]);
  }, [loadAdminNotificationContext, params.loadNotifications]);

  return {
    deviceTimeZone,
    handleToggleAdminNotificationPreference,
    handleSyncTenantTimeZone,
    refreshAlertsPanel,
  };
};
