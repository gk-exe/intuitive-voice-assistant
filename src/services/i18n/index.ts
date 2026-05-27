/**
 * i18n bootstrap.
 *
 * - Three locales out of the gate: English, Malayalam, Hindi.
 * - Detected from browser, persisted to localStorage.
 * - Resources are bundled (not lazy-loaded) — voice-first app, instant first paint matters.
 *
 * To add a locale:
 *   1. Drop a JSON file under /locales/<code>.json with the same key shape.
 *   2. Register it in `resources` below.
 *   3. Add it to APP_CONFIG.supportedLocales.
 */

import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import { APP_CONFIG } from "@/core/config/app.config";
import en from "./locales/en.json";
import ml from "./locales/ml.json";
import hi from "./locales/hi.json";

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        ml: { translation: ml },
        hi: { translation: hi },
      },
      fallbackLng: APP_CONFIG.defaultLocale,
      supportedLngs: APP_CONFIG.supportedLocales as unknown as string[],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: "voice.locale",
      },
      returnNull: false,
    });
}

export default i18n;
