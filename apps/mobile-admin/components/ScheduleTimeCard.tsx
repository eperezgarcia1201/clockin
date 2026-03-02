import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import { formatScheduleTimeLabel, parseScheduleTimeParts } from "../app-helpers";
import type { Meridiem, ScheduleDay, ScheduleTimeKey } from "../types";

type ScheduleTimeCardProps = {
  isLight: boolean;
  day: ScheduleDay;
  label: string;
  timeKey: ScheduleTimeKey;
  fallbackTime: string;
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

export function ScheduleTimeCard({
  isLight,
  day,
  label,
  timeKey,
  fallbackTime,
  onAdjustScheduleTime,
  onSetScheduleMeridiem,
}: ScheduleTimeCardProps) {
  const timeValue = day[timeKey] || fallbackTime;
  const parts = parseScheduleTimeParts(timeValue);

  return (
    <View
      style={[
        styles.scheduleTimeCard,
        isLight && styles.scheduleTimeCardLight,
        !day.enabled && styles.scheduleInputDisabled,
      ]}
    >
      <Text style={[styles.scheduleTimeLabel, isLight && styles.listMetaLight]}>{label}</Text>
      <Text style={[styles.scheduleTimeValue, isLight && styles.listNameLight]}>
        {formatScheduleTimeLabel(timeValue)}
      </Text>
      <View style={styles.scheduleControlRow}>
        <TouchableOpacity
          style={[styles.scheduleStepButton, isLight && styles.scheduleStepButtonLight]}
          disabled={!day.enabled}
          onPress={() => onAdjustScheduleTime(day.weekday, timeKey, "hour", -1)}
        >
          <Text style={[styles.scheduleStepButtonText, isLight && styles.scheduleStepButtonTextLight]}>
            -H
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.scheduleStepButton, isLight && styles.scheduleStepButtonLight]}
          disabled={!day.enabled}
          onPress={() => onAdjustScheduleTime(day.weekday, timeKey, "hour", 1)}
        >
          <Text style={[styles.scheduleStepButtonText, isLight && styles.scheduleStepButtonTextLight]}>
            +H
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.scheduleStepButton, isLight && styles.scheduleStepButtonLight]}
          disabled={!day.enabled}
          onPress={() => onAdjustScheduleTime(day.weekday, timeKey, "minute", -1)}
        >
          <Text style={[styles.scheduleStepButtonText, isLight && styles.scheduleStepButtonTextLight]}>
            -M
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.scheduleStepButton, isLight && styles.scheduleStepButtonLight]}
          disabled={!day.enabled}
          onPress={() => onAdjustScheduleTime(day.weekday, timeKey, "minute", 1)}
        >
          <Text style={[styles.scheduleStepButtonText, isLight && styles.scheduleStepButtonTextLight]}>
            +M
          </Text>
        </TouchableOpacity>
        <View style={styles.scheduleMeridiemGroup}>
          {(["AM", "PM"] as const).map((option) => (
            <TouchableOpacity
              key={`${timeKey}-${day.weekday}-${option}`}
              style={[
                styles.scheduleMeridiemButton,
                isLight && styles.scheduleMeridiemButtonLight,
                parts.meridiem === option && styles.scheduleMeridiemButtonActive,
                parts.meridiem === option && isLight && styles.scheduleMeridiemButtonActiveLight,
              ]}
              disabled={!day.enabled}
              onPress={() => onSetScheduleMeridiem(day.weekday, timeKey, option)}
            >
              <Text
                style={[
                  styles.scheduleMeridiemText,
                  isLight && styles.scheduleMeridiemTextLight,
                  parts.meridiem === option && styles.scheduleMeridiemTextActive,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}
