/**
 * Workspace selectors
 * -------------------
 * Derived state lives here, not in the store. Keeps the store small and
 * makes memoization explicit.
 */

import { useMemo } from "react";

import { composeWorkspace } from "../engine";
import type { WorkspaceComposition, WorkspacePreferences } from "../contracts";
import { useWorkspaceStore } from "./workspace.store";

export function useWorkspacePreferences(): WorkspacePreferences {
  const enabled = useWorkspaceStore((s) => s.modules);
  const hidden = useWorkspaceStore((s) => s.hidden);
  return useMemo(() => ({ enabled, hidden }), [enabled, hidden]);
}

export function useWorkspaceComposition(): WorkspaceComposition {
  const prefs = useWorkspacePreferences();
  return useMemo(() => composeWorkspace(prefs, { source: "user" }), [prefs]);
}
