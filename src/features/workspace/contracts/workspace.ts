/**
 * Workspace Composition Contracts
 * -------------------------------
 * The output shape of the workspace engine. Everything the renderer needs
 * to draw the dashboard is in a `WorkspaceComposition` — nothing else.
 *
 * Keeping the renderer downstream of a pure data structure means:
 *   - the AI layer can emit a `WorkspaceComposition` directly later,
 *   - layouts can be snapshotted / synced across devices,
 *   - we can swap the renderer (web → Flutter) without touching the engine.
 */

import type { CategoryId } from "@/core/categories/registry";
import type { ModuleDefinition, WidgetDescriptor } from "./module";

/**
 * User-controlled preferences fed INTO the engine.
 * Persisted via the workspace state store.
 */
export interface WorkspacePreferences {
  /** Modules the user has enabled, in their preferred order. */
  enabled: readonly CategoryId[];
  /** Modules the user explicitly hid (subset of `enabled`). */
  hidden: readonly CategoryId[];
  /**
   * Per-module widget overrides. Empty in Phase 3 — reserved so the AI
   * layer and future personalization can override defaults without
   * schema changes.
   */
  widgetOverrides?: Partial<Record<CategoryId, readonly WidgetDescriptor[]>>;
}

/** A single module ready to render, after composition. */
export interface ComposedModule {
  module: ModuleDefinition;
  widgets: readonly WidgetDescriptor[];
  /** Where this card sits on the stack (0-based). */
  order: number;
}

/** Layout strategy selector — extend as new layouts ship. */
export type LayoutStrategy = "stack" | "grid" | "adaptive";

/** Final, render-ready plan. */
export interface WorkspaceComposition {
  strategy: LayoutStrategy;
  modules: readonly ComposedModule[];
  /** Composition meta — useful for debugging, telemetry, AI tracing. */
  meta: {
    generatedAt: string;
    source: "defaults" | "user" | "ai";
    moduleCount: number;
  };
}
