/**
 * Entity Schema Contracts
 * -----------------------
 * Declarative, framework-agnostic schemas that drive the entire records
 * system: form generation, list rendering, detail views, grouping, and
 * the future AI orchestrator.
 *
 * Design rules:
 *   - Pure data. No React. No Supabase. No business logic.
 *   - Stable keys. `field.key`, `entity.id`, and `status.key` are part of
 *     the persisted user data — add fields, never rename.
 *   - Flutter-portable. Each shape maps 1:1 to a Dart class.
 *   - Renderer-decoupled. UI maps `FieldType` → input component, schema
 *     stays UI-free.
 *
 * The registry (`features/records/registry/entity.registry.ts`) is the
 * single source of truth for which entities exist.
 */

import type { CategoryId } from "@/core/categories/registry";

/** Atomic field types the form/list renderers know how to draw. */
export type FieldType =
  | "text"
  | "longtext"
  | "number"
  | "money"
  | "date"
  | "select"
  | "phone";

export interface FieldOption {
  value: string;
  /** i18n key for the option label. */
  labelKey: string;
}

export interface FieldDef {
  /** Stable persisted key. Never rename. */
  key: string;
  type: FieldType;
  /** i18n key for the field label. */
  labelKey: string;
  required?: boolean;
  /** Required when `type === "select"`. */
  options?: readonly FieldOption[];
  /** i18n key for the placeholder. */
  placeholderKey?: string;
  /** ISO-4217 currency for "money" fields. Defaults to "INR" at render. */
  currency?: string;
}

/** Visual tone for status pills. */
export type StatusTone = "neutral" | "success" | "warning" | "danger" | "accent";

export interface StatusDef {
  /** Stable persisted key. */
  key: string;
  /** i18n key for the status label. */
  labelKey: string;
  tone: StatusTone;
}

/** How the list view groups records. */
export type GroupBy = "status" | "dueWindow" | "none";

/** Schema for a single entity type. */
export interface EntitySchema {
  /** Stable id, e.g. "finance.entry". Persisted on every record. */
  id: string;
  moduleId: CategoryId;
  /** i18n keys. */
  pluralKey: string;
  singularKey: string;
  addLabelKey: string;
  emptyKey: string;
  /** Field declarations, in display order. */
  fields: readonly FieldDef[];
  /** Field key used as the row headline. Must exist in `fields`. */
  titleField: string;
  /** Optional secondary line on the row. */
  subtitleField?: string;
  /** Optional money field surfaced in summaries / detail header. */
  amountField?: string;
  /** Optional date field used for due-window grouping and reminders. */
  dueField?: string;
  /** Status configuration. Omit if the entity has no lifecycle. */
  statuses?: readonly StatusDef[];
  /** Default status applied on creation. */
  defaultStatus?: string;
  /** Default grouping for the list view. */
  groupBy?: GroupBy;
  /** Whether the entity is compatible with the future reminder engine. */
  reminderCompatible: boolean;
}

/**
 * Reminder metadata attached to a record. Honored by the future reminder
 * engine; today the system only persists and surfaces it on the detail
 * page so users feel the system is operationally aware.
 */
export interface ReminderSpec {
  /** ISO string for when the reminder fires. */
  dueAt: string;
  recurrence?: "none" | "daily" | "weekly" | "monthly" | "yearly";
  /** Reserved for future notification config. */
  notifyMinutesBefore?: number;
}
