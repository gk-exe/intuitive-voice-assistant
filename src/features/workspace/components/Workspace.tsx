/**
 * Workspace
 * ---------
 * The orchestrator. Pulls preferences from state, runs them through the
 * composer, hands the composition to the renderer. Owns *only* the
 * interactive shell (header, edit toggle, add-module sheet) — it does NOT
 * know how a module looks. That's the renderer + widgets.
 *
 * This is the seam where, later, an AI orchestrator can swap in by
 * producing a `WorkspaceComposition` from server state instead of from
 * `composeWorkspace(prefs)`.
 */

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { listCategories } from "@/core/categories/registry";
import { CategoryChip } from "@/features/onboarding/components/CategoryChip";
import { useHasMounted } from "@/hooks/useHasMounted";
import {
  useWorkspaceComposition,
  useWorkspaceStore,
} from "../state";
import { WorkspaceRenderer } from "../renderer";
import { ModuleEditControls } from "./ModuleEditControls";
import { WorkspaceEmpty } from "./WorkspaceEmpty";

export function Workspace() {
  const { t } = useTranslation();
  const mounted = useHasMounted();
  const composition = useWorkspaceComposition();
  const addModule = useWorkspaceStore((s) => s.addModule);

  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);

  // Avoid hydration flicker: the composition is derived from persisted
  // state. On SSR we render a quiet placeholder so the warm sand surface
  // stays stable until the client takes over.
  if (!mounted) {
    return (
      <section className="flex flex-col gap-4" aria-busy="true">
        <div className="h-3 w-24 rounded-full bg-muted" />
        <div className="h-24 rounded-3xl bg-surface/60" />
        <div className="h-24 rounded-3xl bg-surface/60" />
      </section>
    );
  }

  const enabled = new Set(composition.modules.map((c) => c.module.id));
  const available = listCategories().filter((c) => !enabled.has(c.id));

  const isEmpty = composition.modules.length === 0;
  const lastIndex = composition.modules.length - 1;


  return (
    <section className="flex flex-col gap-4" aria-label={t("home.sections.workspace")}>
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t("home.sections.workspace")}
        </h2>
        {!isEmpty && (
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="flex items-center gap-1 rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted touch-target"
            aria-pressed={editing}
          >
            <Pencil className="size-4" strokeWidth={1.5} />
            {editing ? t("common.done") : t("common.edit")}
          </button>
        )}
      </header>

      {isEmpty ? (
        <WorkspaceEmpty onAdd={() => setAdding(true)} />
      ) : (
        <WorkspaceRenderer
          composition={composition}
          decorate={
            editing
              ? (composed) => (
                  <ModuleEditControls
                    id={composed.module.id}
                    order={composed.order}
                    isFirst={composed.order === 0}
                    isLast={composed.order === lastIndex}
                  />
                )
              : undefined
          }
        />
      )}

      {(editing || isEmpty) && available.length > 0 && (
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          aria-expanded={adding}
          className="flex items-center justify-center gap-2 rounded-3xl border border-dashed border-border bg-surface/50 px-5 py-4 text-foreground/80 touch-target-lg hover:bg-surface"
        >
          <Plus className="size-5" strokeWidth={1.5} />
          {t("home.addModule")}
        </button>
      )}

      {adding && available.length > 0 && (
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
    </section>
  );
}
