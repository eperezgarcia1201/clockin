import type { AdminPushDevice } from "../../../../lib/api/admin-devices";
import type {
  AdminNotificationsTranslate,
  PreferenceDefinition,
} from "../types";

type RegisteredDevicesPanelProps = {
  devices: AdminPushDevice[];
  formatDateTime: (value: string) => string;
  onApplyAllToDevice: (device: AdminPushDevice, enabled: boolean) => void;
  onRemoveDevice: (device: AdminPushDevice) => void;
  onToggleDevicePreference: (
    device: AdminPushDevice,
    key: PreferenceDefinition["key"],
  ) => void;
  preferenceDefinitions: PreferenceDefinition[];
  settingsBusy: boolean;
  settingsLoading: boolean;
  tr: AdminNotificationsTranslate;
};

export function RegisteredDevicesPanel({
  devices,
  formatDateTime,
  onApplyAllToDevice,
  onRemoveDevice,
  onToggleDevicePreference,
  preferenceDefinitions,
  settingsBusy,
  settingsLoading,
  tr,
}: RegisteredDevicesPanelProps) {
  if (settingsLoading) {
    return (
      <div className="text-muted">
        {tr(
          "Loading notification settings...",
          "Cargando ajustes de notificaciones...",
        )}
      </div>
    );
  }

  if (!devices.length) {
    return (
      <div className="text-muted border rounded p-3">
        {tr(
          "No admin devices are registered yet. Sign in on a phone or tablet and allow push permissions to manage it here.",
          "Todavia no hay dispositivos admin registrados. Inicia sesion en un telefono o tableta y permite push para administrarlo aqui.",
        )}
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-3">
      <div>
        <h3 className="h6 mb-1">
          {tr("Registered Admin Devices", "Dispositivos Admin Registrados")}
        </h3>
        <p className="text-muted mb-0 small">
          {tr(
            "These are the phones or tablets currently registered to receive admin push alerts. The browser page manages them, but the browser itself does not receive Expo push notifications.",
            "Estos son los telefonos o tabletas registrados actualmente para recibir alertas push de admin. Esta pagina los administra, pero el navegador en si no recibe notificaciones push de Expo.",
          )}
        </p>
      </div>

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
                  {tr("Last updated", "Ultima actualizacion")}: {formatDateTime(device.updatedAt)}
                </div>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => onApplyAllToDevice(device, true)}
                  disabled={settingsBusy}
                >
                  {tr("Enable All", "Activar Todo")}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => onApplyAllToDevice(device, false)}
                  disabled={settingsBusy}
                >
                  {tr("Disable All", "Desactivar Todo")}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => onRemoveDevice(device)}
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
                        <div className="text-muted small">{preference.description}</div>
                      </div>
                      <div className="form-check form-switch m-0 pt-1">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          checked={device.notifications[preference.key]}
                          disabled={settingsBusy}
                          onChange={() =>
                            onToggleDevicePreference(device, preference.key)
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
  );
}
