import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { Lang } from "../copy";
import type { Employee } from "../types";

type UsersListSectionProps = {
  isLight: boolean;
  language: Lang;
  employees: Employee[];
  employeePunchStatus: Map<string, string>;
  inline: (value: string) => string;
  onLoadUserForEdit: (employeeId: string) => void;
  onSetUserDisabled: (employeeId: string, currentlyActive: boolean) => void;
  punchLoadingId: string | null;
  onForcePunchOut: (employeeId: string) => void;
};

export function UsersListSection({
  isLight,
  language,
  employees,
  employeePunchStatus,
  inline,
  onLoadUserForEdit,
  onSetUserDisabled,
  punchLoadingId,
  onForcePunchOut,
}: UsersListSectionProps) {
  return (
    <>
      <Text
        style={[
          styles.cardTitle,
          { marginTop: 18 },
          isLight && styles.cardTitleLight,
        ]}
      >
        Users
      </Text>
      <ScrollView
        style={styles.userList}
        contentContainerStyle={styles.userListContent}
        nestedScrollEnabled
      >
        {employees.map((employee) => {
          const currentPunchStatus = employeePunchStatus.get(employee.id) || "OUT";
          const canClockOut = ["IN", "BREAK", "LUNCH"].includes(currentPunchStatus);

          return (
            <View key={employee.id} style={[styles.listRow, styles.userListRow]}>
              <View style={styles.userListMain}>
                <Text style={[styles.listName, isLight && styles.listNameLight]}>
                  {employee.name}
                </Text>
                <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                  {employee.email || (language === "es" ? "Sin correo" : "No email")} •{" "}
                  {inline(employee.active ? "Active" : "Disabled")} •{" "}
                  {language === "es" ? "Marcación:" : "Punch:"} {currentPunchStatus}
                </Text>
                {employee.isManager && (
                  <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                    {language === "es" ? "Manager Owner:" : "Manager Owner:"}{" "}
                    {employee.isOwnerManager ? inline("Yes") : "No"}
                  </Text>
                )}
              </View>
              <View style={[styles.rowActions, styles.userRowActions]}>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    isLight && styles.secondaryButtonLight,
                    styles.actionButtonCompact,
                  ]}
                  onPress={() => onLoadUserForEdit(employee.id)}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      isLight && styles.secondaryButtonTextLight,
                    ]}
                  >
                    Edit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    isLight && styles.secondaryButtonLight,
                    styles.actionButtonCompact,
                    employee.active && styles.secondaryButtonDanger,
                  ]}
                  onPress={() => onSetUserDisabled(employee.id, employee.active)}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      isLight && styles.secondaryButtonTextLight,
                      employee.active && styles.secondaryButtonDangerText,
                    ]}
                  >
                    {inline(employee.active ? "Disable" : "Enable")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    isLight && styles.secondaryButtonLight,
                    styles.actionButtonCompact,
                    canClockOut && styles.secondaryButtonDanger,
                    (punchLoadingId === employee.id || !canClockOut) &&
                      styles.inlineButtonDisabled,
                  ]}
                  onPress={() => onForcePunchOut(employee.id)}
                  disabled={punchLoadingId === employee.id || !canClockOut}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      isLight && styles.secondaryButtonTextLight,
                      canClockOut && styles.secondaryButtonDangerText,
                    ]}
                  >
                    {punchLoadingId === employee.id
                      ? inline("Working...")
                      : canClockOut
                        ? inline("Clock Out")
                        : language === "es"
                          ? "Sin entrada activa"
                          : "Not Clocked In"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </>
  );
}
