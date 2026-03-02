import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import { i18n } from "../i18n";
import type { TodayScheduleResponse, TodayScheduleRow } from "../types";

type TodayRoleTab = {
  key: string;
  label: string;
};

type TodayTeamCardProps = {
  t: (typeof i18n)[keyof typeof i18n];
  todayScheduleLabel: string;
  todayScheduleLoading: boolean;
  onRefreshTodaySchedule: () => void;
  todayScheduleStatus: string | null;
  todayRoleTabs: TodayRoleTab[];
  activeTodayRoleFilter: string;
  onTodayRoleFilterChange: (value: string) => void;
  filteredTodayScheduleRows: TodayScheduleRow[];
  todaySchedule: TodayScheduleResponse | null;
  formatScheduleShiftLabel: (start: string, end: string) => string;
};

export function TodayTeamCard({
  t,
  todayScheduleLabel,
  todayScheduleLoading,
  onRefreshTodaySchedule,
  todayScheduleStatus,
  todayRoleTabs,
  activeTodayRoleFilter,
  onTodayRoleFilterChange,
  filteredTodayScheduleRows,
  todaySchedule,
  formatScheduleShiftLabel,
}: TodayTeamCardProps) {
  return (
    <View style={styles.teamCard}>
      <View style={styles.teamHeaderRow}>
        <View style={styles.teamHeaderMain}>
          <Text style={styles.teamTitle}>{t.todaysTeam}</Text>
          <Text style={styles.teamMeta}>{todayScheduleLabel}</Text>
        </View>
        <TouchableOpacity
          style={[styles.tenantSwitch, todayScheduleLoading && styles.teamRefreshDisabled]}
          onPress={onRefreshTodaySchedule}
          disabled={todayScheduleLoading}
        >
          <Text style={styles.tenantSwitchText}>
            {todayScheduleLoading ? t.refreshing : t.refresh}
          </Text>
        </TouchableOpacity>
      </View>

      {todayScheduleStatus ? (
        <Text style={[styles.statusText, styles.teamStatusText]}>{todayScheduleStatus}</Text>
      ) : (
        <>
          <View style={styles.teamRoleTabs}>
            {todayRoleTabs.map((tab) => {
              const isActive = activeTodayRoleFilter === tab.key;
              return (
                <TouchableOpacity
                  key={`today-role-${tab.key}`}
                  style={isActive ? styles.teamRoleTabActive : styles.teamRoleTab}
                  onPress={() => onTodayRoleFilterChange(tab.key)}
                >
                  <Text
                    style={isActive ? styles.teamRoleTabTextActive : styles.teamRoleTabText}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {filteredTodayScheduleRows.length === 0 ? (
            <Text style={styles.teamEmptyText}>
              {todaySchedule?.rows?.length ? t.noTeamForRole : t.noTeamToday}
            </Text>
          ) : (
            filteredTodayScheduleRows.map((row) => (
              <View key={`today-row-${row.employeeId}`} style={styles.teamRow}>
                <View style={styles.teamRowMain}>
                  <Text style={styles.teamEmployeeName}>{row.employeeName}</Text>
                  <Text style={styles.teamEmployeeMeta}>
                    {row.roleLabel || t.unassignedRole} • {row.officeName || t.allLocations}
                  </Text>
                </View>
                <Text style={styles.teamShiftText}>
                  {formatScheduleShiftLabel(row.startTime, row.endTime)}
                </Text>
              </View>
            ))
          )}
        </>
      )}
    </View>
  );
}
