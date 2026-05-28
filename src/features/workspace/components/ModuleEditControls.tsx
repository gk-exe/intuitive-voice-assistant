/**
 * ModuleEditControls
 * ------------------
 * Per-card reorder + remove controls shown only in edit mode. Tap-based
 * (not drag) so it works for non-technical users on touch screens without
 * pulling in a drag library.
 */

import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { CategoryId } from "@/core/categories/registry";
import { useWorkspaceStore } from "../state";

interface Props {
  id: CategoryId;
  order: number;
  isFirst: boolean;
  isLast: boolean;
}

export function ModuleEditControls({ id, isFirst, isLast }: Props) {
  const { t } = useTranslation();
  const reorder = useWorkspaceStore((s) => s.reorderModule);
  const remove = useWorkspaceStore((s) => s.removeModule);

  return (
    <div className="mt-2 flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => reorder(id, "up")}
        disabled={isFirst}
        aria-label={t("workspace.moveUp", { defaultValue: "Move up" })}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground/80 disabled:opacity-40"
      >
        <ArrowUp className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => reorder(id, "down")}
        disabled={isLast}
        aria-label={t("workspace.moveDown", { defaultValue: "Move down" })}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground/80 disabled:opacity-40"
      >
        <ArrowDown className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => remove(id)}
        aria-label={t("common.delete")}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
