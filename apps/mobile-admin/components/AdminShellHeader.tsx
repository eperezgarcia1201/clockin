import { Image, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import { BRAND_LOGO } from "../app-config";
import type { Lang } from "../copy";
import type { Screen, ThemeMode } from "../types";

type AdminShellHeaderProps = {
  isLight: boolean;
  subtitle: string;
  languageLabel: string;
  lightLabel: string;
  darkLabel: string;
  logoutLabel: string;
  tenantLabel: string;
  activeLocationLabelText: string;
  switchLocationLabel: string;
  language: Lang;
  onLanguageChange: (value: Lang) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  loggedIn: boolean;
  onLogout: () => void;
  activeTenantLabel: string;
  activeTenant: string;
  activeApiLabel: string;
  canManageMultiLocation: boolean;
  activeLocationLabel: string;
  visibleTabs: Screen[];
  screen: Screen;
  onScreenChange: (value: Screen) => void;
  getTabLabel: (screen: Screen) => string;
  onSwitchLocation: () => void;
};

export function AdminShellHeader({
  isLight,
  subtitle,
  languageLabel,
  lightLabel,
  darkLabel,
  logoutLabel,
  tenantLabel,
  activeLocationLabelText,
  switchLocationLabel,
  language,
  onLanguageChange,
  theme,
  onToggleTheme,
  loggedIn,
  onLogout,
  activeTenantLabel,
  activeTenant,
  activeApiLabel,
  canManageMultiLocation,
  activeLocationLabel,
  visibleTabs,
  screen,
  onScreenChange,
  getTabLabel,
  onSwitchLocation,
}: AdminShellHeaderProps) {
  return (
    <>
      <View style={styles.brandRow}>
        <Image source={BRAND_LOGO} style={styles.brandLogo} resizeMode="contain" />
        <View style={styles.brandTextBlock}>
          <Text style={[styles.title, isLight && styles.titleLight]}>ClockIn Admin</Text>
          <Text style={[styles.subtitle, isLight && styles.subtitleLight]}>{subtitle}</Text>
        </View>
        <View style={styles.headerActions}>
          <View style={[styles.languageSelector, isLight && styles.languageSelectorLight]}>
            <Text style={[styles.languageLabel, isLight && styles.languageLabelLight]}>
              {languageLabel}
            </Text>
            {(["en", "es"] as Lang[]).map((langOption) => (
              <TouchableOpacity
                key={langOption}
                style={[
                  styles.languageOption,
                  isLight && styles.languageOptionLight,
                  language === langOption &&
                    (isLight
                      ? styles.languageOptionActiveLight
                      : styles.languageOptionActive),
                ]}
                onPress={() => onLanguageChange(langOption)}
              >
                <Text
                  style={[
                    styles.languageOptionText,
                    isLight && styles.languageOptionTextLight,
                    language === langOption && styles.languageOptionTextActive,
                  ]}
                >
                  {langOption.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.themeToggle, isLight && styles.themeToggleLight]}
            onPress={onToggleTheme}
          >
            <Text style={[styles.themeToggleText, isLight && styles.themeToggleTextLight]}>
              {theme === "dark" ? lightLabel : darkLabel}
            </Text>
          </TouchableOpacity>
          {loggedIn ? (
            <TouchableOpacity
              style={[
                styles.themeToggle,
                styles.headerLogoutButton,
                isLight && styles.headerLogoutButtonLight,
              ]}
              onPress={onLogout}
            >
              <Text
                style={[
                  styles.themeToggleText,
                  styles.headerLogoutText,
                  isLight && styles.headerLogoutTextLight,
                ]}
              >
                {logoutLabel}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loggedIn ? (
        <View style={[styles.tabShell, isLight && styles.tabShellLight]}>
          <View style={styles.tenantPill}>
            <Text style={[styles.tenantPillText, isLight && styles.tenantPillTextLight]}>
              {tenantLabel}: {activeTenantLabel || activeTenant}
            </Text>
          </View>
          <View style={styles.tenantPill}>
            <Text style={[styles.tenantPillText, isLight && styles.tenantPillTextLight]}>
              API: {activeApiLabel}
            </Text>
          </View>
          {canManageMultiLocation ? (
            <View style={styles.tenantPill}>
              <Text style={[styles.tenantPillText, isLight && styles.tenantPillTextLight]}>
                {activeLocationLabelText}: {activeLocationLabel}
              </Text>
            </View>
          ) : null}

          {visibleTabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                isLight && styles.tabLight,
                screen === tab && (isLight ? styles.tabActiveLight : styles.tabActive),
              ]}
              onPress={() => onScreenChange(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  isLight && styles.tabTextLight,
                  screen === tab && isLight && styles.tabTextLightActive,
                ]}
              >
                {getTabLabel(tab)}
              </Text>
            </TouchableOpacity>
          ))}

          {canManageMultiLocation ? (
            <TouchableOpacity
              style={[
                styles.tab,
                styles.tabLocationSwitch,
                isLight && styles.tabLocationSwitchLight,
              ]}
              onPress={onSwitchLocation}
            >
              <Text
                style={[
                  styles.tabText,
                  isLight && styles.tabTextLight,
                  isLight && styles.tabTextLightActive,
                ]}
              >
                {switchLocationLabel}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.tab,
                styles.tabDanger,
                isLight && styles.tabDangerLight,
              ]}
              onPress={onLogout}
            >
              <Text
                style={[
                  styles.tabText,
                  isLight && styles.tabTextLight,
                  isLight && styles.tabTextLightDanger,
                ]}
              >
                {logoutLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
    </>
  );
}
