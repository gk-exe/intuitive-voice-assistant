/**
 * Workspace Composer
 * ------------------
 * Pure function: (preferences, source) → WorkspaceComposition.
 *
 * Inputs are user state (which modules, what order, what's hidden) plus
 * optional widget overrides. Output is a fully ordered, render-ready
 * `WorkspaceComposition`. No React, no I/O, no globals — so it's trivially
 * testable and a future AI orchestrator can call it with synthetic
 * preferences without spinning up the app shell.
 */

import { getModule } from "../registry";
import type {
  ComposedModule,
  WorkspaceComposition,
  WorkspacePreferences,
} from "../contracts";

export interface ComposeOptions {
  /** Layout strategy hint. Defaults to "stack" (mobile-first). */
  strategy?: WorkspaceComposition["strategy"];
  /** Marks the source of this composition in `meta.source`. */
  source?: WorkspaceComposition["meta"]["source"];
}

export function composeWorkspace(
  prefs: WorkspacePreferences,
  options: ComposeOptions = {},
): WorkspaceComposition {
  const hidden = new Set(prefs.hidden);
  const overrides = prefs.widgetOverrides ?? {};

  const modules: ComposedModule[] = [];
  let order = 0;

  for (const id of prefs.enabled) {
    if (hidden.has(id)) continue;
    const module = getModule(id);
    // Defensively skip ids that no longer exist in the registry — protects
    // users whose persisted state outlives a removed module.
    if (!module) continue;

    const widgets = overrides[id] ?? module.widgets;
    modules.push({ module, widgets, order: order++ });
  }

  return {
    strategy: options.strategy ?? "stack",
    modules,
    meta: {
      generatedAt: new Date().toISOString(),
      source: options.source ?? "user",
      moduleCount: modules.length,
    },
  };
}
