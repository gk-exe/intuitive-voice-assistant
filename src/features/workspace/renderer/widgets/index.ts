/**
 * Widget Renderer Registry
 * ------------------------
 * Maps `WidgetKind` → React component. This is the only place where the
 * pure-data widget descriptors become real UI. To add a new widget kind:
 *   1. add it to `WidgetKind` in contracts/module.ts
 *   2. create the component
 *   3. register it here
 *
 * Phase 3 ships only `empty-state` and `quick-actions` — the data-bound
 * `summary`, `list`, `reminder` kinds resolve to the empty state until
 * their owning feature modules land. This keeps the dashboard honest:
 * no fake numbers, no demo content.
 */

import type { ComponentType } from "react";

import type { WidgetDescriptor, WidgetKind } from "../../contracts";
import { EmptyStateWidget } from "./EmptyStateWidget";
import { QuickActionsWidget } from "./QuickActionsWidget";

type AnyProps = Record<string, unknown>;
type WidgetComponent = ComponentType<AnyProps>;

const WIDGET_RENDERERS: Record<WidgetKind, WidgetComponent> = {
  "empty-state": EmptyStateWidget as WidgetComponent,
  "quick-actions": QuickActionsWidget as WidgetComponent,
  // Data-bound kinds intentionally fall back to empty-state until their
  // feature modules ship. Honest emptiness > fake demo data.
  summary: EmptyStateWidget as WidgetComponent,
  list: EmptyStateWidget as WidgetComponent,
  reminder: EmptyStateWidget as WidgetComponent,
};

export function getWidgetRenderer(kind: WidgetKind): WidgetComponent {
  return WIDGET_RENDERERS[kind] ?? EmptyStateWidget;
}

export function registerWidgetRenderer(
  kind: WidgetKind,
  component: WidgetComponent,
): void {
  WIDGET_RENDERERS[kind] = component;
}

export type { WidgetDescriptor };
