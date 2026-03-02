import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import { i18n } from "../i18n";
import type { EmployeeWeekScheduleResponse } from "../types";

type WeekScheduleCardProps = {
  t: (typeof i18n)[keyof typeof i18n];
  weekSchedule: EmployeeWeekScheduleResponse | null;
  weekScheduleLoading: boolean;
  weekScheduleStatus: string | null;
  onRefreshWeekSchedule: () => void;
  formatScheduleShiftLabel: (start: string, end: string) => string;
};

export function WeekScheduleCard({
  t,
  weekSchedule,
  weekScheduleLoading,
  weekScheduleStatus,
  onRefreshWeekSchedule,
  formatScheduleShiftLabel,
}: WeekScheduleCardProps) {
  const days = weekSchedule?.days || [];

  return (
    <View style={styles.teamCard}>
      <View style={styles.teamHeaderRow}>
        <View style={styles.teamHeaderMain}>
          <Text style={styles.teamTitle}>{t.weekSchedule}</Text>
          <Text style={styles.teamMeta}>
            {weekSchedule?.employeeName || t.noWeekScheduleConfigured}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.tenantSwitch, weekScheduleLoading && styles.teamRefreshDisabled]}
          onPress={onRefreshWeekSchedule}
          disabled={weekScheduleLoading}
        >
          <Text style={styles.tenantSwitchText}>
            {weekScheduleLoading ? t.refreshing : t.refresh}
          </Text>
        </TouchableOpacity>
      </View>

      {weekScheduleStatus ? (
        <Text style={[styles.statusText, styles.teamStatusText]}>{weekScheduleStatus}</Text>
      ) : days.length === 0 ? (
        <Text style={styles.teamEmptyText}>{t.noWeekScheduleConfigured}</Text>
      ) : (
        days.map((day) => (
          <View key={`week-schedule-day-${day.weekday}`} style={styles.teamRow}>
            <View style={styles.teamRowMain}>
              <Text style={styles.teamEmployeeName}>{day.label}</Text>
            </View>
            <Text style={styles.teamShiftText}>
              {day.enabled
                ? formatScheduleShiftLabel(day.startTime, day.endTime)
                : t.notScheduled}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}
