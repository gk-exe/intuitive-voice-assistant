/**
 * WorkspaceEmpty
 * --------------
 * Calm welcome state shown before any modules are added. Intentionally
 * warm and minimal — this is the first impression of a fresh workspace.
 */

import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  onAdd: () => void;
}

export function WorkspaceEmpty({ onAdd }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl bg-surface p-8 text-center shadow-soft">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Sparkles className="size-5" strokeWidth={1.5} />
      </span>
      <h3 className="text-lg text-foreground">
        {t("workspace.empty.title", { defaultValue: "Your space is a fresh page." })}
      </h3>
      <p className="max-w-xs text-sm text-muted-foreground">
        {t("workspace.empty.body", {
          defaultValue: "Pick an area to start with. You can change it anytime.",
        })}
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-2 rounded-full bg-primary px-5 py-3 text-sm text-primary-foreground touch-target"
      >
        {t("home.addModule")}
      </button>
    </div>
  );
}
