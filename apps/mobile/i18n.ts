import { i18nEn } from "./i18n.en";
import { i18nEs } from "./i18n.es";

export type Language = "en" | "es";

export const i18n = {
  en: i18nEn,
  es: i18nEs,
} as const;
