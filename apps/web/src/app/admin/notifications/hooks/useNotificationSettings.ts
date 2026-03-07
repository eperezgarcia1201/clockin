import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listAdminDevices,
  type AdminPushDevice,
} from "../../../../lib/api/admin-devices";
import { getSettings, updateSettings } from "../../../../lib/api/settings-admin";
import {
  buildNotificationPolicyPayload,
  defaultNotificationPolicy,
  pickNotificationPolicy,
  resolveBrowserTimeZone,
  TIMEZONES,
} from "../notification-policy";
import type {
  AdminNotificationsTranslate,
  DeviceDefaultDefinition,
  NotificationPolicyUpdater,
  PreferenceDefinition,
  SourceToggleDefinition,
  StatusKind,
} from "../types";
import { useNotificationDeviceDelivery } from "./useNotificationDeviceDelivery";

export function useNotificationSettings(
  tr: AdminNotificationsTranslate,
  preferenceDefinitions: PreferenceDefinition[],
  sourceToggleDefinitions: SourceToggleDefinition[],
  deviceDefaultDefinitions: DeviceDefaultDefinition[],
) {
  const browserTimeZone = useMemo(resolveBrowserTimeZone, []);
  const [devices, setDevices] = useState<AdminPushDevice[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null);
  const [settingsStatusKind, setSettingsStatusKind] = useState<StatusKind>(
    "info",
  );
  const [notificationPolicy, setNotificationPolicy] = useState(
    defaultNotificationPolicy,
  );
  const [notificationPolicyDraft, setNotificationPolicyDraft] = useState(
    defaultNotificationPolicy,
  );

  const availableTimeZones = useMemo(() => {
    const values = [...TIMEZONES];
    [browserTimeZone, notificationPolicy.timezone, notificationPolicyDraft.timezone]
      .filter((value): value is string => Boolean(value && value.trim()))
      .forEach((value) => {
        if (!values.includes(value)) {
          values.push(value);
        }
      });
    return values;
  }, [browserTimeZone, notificationPolicy.timezone, notificationPolicyDraft.timezone]);

  const policyDirty = useMemo(
    () =>
      JSON.stringify(notificationPolicyDraft) !==
      JSON.stringify(notificationPolicy),
    [notificationPolicy, notificationPolicyDraft],
  );

  const setSettingsAlert = useCallback(
    (kind: StatusKind, message: string | null) => {
      setSettingsStatusKind(kind);
      setSettingsStatus(message);
    },
    [],
  );

  const loadNotificationSettings = useCallback(async () => {
    setSettingsLoading(true);
    const [devicesResult, settingsResult] = await Promise.allSettled([
      listAdminDevices(),
      getSettings<Record<string, unknown>>(),
    ]);

    if (devicesResult.status === "fulfilled") {
      setDevices(devicesResult.value);
    }

    if (settingsResult.status === "fulfilled") {
      const nextPolicy = pickNotificationPolicy(settingsResult.value);
      setNotificationPolicy(nextPolicy);
      setNotificationPolicyDraft(nextPolicy);
    }

    if (
      devicesResult.status === "rejected" ||
      settingsResult.status === "rejected"
    ) {
      const deviceMessage =
        devicesResult.status === "rejected"
          ? devicesResult.reason instanceof Error
            ? devicesResult.reason.message
            : tr(
                "Unable to load registered admin devices.",
                "No se pudieron cargar los dispositivos admin registrados.",
              )
          : null;
      const settingsMessage =
        settingsResult.status === "rejected"
          ? settingsResult.reason instanceof Error
            ? settingsResult.reason.message
            : tr(
                "Unable to load notification settings.",
                "No se pudieron cargar los ajustes de notificaciones.",
              )
          : null;
      setSettingsAlert(
        "danger",
        [deviceMessage, settingsMessage].filter(Boolean).join(" "),
      );
    } else {
      setSettingsAlert("info", null);
    }

    setSettingsLoading(false);
  }, [setSettingsAlert, tr]);

  useEffect(() => {
    void loadNotificationSettings();
  }, [loadNotificationSettings]);

  const updatePolicyDraft = useCallback<NotificationPolicyUpdater>((key, value) => {
    setNotificationPolicyDraft((previous) => ({
      ...previous,
      [key]: value,
    }));
  }, []);

  const handleSaveNotificationPolicy = useCallback(async () => {
    if (
      notificationPolicyDraft.dailySalesReminderFinalMinutes <=
      notificationPolicyDraft.dailySalesReminderFirstMinutes
    ) {
      setSettingsAlert(
        "danger",
        tr(
          "The final daily sales reminder must be later than the first reminder.",
          "El recordatorio final de ventas diarias debe ser posterior al primer recordatorio.",
        ),
      );
      return;
    }

    setSettingsBusy(true);
    setSettingsAlert("info", null);
    try {
      await updateSettings(buildNotificationPolicyPayload(notificationPolicyDraft));
      setNotificationPolicy(notificationPolicyDraft);
      setSettingsAlert(
        "success",
        tr(
          "Notification policy saved. Server reminders will follow these rules.",
          "Politica de notificaciones guardada. Los recordatorios del servidor seguiran estas reglas.",
        ),
      );
    } catch (error) {
      setSettingsAlert(
        "danger",
        error instanceof Error
          ? error.message
          : tr(
              "Unable to save notification policy.",
              "No se pudo guardar la politica de notificaciones.",
            ),
      );
    } finally {
      setSettingsBusy(false);
    }
  }, [notificationPolicyDraft, setSettingsAlert, tr]);

  const handleSetAllSourceToggles = useCallback(
    (enabled: boolean) => {
      setNotificationPolicyDraft((previous) => {
        const next = { ...previous };
        for (const definition of sourceToggleDefinitions) {
          next[definition.key] = enabled;
        }
        return next;
      });
    },
    [sourceToggleDefinitions],
  );

  const handleSetAllDefaultToggles = useCallback(
    (enabled: boolean) => {
      setNotificationPolicyDraft((previous) => {
        const next = { ...previous };
        for (const definition of deviceDefaultDefinitions) {
          next[definition.key] = enabled;
        }
        return next;
      });
    },
    [deviceDefaultDefinitions],
  );

  const deviceDelivery = useNotificationDeviceDelivery({
    devices,
    notificationPolicyDraft,
    preferenceDefinitions,
    setDevices,
    setSettingsAlert,
    setSettingsBusy,
    tr,
  });

  const handleResetNotificationPolicyDraft = useCallback(() => {
    setNotificationPolicyDraft(notificationPolicy);
  }, [notificationPolicy]);

  return {
    availableTimeZones,
    browserTimeZone,
    devices,
    handleResetNotificationPolicyDraft,
    handleSaveNotificationPolicy,
    handleSetAllDefaultToggles,
    handleSetAllSourceToggles,
    loadNotificationSettings,
    notificationPolicy,
    notificationPolicyDraft,
    policyDirty,
    settingsBusy,
    settingsLoading,
    settingsStatus,
    settingsStatusKind,
    updatePolicyDraft,
    ...deviceDelivery,
  };
}
