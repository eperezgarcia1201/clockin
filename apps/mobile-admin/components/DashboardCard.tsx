import { LinearGradient } from "expo-linear-gradient";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { Lang } from "../copy";
import type { Summary } from "../types";
import { DashboardManagerShift } from "./DashboardManagerShift";
import { DashboardPendingApprovals } from "./DashboardPendingApprovals";

type ActiveNowRow = {
  id: string;
  name: string;
  status: string;
};

type PendingScheduleOverride = {
  requestId: string;
  employeeName: string;
  message: string;
  reasonMessage: string;
  attemptedAt: string;
  workDate: string;
};

type DashboardCardProps = {
  isLight: boolean;
  summary: Summary;
  dataSyncError: string | null;
  sessionManagerEmployeeId: string | null;
  managerDisplayName: string;
  managerClockExempt: boolean;
  language: Lang;
  managerCurrentPunchStatus: string;
  managerPin: string;
  onManagerPinChange: (value: string) => void;
  managerCanClockOut: boolean;
  managerPunchLoading: boolean;
  onManagerSelfPunch: () => void;
  inline: (value: string) => string;
  managerActionLabel: string;
  managerPendingTipWorkDate: string | null;
  managerCashTips: string;
  onManagerCashTipsChange: (value: string) => void;
  managerCreditCardTips: string;
  onManagerCreditCardTipsChange: (value: string) => void;
  managerTipSaving: boolean;
  onSubmitManagerPendingTips: () => void;
  managerPunchStatus: string | null;
  inlineOrNull: (value: string | null | undefined) => string | null;
  activeNow: ActiveNowRow[];
  punchLoadingId: string | null;
  onForcePunch: (employeeId: string, actionType: "IN" | "OUT") => void;
  pendingScheduleOverrides: PendingScheduleOverride[];
  scheduleOverrideLoadingId: string | null;
  onScheduleOverrideDecision: (requestId: string, approved: boolean) => void;
  formatDisplayDate: (value: string) => string;
  punchStatus: string | null;
};

