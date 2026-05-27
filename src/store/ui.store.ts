/**
 * UI store — theme + locale preferences.
 *
 * Zustand is used for light, cross-cutting client state only. Server state
 * (data from Supabase) belongs in TanStack Query — never duplicate it here.
 *
 * Persisted to localStorage so theme / language survive reloads.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { APP_CONFIG, type SupportedLocale } from "@/core/config/app.config";

type ThemeMode = "light" | "dark" | "system";

interface UIState {
  theme: ThemeMode;
  locale: SupportedLocale;
  setTheme: (theme: ThemeMode) => void;
  setLocale: (locale: SupportedLocale) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: APP_CONFIG.defaultTheme,
      locale: APP_CONFIG.defaultLocale,
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
    }),
    { name: "voice.ui" },
  ),
);
