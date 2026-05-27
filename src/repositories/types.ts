/**
 * Repository contracts.
 *
 * The repository layer hides the data source from features. Today it will
 * be backed by Supabase; tomorrow it could be Firestore or SQLite (Flutter).
 * Features depend on these interfaces — NOT on Supabase directly.
 *
 * Implementations live in /repositories/<entity>.repository.ts and are
 * registered via /repositories/index.ts. To swap backends, swap the
 * implementation; no feature code changes.
 */

import type {
  Reminder,
  FinanceEntry,
  GroceryItem,
  BillEntry,
  ID,
} from "@/core/types/domain";

export interface ListOptions {
  limit?: number;
  cursor?: string;
}

export interface CrudRepository<T, CreateInput, UpdateInput> {
  list(opts?: ListOptions): Promise<T[]>;
  get(id: ID): Promise<T | null>;
  create(input: CreateInput): Promise<T>;
  update(id: ID, input: UpdateInput): Promise<T>;
  remove(id: ID): Promise<void>;
}

export type ReminderRepository = CrudRepository<
  Reminder,
  Omit<Reminder, "id" | "ownerId" | "createdAt" | "updatedAt">,
  Partial<Reminder>
>;

export type FinanceRepository = CrudRepository<
  FinanceEntry,
  Omit<FinanceEntry, "id" | "ownerId" | "createdAt" | "updatedAt">,
  Partial<FinanceEntry>
>;

export type GroceryRepository = CrudRepository<
  GroceryItem,
  Omit<GroceryItem, "id" | "ownerId" | "createdAt" | "updatedAt">,
  Partial<GroceryItem>
>;

export type BillRepository = CrudRepository<
  BillEntry,
  Omit<BillEntry, "id" | "ownerId" | "createdAt" | "updatedAt">,
  Partial<BillEntry>
>;
