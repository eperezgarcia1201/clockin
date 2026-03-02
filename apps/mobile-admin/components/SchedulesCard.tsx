import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import { ScheduleDaysEditorSection } from "./ScheduleDaysEditorSection";
import { ScheduleEmployeePickerSection } from "./ScheduleEmployeePickerSection";
import { ScheduleTodayTeamSection } from "./ScheduleTodayTeamSection";
import type { SchedulesCardProps } from "./SchedulesCard.types";

export function SchedulesCard(props: SchedulesCardProps) {
  const { isLight, language, selectedScheduleEmployee, inlineOrNull, scheduleStatus, onSaveSchedule } =
    props;

  return (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>Schedules</Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        Schedule for {selectedScheduleEmployee?.name || "employee"}
      </Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        Enable days an employee is allowed to clock in. Optional start/end times can restrict
        clock-ins to a window.
      </Text>

      <ScheduleTodayTeamSection {...props} />
      <ScheduleEmployeePickerSection {...props} />
      <ScheduleDaysEditorSection {...props} />

      {scheduleStatus ? (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inlineOrNull(scheduleStatus)}
        </Text>
      ) : null}

      <TouchableOpacity style={[styles.button, styles.primary]} onPress={onSaveSchedule}>
        <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
          {language === "es" ? "Guardar Horario" : "Save Schedule"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
