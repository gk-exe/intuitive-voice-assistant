/**
 * WorkspaceRenderer
 * -----------------
 * Pure renderer: given a WorkspaceComposition, draw it using the chosen
 * layout strategy. No store reads, no engine calls — that's the caller's
 * job. This separation is what lets us later render an AI-generated
 * composition or a server-synced one with the exact same code path.
 */

import type { ReactNode } from "react";

import type { ComposedModule, WorkspaceComposition } from "../contracts";
import { StackLayout } from "../layouts/StackLayout";
import { ModuleCard } from "./ModuleCard";

interface Props {
  composition: WorkspaceComposition;
  /**
   * Optional per-module decorator — e.g. edit-mode controls. Receives the
   * composed module and returns extra nodes to render after the card.
   * Keeps the renderer free of edit logic.
   */
  decorate?: (composed: ComposedModule) => ReactNode;
}

export function WorkspaceRenderer({ composition, decorate }: Props) {
  const items = composition.modules.map((composed) => (
    <div key={composed.module.id}>
      <ModuleCard composed={composed} />
      {decorate?.(composed)}
    </div>
  ));

  // Layout strategy switch — extend with grid/adaptive layouts later.
  switch (composition.strategy) {
    case "stack":
    default:
      return <StackLayout>{items}</StackLayout>;
  }
}
