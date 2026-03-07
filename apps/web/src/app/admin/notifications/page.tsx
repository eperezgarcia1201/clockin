"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUiLanguage } from "../../../lib/ui-language";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  sendEmployeeMessage,
  type NotificationRow,
} from "../../../lib/api/notifications-admin";
import {
  listEmployees,
  type EmployeeRow as EmployeeOption,
} from "../../../lib/api/users-admin";
import {
  listAdminDevices,
  removeAdminDevice,
  updateAdminDevice,
  type AdminNotificationPreferenceKey,
  type AdminNotificationPreferences,
  type AdminPushDevice,
} from "../../../lib/api/admin-devices";
import { getSettings, updateSettings } from "../../../lib/api/settings-admin";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "UTC",
];

const defaultTimeZone = "America/New_York";

const resolveBrowserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

const resolveTenantTimeZone = (value: unknown) => {
  if (
    value &&
    typeof value === "object" &&
    "timezone" in value &&
    typeof value.timezone === "string" &&
    value.timezone.trim()
  ) {
    return value.timezone;
  }
  return defaultTimeZone;
};

type NotificationPolicySettings = {
  timezone: string;
  lateClockInWorkflowEnabled: boolean;
  lateClockInGraceMinutes: number;
  lateClockInReminderIntervalMinutes: number;
  lateClockInReminderMax: number;
  autoClockInAfterLateReminders: boolean;
  autoClockInOnGeofence: boolean;
  noBreakAlertsEnabled: boolean;
  noBreakAlertHours: number;
  dailySalesReminderEnabled: boolean;
  dailySalesReminderFirstMinutes: number;
  dailySalesReminderFinalMinutes: number;
  ownerDailyReportEnabled: boolean;
  ownerDailyReportSendMinutes: number;
};

const defaultNotificationPolicy: NotificationPolicySettings = {
  timezone: defaultTimeZone,
  lateClockInWorkflowEnabled: true,
  lateClockInGraceMinutes: 5,
  lateClockInReminderIntervalMinutes: 5,
  lateClockInReminderMax: 3,
  autoClockInAfterLateReminders: true,
  autoClockInOnGeofence: true,
  noBreakAlertsEnabled: true,
  noBreakAlertHours: 6,
  dailySalesReminderEnabled: true,
  dailySalesReminderFirstMinutes: 20 * 60 + 50,
  dailySalesReminderFinalMinutes: 22 * 60 + 20,
  ownerDailyReportEnabled: true,
  ownerDailyReportSendMinutes: 22 * 60,
};

const clampInteger = (
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  const rounded = Math.round(value);
  if (rounded < minimum) {
    return minimum;
  }
  if (rounded > maximum) {
    return maximum;
  }
  return rounded;
};

const pickNotificationPolicy = (value: unknown): NotificationPolicySettings => {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : ({} as Record<string, unknown>);

  const dailySalesReminderFirstMinutes = clampInteger(
    source.dailySalesReminderFirstMinutes,
    defaultNotificationPolicy.dailySalesReminderFirstMinutes,
    0,
    1438,
  );
  const dailySalesReminderFinalMinutes = Math.max(
    dailySalesReminderFirstMinutes + 1,
    clampInteger(
      source.dailySalesReminderFinalMinutes,
      defaultNotificationPolicy.dailySalesReminderFinalMinutes,
      1,
      1439,
    ),
  );

  return {
    timezone: resolveTenantTimeZone(source),
    lateClockInWorkflowEnabled:
      typeof source.lateClockInWorkflowEnabled === "boolean"
        ? source.lateClockInWorkflowEnabled
        : defaultNotificationPolicy.lateClockInWorkflowEnabled,
    lateClockInGraceMinutes: clampInteger(
      source.lateClockInGraceMinutes,
      defaultNotificationPolicy.lateClockInGraceMinutes,
      0,
      180,
    ),
    lateClockInReminderIntervalMinutes: clampInteger(
      source.lateClockInReminderIntervalMinutes,
      defaultNotificationPolicy.lateClockInReminderIntervalMinutes,
      1,
      180,
    ),
    lateClockInReminderMax: clampInteger(
      source.lateClockInReminderMax,
      defaultNotificationPolicy.lateClockInReminderMax,
      1,
      12,
    ),
    autoClockInAfterLateReminders:
      typeof source.autoClockInAfterLateReminders === "boolean"
        ? source.autoClockInAfterLateReminders
        : defaultNotificationPolicy.autoClockInAfterLateReminders,
    autoClockInOnGeofence:
      typeof source.autoClockInOnGeofence === "boolean"
        ? source.autoClockInOnGeofence
        : defaultNotificationPolicy.autoClockInOnGeofence,
    noBreakAlertsEnabled:
      typeof source.noBreakAlertsEnabled === "boolean"
        ? source.noBreakAlertsEnabled
        : defaultNotificationPolicy.noBreakAlertsEnabled,
    noBreakAlertHours: clampInteger(
      source.noBreakAlertHours,
      defaultNotificationPolicy.noBreakAlertHours,
      1,
      24,
    ),
    dailySalesReminderEnabled:
      typeof source.dailySalesReminderEnabled === "boolean"
        ? source.dailySalesReminderEnabled
        : defaultNotificationPolicy.dailySalesReminderEnabled,
    dailySalesReminderFirstMinutes,
    dailySalesReminderFinalMinutes,
    ownerDailyReportEnabled:
      typeof source.ownerDailyReportEnabled === "boolean"
        ? source.ownerDailyReportEnabled
        : defaultNotificationPolicy.ownerDailyReportEnabled,
    ownerDailyReportSendMinutes: clampInteger(
      source.ownerDailyReportSendMinutes,
      defaultNotificationPolicy.ownerDailyReportSendMinutes,
      0,
      1439,
    ),
  };
};

