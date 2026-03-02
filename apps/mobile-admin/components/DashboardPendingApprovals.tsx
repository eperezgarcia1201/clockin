import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { Lang } from "../copy";

type PendingScheduleOverride = {
  requestId: string;
  employeeName: string;
  message: string;
  reasonMessage: string;
  attemptedAt: string;
  workDate: string;
};

type DashboardPendingApprovalsProps = {
  isLight: boolean;
  language: Lang;
  pendingScheduleOverrides: PendingScheduleOverride[];
  scheduleOverrideLoadingId: string | null;
  onScheduleOverrideDecision: (requestId: string, approved: boolean) => void;
  formatDisplayDate: (value: string) => string;
  inline: (value: string) => string;
};

export function DashboardPendingApprovals({
  isLight,
  language,
  pendingScheduleOverrides,
  scheduleOverrideLoadingId,
  onScheduleOverrideDecision,
  formatDisplayDate,
  inline,
}: DashboardPendingApprovalsProps) {
  return (
    <>
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
        {language === "es" ? "Aprobaciones Pendientes de Entrada" : "Pending Clock-In Approvals"}
      </Text>
      {pendingScheduleOverrides.length === 0 ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          {language === "es" ? "No hay solicitudes pendientes de aprobación." : "No pending approval requests."}
        </Text>
      ) : (
        pendingScheduleOverrides.map((request) => {
          const isBusy = scheduleOverrideLoadingId === request.requestId;
          return (
            <View key={request.requestId} style={[styles.workingCard, isLight && styles.workingCardLight]}>
              <View style={styles.reportRowMain}>
                <Text style={[styles.listName, isLight && styles.listNameLight]}>{request.employeeName}</Text>
                <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>{request.message}</Text>
                {request.reasonMessage ? (
                  <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>{request.reasonMessage}</Text>
                ) : null}
                {request.workDate ? (
                  <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                    {language === "es" ? "Fecha de trabajo:" : "Work date:"} {formatDisplayDate(request.workDate)}
                  </Text>
                ) : null}
                {request.attemptedAt ? (
                  <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                    {language === "es" ? "Intento:" : "Attempted:"} {new Date(request.attemptedAt).toLocaleString()}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.rowActions, { marginTop: 10 }]}>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    styles.actionButtonCompact,
                    isLight && styles.secondaryButtonLight,
                    isBusy && styles.inlineButtonDisabled,
                  ]}
                  disabled={isBusy}
                  onPress={() => onScheduleOverrideDecision(request.requestId, true)}
                >
                  <Text style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}>
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
                  onPress={() => onScheduleOverrideDecision(request.requestId, false)}
                >
                  <Text style={[styles.secondaryButtonText, styles.secondaryButtonDangerText]}>
                    {language === "es" ? "Rechazar" : "Reject"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </>
  );
}
