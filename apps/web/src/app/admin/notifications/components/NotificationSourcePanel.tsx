import type {
  AdminNotificationsTranslate,
  NotificationPolicySettings,
  NotificationPolicyUpdater,
  SourceToggleDefinition,
} from "../types";

type NotificationSourcePanelProps = {
  onPolicyChange: NotificationPolicyUpdater;
  onSetAllSources: (enabled: boolean) => void;
  policy: NotificationPolicySettings;
  settingsBusy: boolean;
  sourceToggleDefinitions: SourceToggleDefinition[];
  tr: AdminNotificationsTranslate;
};

export function NotificationSourcePanel({
  onPolicyChange,
  onSetAllSources,
  policy,
  settingsBusy,
  sourceToggleDefinitions,
  tr,
}: NotificationSourcePanelProps) {
  return (
    <div className="border rounded p-3 bg-body-tertiary d-flex flex-column gap-3">
      <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
        <div>
          <h3 className="h6 mb-1">
            {tr("Notification Sources", "Fuentes de Notificación")}
          </h3>
          <p className="text-muted mb-0 small">
            {tr(
              "These switches decide whether the server generates each notification type at all. Delivery controls below only decide which devices receive them.",
              "Estos switches deciden si el servidor genera cada tipo de notificación. Los controles de entrega de abajo solo deciden qué dispositivos las reciben.",
            )}
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => onSetAllSources(true)}
            disabled={settingsBusy}
          >
            {tr("Turn On All Sources", "Activar Todas las Fuentes")}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => onSetAllSources(false)}
            disabled={settingsBusy}
          >
            {tr("Turn Off All Sources", "Desactivar Todas las Fuentes")}
          </button>
        </div>
      </div>

      <div className="alert alert-info mb-0 py-2 small">
        {tr(
          "Punch, schedule-override, and tip-summary notifications are event-based and fire once per event. Repeated cadence controls apply to late clock-in and no-break workflows below.",
          "Las notificaciones de punches, solicitudes de horario y resúmenes de propinas son por evento y se envían una vez por evento. Los controles de repetición aplican a los flujos de clock in tardío y alertas sin descanso de abajo.",
        )}
      </div>

      <div className="row g-3">
        {sourceToggleDefinitions.map((definition) => (
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
