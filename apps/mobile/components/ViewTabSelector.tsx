import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import { i18n } from "../i18n";
import type { EmployeeViewTab } from "../types";

type ViewTabSelectorProps = {
  t: (typeof i18n)[keyof typeof i18n];
  activeViewTab: EmployeeViewTab;
  showWeekScheduleTab: boolean;
  showCompanyOrdersTab: boolean;
  onViewTabChange: (tab: EmployeeViewTab) => void;
};

export function ViewTabSelector({
  t,
  activeViewTab,
  showWeekScheduleTab,
  showCompanyOrdersTab,
  onViewTabChange,
}: ViewTabSelectorProps) {
  return (
    <View style={styles.viewTabRow}>
      <TouchableOpacity
        style={activeViewTab === "clock" ? styles.viewTabButtonActive : styles.viewTabButton}
        onPress={() => onViewTabChange("clock")}
      >
        <Text style={activeViewTab === "clock" ? styles.viewTabTextActive : styles.viewTabText}>
          {t.clockStation}
        </Text>
      </TouchableOpacity>
      {showWeekScheduleTab ? (
        <TouchableOpacity
          style={
            activeViewTab === "weekSchedule"
              ? styles.viewTabButtonActive
              : styles.viewTabButton
          }
          onPress={() => onViewTabChange("weekSchedule")}
        >
          <Text
            style={
              activeViewTab === "weekSchedule" ? styles.viewTabTextActive : styles.viewTabText
            }
          >
            {t.weekSchedule}
          </Text>
        </TouchableOpacity>
      ) : null}
      {showCompanyOrdersTab ? (
        <TouchableOpacity
          style={
            activeViewTab === "companyOrders"
              ? styles.viewTabButtonActive
              : styles.viewTabButton
          }
          onPress={() => onViewTabChange("companyOrders")}
        >
          <Text
            style={
              activeViewTab === "companyOrders" ? styles.viewTabTextActive : styles.viewTabText
            }
          >
            {t.companyOrders}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
