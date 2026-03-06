import { useMemo } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { Lang } from "../copy";
import type {
  AdminNotificationPreferenceKey,
  AdminPushDevice,
  Employee,
  NotificationRow,
} from "../types";

type ScheduleOverrideNotice = {
  requestId: string;
  status: string;
  reasonMessage: string;
  workDate: string;
  attemptedAt: string;
  employeeName: string;
} | null;

type AlertsCardProps = {
  isLight: boolean;
  activeMessageEmployees: Employee[];
  employeeMessageEmployeeId: string;
  onEmployeeMessageEmployeeIdChange: (value: string) => void;
  employeeMessageSubject: string;
  onEmployeeMessageSubjectChange: (value: string) => void;
  employeeMessageBody: string;
  onEmployeeMessageBodyChange: (value: string) => void;
  employeeMessageSending: boolean;
  onSendEmployeeMessage: () => void;
  inline: (value: string) => string;
  language: Lang;
  employeeMessageStatus: string | null;
  inlineOrNull: (value: string | null | undefined) => string | null;
  onRefreshAlerts: () => void | Promise<void>;
  alertsStatus: string | null;
  adminNotificationStatus: string | null;
  adminNotificationSaving: boolean;
  currentAdminPushDevice: AdminPushDevice | null;
  tenantTimeZone: string;
  deviceTimeZone: string;
  canSyncTenantTimeZone: boolean;
  onToggleNotificationPreference: (key: AdminNotificationPreferenceKey) => void;
  onSyncTenantTimeZone: () => void;
  notifications: NotificationRow[];
  parseScheduleOverrideNotification: (notice: NotificationRow) => ScheduleOverrideNotice;
  scheduleOverrideLoadingId: string | null;
  onScheduleOverrideDecision: (requestId: string, approved: boolean) => void;
  formatDisplayDate: (value: string) => string;
};

