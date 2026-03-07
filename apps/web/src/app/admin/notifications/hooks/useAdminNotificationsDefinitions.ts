import { useMemo } from "react";
import type {
  AdminNotificationsTranslate,
  DeviceDefaultDefinition,
  PreferenceDefinition,
  SourceToggleDefinition,
} from "../types";

export function useAdminNotificationsDefinitions(
  tr: AdminNotificationsTranslate,
) {
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

  const sourceToggleDefinitions = useMemo<SourceToggleDefinition[]>(
    () => [
      {
        key: "lateClockInWorkflowEnabled",
        title: tr(
          "Late / Missing Clock-In Workflow",
          "Flujo de clock in tardío o faltante",
        ),
        description: tr(
          "Creates scheduled reminders and automatic follow-up actions for missed starts.",
          "Crea recordatorios programados y acciones automáticas de seguimiento para entradas perdidas.",
        ),
      },
      {
        key: "punchActivityNotificationsEnabled",
        title: tr(
          "Clock In / Clock Out Activity",
          "Actividad de clock in y clock out",
        ),
        description: tr(
          "Creates one notification for each in, out, break, or lunch event.",
          "Crea una notificación por cada evento de entrada, salida, descanso o lunch.",
        ),
      },
      {
        key: "noBreakAlertsEnabled",
        title: tr("No-Break Alerts", "Alertas sin descanso"),
        description: tr(
          "Creates repeated alerts when someone stays clocked in too long without a break.",
          "Crea alertas repetidas cuando alguien permanece activo demasiado tiempo sin descanso.",
        ),
      },
      {
        key: "scheduleOverrideNotificationsEnabled",
        title: tr(
          "Schedule Override Requests",
          "Solicitudes de horario",
        ),
        description: tr(
          "Creates notifications when someone requests work outside their assigned schedule.",
          "Crea notificaciones cuando alguien solicita trabajar fuera de su horario asignado.",
        ),
      },
      {
        key: "tipSummaryNotificationsEnabled",
        title: tr("7-Day Tip Summaries", "Resúmenes de propinas"),
        description: tr(
          "Creates summary alerts after tip entries are submitted.",
          "Crea alertas resumen después de registrar propinas.",
        ),
      },
      {
        key: "dailySalesReminderEnabled",
        title: tr("Daily Sales Reminders", "Recordatorios de ventas diarias"),
        description: tr(
          "Creates reminder notifications when daily sales are still missing.",
          "Crea notificaciones recordatorio cuando las ventas diarias aún faltan.",
        ),
      },
      {
        key: "ownerDailyReportEnabled",
        title: tr(
          "Owner Daily Report Email",
          "Correo diario del reporte para owner",
        ),
        description: tr(
          "Sends the owner email summary from the server on the tenant schedule.",
          "Envía el correo resumen del owner desde el servidor según el horario del tenant.",
        ),
      },
    ],
    [tr],
  );

  const deviceDefaultDefinitions = useMemo<DeviceDefaultDefinition[]>(
    () => [
      {
        key: "defaultNotifyLateClockInReminders",
        preferenceKey: "notifyLateClockInReminders",
        title: tr(
          "Late / Missing Clock-In Reminders",
          "Recordatorios de clock in tardío o faltante",
        ),
        description: tr(
          "Apply this delivery setting to newly registered admin devices.",
          "Aplica esta preferencia de entrega a nuevos dispositivos admin registrados.",
        ),
      },
      {
        key: "defaultNotifyPunchActivity",
        preferenceKey: "notifyPunchActivity",
        title: tr(
          "Clock In / Clock Out Activity",
          "Actividad de clock in y clock out",
        ),
        description: tr(
          "Default push delivery for punch activity on new devices.",
          "Entrega push predeterminada para actividad de punch en dispositivos nuevos.",
        ),
      },
      {
        key: "defaultNotifyNoBreakAlerts",
        preferenceKey: "notifyNoBreakAlerts",
        title: tr(
          "Still Clocked-In / No-Break Alerts",
          "Alertas de empleados aún activos",
        ),
        description: tr(
          "Default push delivery for no-break alerts on new devices.",
          "Entrega push predeterminada para alertas sin descanso en dispositivos nuevos.",
        ),
      },
      {
        key: "defaultNotifyScheduleOverrides",
        preferenceKey: "notifyScheduleOverrides",
        title: tr(
          "Schedule Override Requests",
          "Solicitudes de horario",
        ),
        description: tr(
          "Default push delivery for schedule override requests on new devices.",
          "Entrega push predeterminada para solicitudes de horario en dispositivos nuevos.",
        ),
      },
      {
        key: "defaultNotifyTipSummaries",
        preferenceKey: "notifyTipSummaries",
        title: tr("7-Day Tip Summaries", "Resúmenes de propinas"),
        description: tr(
          "Default push delivery for tip summaries on new devices.",
          "Entrega push predeterminada para resúmenes de propinas en dispositivos nuevos.",
        ),
      },
      {
        key: "defaultNotifyDailySalesReminders",
        preferenceKey: "notifyDailySalesReminders",
        title: tr("Daily Sales Reminders", "Recordatorios de ventas diarias"),
        description: tr(
          "Default push delivery for daily sales reminders on new devices.",
          "Entrega push predeterminada para recordatorios de ventas diarias en dispositivos nuevos.",
        ),
      },
    ],
    [tr],
  );

  return {
    deviceDefaultDefinitions,
    preferenceDefinitions,
    sourceToggleDefinitions,
  };
}
