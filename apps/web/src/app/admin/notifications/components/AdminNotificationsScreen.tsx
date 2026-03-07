"use client";

import { useCallback, useMemo } from "react";
import { useUiLanguage } from "../../../../lib/ui-language";
import { DeviceDefaultsPanel } from "./DeviceDefaultsPanel";
import { EmployeeMessagePanel } from "./EmployeeMessagePanel";
import { NotificationCategoryMatrix } from "./NotificationCategoryMatrix";
import { NotificationsFeedPanel } from "./NotificationsFeedPanel";
import { NotificationsHeader } from "./NotificationsHeader";
import { NotificationSourcePanel } from "./NotificationSourcePanel";
import { RegisteredDevicesPanel } from "./RegisteredDevicesPanel";
import { ServerPolicyPanel } from "./ServerPolicyPanel";
import { useAdminNotificationsDefinitions } from "../hooks/useAdminNotificationsDefinitions";
import { useNotificationFeed } from "../hooks/useNotificationFeed";
import { useNotificationSettings } from "../hooks/useNotificationSettings";

export function AdminNotificationsScreen() {
  const lang = useUiLanguage();
  const tr = useCallback(
    (en: string, es: string) => (lang === "es" ? es : en),
    [lang],
  );
  const {
    deviceDefaultDefinitions,
    preferenceDefinitions,
    sourceToggleDefinitions,
  } = useAdminNotificationsDefinitions(tr);
  const feed = useNotificationFeed(tr);
  const settings = useNotificationSettings(
    tr,
    preferenceDefinitions,
    sourceToggleDefinitions,
    deviceDefaultDefinitions,
  );

  const preferenceCounts = useMemo(
    () =>
      preferenceDefinitions.map((preference) => ({
        ...preference,
        enabledCount: settings.devices.filter(
          (device) => device.notifications[preference.key],
        ).length,
      })),
    [preferenceDefinitions, settings.devices],
  );

  const formatDateTime = useCallback((value: string) => {
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  }, []);

  const refreshAll = useCallback(() => {
    void feed.loadNotificationsFeed();
    void settings.loadNotificationSettings();
  }, [feed.loadNotificationsFeed, settings.loadNotificationSettings]);

  return (
    <div className="d-flex flex-column gap-4">
      <NotificationsHeader
        disabled={feed.loading || settings.settingsLoading || settings.settingsBusy}
        onMarkAllRead={() => void feed.handleMarkAll()}
        onRefreshAll={refreshAll}
        tr={tr}
      />

      <div className="admin-card d-flex flex-column gap-3">
        <div>
          <h2 className="h5 mb-1">
            {tr(
              "Notification Policy and Push Delivery",
              "Politica de Notificaciones y Entrega Push",
            )}
          </h2>
          <p className="text-muted mb-0">
            {tr(
              "Configure tenant-wide notification generation, reminder timing, delivery defaults, and current device subscriptions from one screen.",
              "Configura la generacion global de notificaciones, tiempos de recordatorio, entrega predeterminada y suscripciones de dispositivos actuales desde una sola pantalla.",
            )}
          </p>
        </div>

        {settings.settingsStatus ? (
          <div className={`alert alert-${settings.settingsStatusKind} mb-0`}>
            {settings.settingsStatus}
          </div>
        ) : null}

        <NotificationSourcePanel
          onPolicyChange={settings.updatePolicyDraft}
          onSetAllSources={settings.handleSetAllSourceToggles}
          policy={settings.notificationPolicyDraft}
          settingsBusy={settings.settingsBusy}
          sourceToggleDefinitions={sourceToggleDefinitions}
          tr={tr}
        />

        <ServerPolicyPanel
          availableTimeZones={settings.availableTimeZones}
          browserTimeZone={settings.browserTimeZone}
          onPolicyChange={settings.updatePolicyDraft}
          onResetDraft={settings.handleResetNotificationPolicyDraft}
          onSave={() => void settings.handleSaveNotificationPolicy()}
          onUseBrowserTimeZone={() =>
            settings.updatePolicyDraft("timezone", settings.browserTimeZone)
          }
          policy={settings.notificationPolicyDraft}
          policyDirty={settings.policyDirty}
          settingsBusy={settings.settingsBusy}
          settingsLoading={settings.settingsLoading}
          tr={tr}
        />

        <DeviceDefaultsPanel
          definitions={deviceDefaultDefinitions}
          deviceCount={settings.devices.length}
          onApplyDefaultsToDevices={() => void settings.handleApplyDefaultsToAllDevices()}
          onPolicyChange={settings.updatePolicyDraft}
          onSetAllDefaults={settings.handleSetAllDefaultToggles}
          policy={settings.notificationPolicyDraft}
          settingsBusy={settings.settingsBusy}
          tr={tr}
        />

        <NotificationCategoryMatrix
          deviceCount={settings.devices.length}
          onApplyAllDevices={(enabled) =>
            void settings.handleApplyAllNotificationsToAllDevices(enabled)
          }
          onApplyPreferenceToAllDevices={(key, value) =>
            void settings.handleApplyPreferenceToAllDevices(key, value)
          }
          preferenceCounts={preferenceCounts}
          settingsBusy={settings.settingsBusy}
          settingsLoading={settings.settingsLoading}
          tr={tr}
        />

        <RegisteredDevicesPanel
          devices={settings.devices}
          formatDateTime={formatDateTime}
          onApplyAllToDevice={(device, enabled) =>
            void settings.handleApplyAllToDevice(device, enabled)
          }
          onRemoveDevice={(device) => void settings.handleRemoveDevice(device)}
          onToggleDevicePreference={(device, key) =>
            void settings.handleToggleDevicePreference(device, key)
          }
          preferenceDefinitions={preferenceDefinitions}
          settingsBusy={settings.settingsBusy}
          settingsLoading={settings.settingsLoading}
          tr={tr}
        />
      </div>

      <EmployeeMessagePanel
        employeeId={feed.employeeId}
        employees={feed.employees}
        message={feed.message}
        messageStatus={feed.messageStatus}
        onEmployeeIdChange={feed.setEmployeeId}
        onMessageChange={feed.setMessage}
        onSend={() => void feed.handleSendMessage()}
        onSubjectChange={feed.setSubject}
        sendingMessage={feed.sendingMessage}
        subject={feed.subject}
        tr={tr}
      />

      <NotificationsFeedPanel
        feedStatus={feed.feedStatus}
        loading={feed.loading}
        notifications={feed.notifications}
        onMarkRead={(id) => void feed.handleMarkRead(id)}
        onUnreadOnlyChange={feed.setUnreadOnly}
        tr={tr}
        unreadCount={feed.unreadCount}
        unreadOnly={feed.unreadOnly}
      />
    </div>
  );
}
