/**
 * RecordEntity
 * ------------
 * The runtime shape of every stored record. Values are an opaque map
 * driven by the EntitySchema — keeping this generic is what lets the
 * same store, repository, form, list, and detail view back every module
 * without per-module forks.
 *
 * Persisted under `voice.records`. Fields are JSON-safe so the same
 * shape survives a future Supabase sync without translation.
 */

import type { ReminderSpec } from "./schema";

export type FieldValue = string | number | null;

export interface RecordEntity {
  id: string;
  /** Matches `EntitySchema.id`, e.g. "finance.entry". */
  entityType: string;
  /** ISO timestamps. */
  createdAt: string;
  updatedAt: string;
  /** Field map keyed by `FieldDef.key`. */
  values: Record<string, FieldValue>;
  /** Current status key, when the entity has a lifecycle. */
  status?: string;
  /** Optional reminder. The reminder engine will consume this later. */
  reminder?: ReminderSpec | null;
}

/** Input shape accepted by `create`. */
export type RecordCreateInput = {
  values: Record<string, FieldValue>;
  status?: string;
  reminder?: ReminderSpec | null;
};

/** Input shape accepted by `update`. All fields optional. */
export type RecordUpdateInput = Partial<RecordCreateInput>;
