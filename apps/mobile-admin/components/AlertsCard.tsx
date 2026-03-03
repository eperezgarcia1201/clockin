import { useMemo } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { Lang } from "../copy";
import type { Employee, NotificationRow } from "../types";

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
  onRefreshAlerts: () => void;
  alertsStatus: string | null;
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
  notifications,
  parseScheduleOverrideNotification,
  scheduleOverrideLoadingId,
  onScheduleOverrideDecision,
  formatDisplayDate,
}: AlertsCardProps) {
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
        Push notifications include punches, schedule override requests, 6-hour
        no-break alerts, and 7-day tip summaries.
      </Text>
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
