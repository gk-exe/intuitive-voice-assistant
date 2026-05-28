/**
 * StackLayout
 * -----------
 * Mobile-first vertical stack with calm, spacious rhythm. The default —
 * and the only one shipped in Phase 3. Grid/adaptive layouts can be added
 * as sibling files and selected via WorkspaceComposition.strategy.
 */

import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export function StackLayout({ children }: Props) {
  return <div className="flex flex-col gap-4">{children}</div>;
}
