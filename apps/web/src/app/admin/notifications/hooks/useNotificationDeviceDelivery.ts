import { useCallback, type Dispatch, type SetStateAction } from "react";
import {
  removeAdminDevice,
  updateAdminDevice,
  type AdminNotificationPreferenceKey,
  type AdminNotificationPreferences,
  type AdminPushDevice,
} from "../../../../lib/api/admin-devices";
import type {
  AdminNotificationsTranslate,
  NotificationPolicySettings,
  PreferenceDefinition,
  StatusKind,
} from "../types";

function buildPreferencePayload(
  value: boolean,
): AdminNotificationPreferences {
  return {
    notifyDailySalesReminders: value,
    notifyLateClockInReminders: value,
    notifyNoBreakAlerts: value,
    notifyPunchActivity: value,
    notifyScheduleOverrides: value,
    notifyTipSummaries: value,
  };
}

function buildDefaultDevicePayload(
  policy: NotificationPolicySettings,
): AdminNotificationPreferences {
  return {
    notifyDailySalesReminders: policy.defaultNotifyDailySalesReminders,
    notifyLateClockInReminders: policy.defaultNotifyLateClockInReminders,
    notifyNoBreakAlerts: policy.defaultNotifyNoBreakAlerts,
    notifyPunchActivity: policy.defaultNotifyPunchActivity,
    notifyScheduleOverrides: policy.defaultNotifyScheduleOverrides,
    notifyTipSummaries: policy.defaultNotifyTipSummaries,
  };
}

type UseNotificationDeviceDeliveryArgs = {
  devices: AdminPushDevice[];
  notificationPolicyDraft: NotificationPolicySettings;
  preferenceDefinitions: PreferenceDefinition[];
  setDevices: Dispatch<SetStateAction<AdminPushDevice[]>>;
  setSettingsAlert: (kind: StatusKind, message: string | null) => void;
  setSettingsBusy: Dispatch<SetStateAction<boolean>>;
  tr: AdminNotificationsTranslate;
};

