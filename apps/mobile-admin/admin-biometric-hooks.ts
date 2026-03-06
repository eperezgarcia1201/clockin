import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, type AppStateStatus } from "react-native";
import { ADMIN_BIOMETRIC_ENABLED_STORAGE_KEY } from "./app-config";
import { copy, type Lang } from "./copy";
import {
  authenticateAdminWithBiometrics,
  isAdminBiometricAvailable,
} from "./admin-biometric-runtime";

export const useAdminBiometricSession = ({
  loggedIn,
  language,
}: {
  loggedIn: boolean;
  language: Lang;
}) => {
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLocked, setBiometricLocked] = useState(false);
  const [biometricPrompting, setBiometricPrompting] = useState(false);
  const [biometricPromptPending, setBiometricPromptPending] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<string | null>(null);

  const preferenceLoadedRef = useRef(false);
  const skipNextAutoLockRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const biometricPromptSessionRef = useRef(false);
  const suppressAutoLockUntilRef = useRef(0);

  const text = copy[language] ?? copy.en;

  const clearAutoLockSuppression = useCallback(() => {
    biometricPromptSessionRef.current = false;
    suppressAutoLockUntilRef.current = 0;
  }, []);

  const suppressAutoLockForPromptBounce = useCallback((durationMs = 3000) => {
    suppressAutoLockUntilRef.current = Date.now() + durationMs;
  }, []);

  const isAutoLockSuppressed = useCallback(
    () =>
      biometricPromptSessionRef.current ||
      Date.now() < suppressAutoLockUntilRef.current,
    [],
  );

  useEffect(() => {
    let active = true;

    const loadBiometricPreference = async () => {
      const available = await isAdminBiometricAvailable();
      let storedEnabled = false;

      try {
        storedEnabled =
          (await AsyncStorage.getItem(ADMIN_BIOMETRIC_ENABLED_STORAGE_KEY)) ===
          "1";
      } catch {
        storedEnabled = false;
      }

      if (!active) {
        return;
      }

      setBiometricAvailable(available);
      setBiometricEnabled(available && storedEnabled);
      preferenceLoadedRef.current = true;

      if (!available) {
        void AsyncStorage.removeItem(ADMIN_BIOMETRIC_ENABLED_STORAGE_KEY);
      }
    };

    void loadBiometricPreference();

    return () => {
      active = false;
      clearAutoLockSuppression();
    };
  }, [clearAutoLockSuppression]);

  useEffect(() => {
    if (!preferenceLoadedRef.current) {
      return;
    }

    if (!biometricAvailable || !biometricEnabled) {
      void AsyncStorage.removeItem(ADMIN_BIOMETRIC_ENABLED_STORAGE_KEY);
      return;
    }

    void AsyncStorage.setItem(ADMIN_BIOMETRIC_ENABLED_STORAGE_KEY, "1");
  }, [biometricAvailable, biometricEnabled]);

  const clearBiometricPreference = useCallback(() => {
    clearAutoLockSuppression();
    setBiometricEnabled(false);
    setBiometricLocked(false);
    setBiometricPromptPending(false);
    setBiometricPrompting(false);
    setBiometricStatus(null);
    void AsyncStorage.removeItem(ADMIN_BIOMETRIC_ENABLED_STORAGE_KEY);
  }, [clearAutoLockSuppression]);

  const markSessionAuthenticated = useCallback(() => {
    skipNextAutoLockRef.current = true;
    clearAutoLockSuppression();
    setBiometricLocked(false);
    setBiometricPromptPending(false);
    setBiometricPrompting(false);
    setBiometricStatus(null);
  }, [clearAutoLockSuppression]);

  const requestBiometricUnlock = useCallback(async (lockOnFailure = true) => {
    if (!biometricAvailable) {
      setBiometricStatus(text.biometricUnavailableStatus);
      return false;
    }

    biometricPromptSessionRef.current = true;
    suppressAutoLockForPromptBounce();
    setBiometricPromptPending(false);
    setBiometricPrompting(true);
    setBiometricStatus(null);

    try {
      const result = await authenticateAdminWithBiometrics();

      setBiometricPrompting(false);
      suppressAutoLockForPromptBounce();
      biometricPromptSessionRef.current = false;

      if (result.ok) {
        skipNextAutoLockRef.current = true;
        setBiometricLocked(false);
        setBiometricStatus(null);
        return true;
      }

      setBiometricLocked(lockOnFailure);
      setBiometricStatus(
        result.canceled
          ? text.biometricCanceledStatus
          : text.biometricFailedStatus,
      );
      return false;
    } catch {
      setBiometricPrompting(false);
      suppressAutoLockForPromptBounce();
      biometricPromptSessionRef.current = false;
      setBiometricLocked(lockOnFailure);
      setBiometricStatus(text.biometricFailedStatus);
      return false;
    }
  }, [
    biometricAvailable,
    suppressAutoLockForPromptBounce,
    text.biometricCanceledStatus,
    text.biometricFailedStatus,
    text.biometricUnavailableStatus,
  ]);

  const retryBiometricUnlock = useCallback(() => {
    setBiometricStatus(null);
    setBiometricPromptPending(true);
  }, []);

  const toggleBiometricPreference = useCallback(async () => {
    if (!biometricAvailable) {
      setBiometricStatus(text.biometricUnavailableStatus);
      return;
    }

    if (biometricEnabled) {
      clearBiometricPreference();
      setBiometricStatus(text.biometricDisabledStatus);
      return;
    }

    const didUnlock = await requestBiometricUnlock(false);
    if (!didUnlock) {
      return;
    }

    skipNextAutoLockRef.current = true;
    setBiometricEnabled(true);
    setBiometricLocked(false);
    setBiometricPromptPending(false);
    setBiometricStatus(text.biometricEnabledStatus);
  }, [
    biometricAvailable,
    biometricEnabled,
    clearBiometricPreference,
    requestBiometricUnlock,
    text.biometricDisabledStatus,
    text.biometricEnabledStatus,
    text.biometricUnavailableStatus,
  ]);

  useEffect(() => {
    if (loggedIn || !preferenceLoadedRef.current) {
      return;
    }

    setBiometricLocked(false);
    setBiometricPromptPending(false);
    setBiometricPrompting(false);
    setBiometricStatus(null);
  }, [loggedIn]);

  useEffect(() => {
    if (
      !preferenceLoadedRef.current ||
      !loggedIn ||
      !biometricEnabled ||
      !biometricAvailable
    ) {
      return;
    }

    if (skipNextAutoLockRef.current) {
      skipNextAutoLockRef.current = false;
      return;
    }

    setBiometricLocked(true);
    setBiometricPromptPending(true);
  }, [biometricAvailable, biometricEnabled, loggedIn]);

  useEffect(() => {
    if (
      !loggedIn ||
      !biometricEnabled ||
      !biometricAvailable ||
      !biometricLocked ||
      !biometricPromptPending ||
      biometricPrompting
    ) {
      return;
    }

    void requestBiometricUnlock();
  }, [
    biometricAvailable,
    biometricEnabled,
    biometricLocked,
    biometricPromptPending,
    biometricPrompting,
    loggedIn,
    requestBiometricUnlock,
  ]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (!loggedIn || !biometricEnabled || !biometricAvailable) {
        return;
      }

      if (
        (previousState === "background" || previousState === "inactive") &&
        nextState === "active"
      ) {
        if (isAutoLockSuppressed()) {
          return;
        }
        setBiometricLocked(true);
        setBiometricPromptPending(true);
        setBiometricStatus(null);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [
    biometricAvailable,
    biometricEnabled,
    isAutoLockSuppressed,
    loggedIn,
  ]);

  return {
    biometricAvailable,
    biometricEnabled,
    biometricLocked,
    biometricPrompting,
    biometricStatus,
    clearBiometricPreference,
    markSessionAuthenticated,
    requestBiometricUnlock,
    retryBiometricUnlock,
    toggleBiometricPreference,
  };
};
