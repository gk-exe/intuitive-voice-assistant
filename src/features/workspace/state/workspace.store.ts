/**
 * Workspace State
 * ---------------
 * Owns the user's workspace preferences and onboarding memory. Lives
 * inside the feature (not /store) so the workspace module is self-contained.
 *
 * Phase 3 persists to localStorage; the persisted shape is versioned
 * (`version` on the persist config) so a future migration to Supabase
 * keeps a clean upgrade path. Server code MUST go through a repository,
 * never read this store directly.
 *
 * IMPORTANT — shape stability:
 *   - The persisted key `voice.workspace` is part of the user's data.
 *   - Field names here are part of the migration contract. Add new fields,
 *     don't rename existing ones, and bump `version` when changing semantics.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { CategoryId } from "@/core/categories/registry";
import { isKnownModule } from "../registry";

/** A single onboarding answer, kept verbatim for future AI personalization. */
export interface OnboardingAnswer {
  questionId: string;
  text?: string;
  selections?: string[];
  source: "text" | "voice" | "tap";
  at: string;
}

interface WorkspaceState {
  onboardingComplete: boolean;
  /** Modules the user wants on their dashboard, in display order. */
  modules: CategoryId[];
  /** Modules temporarily hidden without removing (reserved for later UX). */
  hidden: CategoryId[];
  /** Raw onboarding inputs — fuel for the AI layer later. */
  answers: OnboardingAnswer[];

  setModules: (modules: CategoryId[]) => void;
  addModule: (id: CategoryId) => void;
  removeModule: (id: CategoryId) => void;
  reorderModule: (id: CategoryId, direction: "up" | "down") => void;
  moveModule: (id: CategoryId, toIndex: number) => void;

  hideModule: (id: CategoryId) => void;
  showModule: (id: CategoryId) => void;

  recordAnswer: (answer: OnboardingAnswer) => void;
  completeOnboarding: () => void;
  resetWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      onboardingComplete: false,
      modules: [],
      hidden: [],
      answers: [],

      setModules: (modules) =>
        set({ modules: dedupe(modules).filter(isKnownModule) }),

      addModule: (id) => {
        if (!isKnownModule(id)) return;
        const current = get().modules;
        if (current.includes(id)) return;
        set({ modules: [...current, id] });
      },

      removeModule: (id) =>
        set({
          modules: get().modules.filter((m) => m !== id),
          hidden: get().hidden.filter((m) => m !== id),
        }),

      reorderModule: (id, direction) => {
        const modules = [...get().modules];
        const i = modules.indexOf(id);
        if (i === -1) return;
        const j = direction === "up" ? i - 1 : i + 1;
        if (j < 0 || j >= modules.length) return;
        [modules[i], modules[j]] = [modules[j], modules[i]];
        set({ modules });
      },

      moveModule: (id, toIndex) => {
        const modules = [...get().modules];
        const from = modules.indexOf(id);
        if (from === -1) return;
        const clamped = Math.max(0, Math.min(modules.length - 1, toIndex));
        const [item] = modules.splice(from, 1);
        modules.splice(clamped, 0, item);
        set({ modules });
      },

      hideModule: (id) => {
        if (get().hidden.includes(id)) return;
        set({ hidden: [...get().hidden, id] });
      },

      showModule: (id) =>
        set({ hidden: get().hidden.filter((m) => m !== id) }),

      recordAnswer: (answer) =>
        set({ answers: [...get().answers, answer] }),

      completeOnboarding: () => set({ onboardingComplete: true }),

      resetWorkspace: () =>
        set({ onboardingComplete: false, modules: [], hidden: [], answers: [] }),
    }),
    {
      name: "voice.workspace",
      version: 2,
      // Migration from v1 (no `hidden` array) → v2.
      migrate: (persistedState, version) => {
        const state = (persistedState ?? {}) as Partial<WorkspaceState>;
        if (version < 2 && !state.hidden) {
          return { ...state, hidden: [] } as WorkspaceState;
        }
        return state as WorkspaceState;
      },
    },
  ),
);

function dedupe<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
