/**
 * Canonical Entity Model — Contracts
 * ----------------------------------
 * Modules (finance, rent, groceries, …) are PRESENTATION layers.
 * The platform's long-term memory is built from CANONICAL ENTITIES that
 * model the real world: people, properties, organizations, money, time,
 * intentions. AI reasoning, search, timelines, and relationships all
 * operate on these entities — never on module-specific record shapes.
 *
 * Rules for this file:
 *   - Pure TypeScript types. No runtime. No React. No Supabase.
 *   - JSON-safe. Dates are ISO-8601 strings.
 *   - Additive evolution only. Never rename a field; deprecate + add.
 *   - Ports 1:1 to Dart for the Flutter app.
 */

import type { CategoryId } from "@/core/categories/registry";

export type EntityId = string;
export type ISODateString = string;

/**
 * Canonical entity kinds. The AI thinks in this vocabulary.
 * Module-level record types (e.g. `finance.entry`) MAP to one of these.
 */
export type CanonicalEntityKind =
  | "person"
  | "organization"
  | "property"
  | "financial_entry"
  | "bill"
  | "reminder"
  | "task"
  | "goal"
  | "event"
  | "grocery_item"
  | "note";

/**
 * Confidence + provenance metadata attached to AI-derived facts.
 * Every field on every entity may be wrapped in this when needed; the
 * raw value form is preserved for human-entered data.
 */
export interface AttributedValue<T> {
  value: T;
  /** 0..1 — model confidence; 1 for user-confirmed values. */
  confidence: number;
  source: AttributionSource;
  observedAt: ISODateString;
}

export type AttributionSource =
  | { kind: "user" }
  | { kind: "voice"; utteranceId: string }
  | { kind: "automation"; ruleId: string }
  | { kind: "ai"; model: string }
  | { kind: "import"; system: string };

/** Free-form, user- or AI-assigned tags. */
export type EntityTag = string;

/**
 * Sensitivity governs sync, encryption, and export behavior. Mirrors
 * `MemorySensitivity` so policies stay consistent across the platform.
 */
export type EntitySensitivity = "low" | "personal" | "financial" | "secret";

/**
 * Lifecycle status of any entity. Module-level statuses (e.g. "paid",
 * "overdue") map to one of these for cross-cutting queries.
 */
export type EntityLifecycle =
  | "active"
  | "archived"
  | "completed"
  | "cancelled"
  | "deleted";

/**
 * Common envelope shared by every canonical entity. Module-specific
 * payloads live on `attributes`; cross-cutting concerns live here.
 */
export interface CanonicalEntityBase<
  K extends CanonicalEntityKind = CanonicalEntityKind,
  A extends object = Record<string, unknown>,
> {
  id: EntityId;
  kind: K;
  /** Owning user/account; required for multi-tenant queries. */
  ownerId: string;

  /** Display label used by search + timeline + suggestions. */
  displayName: string;
  /** Optional one-line summary for AI context windows. */
  summary?: string;

  /** Module that originated the entity (presentation, not identity). */
  originModule?: CategoryId;
  /**
   * Module-specific record id this canonical entity projects from.
   * Allows round-tripping between presentation records and canonical
   * entities without coupling the AI layer to module schemas.
   */
  sourceRecordRef?: SourceRecordRef;

  /** Structured, kind-specific data. Validated per-kind elsewhere. */
  attributes: A;

  tags: readonly EntityTag[];
  lifecycle: EntityLifecycle;
  sensitivity: EntitySensitivity;

  createdAt: ISODateString;
  updatedAt: ISODateString;
  /** Soft delete marker — preserved for audit + AI memory. */
  deletedAt?: ISODateString;

  /** Reserved namespace for future AI-derived metadata (embeddings, etc). */
  ai?: EntityAIMetadata;
}

export interface SourceRecordRef {
  moduleId: CategoryId;
  entityType: string; // e.g. "finance.entry"
  recordId: string;
}

export interface EntityAIMetadata {
  /** Vector embedding id (stored externally; this is only the handle). */
  embeddingId?: string;
  /** Last time the AI layer refreshed its derived view of this entity. */
  lastIndexedAt?: ISODateString;
  /** AI-assigned topical labels (separate from user tags). */
  topics?: readonly string[];
  /** Free-form notes the AI keeps about the entity (capped). */
  observations?: readonly AIObservation[];
}

