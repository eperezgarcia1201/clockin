import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { SchedulesCardProps } from "./SchedulesCard.types";

export function ScheduleEmployeePickerSection({
  isLight,
  selectedScheduleEmployee,
  scheduleEmployeePickerOpen,
  employees,
  onToggleScheduleEmployeePicker,
  scheduleEmployeeSearch,
  onScheduleEmployeeSearchChange,
  filteredScheduleEmployees,
  scheduleEmployeeId,
  onSelectScheduleEmployee,
}: SchedulesCardProps) {
  return (
    <>
      <Text style={[styles.label, isLight && styles.labelLight]}>Employee</Text>
      <TouchableOpacity
        style={[styles.scheduleEmployeePicker, isLight && styles.scheduleEmployeePickerLight]}
        disabled={employees.length === 0}
        onPress={onToggleScheduleEmployeePicker}
      >
        <Text style={[styles.scheduleEmployeePickerText, isLight && styles.scheduleEmployeePickerTextLight]}>
          {selectedScheduleEmployee?.name || "Select employee"}
        </Text>
        <Text
          style={[styles.scheduleEmployeePickerArrow, isLight && styles.scheduleEmployeePickerTextLight]}
        >
          {scheduleEmployeePickerOpen ? "▲" : "▼"}
        </Text>
      </TouchableOpacity>

      {scheduleEmployeePickerOpen && (
        <View style={[styles.scheduleEmployeeMenu, isLight && styles.scheduleEmployeeMenuLight]}>
          <TextInput
            style={[
              styles.scheduleEmployeeSearchInput,
              isLight && styles.scheduleEmployeeSearchInputLight,
            ]}
            placeholder="Search employee..."
            placeholderTextColor={isLight ? "#64748b" : "#94a3b8"}
            value={scheduleEmployeeSearch}
            onChangeText={onScheduleEmployeeSearchChange}
          />
          <ScrollView
            style={styles.scheduleEmployeeList}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {filteredScheduleEmployees.length === 0 ? (
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                No employees found.
              </Text>
            ) : (
              filteredScheduleEmployees.map((employee) => (
                <TouchableOpacity
                  key={employee.id}
                  style={[
                    styles.scheduleEmployeeItem,
                    isLight && styles.scheduleEmployeeItemLight,
                    scheduleEmployeeId === employee.id && styles.scheduleEmployeeItemActive,
                    scheduleEmployeeId === employee.id && isLight && styles.scheduleEmployeeItemActiveLight,
                  ]}
                  onPress={() => onSelectScheduleEmployee(employee.id)}
                >
                  <Text
                    style={[
                      styles.scheduleEmployeeItemText,
                      isLight && styles.scheduleEmployeeItemTextLight,
                      scheduleEmployeeId === employee.id && styles.scheduleEmployeeItemTextActive,
                    ]}
                  >
                    {employee.name}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </>
  );
}