export function useNotificationDeviceDelivery({
  devices,
  notificationPolicyDraft,
  preferenceDefinitions,
  setDevices,
  setSettingsAlert,
  setSettingsBusy,
  tr,
}: UseNotificationDeviceDeliveryArgs) {
  const handleUpdateDevice = useCallback(
    async (
      deviceId: string,
      payload: Partial<AdminNotificationPreferences>,
      successMessage: string,
    ) => {
      setSettingsBusy(true);
      setSettingsAlert("info", null);
      try {
        const updated = await updateAdminDevice(deviceId, payload);
        setDevices((previous) =>
          previous.map((device) => (device.id === deviceId ? updated : device)),
        );
        setSettingsAlert("success", successMessage);
      } catch (error) {
        setSettingsAlert(
          "danger",
          error instanceof Error
            ? error.message
            : tr(
                "Unable to save notification settings.",
                "No se pudieron guardar los ajustes de notificaciones.",
              ),
        );
      } finally {
        setSettingsBusy(false);
      }
    },
    [setDevices, setSettingsAlert, setSettingsBusy, tr],
  );

  const applyPayloadToAllDevices = useCallback(
    async (
      payload: Partial<AdminNotificationPreferences>,
      successMessage: string,
    ) => {
      if (!devices.length) {
        setSettingsAlert(
          "danger",
          tr(
            "No registered admin devices found.",
            "No se encontraron dispositivos admin registrados.",
          ),
        );
        return;
      }

      setSettingsBusy(true);
      setSettingsAlert("info", null);
      try {
        const updated = await Promise.all(
          devices.map((device) => updateAdminDevice(device.id, payload)),
        );
        setDevices(updated);
        setSettingsAlert("success", successMessage);
      } catch (error) {
        setSettingsAlert(
          "danger",
          error instanceof Error
            ? error.message
            : tr(
                "Unable to update all devices.",
                "No se pudieron actualizar todos los dispositivos.",
              ),
        );
      } finally {
        setSettingsBusy(false);
      }
    },
    [devices, setDevices, setSettingsAlert, setSettingsBusy, tr],
  );

  const handleToggleDevicePreference = useCallback(
    async (device: AdminPushDevice, key: AdminNotificationPreferenceKey) => {
      await handleUpdateDevice(
        device.id,
        { [key]: !device.notifications[key] },
        tr(
          "Device notification setting updated.",
          "Ajuste de notificacion del dispositivo actualizado.",
        ),
      );
    },
    [handleUpdateDevice, tr],
  );

  const handleApplyAllToDevice = useCallback(
    async (device: AdminPushDevice, enabled: boolean) => {
      await handleUpdateDevice(
        device.id,
        buildPreferencePayload(enabled),
        enabled
          ? tr(
              "All notifications enabled for this device.",
              "Todas las notificaciones activadas para este dispositivo.",
            )
          : tr(
              "All notifications disabled for this device.",
              "Todas las notificaciones desactivadas para este dispositivo.",
            ),
      );
    },
    [handleUpdateDevice, tr],
  );

  const handleRemoveDevice = useCallback(
    async (device: AdminPushDevice) => {
      if (typeof window !== "undefined") {
        const confirmed = window.confirm(
          tr(
            `Remove ${device.label || device.platform || "this device"} from push notifications?`,
            `¿Eliminar ${device.label || device.platform || "este dispositivo"} de las notificaciones push?`,
          ),
        );
        if (!confirmed) {
          return;
        }
      }

      setSettingsBusy(true);
      setSettingsAlert("info", null);
      try {
        await removeAdminDevice(device.id);
        setDevices((previous) =>
          previous.filter((entry) => entry.id !== device.id),
        );
        setSettingsAlert(
          "success",
          tr(
            "Device removed from notification delivery.",
            "Dispositivo eliminado de la entrega de notificaciones.",
          ),
        );
      } catch (error) {
        setSettingsAlert(
          "danger",
          error instanceof Error
            ? error.message
            : tr(
                "Unable to remove the device.",
                "No se pudo eliminar el dispositivo.",
              ),
        );
      } finally {
        setSettingsBusy(false);
      }
    },
    [setDevices, setSettingsAlert, setSettingsBusy, tr],
  );

  const handleApplyPreferenceToAllDevices = useCallback(
    async (key: AdminNotificationPreferenceKey, value: boolean) => {
      const target = preferenceDefinitions.find((entry) => entry.key === key);
      await applyPayloadToAllDevices(
        { [key]: value },
        value
          ? tr(
              `Enabled ${target?.title || "the notification"} on all devices.`,
              `Se activo ${target?.title || "la notificacion"} en todos los dispositivos.`,
            )
          : tr(
              `Disabled ${target?.title || "the notification"} on all devices.`,
              `Se desactivo ${target?.title || "la notificacion"} en todos los dispositivos.`,
            ),
      );
    },
    [applyPayloadToAllDevices, preferenceDefinitions, tr],
  );

  const handleApplyAllNotificationsToAllDevices = useCallback(
    async (enabled: boolean) => {
      await applyPayloadToAllDevices(
        buildPreferencePayload(enabled),
        enabled
          ? tr(
              "All notification categories were enabled on every registered device.",
              "Todas las categorias de notificacion fueron activadas en cada dispositivo registrado.",
            )
          : tr(
              "All notification categories were disabled on every registered device.",
              "Todas las categorias de notificacion fueron desactivadas en cada dispositivo registrado.",
            ),
      );
    },
    [applyPayloadToAllDevices, tr],
  );

  const handleApplyDefaultsToAllDevices = useCallback(async () => {
    await applyPayloadToAllDevices(
      buildDefaultDevicePayload(notificationPolicyDraft),
      tr(
        "Draft default delivery settings were applied to every current device.",
        "Los ajustes predeterminados del borrador se aplicaron a todos los dispositivos actuales.",
      ),
    );
  }, [applyPayloadToAllDevices, notificationPolicyDraft, tr]);

  return {
    handleApplyAllNotificationsToAllDevices,
    handleApplyAllToDevice,
    handleApplyDefaultsToAllDevices,
    handleApplyPreferenceToAllDevices,
    handleRemoveDevice,
    handleToggleDevicePreference,
  };
}