export interface AIObservation {
  id: string;
  text: string;
  source: AttributionSource;
  observedAt: ISODateString;
  /** 0..1 — drives decay / pruning. */
  salience: number;
}

/* ─────────────────────────── Kind-specific shapes ─────────────────────── */

export interface PersonAttributes {
  fullName?: string;
  aliases?: readonly string[];
  phones?: readonly string[];
  emails?: readonly string[];
  /** Free-form roles the user has assigned: "tenant", "father", "client". */
  roles?: readonly string[];
  birthday?: ISODateString;
}

export interface OrganizationAttributes {
  legalName?: string;
  category?: string; // "bank", "utility", "vendor", …
  website?: string;
  phones?: readonly string[];
}

export interface PropertyAttributes {
  label: string;
  address?: string;
  type?: "residential" | "commercial" | "land" | "other";
  ownership?: "owned" | "rented-out" | "renting" | "managed";
}

export interface FinancialEntryAttributes {
  direction: "incoming" | "outgoing";
  amount: number;
  currency: string; // ISO-4217
  /** What the money is FOR — purely descriptive. */
  purpose?: string;
  dueAt?: ISODateString;
  settledAt?: ISODateString;
}

export interface BillAttributes {
  label: string;
  amount?: number;
  currency?: string;
  dueAt?: ISODateString;
  recurring: boolean;
  paid: boolean;
}

export interface ReminderAttributes {
  title: string;
  dueAt: ISODateString;
  recurrence?: "daily" | "weekly" | "monthly" | "yearly" | null;
}

export interface TaskAttributes {
  title: string;
  dueAt?: ISODateString;
  doneAt?: ISODateString;
  priority?: "low" | "normal" | "high" | "urgent";
}

export interface GoalAttributes {
  title: string;
  horizon?: "week" | "month" | "quarter" | "year" | "life";
  /** Optional measurable target. */
  target?: { metric: string; value: number; unit?: string };
}

export interface EventAttributes {
  title: string;
  startAt: ISODateString;
  endAt?: ISODateString;
  location?: string;
}

export interface GroceryItemAttributes {
  name: string;
  quantity?: string;
  recurring?: "weekly" | "monthly" | null;
}

export interface NoteAttributes {
  body: string;
}

/* ─────────────────────────── Typed entity union ───────────────────────── */

export type PersonEntity = CanonicalEntityBase<"person", PersonAttributes>;
export type OrganizationEntity = CanonicalEntityBase<"organization", OrganizationAttributes>;
export type PropertyEntity = CanonicalEntityBase<"property", PropertyAttributes>;
export type FinancialEntryEntity = CanonicalEntityBase<"financial_entry", FinancialEntryAttributes>;
export type BillEntity = CanonicalEntityBase<"bill", BillAttributes>;
export type ReminderEntity = CanonicalEntityBase<"reminder", ReminderAttributes>;
export type TaskEntity = CanonicalEntityBase<"task", TaskAttributes>;
export type GoalEntity = CanonicalEntityBase<"goal", GoalAttributes>;
export type EventEntity = CanonicalEntityBase<"event", EventAttributes>;
export type GroceryItemEntity = CanonicalEntityBase<"grocery_item", GroceryItemAttributes>;
export type NoteEntity = CanonicalEntityBase<"note", NoteAttributes>;

export type CanonicalEntity =
  | PersonEntity
  | OrganizationEntity
  | PropertyEntity
  | FinancialEntryEntity
  | BillEntity
  | ReminderEntity
  | TaskEntity
  | GoalEntity
  | EventEntity
  | GroceryItemEntity
  | NoteEntity;

/**
 * Read-side façade. Implementations live in
 * `services/knowledge/entity.repository.ts` (later phase). The contract
 * stays free of storage details so the same interface serves a local
 * Zustand-backed implementation today and a Supabase/edge implementation
 * tomorrow.
 */
export interface EntityRepository {
  get(id: EntityId): Promise<CanonicalEntity | null>;
  list(query: EntityListQuery): Promise<readonly CanonicalEntity[]>;
  upsertFromRecord(ref: SourceRecordRef): Promise<CanonicalEntity>;
  softDelete(id: EntityId, reason?: string): Promise<void>;
}

export interface EntityListQuery {
  kinds?: readonly CanonicalEntityKind[];
  tags?: readonly EntityTag[];
  lifecycle?: readonly EntityLifecycle[];
  updatedSince?: ISODateString;
  limit?: number;
  cursor?: string;
}