const buildNotificationPolicyPayload = (
  policy: NotificationPolicySettings,
): Record<string, string | number | boolean | null> => ({
  timezone: policy.timezone,
  lateClockInWorkflowEnabled: policy.lateClockInWorkflowEnabled,
  lateClockInGraceMinutes: policy.lateClockInGraceMinutes,
  lateClockInReminderIntervalMinutes: policy.lateClockInReminderIntervalMinutes,
  lateClockInReminderMax: policy.lateClockInReminderMax,
  autoClockInAfterLateReminders: policy.autoClockInAfterLateReminders,
  autoClockInOnGeofence: policy.autoClockInOnGeofence,
  noBreakAlertsEnabled: policy.noBreakAlertsEnabled,
  noBreakAlertHours: policy.noBreakAlertHours,
  dailySalesReminderEnabled: policy.dailySalesReminderEnabled,
  dailySalesReminderFirstMinutes: policy.dailySalesReminderFirstMinutes,
  dailySalesReminderFinalMinutes: policy.dailySalesReminderFinalMinutes,
  ownerDailyReportEnabled: policy.ownerDailyReportEnabled,
  ownerDailyReportSendMinutes: policy.ownerDailyReportSendMinutes,
});

const formatMinutesAsTimeInput = (value: number) => {
  const normalized = ((Math.round(value) % 1440) + 1440) % 1440;
  const hours = String(Math.floor(normalized / 60)).padStart(2, "0");
  const minutes = String(normalized % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const parseTimeInputToMinutes = (value: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
};

type StatusKind = "success" | "danger" | "info";

type PreferenceDefinition = {
  key: AdminNotificationPreferenceKey;
  title: string;
  description: string;
};

const preferencePayload = (
  value: boolean,
): AdminNotificationPreferences => ({
  notifyPunchActivity: value,
  notifyNoBreakAlerts: value,
  notifyLateClockInReminders: value,
  notifyScheduleOverrides: value,
  notifyTipSummaries: value,
  notifyDailySalesReminders: value,
});

export default function AdminNotifications() {
  const lang = useUiLanguage();
  const tr = useCallback(
    (en: string, es: string) => (lang === "es" ? es : en),
    [lang],
  );
  const browserTimeZone = useMemo(resolveBrowserTimeZone, []);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [devices, setDevices] = useState<AdminPushDevice[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageStatus, setMessageStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(true);
  const [feedStatus, setFeedStatus] = useState<string | null>(null);
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

  const preferenceDefinitions = useMemo<PreferenceDefinition[]>(
    () => [
      {
        key: "notifyLateClockInReminders",
        title: tr(
          "Late / Missing Clock-In Reminders",
          "Recordatorios de clock in tardío o faltante",
        ),
        description: tr(
          "Alerts when an employee has not clocked in on time.",
          "Avisos cuando un empleado no ha hecho clock in a tiempo.",
        ),
      },
      {
        key: "notifyPunchActivity",
        title: tr(
          "Clock In / Clock Out Activity",
          "Actividad de clock in y clock out",
        ),
        description: tr(
          "Pushes for in, out, break, and lunch punches.",
          "Pushes de entradas, salidas, descansos y lunch.",
        ),
      },
      {
        key: "notifyNoBreakAlerts",
        title: tr(
          "Still Clocked-In / No-Break Alerts",
          "Alertas de empleados aún activos",
        ),
        description: tr(
          "Alerts when someone stays active too long without a break.",
          "Avisos cuando alguien sigue activo demasiado tiempo sin descanso.",
        ),
      },
      {
        key: "notifyScheduleOverrides",
        title: tr(
          "Schedule Override Requests",
          "Solicitudes de horario",
        ),
        description: tr(
          "Requests to work outside the assigned schedule.",
          "Solicitudes para trabajar fuera del horario asignado.",
        ),
      },
      {
        key: "notifyTipSummaries",
        title: tr("7-Day Tip Summaries", "Resúmenes de propinas"),
        description: tr(
          "Summaries after tip entries are submitted.",
          "Resúmenes después de registrar propinas.",
        ),
      },
      {
        key: "notifyDailySalesReminders",
        title: tr("Daily Sales Reminders", "Recordatorios de ventas diarias"),
        description: tr(
          "Reminders to submit missing daily sales.",
          "Avisos para capturar ventas diarias pendientes.",
        ),
      },
    ],
    [tr],
  );

  const unreadCount = useMemo(
    () => notifications.filter((notice) => !notice.readAt).length,
    [notifications],
  );

  const preferenceCounts = useMemo(() => {
    return preferenceDefinitions.map((preference) => ({
      ...preference,
      enabledCount: devices.filter(
        (device) => device.notifications[preference.key],
      ).length,
    }));
  }, [devices, preferenceDefinitions]);

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

  const formatDateTime = useCallback((value: string) => {
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  }, []);

  const loadNotificationsFeed = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listNotifications({ limit: 50, unreadOnly });
      setNotifications(rows);
      setFeedStatus(null);
    } catch {
      setFeedStatus(
        tr(
          "Unable to load notifications.",
          "No se pudieron cargar las notificaciones.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [tr, unreadOnly]);

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
    void loadNotificationsFeed();
  }, [loadNotificationsFeed]);

  useEffect(() => {
    void loadNotificationSettings();
  }, [loadNotificationSettings]);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const data = await listEmployees();
        const active = data.filter((employee) => employee.active);
        setEmployees(active);
        setEmployeeId((previous) => {
          if (previous && active.some((employee) => employee.id === previous)) {
            return previous;
          }
          return active[0]?.id || "";
        });
      } catch {
        // keep current list when employee options fail to load
      }
    };
    void loadEmployees();
  }, []);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((notice) =>
        notice.id === id
          ? { ...notice, readAt: new Date().toISOString() }
          : notice,
      ),
    );
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) =>
      prev.map((notice) => ({ ...notice, readAt: new Date().toISOString() })),
    );
  };

  const handleSendMessage = async () => {
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    if (!employeeId) {
      setMessageStatus(tr("Select an employee.", "Selecciona un empleado."));
      return;
    }
    if (!trimmedSubject) {
      setMessageStatus(tr("Subject is required.", "El asunto es obligatorio."));
      return;
    }
    if (!trimmedMessage) {
      setMessageStatus(
        tr("Message is required.", "El mensaje es obligatorio."),
      );
      return;
    }

    setSendingMessage(true);
    setMessageStatus(null);
    try {
      await sendEmployeeMessage({
        employeeId,
        subject: trimmedSubject,
        message: trimmedMessage,
      });

      setSubject("");
      setMessage("");
      setMessageStatus(
        tr(
          "Message sent. It will appear when the employee clocks in.",
          "Mensaje enviado. Aparecerá cuando el empleado marque entrada.",
        ),
      );
      await loadNotificationsFeed();
    } catch (error) {
      setMessageStatus(
        error instanceof Error
          ? error.message
          : tr("Unable to send message.", "No se pudo enviar el mensaje."),
      );
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpdateDevice = async (
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
  };

  const handleToggleDevicePreference = async (
    device: AdminPushDevice,
    key: AdminNotificationPreferenceKey,
  ) => {
    await handleUpdateDevice(
      device.id,
      { [key]: !device.notifications[key] },
      tr(
        "Device notification setting updated.",
        "Ajuste de notificación del dispositivo actualizado.",
      ),
    );
  };

  const handleApplyAllToDevice = async (
    device: AdminPushDevice,
    enabled: boolean,
  ) => {
    await handleUpdateDevice(
      device.id,
      preferencePayload(enabled),
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
  };

  const handleRemoveDevice = async (device: AdminPushDevice) => {
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
  };

  const handleApplyPreferenceToAllDevices = async (
    key: AdminNotificationPreferenceKey,
    value: boolean,
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
        devices.map((device) => updateAdminDevice(device.id, { [key]: value })),
      );
      setDevices(updated);
      const target = preferenceDefinitions.find((entry) => entry.key === key);
      setSettingsAlert(
        "success",
        value
          ? tr(
              `Enabled ${target?.title || "the notification"} on all devices.`,
              `Se activó ${target?.title || "la notificación"} en todos los dispositivos.`,
            )
          : tr(
              `Disabled ${target?.title || "the notification"} on all devices.`,
              `Se desactivó ${target?.title || "la notificación"} en todos los dispositivos.`,
            ),
      );
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
  };

  const handleApplyAllNotificationsToAllDevices = async (enabled: boolean) => {
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
      const payload = preferencePayload(enabled);
      const updated = await Promise.all(
        devices.map((device) => updateAdminDevice(device.id, payload)),
      );
      setDevices(updated);
      setSettingsAlert(
        "success",
        enabled
          ? tr(
              "All notification categories were enabled on every registered device.",
              "Todas las categorías de notificación fueron activadas en cada dispositivo registrado.",
            )
          : tr(
              "All notification categories were disabled on every registered device.",
              "Todas las categorías de notificación fueron desactivadas en cada dispositivo registrado.",
            ),
      );
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
  };

  const updatePolicyDraft = useCallback(
    <Key extends keyof NotificationPolicySettings>(
      key: Key,
      value: NotificationPolicySettings[Key],
    ) => {
      setNotificationPolicyDraft((previous) => ({
        ...previous,
        [key]: value,
      }));
    },
    [],
  );

  const handleSaveNotificationPolicy = async () => {
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
          "Política de notificaciones guardada. Los recordatorios del servidor seguirán estas reglas.",
        ),
      );
    } catch (error) {
      setSettingsAlert(
        "danger",
        error instanceof Error
          ? error.message
          : tr(
              "Unable to save notification policy.",
              "No se pudo guardar la política de notificaciones.",
            ),
      );
    } finally {
      setSettingsBusy(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <div>
          <h1>{tr("Notifications", "Notificaciones")}</h1>
          <p className="text-muted mb-0">
            {tr(
              "Manage live alerts, push delivery rules, device notification categories, and reminder timezone from the browser.",
              "Administra alertas en vivo, reglas de entrega push, categorías de notificación por dispositivo y la zona horaria de recordatorios desde el navegador.",
            )}
          </p>
        </div>
        <div className="admin-actions d-flex flex-wrap gap-2">
          <button
            className="btn btn-outline-secondary"
            onClick={() => {
              void loadNotificationsFeed();
              void loadNotificationSettings();
            }}
            disabled={loading || settingsLoading || settingsBusy}
          >
            {tr("Refresh All", "Actualizar Todo")}
          </button>
          <button className="btn btn-primary" onClick={handleMarkAll}>
            {tr("Mark All Read", "Marcar Todo como Leído")}
          </button>
        </div>
      </div>

      <div className="admin-card d-flex flex-column gap-3">
        <div>
          <h2 className="h5 mb-1">
            {tr(
              "Notification Policy and Push Delivery",
              "Política de Notificaciones y Entrega Push",
            )}
          </h2>
          <p className="text-muted mb-0">
            {tr(
              "Configure tenant-wide reminder behavior on the server and control which registered admin devices receive each push category.",
              "Configura el comportamiento global de recordatorios en el servidor y controla qué dispositivos admin registrados reciben cada categoría push.",
            )}
          </p>
        </div>

        <div className="border rounded p-3 bg-body-tertiary d-flex flex-column gap-3">
          <div>
            <h3 className="h6 mb-1">
              {tr("Server Reminder Policy", "Política de Recordatorios del Servidor")}
            </h3>
            <p className="text-muted mb-0 small">
              {tr(
                "These settings control how often reminder notifications are generated, when they fire, and whether automatic follow-up actions should happen.",
                "Estos ajustes controlan cuántas veces se generan recordatorios, cuándo se envían y si deben ocurrir acciones automáticas de seguimiento.",
              )}
            </p>
          </div>

          <div className="row g-3 align-items-end">
            <div className="col-12 col-lg-4">
              <label className="form-label">
                {tr("Tenant Timezone", "Zona Horaria del Tenant")}
              </label>
              <select
                className="form-select"
                value={notificationPolicyDraft.timezone}
                onChange={(event) =>
                  updatePolicyDraft("timezone", event.target.value)
                }
                disabled={settingsBusy}
              >
                {availableTimeZones.map((timeZone) => (
                  <option key={timeZone} value={timeZone}>
                    {timeZone}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-lg-4">
              <label className="form-label">
                {tr("This Browser Timezone", "Zona Horaria de Este Navegador")}
              </label>
              <input className="form-control" value={browserTimeZone} readOnly />
            </div>
            <div className="col-12 col-lg-4 d-flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleSaveNotificationPolicy()}
                disabled={settingsBusy || settingsLoading || !policyDirty}
              >
                {tr("Save Policy", "Guardar Política")}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => updatePolicyDraft("timezone", browserTimeZone)}
                disabled={settingsBusy || browserTimeZone === notificationPolicyDraft.timezone}
              >
                {tr("Use Browser Timezone", "Usar Zona del Navegador")}
              </button>
            </div>
          </div>

          <div className="border rounded p-3 bg-white d-flex flex-column gap-3">
            <div className="d-flex justify-content-between align-items-start gap-3">
              <div>
                <div className="fw-semibold">
                  {tr(
                    "Late / Missing Clock-In Workflow",
                    "Flujo de Clock In Tardío o Faltante",
                  )}
                </div>
                <div className="text-muted small">
                  {tr(
                    "Manage reminder timing, reminder count, and automatic clock-in actions for employees who miss their scheduled start.",
                    "Administra el tiempo, la cantidad de recordatorios y las acciones automáticas para empleados que pierden su hora programada.",
                  )}
                </div>
              </div>
              <div className="form-check form-switch m-0 pt-1">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  checked={notificationPolicyDraft.lateClockInWorkflowEnabled}
                  disabled={settingsBusy}
                  onChange={(event) =>
                    updatePolicyDraft(
                      "lateClockInWorkflowEnabled",
                      event.target.checked,
                    )
                  }
                />
              </div>
            </div>
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label className="form-label">
                  {tr("Grace Minutes", "Minutos de Gracia")}
                </label>
                <input
                  type="number"
                  min={0}
                  max={180}
                  className="form-control"
                  value={notificationPolicyDraft.lateClockInGraceMinutes}
                  disabled={
                    settingsBusy || !notificationPolicyDraft.lateClockInWorkflowEnabled
                  }
                  onChange={(event) =>
                    updatePolicyDraft(
                      "lateClockInGraceMinutes",
                      clampInteger(Number(event.target.value), 0, 0, 180),
                    )
                  }
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">
                  {tr(
                    "Reminder Interval (Minutes)",
                    "Intervalo entre Recordatorios (Minutos)",
                  )}
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  className="form-control"
                  value={notificationPolicyDraft.lateClockInReminderIntervalMinutes}
                  disabled={
                    settingsBusy || !notificationPolicyDraft.lateClockInWorkflowEnabled
                  }
                  onChange={(event) =>
                    updatePolicyDraft(
                      "lateClockInReminderIntervalMinutes",
                      clampInteger(Number(event.target.value), 1, 1, 180),
                    )
                  }
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">
                  {tr("Maximum Reminders", "Máximo de Recordatorios")}
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  className="form-control"
                  value={notificationPolicyDraft.lateClockInReminderMax}
                  disabled={
                    settingsBusy || !notificationPolicyDraft.lateClockInWorkflowEnabled
                  }
                  onChange={(event) =>
                    updatePolicyDraft(
                      "lateClockInReminderMax",
                      clampInteger(Number(event.target.value), 1, 1, 12),
                    )
                  }
                />
              </div>
              <div className="col-12 col-md-6">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    checked={notificationPolicyDraft.autoClockInAfterLateReminders}
                    disabled={
                      settingsBusy || !notificationPolicyDraft.lateClockInWorkflowEnabled
                    }
                    onChange={(event) =>
                      updatePolicyDraft(
                        "autoClockInAfterLateReminders",
                        event.target.checked,
                      )
                    }
                  />
                  <label className="form-check-label">
                    {tr(
                      "Auto clock in after the final reminder",
                      "Hacer clock in automático después del último recordatorio",
                    )}
                  </label>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    checked={notificationPolicyDraft.autoClockInOnGeofence}
                    disabled={
                      settingsBusy || !notificationPolicyDraft.lateClockInWorkflowEnabled
                    }
                    onChange={(event) =>
                      updatePolicyDraft(
                        "autoClockInOnGeofence",
                        event.target.checked,
                      )
                    }
                  />
                  <label className="form-check-label">
                    {tr(
                      "Auto clock in when the latest punch is inside the assigned geofence",
                      "Hacer clock in automático cuando el último punch esté dentro del geofence asignado",
                    )}
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-xl-6">
              <div className="border rounded p-3 bg-white h-100 d-flex flex-column gap-3">
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <div>
                    <div className="fw-semibold">
                      {tr("No-Break Alerts", "Alertas sin Descanso")}
                    </div>
                    <div className="text-muted small">
                      {tr(
                        "Alert managers when someone stays clocked in too long without taking a break.",
                        "Avisa a los managers cuando alguien permanece activo demasiado tiempo sin descanso.",
                      )}
                    </div>
                  </div>
                  <div className="form-check form-switch m-0 pt-1">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      checked={notificationPolicyDraft.noBreakAlertsEnabled}
                      disabled={settingsBusy}
                      onChange={(event) =>
                        updatePolicyDraft(
                          "noBreakAlertsEnabled",
                          event.target.checked,
                        )
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">
                    {tr("Threshold Hours", "Horas de Umbral")}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    className="form-control"
                    value={notificationPolicyDraft.noBreakAlertHours}
                    disabled={settingsBusy || !notificationPolicyDraft.noBreakAlertsEnabled}
                    onChange={(event) =>
                      updatePolicyDraft(
                        "noBreakAlertHours",
                        clampInteger(Number(event.target.value), 1, 1, 24),
                      )
                    }
                  />
                </div>
              </div>
            </div>

            <div className="col-12 col-xl-6">
              <div className="border rounded p-3 bg-white h-100 d-flex flex-column gap-3">
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <div>
                    <div className="fw-semibold">
                      {tr(
                        "Owner Daily Report Email",
                        "Correo Diario del Reporte para Owner",
                      )}
                    </div>
                    <div className="text-muted small">
                      {tr(
                        "Send the owner summary email at a fixed time each day in the tenant timezone.",
                        "Envía el correo resumen al owner a una hora fija cada día según la zona horaria del tenant.",
                      )}
                    </div>
                  </div>
                  <div className="form-check form-switch m-0 pt-1">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      checked={notificationPolicyDraft.ownerDailyReportEnabled}
                      disabled={settingsBusy}
                      onChange={(event) =>
                        updatePolicyDraft(
                          "ownerDailyReportEnabled",
                          event.target.checked,
                        )
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">
                    {tr("Send Time", "Hora de Envío")}
                  </label>
                  <input
                    type="time"
                    className="form-control"
                    value={formatMinutesAsTimeInput(
                      notificationPolicyDraft.ownerDailyReportSendMinutes,
                    )}
                    disabled={
                      settingsBusy || !notificationPolicyDraft.ownerDailyReportEnabled
                    }
                    onChange={(event) => {
                      const nextMinutes = parseTimeInputToMinutes(
                        event.target.value,
                      );
                      if (nextMinutes === null) {
                        return;
                      }
                      updatePolicyDraft(
                        "ownerDailyReportSendMinutes",
                        nextMinutes,
                      );
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded p-3 bg-white d-flex flex-column gap-3">
            <div className="d-flex justify-content-between align-items-start gap-3">
              <div>
                <div className="fw-semibold">
                  {tr("Daily Sales Reminders", "Recordatorios de Ventas Diarias")}
                </div>
                <div className="text-muted small">
                  {tr(
                    "Control the first reminder and the overdue follow-up when daily sales have not been submitted.",
                    "Controla el primer recordatorio y el seguimiento por atraso cuando no se han enviado las ventas diarias.",
                  )}
                </div>
              </div>
              <div className="form-check form-switch m-0 pt-1">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  checked={notificationPolicyDraft.dailySalesReminderEnabled}
                  disabled={settingsBusy}
                  onChange={(event) =>
                    updatePolicyDraft(
                      "dailySalesReminderEnabled",
                      event.target.checked,
                    )
                  }
                />
              </div>
            </div>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label">
                  {tr("First Reminder Time", "Hora del Primer Recordatorio")}
                </label>
                <input
                  type="time"
                  className="form-control"
                  value={formatMinutesAsTimeInput(
                    notificationPolicyDraft.dailySalesReminderFirstMinutes,
                  )}
                  disabled={
                    settingsBusy || !notificationPolicyDraft.dailySalesReminderEnabled
                  }
                  onChange={(event) => {
                    const nextMinutes = parseTimeInputToMinutes(
                      event.target.value,
                    );
                    if (nextMinutes === null) {
                      return;
                    }
                    updatePolicyDraft("dailySalesReminderFirstMinutes", nextMinutes);
                  }}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">
                  {tr("Final Reminder Time", "Hora del Recordatorio Final")}
                </label>
                <input
                  type="time"
                  className="form-control"
                  value={formatMinutesAsTimeInput(
                    notificationPolicyDraft.dailySalesReminderFinalMinutes,
                  )}
                  disabled={
                    settingsBusy || !notificationPolicyDraft.dailySalesReminderEnabled
                  }
                  onChange={(event) => {
                    const nextMinutes = parseTimeInputToMinutes(
                      event.target.value,
                    );
                    if (nextMinutes === null) {
                      return;
                    }
                    updatePolicyDraft("dailySalesReminderFinalMinutes", nextMinutes);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleSaveNotificationPolicy()}
              disabled={settingsBusy || settingsLoading || !policyDirty}
            >
              {tr("Save Server Policy", "Guardar Política del Servidor")}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setNotificationPolicyDraft(notificationPolicy)}
              disabled={settingsBusy || settingsLoading || !policyDirty}
            >
              {tr("Reset Draft", "Restablecer Borrador")}
            </button>
          </div>
        </div>

        {settingsStatus ? (
          <div className={`alert alert-${settingsStatusKind} mb-0`}>
            {settingsStatus}
          </div>
        ) : null}

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => void handleApplyAllNotificationsToAllDevices(true)}
            disabled={settingsBusy || settingsLoading || !devices.length}
          >
            {tr("Enable All Devices", "Activar Todos los Dispositivos")}
          </button>
          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={() => void handleApplyAllNotificationsToAllDevices(false)}
            disabled={settingsBusy || settingsLoading || !devices.length}
          >
            {tr("Disable All Devices", "Desactivar Todos los Dispositivos")}
          </button>
        </div>

        <div className="border rounded p-3 bg-body-tertiary">
          <div className="d-flex flex-column gap-3">
            <div>
              <h3 className="h6 mb-1">
                {tr(
                  "Category Control Across All Devices",
                  "Control de Categorías en Todos los Dispositivos",
                )}
              </h3>
              <p className="text-muted mb-0 small">
                {tr(
                  "Turn individual push categories on or off for every registered admin device at once.",
                  "Activa o desactiva categorías push individuales para todos los dispositivos admin registrados al mismo tiempo.",
                )}
              </p>
            </div>
            {preferenceCounts.map((preference) => (
              <div
                key={`preference-${preference.key}`}
                className="d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-lg-center border rounded p-3 bg-white"
              >
                <div>
                  <div className="fw-semibold">{preference.title}</div>
                  <div className="text-muted small">{preference.description}</div>
                  <div className="text-muted small">
                    {tr(
                      `${preference.enabledCount} of ${devices.length} registered devices enabled`,
                      `${preference.enabledCount} de ${devices.length} dispositivos registrados activados`,
                    )}
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() =>
                      void handleApplyPreferenceToAllDevices(preference.key, true)
                    }
                    disabled={settingsBusy || settingsLoading || !devices.length}
                  >
                    {tr("Turn On for All", "Activar en Todos")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() =>
                      void handleApplyPreferenceToAllDevices(preference.key, false)
                    }
                    disabled={settingsBusy || settingsLoading || !devices.length}
                  >
                    {tr("Turn Off for All", "Desactivar en Todos")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="h6 mb-1">
            {tr("Registered Admin Devices", "Dispositivos Admin Registrados")}
          </h3>
          <p className="text-muted mb-0 small">
            {tr(
              "These are the phones or tablets currently registered to receive admin push alerts. The browser page manages them, but the browser itself does not receive Expo push notifications.",
              "Estos son los teléfonos o tabletas registrados actualmente para recibir alertas push de admin. Esta página los administra, pero el navegador en sí no recibe notificaciones push de Expo.",
            )}
          </p>
        </div>

        {settingsLoading ? (
          <div className="text-muted">
            {tr(
              "Loading notification settings...",
              "Cargando ajustes de notificaciones...",
            )}
          </div>
        ) : devices.length === 0 ? (
          <div className="text-muted border rounded p-3">
            {tr(
              "No admin devices are registered yet. Sign in on a phone or tablet and allow push permissions to manage it here.",
              "Todavía no hay dispositivos admin registrados. Inicia sesión en un teléfono o tableta y permite push para administrarlo aquí.",
            )}
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {devices.map((device, index) => {
              const deviceLabel =
                device.label?.trim() ||
                device.platform?.trim() ||
                tr(`Device ${index + 1}`, `Dispositivo ${index + 1}`);
              return (
                <div key={device.id} className="border rounded p-3 bg-body-tertiary">
                  <div className="d-flex flex-column flex-xl-row justify-content-between gap-3 mb-3">
                    <div>
                      <div className="fw-semibold">{deviceLabel}</div>
                      <div className="text-muted small">
                        {[
                          device.platform || tr("Unknown platform", "Plataforma desconocida"),
                          device.timeZone || tr("No device timezone", "Sin zona horaria del dispositivo"),
                          device.tokenPreview
                            ? `${tr("Push token", "Token push")}: ••••${device.tokenPreview}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                      <div className="text-muted small">
                        {tr("Last updated", "Última actualización")}: {formatDateTime(device.updatedAt)}
                      </div>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => void handleApplyAllToDevice(device, true)}
                        disabled={settingsBusy}
                      >
                        {tr("Enable All", "Activar Todo")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => void handleApplyAllToDevice(device, false)}
                        disabled={settingsBusy}
                      >
                        {tr("Disable All", "Desactivar Todo")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => void handleRemoveDevice(device)}
                        disabled={settingsBusy}
                      >
                        {tr("Remove Device", "Eliminar Dispositivo")}
                      </button>
                    </div>
                  </div>

                  <div className="row g-3">
                    {preferenceDefinitions.map((preference) => (
                      <div className="col-12 col-md-6" key={`${device.id}-${preference.key}`}>
                        <div className="border rounded p-3 bg-white h-100">
                          <div className="d-flex justify-content-between align-items-start gap-3">
                            <div>
                              <div className="fw-semibold">{preference.title}</div>
                              <div className="text-muted small">
                                {preference.description}
                              </div>
                            </div>
                            <div className="form-check form-switch m-0 pt-1">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                role="switch"
                                checked={device.notifications[preference.key]}
                                disabled={settingsBusy}
                                onChange={() =>
                                  void handleToggleDevicePreference(device, preference.key)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="admin-card d-flex flex-column gap-3">
        <div>
          <h2 className="h5 mb-1">
            {tr("Send Employee Message", "Enviar Mensaje al Empleado")}
          </h2>
          <p className="text-muted mb-0">
            {tr(
              "This alert pops up for the employee on their next clock-in.",
              "Esta alerta aparece para el empleado en su próxima entrada.",
            )}
          </p>
        </div>
        <div className="row g-2">
          <div className="col-md-4">
            <label className="form-label">{tr("Employee", "Empleado")}</label>
            <select
              className="form-select"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-8">
            <label className="form-label">{tr("Subject", "Asunto")}</label>
            <input
              className="form-control"
              value={subject}
              maxLength={120}
              onChange={(event) => setSubject(event.target.value)}
              placeholder={tr("Subject", "Asunto")}
            />
          </div>
          <div className="col-12">
            <label className="form-label">{tr("Message", "Mensaje")}</label>
            <textarea
              className="form-control"
              rows={3}
              value={message}
              maxLength={2000}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={tr(
                "Write your message for the employee...",
                "Escribe tu mensaje para el empleado...",
              )}
            />
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-primary"
            onClick={handleSendMessage}
            disabled={sendingMessage}
          >
            {sendingMessage
              ? tr("Sending...", "Enviando...")
              : tr("Send Message", "Enviar Mensaje")}
          </button>
          {messageStatus && <span className="text-muted">{messageStatus}</span>}
        </div>
      </div>

      <div className="admin-card">
        <div className="notification-toolbar">
          <div className="notification-count">
            {unreadCount} {tr("Unread", "No leídas")}
          </div>
          <label className="notification-filter">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(event) => setUnreadOnly(event.target.checked)}
            />
            {tr("Show unread only", "Mostrar solo no leídas")}
          </label>
        </div>

        {feedStatus && <div className="alert alert-danger">{feedStatus}</div>}

        {loading ? (
          <div className="empty-state">
            {tr("Loading notifications…", "Cargando notificaciones…")}
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            {tr("No notifications yet.", "Aún no hay notificaciones.")}
          </div>
        ) : (
          <ul className="notification-list">
            {notifications.map((notice) => {
              const created = new Date(notice.createdAt);
              return (
                <li
                  key={notice.id}
                  className={`notification-item ${
                    notice.readAt ? "is-read" : "is-unread"
                  }`}
                >
                  <div className="notification-main">
                    <div className="notification-title">{notice.message}</div>
                    <div className="notification-meta">
                      <span className="badge bg-primary-subtle">
                        {notice.type.replace(/_/g, " ")}
                      </span>
                      {notice.employeeName && (
                        <span className="meta-pill">{notice.employeeName}</span>
                      )}
                      <span className="meta-time">
                        {created.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="notification-actions">
                    {!notice.readAt && (
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleMarkRead(notice.id)}
                      >
                        {tr("Mark Read", "Marcar Leída")}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
