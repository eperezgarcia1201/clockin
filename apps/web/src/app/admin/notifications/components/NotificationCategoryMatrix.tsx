import type {
  AdminNotificationsTranslate,
  PreferenceCount,
} from "../types";

type NotificationCategoryMatrixProps = {
  deviceCount: number;
  onApplyAllDevices: (enabled: boolean) => void;
  onApplyPreferenceToAllDevices: (key: PreferenceCount["key"], value: boolean) => void;
  preferenceCounts: PreferenceCount[];
  settingsBusy: boolean;
  settingsLoading: boolean;
  tr: AdminNotificationsTranslate;
};

export function NotificationCategoryMatrix({
  deviceCount,
  onApplyAllDevices,
  onApplyPreferenceToAllDevices,
  preferenceCounts,
  settingsBusy,
  settingsLoading,
  tr,
}: NotificationCategoryMatrixProps) {
  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={() => onApplyAllDevices(true)}
          disabled={settingsBusy || settingsLoading || !deviceCount}
        >
          {tr("Enable All Devices", "Activar Todos los Dispositivos")}
        </button>
        <button
          type="button"
          className="btn btn-outline-danger"
          onClick={() => onApplyAllDevices(false)}
          disabled={settingsBusy || settingsLoading || !deviceCount}
        >
          {tr("Disable All Devices", "Desactivar Todos los Dispositivos")}
        </button>
      </div>

      <div className="border rounded p-3 bg-body-tertiary d-flex flex-column gap-3">
        <div>
          <h3 className="h6 mb-1">
            {tr(
              "Category Control Across All Devices",
              "Control de Categorias en Todos los Dispositivos",
            )}
          </h3>
          <p className="text-muted mb-0 small">
            {tr(
              "This is delivery-only control. It does not create notifications by itself; it only decides which current devices receive each category.",
              "Este control solo maneja la entrega. No crea notificaciones por si mismo; solo decide que dispositivos actuales reciben cada categoria.",
            )}
          </p>
        </div>

        {preferenceCounts.map((preference) => (
          <div
            key={preference.key}
            className="d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-lg-center border rounded p-3 bg-white"
          >
            <div>
              <div className="fw-semibold">{preference.title}</div>
              <div className="text-muted small">{preference.description}</div>
              <div className="text-muted small">
                {tr(
                  `${preference.enabledCount} of ${deviceCount} registered devices enabled`,
                  `${preference.enabledCount} de ${deviceCount} dispositivos registrados activados`,
                )}
              </div>
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => onApplyPreferenceToAllDevices(preference.key, true)}
                disabled={settingsBusy || settingsLoading || !deviceCount}
              >
                {tr("Turn On for All", "Activar en Todos")}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => onApplyPreferenceToAllDevices(preference.key, false)}
                disabled={settingsBusy || settingsLoading || !deviceCount}
              >
                {tr("Turn Off for All", "Desactivar en Todos")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
