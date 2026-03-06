import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";

const CANCELED_ERRORS = new Set(["app_cancel", "system_cancel", "user_cancel"]);

export const isAdminBiometricAvailable = async (): Promise<boolean> => {
  if (Platform.OS === "web") {
    return false;
  }

  try {
    const [hasHardware, isEnrolled, supportedTypes] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);

    return hasHardware && isEnrolled && supportedTypes.length > 0;
  } catch {
    return false;
  }
};

export const authenticateAdminWithBiometrics = async (): Promise<{
  ok: boolean;
  canceled: boolean;
}> => {
  if (Platform.OS === "web") {
    return { ok: false, canceled: false };
  }

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock ClockIn Admin",
      cancelLabel: "Cancel",
      fallbackLabel: "Use device passcode",
      disableDeviceFallback: false,
      requireConfirmation: false,
    });

    if (result.success) {
      return { ok: true, canceled: false };
    }

    const errorCode = "error" in result ? result.error || "" : "";

    return {
      ok: false,
      canceled: CANCELED_ERRORS.has(errorCode),
    };
  } catch {
    return { ok: false, canceled: false };
  }
};
