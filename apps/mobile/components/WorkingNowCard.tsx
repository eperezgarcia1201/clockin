import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import { i18n } from "../i18n";
import type { WorkingNowRow } from "../types";

type WorkingNowCardProps = {
  t: (typeof i18n)[keyof typeof i18n];
  selectedOfficeName: string | null;
  workingNowLoading: boolean;
  onRefreshWorkingNow: () => void;
  workingNowStatus: string | null;
  workingNowRows: WorkingNowRow[];
};

export function WorkingNowCard({
  t,
  selectedOfficeName,
  workingNowLoading,
  onRefreshWorkingNow,
  workingNowStatus,
  workingNowRows,
}: WorkingNowCardProps) {
  return (
    <View style={styles.teamCard}>
      <View style={styles.teamHeaderRow}>
        <View style={styles.teamHeaderMain}>
          <Text style={styles.teamTitle}>{t.workingNow}</Text>
          <Text style={styles.teamMeta}>{selectedOfficeName || t.allLocations}</Text>
        </View>
        <TouchableOpacity
          style={[styles.tenantSwitch, workingNowLoading && styles.teamRefreshDisabled]}
          onPress={onRefreshWorkingNow}
          disabled={workingNowLoading}
        >
          <Text style={styles.tenantSwitchText}>
            {workingNowLoading ? t.refreshing : t.refresh}
          </Text>
        </TouchableOpacity>
      </View>

      {workingNowStatus ? (
        <Text style={[styles.statusText, styles.teamStatusText]}>{workingNowStatus}</Text>
      ) : workingNowRows.length === 0 ? (
        <Text style={styles.teamEmptyText}>{t.noWorkingNow}</Text>
      ) : (
        workingNowRows.map((row) => (
          <View key={`working-now-${row.id}`} style={styles.teamRow}>
            <View style={styles.teamRowMain}>
              <Text style={styles.teamEmployeeName}>{row.name}</Text>
              <Text style={styles.teamEmployeeMeta}>
                {row.group || t.unassignedRole} • {row.office || t.allLocations}
              </Text>
            </View>
            <Text style={styles.teamShiftText}>{t.actions[row.status]}</Text>
          </View>
        ))
      )}
    </View>
  );
}
