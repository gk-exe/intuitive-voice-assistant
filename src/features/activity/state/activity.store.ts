/**
 * Activity Store
 * --------------
 * A bounded, persisted feed of meaningful changes the user makes.
 * Powers the "Recent activity" section on the home dashboard and gives
 * users a visible sense of progress without inventing analytics.
 *
 * Bounded to the last 100 entries. Future Supabase sync will replace
 * the storage layer without touching consumers.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { CategoryId } from "@/core/categories/registry";

export type ActivityKind =
  | "created"
  | "updated"
  | "completed"
  | "status-changed"
  | "deleted";

export type ActivitySource = "manual" | "capture" | "voice";

export interface ActivityItem {
  id: string;
  at: string;
  kind: ActivityKind;
  entityType: string;
  moduleId: CategoryId;
  recordId: string;
  /** Human title (e.g. "Rajeev", "Buy milk"). */
  title: string;
  /** Optional short detail line ("paid", "+₹15,000"). */
  detail?: string;
  source: ActivitySource;
}

const MAX_ITEMS = 100;

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `a_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

interface ActivityState {
  items: ActivityItem[];
  log: (it: Omit<ActivityItem, "id" | "at">) => ActivityItem;
  clear: () => void;
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      items: [],
      log: (it) => {
        const entry: ActivityItem = { ...it, id: newId(), at: new Date().toISOString() };
        set({ items: [entry, ...get().items].slice(0, MAX_ITEMS) });
        return entry;
      },
      clear: () => set({ items: [] }),
    }),
    { name: "voice.activity", version: 1 },
  ),
);
