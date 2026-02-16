"use client";

import { useEffect, useMemo, useState } from "react";

export type UiLang = "en" | "es";

const STORAGE_KEY = "clockin-lang";
const CHANGE_EVENT = "clockin-lang-change";

export const getStoredLanguage = (fallback: UiLang = "en"): UiLang => {
  if (typeof window === "undefined") {
    return fallback;
  }
  return localStorage.getItem(STORAGE_KEY) === "es" ? "es" : "en";
};

export const useUiLanguage = (fallback: UiLang = "en") => {
  const [lang, setLang] = useState<UiLang>(() => getStoredLanguage(fallback));

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const apply = () => {
      setLang(getStoredLanguage(fallback));
    };

    apply();

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === STORAGE_KEY) {
        apply();
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, apply);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGE_EVENT, apply);
    };
  }, [fallback]);

  return lang;
};

export const useUiCopy = <T>(dictionary: Record<UiLang, T>, lang: UiLang) =>
  useMemo(() => dictionary[lang] ?? dictionary.en, [dictionary, lang]);

