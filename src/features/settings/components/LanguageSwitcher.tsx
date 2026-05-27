import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import { APP_CONFIG, type SupportedLocale } from "@/core/config/app.config";
import { useUIStore } from "@/store/ui.store";

/**
 * Minimal language pill. Tap to cycle through supported locales — fast,
 * thumb-friendly, no dropdown menus (those are corporate and slow).
 */
export function LanguageSwitcher() {
  const { t } = useTranslation();
  const locale = useUIStore((s) => s.locale);
  const setLocale = useUIStore((s) => s.setLocale);

  const cycle = () => {
    const list = APP_CONFIG.supportedLocales;
    const next = list[(list.indexOf(locale) + 1) % list.length] as SupportedLocale;
    setLocale(next);
  };

  return (
    <button
      type="button"
      onClick={cycle}
      className="touch-target inline-flex items-center gap-2 rounded-pill bg-muted px-4 text-sm text-foreground"
      aria-label={t("common.language")}
    >
      <Languages className="size-4" />
      <span>{t(`languages.${locale}`)}</span>
    </button>
  );
}
