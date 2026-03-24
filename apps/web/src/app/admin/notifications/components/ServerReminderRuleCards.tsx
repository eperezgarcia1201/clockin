import {
  clampInteger,
  formatMinutesAsTimeInput,
  parseTimeInputToMinutes,
} from "../notification-policy";
import type {
  AdminNotificationsTranslate,
  NotificationPolicySettings,
  NotificationPolicyUpdater,
} from "../types";

type ServerReminderRuleCardsProps = {
  onPolicyChange: NotificationPolicyUpdater;
  policy: NotificationPolicySettings;
  settingsBusy: boolean;
  tr: AdminNotificationsTranslate;
};

export function ServerReminderRuleCards({
  onPolicyChange,
  policy,
  settingsBusy,
  tr,
}: ServerReminderRuleCardsProps) {
  const changeTimeValue = (
    key:
      | "dailySalesReminderFirstMinutes"
      | "dailySalesReminderFinalMinutes"
      | "ownerDailyReportSendMinutes",
    value: string,
  ) => {
    const nextMinutes = parseTimeInputToMinutes(value);
    if (nextMinutes !== null) {
      onPolicyChange(key, nextMinutes);
    }
  };

  return (
    <>
      <div className="border rounded p-3 bg-white d-flex flex-column gap-3">
        <div>
          <div className="fw-semibold">
            {tr("Late / Missing Clock-In Workflow", "Flujo de Clock In Tardio o Faltante")}
          </div>
          <div className="text-muted small">
            {tr(
              "These controls only apply when the late-clock-in source is enabled above.",
              "Estos controles solo aplican cuando la fuente de clock in tardio esta activada arriba.",
            )}
          </div>
        </div>
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <label className="form-label">{tr("Grace Minutes", "Minutos de Gracia")}</label>
            <input
              type="number"
              min={0}
              max={180}
              className="form-control"
              value={policy.lateClockInGraceMinutes}
              disabled={settingsBusy || !policy.lateClockInWorkflowEnabled}
              onChange={(event) =>
                onPolicyChange(
                  "lateClockInGraceMinutes",
                  clampInteger(Number(event.target.value), 0, 0, 180),
                )
              }
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">{tr("Reminder Interval (Minutes)", "Intervalo entre Recordatorios (Minutos)")}</label>
            <input
              type="number"
              min={1}
              max={180}
              className="form-control"
              value={policy.lateClockInReminderIntervalMinutes}
              disabled={settingsBusy || !policy.lateClockInWorkflowEnabled}
              onChange={(event) =>
                onPolicyChange(
                  "lateClockInReminderIntervalMinutes",
                  clampInteger(Number(event.target.value), 1, 1, 180),
                )
              }
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">{tr("Maximum Reminders", "Maximo de Recordatorios")}</label>
            <input
              type="number"
              min={1}
              max={12}
              className="form-control"
              value={policy.lateClockInReminderMax}
              disabled={settingsBusy || !policy.lateClockInWorkflowEnabled}
              onChange={(event) =>
                onPolicyChange(
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
                checked={policy.autoClockInAfterLateReminders}
                disabled={settingsBusy || !policy.lateClockInWorkflowEnabled}
                onChange={(event) =>
                  onPolicyChange("autoClockInAfterLateReminders", event.target.checked)
                }
              />
              <label className="form-check-label">
                {tr("Auto clock in after the final reminder", "Hacer clock in automatico despues del ultimo recordatorio")}
              </label>
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                checked={policy.autoClockInOnGeofence}
                disabled={settingsBusy || !policy.lateClockInWorkflowEnabled}
                onChange={(event) => onPolicyChange("autoClockInOnGeofence", event.target.checked)}
              />
              <label className="form-check-label">
                {tr("Auto clock in when the latest punch is inside the assigned geofence", "Hacer clock in automatico cuando el ultimo punch este dentro del geofence asignado")}
              </label>
            </div>
          </div>
          <div className="col-12">
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                checked={policy.employeeLateClockInPushEnabled}
                disabled={settingsBusy || !policy.lateClockInWorkflowEnabled}
                onChange={(event) =>
                  onPolicyChange(
                    "employeeLateClockInPushEnabled",
                    event.target.checked,
                  )
                }
              />
              <label className="form-check-label">
                {tr(
                  "Send late clock-in push reminders to employees on their registered devices",
                  "Enviar recordatorios push de clock in tardio a empleados en sus dispositivos registrados",
                )}
              </label>
            </div>
            <div className="text-muted small mt-2">
              {tr(
                "This affects employee phones only and does not change admin delivery settings.",
                "Esto afecta solo a los telefonos de empleados y no cambia las entregas para admins.",
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <div className="border rounded p-3 bg-white h-100 d-flex flex-column gap-3">
            <div>
              <div className="fw-semibold">{tr("No-Break Alerts", "Alertas sin Descanso")}</div>
              <div className="text-muted small">
                {tr(
                  "Alert timing follows the no-break source above. The deduction rule below is independent and affects reported hours.",
                  "Los tiempos de alerta siguen la fuente de alertas sin descanso. La regla de descuento abajo es independiente y afecta las horas reportadas.",
                )}
              </div>
            </div>
            <div className="row g-3">
              <div className="col-12 col-md-4 col-xl-12">
                <label className="form-label">{tr("Threshold Hours", "Horas de Umbral")}</label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  className="form-control"
                  value={policy.noBreakAlertHours}
                  disabled={settingsBusy || !policy.noBreakAlertsEnabled}
                  onChange={(event) =>
                    onPolicyChange(
                      "noBreakAlertHours",
                      clampInteger(Number(event.target.value), 1, 1, 24),
                    )
                  }
                />
              </div>
              <div className="col-12 col-md-4 col-xl-12">
                <label className="form-label">{tr("Repeat Every (Minutes)", "Repetir Cada (Minutos)")}</label>
                <input
                  type="number"
                  min={1}
                  max={720}
                  className="form-control"
                  value={policy.noBreakReminderIntervalMinutes}
                  disabled={settingsBusy || !policy.noBreakAlertsEnabled}
                  onChange={(event) =>
                    onPolicyChange(
                      "noBreakReminderIntervalMinutes",
                      clampInteger(Number(event.target.value), 60, 1, 720),
                    )
                  }
                />
              </div>
              <div className="col-12 col-md-4 col-xl-12">
                <label className="form-label">{tr("Maximum Alerts", "Maximo de Alertas")}</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  className="form-control"
                  value={policy.noBreakReminderMax}
                  disabled={settingsBusy || !policy.noBreakAlertsEnabled}
                  onChange={(event) =>
                    onPolicyChange(
                      "noBreakReminderMax",
                      clampInteger(Number(event.target.value), 1, 1, 12),
                    )
                  }
                />
              </div>
              <div className="col-12">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    checked={policy.missedBreakDeductionEnabled}
                    disabled={settingsBusy}
                    onChange={(event) =>
                      onPolicyChange(
                        "missedBreakDeductionEnabled",
                        event.target.checked,
                      )
                    }
                  />
                  <label className="form-check-label">
                    {tr(
                      "Deduct time when a full long shift ends without a break punch",
                      "Descontar tiempo cuando un turno largo completo termina sin punch de descanso",
                    )}
                  </label>
                </div>
                <div className="text-muted small mt-2">
                  {tr(
                    "This only applies after the employee reaches the full scheduled shift length.",
                    "Esto solo aplica despues de que el empleado cumple la duracion completa del turno programado.",
                  )}
                </div>
              </div>
              <div className="col-12 col-md-6 col-xl-12">
                <label className="form-label">
                  {tr("Scheduled Hours Trigger", "Horas Programadas de Activacion")}
                </label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  className="form-control"
                  value={policy.missedBreakScheduleHours}
                  disabled={
                    settingsBusy ||
                    !policy.missedBreakDeductionEnabled
                  }
                  onChange={(event) =>
                    onPolicyChange(
                      "missedBreakScheduleHours",
                      clampInteger(Number(event.target.value), 6, 1, 24),
                    )
                  }
                />
              </div>
              <div className="col-12 col-md-6 col-xl-12">
                <label className="form-label">
                  {tr("Deduct Minutes", "Minutos a Descontar")}
                </label>
                <input
                  type="number"
                  min={1}
                  max={720}
                  className="form-control"
                  value={policy.missedBreakDeductionMinutes}
                  disabled={
                    settingsBusy ||
                    !policy.missedBreakDeductionEnabled
                  }
                  onChange={(event) =>
                    onPolicyChange(
                      "missedBreakDeductionMinutes",
                      clampInteger(Number(event.target.value), 120, 1, 720),
                    )
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-6">
          <div className="border rounded p-3 bg-white h-100 d-flex flex-column gap-3">
            <div>
              <div className="fw-semibold">{tr("Owner Daily Report Email", "Correo Diario del Reporte para Owner")}</div>
              <div className="text-muted small">
                {tr(
                  "This send time only applies when the owner daily report source is enabled above.",
                  "Esta hora de envio solo aplica cuando la fuente del correo diario del owner esta activada arriba.",
                )}
              </div>
            </div>
            <div>
              <label className="form-label">{tr("Send Time", "Hora de Envio")}</label>
              <input
                type="time"
                className="form-control"
                value={formatMinutesAsTimeInput(policy.ownerDailyReportSendMinutes)}
                disabled={settingsBusy || !policy.ownerDailyReportEnabled}
                onChange={(event) =>
                  changeTimeValue("ownerDailyReportSendMinutes", event.target.value)
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border rounded p-3 bg-white d-flex flex-column gap-3">
        <div>
          <div className="fw-semibold">{tr("Daily Sales Reminders", "Recordatorios de Ventas Diarias")}</div>
          <div className="text-muted small">
            {tr(
              "These times only apply when the daily-sales reminder source is enabled above.",
              "Estas horas solo aplican cuando la fuente de recordatorios de ventas diarias esta activada arriba.",
            )}
          </div>
        </div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label">{tr("First Reminder Time", "Hora del Primer Recordatorio")}</label>
            <input
              type="time"
              className="form-control"
              value={formatMinutesAsTimeInput(policy.dailySalesReminderFirstMinutes)}
              disabled={settingsBusy || !policy.dailySalesReminderEnabled}
              onChange={(event) =>
                changeTimeValue("dailySalesReminderFirstMinutes", event.target.value)
              }
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">{tr("Final Reminder Time", "Hora del Recordatorio Final")}</label>
            <input
              type="time"
              className="form-control"
              value={formatMinutesAsTimeInput(policy.dailySalesReminderFinalMinutes)}
              disabled={settingsBusy || !policy.dailySalesReminderEnabled}
              onChange={(event) =>
                changeTimeValue("dailySalesReminderFinalMinutes", event.target.value)
              }
            />
          </div>
        </div>
      </div>
    </>
  );
}
