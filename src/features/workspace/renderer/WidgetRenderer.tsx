/**
 * WidgetRenderer
 * --------------
 * Resolves a single WidgetDescriptor to its registered component and
 * renders it with the descriptor's props (plus any orchestration callbacks
 * forwarded by the host card). Failure mode is silent — a missing widget
 * should never crash the dashboard.
 */

import type { WidgetDescriptor } from "../contracts";
import { getWidgetRenderer } from "./widgets";

interface Props {
  widget: WidgetDescriptor;
  /** Forwarded to widgets that emit intents (e.g. QuickActionsWidget). */
  onDispatch?: (intent: string) => void;
}

export function WidgetRenderer({ widget, onDispatch }: Props) {
  const Component = getWidgetRenderer(widget.kind);
  if (!Component) return null;
  return <Component {...(widget.props ?? {})} onDispatch={onDispatch} />;
}
