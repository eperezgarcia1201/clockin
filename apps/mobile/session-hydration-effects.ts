import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, type Dispatch, type SetStateAction } from "react";
import {
  LANGUAGE_STORAGE_KEY,
  TENANT_STORAGE_KEY,
  TIPS_SUBMITTED_STORAGE_KEY,
} from "./app-config";
import { parseStoredTenantContext } from "./tenant-context-runtime";
import type { Language } from "./i18n";
import type { TenantContext } from "./types";

export const useSessionHydrationEffects = (params: {
  setTenant: Dispatch<SetStateAction<TenantContext | null>>;
  setTenantInput: Dispatch<SetStateAction<string>>;
  setTenantHydrated: Dispatch<SetStateAction<boolean>>;
  setTipsSubmittedByDay: Dispatch<SetStateAction<Record<string, boolean>>>;
  setLanguage: Dispatch<SetStateAction<Language>>;
}) => {
  useEffect(() => {
    let active = true;

    const loadTenant = async () => {
      try {
        const raw = await AsyncStorage.getItem(TENANT_STORAGE_KEY);
        if (!raw) {
          return;
        }

        const parsed = parseStoredTenantContext(raw);
        if (parsed && active) {
          params.setTenant(parsed);
          params.setTenantInput(parsed.input || parsed.slug || "");
        }
      } catch {
        await AsyncStorage.removeItem(TENANT_STORAGE_KEY);
      } finally {
        if (active) {
          params.setTenantHydrated(true);
        }
      }
    };

    void loadTenant();

    return () => {
      active = false;
    };
  }, [
    params.setTenant,
    params.setTenantHydrated,
    params.setTenantInput,
  ]);

  useEffect(() => {
    let active = true;

    const loadTipSubmissionCache = async () => {
      try {
        const raw = await AsyncStorage.getItem(TIPS_SUBMITTED_STORAGE_KEY);
        if (!raw) {
          return;
        }
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          await AsyncStorage.removeItem(TIPS_SUBMITTED_STORAGE_KEY);
          return;
        }

        const normalized: Record<string, boolean> = {};
        Object.entries(parsed).forEach(([key, value]) => {
          if (value === true) {
            normalized[key] = true;
          }
        });

        if (active) {
          params.setTipsSubmittedByDay(normalized);
        }
      } catch {
        await AsyncStorage.removeItem(TIPS_SUBMITTED_STORAGE_KEY);
      }
    };

    void loadTipSubmissionCache();

    return () => {
      active = false;
    };
  }, [params.setTipsSubmittedByDay]);

  useEffect(() => {
    let active = true;

    const loadLanguage = async () => {
      try {
        const raw = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (raw === "en" || raw === "es") {
          if (active) {
            params.setLanguage(raw);
          }
        }
      } catch {
        // ignore and keep default language
      }
    };

    void loadLanguage();
    return () => {
      active = false;
    };
  }, [params.setLanguage]);
};
