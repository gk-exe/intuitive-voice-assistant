/**
 * Workspace Store — user memory + dashboard layout
 * ------------------------------------------------
 * Lightweight personalization layer. Persisted to localStorage so the app
 * "remembers" the user across reloads without a backend (Phase 3 will move
 * this to Supabase, but the surface won't change — UI keeps calling the
 * same hooks).
 *
 * What lives here:
 *   - which modules (categories) the user enabled during onboarding
 *   - their order on the dashboard
 *   - the raw answers they gave during onboarding (for later AI context)
 *   - whether onboarding is complete
 *
 * What does NOT live here:
 *   - server data (reminders, finance entries, …) → TanStack Query
 *   - theme/locale → already in ui.store
 *   - auth → auth.store
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { CategoryId } from "@/core/categories/registry";

/** A single onboarding answer, kept verbatim for future AI personalization. */
export interface OnboardingAnswer {
  questionId: string;
  /** Free text the user typed/spoke, if any. */
  text?: string;
  /** Structured selections (e.g. picked categories). */
  selections?: string[];
  /** Source of input — lets us upgrade to real voice without schema change. */
  source: "text" | "voice" | "tap";
  at: string; // ISO timestamp
}

interface WorkspaceState {
  onboardingComplete: boolean;
  /** Categories the user wants on their dashboard, in display order. */
  modules: CategoryId[];
  /** Raw onboarding inputs — kept lean, useful for the AI layer later. */
  answers: OnboardingAnswer[];

  setModules: (modules: CategoryId[]) => void;
  addModule: (id: CategoryId) => void;
  removeModule: (id: CategoryId) => void;
  reorderModule: (id: CategoryId, direction: "up" | "down") => void;

  recordAnswer: (answer: OnboardingAnswer) => void;
  completeOnboarding: () => void;
  resetWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      onboardingComplete: false,
      modules: [],
      answers: [],

      setModules: (modules) => set({ modules: dedupe(modules) }),

      addModule: (id) => {
        const current = get().modules;
        if (current.includes(id)) return;
        set({ modules: [...current, id] });
      },

      removeModule: (id) =>
        set({ modules: get().modules.filter((m) => m !== id) }),

      reorderModule: (id, direction) => {
        const modules = [...get().modules];
        const i = modules.indexOf(id);
        if (i === -1) return;
        const j = direction === "up" ? i - 1 : i + 1;
        if (j < 0 || j >= modules.length) return;
        [modules[i], modules[j]] = [modules[j], modules[i]];
        set({ modules });
      },

      recordAnswer: (answer) =>
        set({ answers: [...get().answers, answer] }),

      completeOnboarding: () => set({ onboardingComplete: true }),

      resetWorkspace: () =>
        set({ onboardingComplete: false, modules: [], answers: [] }),
    }),
    { name: "voice.workspace" },
  ),
);

function dedupe<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
