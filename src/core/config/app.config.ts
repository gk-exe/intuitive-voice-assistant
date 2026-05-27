/**
 * App-wide configuration constants.
 *
 * Single source of truth for non-secret settings. Anything secret belongs in
 * server env (process.env.*), never here.
 *
 * Portability note: when migrating to Flutter, these values map 1:1 to a
 * Dart constants file. Keep them serializable and free of platform APIs.
 */

export const APP_CONFIG = {
  name: "Voice",
  tagline: "Talk naturally. Stay organized.",
  defaultLocale: "en",
  supportedLocales: ["en", "ml", "hi"] as const,
  defaultTheme: "system" as "light" | "dark" | "system",
  // Voice UX targets — keep generous for older / non-technical users
  touch: {
    minSizePx: 56,
    largeSizePx: 64,
    micSizePx: 168,
  },
} as const;

export type SupportedLocale = (typeof APP_CONFIG.supportedLocales)[number];
