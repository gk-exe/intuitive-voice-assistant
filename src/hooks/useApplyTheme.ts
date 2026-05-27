import { useEffect } from "react";
import { useUIStore } from "@/store/ui.store";
import i18n from "@/services/i18n";

/**
 * Side-effects for global UI prefs:
 *  - toggle `.dark` on <html> based on store + system preference
 *  - keep i18n language in sync with store
 *
 * Mount once at the app root.
 */
export function useApplyTheme() {
  const theme = useUIStore((s) => s.theme);
  const locale = useUIStore((s) => s.locale);

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && mq.matches);
      root.classList.toggle("dark", dark);
    };
    apply();
    if (theme === "system") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);

  useEffect(() => {
    if (i18n.language !== locale) i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
  }, [locale]);
}
