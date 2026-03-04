import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { Language } from "../i18n";
import type { TenantContext, TenantOffice } from "../types";
import { TenantTopBar } from "./TenantTopBar";

type TerminalCopy = {
  loading: string;
  checkingSavedTenant: string;
  welcome: string;
  enterTenantBeforeClockIn: string;
  tenantName: string;
  continue: string;
  checking: string;
  tenant: string;
  location: string;
  language: string;
  loadingLocations: string;
  chooseLocation: string;
  selectLocationBeforeClockIn: string;
};

type TerminalEntryScreensProps = {
  t: TerminalCopy;
  tenantHydrated: boolean;
  tenant: TenantContext | null;
  tenantInput: string;
  onTenantInputChange: (value: string) => void;
  tenantStatus: string | null;
  resolvingTenant: boolean;
  onConfigureTenant: () => void;
  loadingLocations: boolean;
  language: Language;
  onToggleLanguage: () => void;
  requiresLocationSelection: boolean;
  selectedOfficeId: string | null;
  tenantOffices: TenantOffice[];
  onSelectLocation: (officeId: string) => void;
  locationStatus: string | null;
};

export function TerminalEntryScreens({
  t,
  tenantHydrated,
  tenant,
  tenantInput,
  onTenantInputChange,
  tenantStatus,
  resolvingTenant,
  onConfigureTenant,
  loadingLocations,
  language,
  onToggleLanguage,
  requiresLocationSelection,
  selectedOfficeId,
  tenantOffices,
  onSelectLocation,
  locationStatus,
}: TerminalEntryScreensProps) {
  if (!tenantHydrated) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.loading}</Text>
        <Text style={styles.subtitleDark}>{t.checkingSavedTenant}</Text>
      </View>
    );
  }

  if (!tenant) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.welcome}</Text>
        <Text style={styles.subtitleDark}>{t.enterTenantBeforeClockIn}</Text>

        <Text style={styles.label}>{t.tenantName}</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. clockin-demo"
          placeholderTextColor="rgba(31, 26, 22, 0.35)"
          value={tenantInput}
          onChangeText={onTenantInputChange}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {tenantStatus && <Text style={styles.statusText}>{tenantStatus}</Text>}

        <TouchableOpacity
          style={[styles.button, styles.primary]}
          onPress={onConfigureTenant}
          disabled={resolvingTenant}
        >
          <Text style={styles.primaryText}>
            {resolvingTenant ? t.checking : t.continue}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loadingLocations) {
    return (
      <>
        <TenantTopBar
          tenantLabel={t.tenant}
          tenantName={tenant.name}
          locationLabel={t.location}
          languageLabel={t.language}
          language={language}
          onToggleLanguage={onToggleLanguage}
        />
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.loadingLocations}</Text>
        </View>
      </>
    );
  }

  if (requiresLocationSelection && !selectedOfficeId) {
    return (
      <>
        <TenantTopBar
          tenantLabel={t.tenant}
          tenantName={tenant.name}
          locationLabel={t.location}
          languageLabel={t.language}
          language={language}
          onToggleLanguage={onToggleLanguage}
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.chooseLocation}</Text>
          <Text style={styles.subtitleDark}>
            {t.selectLocationBeforeClockIn}
          </Text>

          <Text style={styles.label}>{t.location}</Text>
          <View style={styles.locationList}>
            {tenantOffices.map((office) => (
              <TouchableOpacity
                key={office.id}
                style={styles.locationOption}
                onPress={() => onSelectLocation(office.id)}
              >
                <Text style={styles.locationOptionText}>{office.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {locationStatus && (
            <Text style={styles.statusText}>{locationStatus}</Text>
          )}
        </View>
      </>
    );
  }

  return null;
}
