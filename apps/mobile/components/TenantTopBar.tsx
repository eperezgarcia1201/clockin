import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { Language } from "../i18n";

type TenantTopBarProps = {
  tenantLabel: string;
  tenantName: string;
  locationLabel: string;
  locationName?: string | null;
  showLocationMeta?: boolean;
  showLocationToggle?: boolean;
  locationToggleLabel?: string;
  onLocationToggle?: () => void;
  languageLabel: string;
  language: Language;
  onToggleLanguage: () => void;
  logoutTenantLabel?: string;
  onLogoutTenant?: (() => void) | null;
};

export function TenantTopBar({
  tenantLabel,
  tenantName,
  locationLabel,
  locationName,
  showLocationMeta = false,
  showLocationToggle = false,
  locationToggleLabel,
  onLocationToggle,
  languageLabel,
  language,
  onToggleLanguage,
  logoutTenantLabel,
  onLogoutTenant,
}: TenantTopBarProps) {
  return (
    <View style={styles.tenantBar}>
      <View style={styles.tenantBarInfoStack}>
        <View style={styles.tenantMetaRow}>
          <Text style={styles.tenantMetaLabel}>{tenantLabel}</Text>
          <Text style={styles.tenantNameValue} numberOfLines={1}>
            {tenantName}
          </Text>
        </View>
        {showLocationMeta && locationName ? (
          <View style={styles.tenantMetaRow}>
            <Text style={styles.tenantMetaLabel}>{locationLabel}</Text>
            <Text style={styles.tenantLocationValue} numberOfLines={2}>
              {locationName}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.tenantBarActions}>
        {showLocationToggle && onLocationToggle && locationToggleLabel ? (
          <TouchableOpacity style={styles.tenantHeaderAction} onPress={onLocationToggle}>
            <Text style={styles.tenantHeaderActionText}>{locationToggleLabel}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.tenantHeaderAction} onPress={onToggleLanguage}>
          <Text style={styles.tenantHeaderActionText}>
            {languageLabel}: {language.toUpperCase()}
          </Text>
        </TouchableOpacity>
        {logoutTenantLabel && onLogoutTenant ? (
          <TouchableOpacity
            style={[styles.tenantHeaderAction, styles.tenantHeaderActionDanger]}
            onPress={onLogoutTenant}
          >
            <Text style={styles.tenantHeaderActionText}>{logoutTenantLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
