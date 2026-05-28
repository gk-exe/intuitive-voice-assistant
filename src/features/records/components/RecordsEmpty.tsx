/**
 * RecordsEmpty
 * ------------
 * Calm empty state for a module's list view. Reads its copy from the
 * entity's `emptyKey`. No fake data, no demo cards — just a clear next
 * step.
 */

import { useTranslation } from "react-i18next";

import { TouchButton } from "@/shared/components/TouchButton";
import type { EntitySchema } from "../contracts";

interface Props {
  schema: EntitySchema;
  onAdd: () => void;
}

export function RecordsEmpty({ schema, onAdd }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl bg-surface px-6 py-10 text-center shadow-soft">
      <p className="font-display text-2xl text-foreground">
        {t(schema.emptyKey)}
      </p>
      <p className="max-w-xs text-sm text-muted-foreground">
        {t("records.empty.body", {
          defaultValue: "Add your first one. You can edit or remove it anytime.",
        })}
      </p>
      <TouchButton onClick={onAdd}>{t(schema.addLabelKey)}</TouchButton>
    </div>
  );
}
