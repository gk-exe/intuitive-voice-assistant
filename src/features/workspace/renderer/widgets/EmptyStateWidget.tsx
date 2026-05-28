/**
 * EmptyStateWidget
 * ----------------
 * Calm, welcoming placeholder shown when a module has no data yet.
 * Reads its copy from i18n via `messageKey`, with a graceful fallback so
 * a missing translation never shows a raw key.
 */

import { useTranslation } from "react-i18next";

interface Props {
  messageKey?: string;
  /** Optional explicit message overrides i18n lookup. */
  message?: string;
}

export function EmptyStateWidget({ messageKey, message }: Props) {
  const { t } = useTranslation();
  const text = message ?? (messageKey ? t(messageKey, { defaultValue: "" }) : "");

  return (
    <p className="text-sm leading-relaxed text-muted-foreground">
      {text || t("workspace.defaultEmpty", { defaultValue: "Nothing here yet — tap the mic anytime." })}
    </p>
  );
}