export function DashboardCard({
  isLight,
  summary,
  dataSyncError,
  sessionManagerEmployeeId,
  managerDisplayName,
  managerClockExempt,
  language,
  managerCurrentPunchStatus,
  managerPin,
  onManagerPinChange,
  managerCanClockOut,
  managerPunchLoading,
  onManagerSelfPunch,
  inline,
  managerActionLabel,
  managerPendingTipWorkDate,
  managerCashTips,
  onManagerCashTipsChange,
  managerCreditCardTips,
  onManagerCreditCardTipsChange,
  managerTipSaving,
  onSubmitManagerPendingTips,
  managerPunchStatus,
  inlineOrNull,
  activeNow,
  punchLoadingId,
  onForcePunch,
  pendingScheduleOverrides,
  scheduleOverrideLoadingId,
  onScheduleOverrideDecision,
  formatDisplayDate,
  punchStatus,
}: DashboardCardProps) {
  return (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
        Admin Overview
      </Text>
      <View style={styles.summaryGrid}>
        <LinearGradient
          colors={isLight ? ["#eef2ff", "#e0e7ff"] : ["#2b3550", "#1e2a44"]}
          style={[styles.summaryTile, isLight && styles.summaryTileLight]}
        >
          <View style={styles.summaryHeader}>
            <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
              TOTAL USERS
            </Text>
            <View style={[styles.summaryIcon, styles.summaryIconUsers]} />
          </View>
          <Text style={[styles.summaryValue, isLight && styles.summaryValueLight]}>
            {summary.total}
          </Text>
        </LinearGradient>
        <LinearGradient
          colors={isLight ? ["#f3f4f6", "#e5e7eb"] : ["#3a3340", "#2a2434"]}
          style={[styles.summaryTile, isLight && styles.summaryTileLight]}
        >
          <View style={styles.summaryHeader}>
            <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
              SYS ADMINS
            </Text>
            <View style={[styles.summaryIcon, styles.summaryIconShield]} />
          </View>
          <Text style={[styles.summaryValue, isLight && styles.summaryValueLight]}>
            {summary.admins}
          </Text>
        </LinearGradient>
        <LinearGradient
          colors={isLight ? ["#e8f5f2", "#d7efe8"] : ["#2a3f45", "#20323a"]}
          style={[styles.summaryTile, isLight && styles.summaryTileLight]}
        >
          <View style={styles.summaryHeader}>
            <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
              TIME ADMINS
            </Text>
            <View style={[styles.summaryIcon, styles.summaryIconTime]} />
          </View>
          <Text style={[styles.summaryValue, isLight && styles.summaryValueLight]}>
            {summary.timeAdmins}
          </Text>
        </LinearGradient>
        <LinearGradient
          colors={isLight ? ["#f7f2ff", "#ede9fe"] : ["#3d364a", "#2c2636"]}
          style={[styles.summaryTile, isLight && styles.summaryTileLight]}
        >
          <View style={styles.summaryHeader}>
            <Text style={[styles.summaryLabel, isLight && styles.summaryLabelLight]}>
              REPORTS
            </Text>
            <View style={[styles.summaryIcon, styles.summaryIconReports]} />
          </View>
          <Text style={[styles.summaryValue, isLight && styles.summaryValueLight]}>
            {summary.reports}
          </Text>
        </LinearGradient>
      </View>
      {dataSyncError ? (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          API sync: {dataSyncError}
        </Text>
      ) : null}
      <DashboardManagerShift
        isLight={isLight}
        sessionManagerEmployeeId={sessionManagerEmployeeId}
        managerDisplayName={managerDisplayName}
        managerClockExempt={managerClockExempt}
        language={language}
        managerCurrentPunchStatus={managerCurrentPunchStatus}
        managerPin={managerPin}
        onManagerPinChange={onManagerPinChange}
        managerCanClockOut={managerCanClockOut}
        managerPunchLoading={managerPunchLoading}
        onManagerSelfPunch={onManagerSelfPunch}
        inline={inline}
        managerActionLabel={managerActionLabel}
        managerPendingTipWorkDate={managerPendingTipWorkDate}
        managerCashTips={managerCashTips}
        onManagerCashTipsChange={onManagerCashTipsChange}
        managerCreditCardTips={managerCreditCardTips}
        onManagerCreditCardTipsChange={onManagerCreditCardTipsChange}
        managerTipSaving={managerTipSaving}
        onSubmitManagerPendingTips={onSubmitManagerPendingTips}
        managerPunchStatus={managerPunchStatus}
        inlineOrNull={inlineOrNull}
      />
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
        Working Now
      </Text>
      {activeNow.length === 0 ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          No active employees.
        </Text>
      ) : (
        activeNow.map((row) => {
          const status = row.status.toUpperCase();
          const isActive = ["IN", "BREAK", "LUNCH"].includes(status);
          const actionLabel = isActive ? "Clock Out" : "Clock In";
          const actionType: "IN" | "OUT" = isActive ? "OUT" : "IN";
          return (
            <View
              key={row.id}
              style={[styles.workingCard, isLight && styles.workingCardLight]}
            >
              <View style={styles.workingRow}>
                <View style={styles.workingLeft}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {row.name
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.listName, isLight && styles.listNameLight]}>
                    {row.name}
                  </Text>
                </View>
                <View style={styles.listActions}>
                  <View style={[styles.statusPill, !isActive && styles.statusPillOut]}>
                    <View style={[styles.statusDot, !isActive && styles.statusDotOut]} />
                    <Text
                      style={[styles.statusPillText, !isActive && styles.statusPillTextOut]}
                    >
                      {status}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      isActive ? styles.inlineButton : styles.inlineButtonIn,
                      isLight &&
                        (isActive
                          ? styles.inlineButtonLight
                          : styles.inlineButtonInLight),
                      punchLoadingId === row.id && styles.inlineButtonDisabled,
                    ]}
                    onPress={() => onForcePunch(row.id, actionType)}
                    disabled={punchLoadingId === row.id}
                  >
                    <Text
                      style={[
                        isActive ? styles.inlineButtonText : styles.inlineButtonTextIn,
                        isLight &&
                          (isActive
                            ? styles.inlineButtonTextLight
                            : styles.inlineButtonTextInLight),
                      ]}
                    >
                      {punchLoadingId === row.id
                        ? inline("Working...")
                        : inline(actionLabel)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })
      )}
      <DashboardPendingApprovals
        isLight={isLight}
        language={language}
        pendingScheduleOverrides={pendingScheduleOverrides}
        scheduleOverrideLoadingId={scheduleOverrideLoadingId}
        onScheduleOverrideDecision={onScheduleOverrideDecision}
        formatDisplayDate={formatDisplayDate}
        inline={inline}
      />
      {punchStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inlineOrNull(punchStatus)}
        </Text>
      )}
      {dataSyncError && (
        <Text
          style={[
            styles.statusText,
            { color: isLight ? "#b91c1c" : "#fca5a5" },
          ]}
        >
          API sync: {dataSyncError}
        </Text>
      )}
      <Text style={[styles.footerNote, isLight && styles.footerNoteLight]}>
        Powered by Websys Workforce
      </Text>
    </View>
  );
}
