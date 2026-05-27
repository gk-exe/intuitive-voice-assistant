/**
 * Workspace — the user's editable home dashboard.
 *
 * Renders one DashboardCard per enabled module, in stored order. Provides
 * touch-friendly reorder (up/down) and remove actions in "edit" mode.
 *
 * No drag-and-drop library on purpose: tap targets are more accessible
 * for non-technical users and avoid heavyweight deps. A future phase can
 * layer pointer drag on top — the store API (`reorderModule`) already
 * supports arbitrary moves.
 */

import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useWorkspaceStore } from "@/store/workspace.store";
import { listCategories, type CategoryId } from "@/core/categories/registry";
import { DashboardCard } from "@/features/workspace/dashboard.registry";
import { CategoryChip } from "@/features/onboarding/components/CategoryChip";

export function Workspace() {
  const { t } = useTranslation();
  const modules = useWorkspaceStore((s) => s.modules);
  const removeModule = useWorkspaceStore((s) => s.removeModule);
  const reorderModule = useWorkspaceStore((s) => s.reorderModule);
  const addModule = useWorkspaceStore((s) => s.addModule);

  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);

  const enabled = new Set(modules);
  const available = listCategories().filter((c) => !enabled.has(c.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t("home.sections.workspace")}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="flex items-center gap-1 rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted touch-target"
            aria-pressed={editing}
          >
            <Pencil className="size-4" strokeWidth={1.5} />
            {editing ? t("common.done") : t("common.edit")}
          </button>
        </div>
      </div>

      {modules.length === 0 ? (
        <div className="rounded-3xl bg-surface p-6 text-center shadow-soft">
          <p className="text-foreground/80">{t("home.workspaceEmpty")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {modules.map((id, i) => (
            <ModuleRow
              key={id}
              id={id}
              editing={editing}
              isFirst={i === 0}
              isLast={i === modules.length - 1}
              onUp={() => reorderModule(id, "up")}
              onDown={() => reorderModule(id, "down")}
              onRemove={() => removeModule(id)}
            />
          ))}
        </div>
      )}

      {editing && available.length > 0 && (
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="flex items-center justify-center gap-2 rounded-3xl border border-dashed border-border bg-surface/50 px-5 py-4 text-foreground/80 touch-target-lg hover:bg-surface"
        >
          <Plus className="size-5" strokeWidth={1.5} />
          {t("home.addModule")}
        </button>
      )}

      {editing && adding && (
        <div className="flex flex-col gap-2 rounded-3xl bg-surface p-4 shadow-soft">
          {available.map((c) => (
            <CategoryChip
              key={c.id}
              id={c.id}
              selected={false}
              onToggle={(id) => {
                addModule(id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RowProps {
  id: CategoryId;
  editing: boolean;
  isFirst: boolean;
  isLast: boolean;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}

function ModuleRow({ id, editing, isFirst, isLast, onUp, onDown, onRemove }: RowProps) {
  return (
    <div className="relative">
      <DashboardCard id={id} />
      {editing && (
        <div className="mt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onUp}
            disabled={isFirst}
            aria-label="Move up"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground/80 disabled:opacity-40"
          >
            <ArrowUp className="size-4" />
          </button>
          <button
            type="button"
            onClick={onDown}
            disabled={isLast}
            aria-label="Move down"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground/80 disabled:opacity-40"
          >
            <ArrowDown className="size-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
