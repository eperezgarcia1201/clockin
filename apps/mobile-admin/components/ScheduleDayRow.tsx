import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { Meridiem, ScheduleDay, ScheduleTimeKey } from "../types";
import { ScheduleTimeCard } from "./ScheduleTimeCard";

type ScheduleDayRowProps = {
  isLight: boolean;
  day: ScheduleDay;
  onUpdateScheduleDay: (
    weekday: number,
    key: keyof ScheduleDay,
    value: string | boolean,
  ) => void;
  onAdjustScheduleTime: (
    weekday: number,
    key: ScheduleTimeKey,
    part: "hour" | "minute" | "meridiem",
    direction: 1 | -1,
  ) => void;
  onSetScheduleMeridiem: (
    weekday: number,
    key: ScheduleTimeKey,
    meridiem: Meridiem,
  ) => void;
};

export function ScheduleDayRow({
  isLight,
  day,
  onUpdateScheduleDay,
  onAdjustScheduleTime,
  onSetScheduleMeridiem,
}: ScheduleDayRowProps) {
  return (
    <View style={styles.scheduleRow}>
      <TouchableOpacity
        style={[
          styles.scheduleToggle,
          isLight && styles.scheduleToggleLight,
          day.enabled && styles.scheduleToggleActive,
        ]}
        onPress={() => onUpdateScheduleDay(day.weekday, "enabled", !day.enabled)}
      >
        <Text
          style={[
            styles.scheduleToggleText,
            isLight && styles.scheduleToggleTextLight,
            day.enabled && styles.scheduleToggleTextActive,
          ]}
        >
          {day.label}
        </Text>
      </TouchableOpacity>
      <View style={styles.scheduleTimes}>
        <ScheduleTimeCard
          isLight={isLight}
          day={day}
          label="Start"
          timeKey="startTime"
          fallbackTime="09:00"
          onAdjustScheduleTime={onAdjustScheduleTime}
          onSetScheduleMeridiem={onSetScheduleMeridiem}
        />
        <ScheduleTimeCard
          isLight={isLight}
          day={day}
          label="End"
          timeKey="endTime"
          fallbackTime="17:00"
          onAdjustScheduleTime={onAdjustScheduleTime}
          onSetScheduleMeridiem={onSetScheduleMeridiem}
        />
      </View>
    </View>
  );
}
