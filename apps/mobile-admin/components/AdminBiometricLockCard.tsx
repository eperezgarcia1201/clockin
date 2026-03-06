import { LinearGradient } from "expo-linear-gradient";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import { ADMIN_APP_ICON, BRAND_LOGO } from "../app-config";

type AdminBiometricLockCopy = {
  biometricUnlockTitle: string;
  biometricUnlockBody: string;
  biometricUnlockButton: string;
  biometricUnlocking: string;
  logout: string;
};

export function AdminBiometricLockCard({
  isLight,
  text,
  biometricPrompting,
  biometricStatus,
  onUnlock,
  onLogout,
}: {
  isLight: boolean;
  text: AdminBiometricLockCopy;
  biometricPrompting: boolean;
  biometricStatus: string | null;
  onUnlock: () => void;
  onLogout: () => void;
}) {
  return (
    <View style={styles.biometricLockScreen}>
      <Image
        source={BRAND_LOGO}
        style={styles.biometricLockBrandLogo}
        resizeMode="contain"
      />
      <Text style={[styles.biometricLockTitle, isLight && styles.biometricLockTitleLight]}>
        {text.biometricUnlockTitle}
      </Text>
      <Text style={[styles.biometricLockBody, isLight && styles.biometricLockBodyLight]}>
        {text.biometricUnlockBody}
      </Text>
      <View style={[styles.card, styles.biometricLockCard, isLight && styles.cardLight]}>
        <Text
          style={[
            styles.biometricLockHeadline,
            isLight && styles.biometricLockHeadlineLight,
          ]}
        >
          {biometricPrompting
            ? text.biometricUnlocking
            : text.biometricUnlockButton}
        </Text>
        <LinearGradient
          colors={
            isLight
              ? ["rgba(37, 99, 235, 0.14)", "rgba(59, 130, 246, 0.04)"]
              : ["rgba(22, 163, 74, 0.18)", "rgba(59, 130, 246, 0.08)"]
          }
          style={[
            styles.biometricLockHero,
            isLight && styles.biometricLockHeroLight,
          ]}
        >
          <View style={styles.biometricLockHalo} />
          <View style={[styles.biometricLockIconFrame, isLight && styles.biometricLockIconFrameLight]}>
            <Image
              source={ADMIN_APP_ICON}
              style={styles.biometricLockIcon}
              resizeMode="cover"
            />
          </View>
        </LinearGradient>
        {biometricStatus ? (
          <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
            {biometricStatus}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={[styles.button, styles.primary]}
        onPress={onUnlock}
        disabled={biometricPrompting}
      >
        <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
          {biometricPrompting
            ? text.biometricUnlocking
            : text.biometricUnlockButton}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.secondaryButton,
          styles.biometricLogoutButton,
          isLight && styles.secondaryButtonLight,
        ]}
        onPress={onLogout}
        disabled={biometricPrompting}
      >
        <Text
          style={[
            styles.secondaryButtonText,
            isLight && styles.secondaryButtonTextLight,
          ]}
        >
          {text.logout}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
