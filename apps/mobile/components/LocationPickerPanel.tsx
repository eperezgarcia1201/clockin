import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { TenantOffice } from "../types";

type LocationPickerPanelProps = {
  tenantOffices: TenantOffice[];
  selectedOfficeId: string | null;
  onSelectOffice: (officeId: string) => void;
  locationStatus: string | null;
};

export function LocationPickerPanel({
  tenantOffices,
  selectedOfficeId,
  onSelectOffice,
  locationStatus,
}: LocationPickerPanelProps) {
  return (
    <View style={styles.locationPickerPanel}>
      {tenantOffices.map((office) => {
        const isActive = office.id === selectedOfficeId;
        return (
          <TouchableOpacity
            key={office.id}
            style={isActive ? styles.locationOptionActive : styles.locationOption}
            onPress={() => onSelectOffice(office.id)}
          >
            <Text style={isActive ? styles.locationOptionTextActive : styles.locationOptionText}>
              {office.name}
            </Text>
          </TouchableOpacity>
        );
      })}
      {locationStatus ? (
        <Text style={[styles.statusText, styles.locationStatus]}>{locationStatus}</Text>
      ) : null}
    </View>
  );
}
