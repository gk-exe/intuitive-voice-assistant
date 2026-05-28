/**
 * WidgetRenderer
 * --------------
 * Resolves a single WidgetDescriptor to its registered component and
 * renders it with the descriptor's props. Failure mode is silent (returns
 * null) — a missing widget should never crash the dashboard.
 */

import type { WidgetDescriptor } from "../contracts";
import { getWidgetRenderer } from "./widgets";

interface Props {
  widget: WidgetDescriptor;
}

export function WidgetRenderer({ widget }: Props) {
  const Component = getWidgetRenderer(widget.kind);
  if (!Component) return null;
  return <Component {...(widget.props ?? {})} />;
}
