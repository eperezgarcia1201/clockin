import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import { formatScheduleShiftLabel } from "../app-helpers";
import type { SchedulesCardProps } from "./SchedulesCard.types";

export function ScheduleTodayTeamSection({
  isLight,
  language,
  todayScheduleLabel,
  todayScheduleLoading,
  onRefreshTodaySchedule,
  inline,
  todayScheduleStatus,
  inlineOrNull,
  todayRoleTabs,
  activeTodayRoleFilter,
  onTodayRoleFilterChange,
  filteredTodayScheduleRows,
}: SchedulesCardProps) {
  return (
    <View style={[styles.scheduleTodayCard, isLight && styles.scheduleTodayCardLight]}>
      <View style={styles.scheduleTodayHeader}>
        <View style={styles.scheduleTodayTitleWrap}>
          <Text style={[styles.scheduleTodayTitle, isLight && styles.scheduleTodayTitleLight]}>
            Today's Team
          </Text>
          <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
            {todayScheduleLabel}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.secondaryButton,
            isLight && styles.secondaryButtonLight,
            styles.actionButtonCompact,
            todayScheduleLoading && styles.inlineButtonDisabled,
          ]}
          onPress={onRefreshTodaySchedule}
          disabled={todayScheduleLoading}
        >
          <Text style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}>
            {todayScheduleLoading
              ? inline("Refreshing...")
              : language === "es"
                ? "Actualizar"
                : "Refresh"}
          </Text>
        </TouchableOpacity>
      </View>

      {todayScheduleStatus ? (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inlineOrNull(todayScheduleStatus)}
        </Text>
      ) : (
        <>
          <View style={[styles.toggleRow, styles.scheduleRoleTabs]}>
            {todayRoleTabs.map((role) => (
              <TouchableOpacity
                key={`schedule-role-${role}`}
                style={[
                  styles.togglePill,
                  isLight && styles.togglePillLight,
                  activeTodayRoleFilter === role && styles.toggleActive,
                  activeTodayRoleFilter === role && isLight && styles.toggleActiveLight,
                ]}
                onPress={() => onTodayRoleFilterChange(role)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    isLight && styles.toggleTextLight,
                    activeTodayRoleFilter === role && isLight && styles.toggleTextLightActive,
                  ]}
                >
                  {role}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {filteredTodayScheduleRows.length === 0 ? (
            <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
              No employees are scheduled for this role today.
            </Text>
          ) : (
            filteredTodayScheduleRows.map((row) => (
              <View
                key={`today-${row.employeeId}`}
                style={[styles.scheduleTodayRow, isLight && styles.scheduleTodayRowLight]}
              >
                <View style={styles.scheduleTodayRowMain}>
                  <Text style={[styles.listName, isLight && styles.listNameLight]}>
                    {row.employeeName}
                  </Text>
                  <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                    {row.roleLabel} • {row.officeName || "All locations"}
                  </Text>
                </View>
                <Text style={[styles.scheduleTodayShift, isLight && styles.scheduleTodayShiftLight]}>
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
