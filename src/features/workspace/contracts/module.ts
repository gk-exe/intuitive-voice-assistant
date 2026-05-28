/**
 * Module Contracts
 * ----------------
 * The framework-agnostic shape of a "module" — one life-domain building
 * block (finance, groceries, rent, …) that the workspace engine composes
 * into a personalized dashboard.
 *
 * Design rules:
 *   - Pure data. No React, no Supabase, no business logic here.
 *   - Stable keys. Module ids and widget kinds are part of the persisted
 *     user state — never rename, only add.
 *   - Renderer-decoupled. A widget is a `{ kind, props }` descriptor; the
 *     renderer maps `kind` to a component. This is what lets a future AI
 *     layer *generate* a workspace as pure JSON without touching React.
 *   - Flutter-portable. Every field maps cleanly to Dart.
 *
 * The registry (`features/workspace/registry/module.registry.ts`) is the
 * single source of truth for which modules exist and what they default to.
 */

import type { CategoryId } from "@/core/categories/registry";

/** Semantic color token (matches CSS vars in src/styles.css). */
export type ColorToken =
  | "primary"
  | "accent"
  | "success"
  | "warning"
  | "secondary";

/** Visual footprint a module wants on the dashboard. */
export type ModuleSize = "sm" | "md" | "lg";

/**
 * Built-in widget kinds. Each kind has a renderer registered in
 * `features/workspace/renderer/widgets`. Add a new kind by:
 *   1. extending this union,
 *   2. registering a renderer,
 *   3. (optionally) referencing it from a module's default `widgets`.
 *
 * NOTE: Phase 3 ships only render-safe "empty state" and "quick actions"
 * widgets — we do not fake analytics or numbers. Data-bound widgets land
 * with each module's real feature work.
 */
export type WidgetKind =
  | "empty-state"
  | "quick-actions"
  | "summary"
  | "list"
  | "reminder";

/** A widget instance the engine asks the renderer to draw. */
export interface WidgetDescriptor {
  /** Stable within a module — used as React key and for AI patches later. */
  id: string;
  kind: WidgetKind;
  /** Free-form props consumed by the kind's renderer. */
  props?: Record<string, unknown>;
}

/**
 * Quick action surfaced on a module card. `intent` is a stable string the
 * future voice/AI orchestrator dispatches against — it is NOT a route or
 * a function reference, so it survives Flutter and serialization.
 *
 * Example intents: "finance.add-entry", "groceries.add-item".
 */
export interface QuickAction {
  id: string;
  /** i18n key. */
  labelKey: string;
  /** lucide-react icon name. */
  icon: string;
  /** Action contract — dispatched by the orchestrator, not invoked directly. */
  intent: string;
  /** Visual emphasis. `primary` renders as the main CTA on the card. */
  emphasis?: "primary" | "ghost";
}

/** Hints reserved for the future AI orchestration / personalization layer. */
export interface ModuleAIHooks {
  /** Intent strings the AI may emit that should route to this module. */
  intents: readonly string[];
  /** Free-text examples the AI can use for few-shot prompting later. */
  examplePhrases?: readonly string[];
}

/**
 * The full contract for a workspace module. Composed from a CategoryDefinition
 * (which owns visual metadata + parser keywords) plus module-specific
 * behavior: layout, default widget composition, quick actions, AI hooks.
 */
export interface ModuleDefinition {
  /** Same id as the CategoryDefinition this module backs. */
  id: CategoryId;
  /** i18n key — defaults to `categories.<id>`. */
  titleKey: string;
  /** i18n key for the calm one-liner shown on empty cards. */
  blurbKey: string;
  /** lucide-react icon name. */
  icon: string;
  colorToken: ColorToken;
  layout: {
    /** Lower = higher on the stack when the user has no custom order. */
    defaultOrder: number;
    size: ModuleSize;
  };
  /**
   * Default widget composition for a freshly-added module. The composer
   * uses this verbatim until per-user customization arrives in a later
   * phase. AI-generated layouts will replace this list at runtime — same
   * shape, different source.
   */
  widgets: readonly WidgetDescriptor[];
  quickActions: readonly QuickAction[];
  ai: ModuleAIHooks;
}