export function AlertsCard({
  isLight,
  activeMessageEmployees,
  employeeMessageEmployeeId,
  onEmployeeMessageEmployeeIdChange,
  employeeMessageSubject,
  onEmployeeMessageSubjectChange,
  employeeMessageBody,
  onEmployeeMessageBodyChange,
  employeeMessageSending,
  onSendEmployeeMessage,
  inline,
  language,
  employeeMessageStatus,
  inlineOrNull,
  onRefreshAlerts,
  alertsStatus,
  adminNotificationStatus,
  adminNotificationSaving,
  currentAdminPushDevice,
  tenantTimeZone,
  deviceTimeZone,
  canSyncTenantTimeZone,
  onToggleNotificationPreference,
  onSyncTenantTimeZone,
  notifications,
  parseScheduleOverrideNotification,
  scheduleOverrideLoadingId,
  onScheduleOverrideDecision,
  formatDisplayDate,
}: AlertsCardProps) {
  const notificationPreferences = useMemo(
    () => [
      {
        key: "notifyLateClockInReminders" as const,
        title:
          language === "es"
            ? "Recordatorios de empleados sin clock in"
            : "Late / Missing Clock-In Reminders",
        description:
          language === "es"
            ? "Avisos cuando un empleado no ha hecho clock in a tiempo."
            : "Alerts when an employee has not clocked in on time.",
      },
      {
        key: "notifyPunchActivity" as const,
        title:
          language === "es"
            ? "Actividad de clock in y clock out"
            : "Clock In / Clock Out Activity",
        description:
          language === "es"
            ? "Push de entradas, salidas, descansos y lunch."
            : "Pushes for in, out, break, and lunch punches.",
      },
      {
        key: "notifyNoBreakAlerts" as const,
        title:
          language === "es"
            ? "Alertas de empleados aun activos"
            : "Still Clocked-In / No-Break Alerts",
        description:
          language === "es"
            ? "Avisos cuando alguien sigue activo mucho tiempo sin descanso."
            : "Alerts when someone is still active too long without a break.",
      },
      {
        key: "notifyScheduleOverrides" as const,
        title:
          language === "es"
            ? "Solicitudes de horario"
            : "Schedule Override Requests",
        description:
          language === "es"
            ? "Solicitudes para trabajar fuera del horario asignado."
            : "Requests to work outside the assigned schedule.",
      },
      {
        key: "notifyTipSummaries" as const,
        title:
          language === "es"
            ? "Resumenes de propinas"
            : "7-Day Tip Summaries",
        description:
          language === "es"
            ? "Resumenes cuando se registran propinas."
            : "Summaries after tip entries are submitted.",
      },
      {
        key: "notifyDailySalesReminders" as const,
        title:
          language === "es"
            ? "Recordatorios de ventas diarias"
            : "Daily Sales Reminders",
        description:
          language === "es"
            ? "Avisos para capturar ventas diarias pendientes."
            : "Reminders to submit missing daily sales.",
      },
    ],
    [language],
  );
  const messageEmployees = useMemo(
    () =>
      activeMessageEmployees.map((employee, index) => {
        const name = employee.name?.trim();
        const email = employee.email?.trim();
        return {
          ...employee,
          label:
            name ||
            email ||
            (language === "es" ? `Empleado ${index + 1}` : `Employee ${index + 1}`),
        };
      }),
    [activeMessageEmployees, language],
  );

  return (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>Alerts</Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        {language === "es"
          ? "Los recordatorios push usan la zona horaria del tenant. Las opciones de abajo solo afectan este dispositivo."
          : "Reminder pushes use the tenant timezone on the server. The controls below only affect this device."}
      </Text>
      <View style={styles.tipCard}>
        <Text style={[styles.listName, isLight && styles.listNameLight]}>
          {language === "es" ? "Zona horaria del tenant" : "Tenant Timezone"}
        </Text>
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          {tenantTimeZone || (language === "es" ? "Cargando..." : "Loading...")}
        </Text>
        <Text style={[styles.listName, isLight && styles.listNameLight]}>
          {language === "es" ? "Zona horaria del dispositivo" : "This Device Timezone"}
        </Text>
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          {deviceTimeZone}
        </Text>
        {tenantTimeZone && tenantTimeZone !== deviceTimeZone ? (
          <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
            {language === "es"
              ? "Los horarios de recordatorio seguiran la zona del tenant hasta que la actualices."
              : "Reminder schedules will follow the tenant timezone until you update it."}
          </Text>
        ) : null}
        {canSyncTenantTimeZone &&
        tenantTimeZone &&
        tenantTimeZone !== deviceTimeZone ? (
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              isLight && styles.secondaryButtonLight,
              adminNotificationSaving && styles.inlineButtonDisabled,
            ]}
            onPress={onSyncTenantTimeZone}
            disabled={adminNotificationSaving}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                isLight && styles.secondaryButtonTextLight,
              ]}
            >
              {language === "es"
                ? "Usar zona de este dispositivo"
                : "Use This Device Timezone"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      <Text style={[styles.listName, isLight && styles.listNameLight]}>
        {language === "es" ? "Push de este dispositivo" : "This Device Push Delivery"}
      </Text>
      {!currentAdminPushDevice ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          {language === "es"
            ? "Inicia sesión en un dispositivo real y permite notificaciones para configurar estas alertas."
            : "Sign in on a physical device and allow notifications to configure these push alerts."}
        </Text>
      ) : (
        notificationPreferences.map((preference) => {
          const enabled = currentAdminPushDevice.notifications[preference.key];
          return (
            <View
              key={preference.key}
              style={styles.listRow}
            >
              <View style={styles.reportRowMain}>
                <Text style={[styles.listName, isLight && styles.listNameLight]}>
                  {preference.title}
                </Text>
                <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                  {preference.description}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.togglePill,
                  isLight && styles.togglePillLight,
                  enabled && styles.toggleActive,
                  enabled && isLight && styles.toggleActiveLight,
                  adminNotificationSaving && styles.inlineButtonDisabled,
                ]}
                disabled={adminNotificationSaving}
                onPress={() => onToggleNotificationPreference(preference.key)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    isLight && styles.toggleTextLight,
                    enabled && isLight && styles.toggleTextLightActive,
                  ]}
                >
                  {enabled
                    ? language === "es"
                      ? "Activo"
                      : "On"
                    : language === "es"
                      ? "Apagado"
                      : "Off"}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}
      {adminNotificationStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inlineOrNull(adminNotificationStatus)}
        </Text>
      )}
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      <Text style={[styles.listName, isLight && styles.listNameLight]}>
        Send Employee Message
      </Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        This message appears as a pop-up the next time the employee clocks in.
      </Text>
      {messageEmployees.length === 0 ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          {language === "es"
            ? "No hay empleados disponibles para alertas."
            : "No employees available for alerts."}
        </Text>
      ) : (
        <ScrollView
          style={styles.employeeMessageList}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.toggleRow}
        >
          {messageEmployees.map((employee) => {
            const isActive = employee.id === employeeMessageEmployeeId;
            return (
              <TouchableOpacity
                key={`message-employee-${employee.id}`}
                style={[
                  styles.togglePill,
                  styles.employeeMessagePill,
                  isLight && styles.togglePillLight,
                  isActive && styles.toggleActive,
                  isActive && isLight && styles.toggleActiveLight,
                ]}
                onPress={() => onEmployeeMessageEmployeeIdChange(employee.id)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    isLight && styles.toggleTextLight,
                    isActive && isLight && styles.toggleTextLightActive,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {employee.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      <Text style={[styles.label, isLight && styles.labelLight]}>Subject</Text>
      <TextInput
        value={employeeMessageSubject}
        onChangeText={onEmployeeMessageSubjectChange}
        style={[styles.input, isLight && styles.inputLight]}
        placeholder="Subject"
        placeholderTextColor={isLight ? "#94a3b8" : "#64748b"}
        maxLength={120}
      />
      <Text style={[styles.label, isLight && styles.labelLight]}>Message</Text>
      <TextInput
        value={employeeMessageBody}
        onChangeText={onEmployeeMessageBodyChange}
        style={[
          styles.input,
          styles.employeeMessageInput,
          isLight && styles.inputLight,
        ]}
        placeholder="Message for employee"
        placeholderTextColor={isLight ? "#94a3b8" : "#64748b"}
        multiline
        maxLength={2000}
      />
      <TouchableOpacity
        style={[
          styles.button,
          styles.primary,
          employeeMessageSending && styles.inlineButtonDisabled,
        ]}
        onPress={onSendEmployeeMessage}
        disabled={employeeMessageSending}
      >
        <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
          {employeeMessageSending
            ? inline("Sending...")
            : language === "es"
              ? "Enviar Mensaje al Empleado"
              : "Send Employee Message"}
        </Text>
      </TouchableOpacity>
      {employeeMessageStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inlineOrNull(employeeMessageStatus)}
        </Text>
      )}
      <TouchableOpacity
        style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
        onPress={onRefreshAlerts}
      >
        <Text
          style={[
            styles.secondaryButtonText,
            isLight && styles.secondaryButtonTextLight,
          ]}
        >
          Refresh Alerts
        </Text>
      </TouchableOpacity>
      {alertsStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inlineOrNull(alertsStatus)}
        </Text>
      )}
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      {notifications.length === 0 ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          No alerts yet.
        </Text>
      ) : (
        notifications.map((notice) => {
          const scheduleOverride = parseScheduleOverrideNotification(notice);
          const canApproveOverride = scheduleOverride?.status === "PENDING";
          const isBusy =
            Boolean(scheduleOverride?.requestId) &&
            scheduleOverrideLoadingId === scheduleOverride.requestId;

          return (
            <View key={notice.id} style={styles.listRow}>
              <View style={styles.reportRowMain}>
                <Text style={[styles.listName, isLight && styles.listNameLight]}>
                  {notice.message}
                </Text>
                <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                  {notice.employeeName ? `${notice.employeeName} • ` : ""}
                  {new Date(notice.createdAt).toLocaleString()}
                </Text>
                {scheduleOverride?.reasonMessage ? (
                  <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                    {scheduleOverride.reasonMessage}
                  </Text>
                ) : null}
                {scheduleOverride?.workDate ? (
                  <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                    {language === "es" ? "Fecha de trabajo:" : "Work date:"}{" "}
                    {formatDisplayDate(scheduleOverride.workDate)}
                  </Text>
                ) : null}
                {scheduleOverride?.status &&
                scheduleOverride.status !== "PENDING" ? (
                  <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                    {language === "es" ? "Estado:" : "Status:"}{" "}
                    {scheduleOverride.status}
                  </Text>
                ) : null}
                {canApproveOverride && scheduleOverride ? (
                  <View style={styles.rowActions}>
                    <TouchableOpacity
                      style={[
                        styles.secondaryButton,
                        styles.actionButtonCompact,
                        isLight && styles.secondaryButtonLight,
                        isBusy && styles.inlineButtonDisabled,
                      ]}
                      disabled={isBusy}
                      onPress={() =>
                        onScheduleOverrideDecision(scheduleOverride.requestId, true)
                      }
                    >
                      <Text
                        style={[
                          styles.secondaryButtonText,
                          isLight && styles.secondaryButtonTextLight,
                        ]}
                      >
                        {isBusy ? inline("Working...") : inline("Approve")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.secondaryButton,
                        styles.actionButtonCompact,
                        styles.secondaryButtonDanger,
                        isBusy && styles.inlineButtonDisabled,
                      ]}
                      disabled={isBusy}
                      onPress={() =>
                        onScheduleOverrideDecision(scheduleOverride.requestId, false)
                      }
                    >
                      <Text
                        style={[
                          styles.secondaryButtonText,
                          styles.secondaryButtonDangerText,
                        ]}
                      >
                        Reject
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}
