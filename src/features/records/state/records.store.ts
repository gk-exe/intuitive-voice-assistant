/**
 * Records Store
 * -------------
 * The single in-memory + persisted store backing every module's records.
 * Generic by design — the schema (not the store) decides what a record
 * looks like. This is what lets one CRUD foundation power every module.
 *
 * Persisted under `voice.records` (versioned). Features MUST go through
 * the repository facade (`features/records/repository.ts`) — never reach
 * into the store directly. That keeps a future Supabase swap a one-file
 * change.
 *
 * Shape stability:
 *   - `records[]` entries are part of the user's data. Add fields,
 *     never rename. Bump `version` for breaking changes and write a
 *     `migrate` step.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type {
  RecordEntity,
  RecordCreateInput,
  RecordUpdateInput,
} from "../contracts";

interface RecordsState {
  records: RecordEntity[];

  list: (entityType: string) => RecordEntity[];
  get: (id: string) => RecordEntity | undefined;
  create: (entityType: string, input: RecordCreateInput) => RecordEntity;
  update: (id: string, input: RecordUpdateInput) => RecordEntity | undefined;
  remove: (id: string) => void;
  setStatus: (id: string, status: string) => void;

  /** Test / dev helper. Never call from product code. */
  resetAll: () => void;
}

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  // Crypto-safe where available; falls back to a serviceable random id.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `r_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

export const useRecordsStore = create<RecordsState>()(
  persist(
    (set, get) => ({
      records: [],

      list: (entityType) =>
        get().records.filter((r) => r.entityType === entityType),

      get: (id) => get().records.find((r) => r.id === id),

      create: (entityType, input) => {
        const ts = nowIso();
        const record: RecordEntity = {
          id: newId(),
          entityType,
          createdAt: ts,
          updatedAt: ts,
          values: { ...input.values },
          status: input.status,
          reminder: input.reminder ?? null,
        };
        set({ records: [record, ...get().records] });
        return record;
      },

      update: (id, input) => {
        let updated: RecordEntity | undefined;
        set({
          records: get().records.map((r) => {
            if (r.id !== id) return r;
            updated = {
              ...r,
              values: input.values ? { ...r.values, ...input.values } : r.values,
              status: input.status ?? r.status,
              reminder: input.reminder === undefined ? r.reminder : input.reminder,
              updatedAt: nowIso(),
            };
            return updated;
          }),
        });
        return updated;
      },

      remove: (id) =>
        set({ records: get().records.filter((r) => r.id !== id) }),

      setStatus: (id, status) =>
        set({
          records: get().records.map((r) =>
            r.id === id ? { ...r, status, updatedAt: nowIso() } : r,
          ),
        }),

      resetAll: () => set({ records: [] }),
    }),
    {
      name: "voice.records",
      version: 1,
    },
  ),
);
