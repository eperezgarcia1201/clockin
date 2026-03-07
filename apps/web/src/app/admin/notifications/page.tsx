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
  const [tenantTimeZone, setTenantTimeZone] = useState(defaultTimeZone);
  const [timezoneDraft, setTimezoneDraft] = useState(defaultTimeZone);

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
      const nextTimeZone = resolveTenantTimeZone(settingsResult.value);
      setTenantTimeZone(nextTimeZone);
      setTimezoneDraft(nextTimeZone);
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

  const handleSaveTenantTimeZone = async (nextTimeZone: string) => {
    setSettingsBusy(true);
    setSettingsAlert("info", null);
    try {
      await updateSettings({ timezone: nextTimeZone });
      setTenantTimeZone(nextTimeZone);
      setTimezoneDraft(nextTimeZone);
      setSettingsAlert(
        "success",
        tr(
          "Tenant timezone updated. Reminder scheduling will follow this timezone.",
          "Zona horaria del tenant actualizada. La programación de recordatorios seguirá esta zona horaria.",
        ),
      );
    } catch (error) {
      setSettingsAlert(
        "danger",
        error instanceof Error
          ? error.message
          : tr(
              "Unable to save tenant timezone.",
              "No se pudo guardar la zona horaria del tenant.",
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
            {tr("Push Notification Settings", "Ajustes de Notificaciones Push")}
          </h2>
          <p className="text-muted mb-0">
            {tr(
              "Reminder scheduling uses the tenant timezone on the server. The toggles below control which registered admin devices receive each push category.",
              "La programación de recordatorios usa la zona horaria del tenant en el servidor. Los controles de abajo definen qué dispositivos admin registrados reciben cada categoría push.",
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
              value={timezoneDraft}
              onChange={(event) => setTimezoneDraft(event.target.value)}
              disabled={settingsBusy}
            >
              {TIMEZONES.map((timeZone) => (
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
              onClick={() => void handleSaveTenantTimeZone(timezoneDraft)}
              disabled={settingsBusy || timezoneDraft === tenantTimeZone}
            >
              {tr("Save Timezone", "Guardar Zona Horaria")}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                setTimezoneDraft(browserTimeZone);
                void handleSaveTenantTimeZone(browserTimeZone);
              }}
              disabled={settingsBusy || browserTimeZone === tenantTimeZone}
            >
              {tr("Use Browser Timezone", "Usar Zona del Navegador")}
            </button>
          </div>
        </div>

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

        {settingsStatus ? (
          <div className={`alert alert-${settingsStatusKind} mb-0`}>
            {settingsStatus}
          </div>
        ) : null}

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
