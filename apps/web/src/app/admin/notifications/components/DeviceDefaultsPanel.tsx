import type {
  AdminNotificationsTranslate,
  DeviceDefaultDefinition,
  NotificationPolicySettings,
  NotificationPolicyUpdater,
} from "../types";

type DeviceDefaultsPanelProps = {
  definitions: DeviceDefaultDefinition[];
  deviceCount: number;
  onApplyDefaultsToDevices: () => void;
  onPolicyChange: NotificationPolicyUpdater;
  onSetAllDefaults: (enabled: boolean) => void;
  policy: NotificationPolicySettings;
  settingsBusy: boolean;
  tr: AdminNotificationsTranslate;
};

export function DeviceDefaultsPanel({
  definitions,
  deviceCount,
  onApplyDefaultsToDevices,
  onPolicyChange,
  onSetAllDefaults,
  policy,
  settingsBusy,
  tr,
}: DeviceDefaultsPanelProps) {
  return (
    <div className="border rounded p-3 bg-body-tertiary d-flex flex-column gap-3">
      <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
        <div>
          <h3 className="h6 mb-1">
            {tr(
              "Default Delivery for New Devices",
              "Entrega Predeterminada para Nuevos Dispositivos",
            )}
          </h3>
          <p className="text-muted mb-0 small">
            {tr(
              "Choose which categories new admin phones and tablets should receive the moment they register push notifications.",
              "Elige qué categorías deben recibir los nuevos teléfonos y tabletas admin en cuanto registren notificaciones push.",
            )}
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => onSetAllDefaults(true)}
            disabled={settingsBusy}
          >
            {tr("Turn On All Defaults", "Activar Todos los Predeterminados")}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => onSetAllDefaults(false)}
            disabled={settingsBusy}
          >
            {tr("Turn Off All Defaults", "Desactivar Todos los Predeterminados")}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={onApplyDefaultsToDevices}
            disabled={settingsBusy || deviceCount === 0}
          >
            {tr(
              "Apply Draft Defaults to Current Devices",
              "Aplicar Predeterminados del Borrador a Dispositivos Actuales",
            )}
          </button>
        </div>
      </div>

      <div className="alert alert-info mb-0 py-2 small">
        {tr(
          `${deviceCount} registered devices are currently managed here. Saving this section affects future registrations; the apply button syncs the same choices to existing devices now.`,
          `${deviceCount} dispositivos registrados se administran aqui. Guardar esta seccion afecta registros futuros; el boton aplicar sincroniza esas mismas opciones con los dispositivos actuales.`,
        )}
      </div>

      <div className="row g-3">
        {definitions.map((definition) => (
          <div className="col-12 col-xl-6" key={definition.key}>
            <div className="border rounded p-3 bg-white h-100">
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div>
                  <div className="fw-semibold">{definition.title}</div>
                  <div className="text-muted small">{definition.description}</div>
                </div>
                <div className="form-check form-switch m-0 pt-1">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    checked={policy[definition.key]}
                    disabled={settingsBusy}
                    onChange={(event) =>
                      onPolicyChange(definition.key, event.target.checked)
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
}
