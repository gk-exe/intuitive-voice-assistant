/**
 * StatusPill
 * ----------
 * Tiny visual marker for a record's lifecycle state. Tone maps to the
 * design system's semantic tokens — never raw colors.
 */

import type { StatusDef, StatusTone } from "../contracts";
import { useTranslation } from "react-i18next";

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning-foreground",
  danger: "bg-destructive/15 text-destructive",
  accent: "bg-accent/20 text-accent-foreground",
};

interface Props {
  status: StatusDef;
}

export function StatusPill({ status }: Props) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLASS[status.tone]}`}
    >
      {t(status.labelKey, { defaultValue: status.key })}
    </span>
  );
}
