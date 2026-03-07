import type {
  AdminNotificationsTranslate,
  NotificationPolicySettings,
} from "../types";

type ServerPolicyToolbarProps = {
  availableTimeZones: string[];
  browserTimeZone: string;
  onResetDraft: () => void;
  onSave: () => void;
  onTimeZoneChange: (value: string) => void;
  onUseBrowserTimeZone: () => void;
  policy: NotificationPolicySettings;
  policyDirty: boolean;
  settingsBusy: boolean;
  settingsLoading: boolean;
  tr: AdminNotificationsTranslate;
};

export function ServerPolicyToolbar({
  availableTimeZones,
  browserTimeZone,
  onResetDraft,
  onSave,
  onTimeZoneChange,
  onUseBrowserTimeZone,
  policy,
  policyDirty,
  settingsBusy,
  settingsLoading,
  tr,
}: ServerPolicyToolbarProps) {
  return (
    <div className="d-flex flex-column gap-3">
      <div>
        <h3 className="h6 mb-1">
          {tr("Server Reminder Policy", "Politica de Recordatorios del Servidor")}
        </h3>
        <p className="text-muted mb-0 small">
          {tr(
            "Configure timezone, reminder timing, repeat cadence, and automatic follow-up actions for server-generated notifications.",
            "Configura zona horaria, tiempo de recordatorios, cadencia de repeticion y acciones automaticas de seguimiento para notificaciones generadas por el servidor.",
          )}
        </p>
      </div>

      <div className="row g-3 align-items-end">
        <div className="col-12 col-lg-4">
          <label className="form-label">{tr("Tenant Timezone", "Zona Horaria del Tenant")}</label>
          <select
            className="form-select"
            value={policy.timezone}
            onChange={(event) => onTimeZoneChange(event.target.value)}
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
          <label className="form-label">{tr("This Browser Timezone", "Zona Horaria de Este Navegador")}</label>
          <input className="form-control" value={browserTimeZone} readOnly />
        </div>
        <div className="col-12 col-lg-4 d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onSave}
            disabled={settingsBusy || settingsLoading || !policyDirty}
          >
            {tr("Save Server Policy", "Guardar Politica del Servidor")}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onUseBrowserTimeZone}
            disabled={settingsBusy || browserTimeZone === policy.timezone}
          >
            {tr("Use Browser Timezone", "Usar Zona del Navegador")}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onResetDraft}
            disabled={settingsBusy || settingsLoading || !policyDirty}
          >
            {tr("Reset Draft", "Restablecer Borrador")}
          </button>
        </div>
      </div>
    </div>
  );
}
