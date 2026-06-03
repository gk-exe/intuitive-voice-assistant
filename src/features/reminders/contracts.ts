/**
 * Reminder Engine — Contracts
 * ---------------------------
 * A reminder is a scheduled signal to surface a record (or a free-form
 * note) to the user at a future moment. The engine is intentionally
 * decoupled from notification delivery: it OWNS scheduling + state, and
 * EMITS events that the notification architecture consumes.
 *
 * Sources of reminders:
 *   - User-created, free-form ("call Suresh tomorrow")
 *   - Entity-linked, derived from a record's `dueField`
 *     (finance.entry due, bill.entry due, rent rollover, …)
 *   - Automation-created (see core/automation/contracts.ts)
 *
 * The engine is the single source of truth for "what fires when".
 * Records may carry a `ReminderSpec`, but the spec is just an
 * intention — the engine materializes it into a `ReminderInstance`.
 */

export type ReminderId = string;

export type RecurrenceFrequency =
  | "none"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  /** Cron-like, reserved for power users + automation rules. */
  | "custom";

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval?: number; // every N units (default 1)
  /** ISO weekday list for weekly: 1..7 (Mon..Sun). */
  byWeekday?: readonly number[];
  /** End condition; mutually exclusive. */
  until?: string; // ISO
  count?: number;
  /** Custom RRULE string when frequency === "custom". */
  rrule?: string;
}

/** Origin of a reminder — drives display + lifecycle. */
export type ReminderSource =
  | { kind: "manual" }
  | { kind: "entity"; entityType: string; recordId: string; fieldKey: string }
  | { kind: "automation"; ruleId: string };

export type ReminderStatus =
  | "scheduled"
  | "snoozed"
  | "fired"
  | "completed"
  | "dismissed"
  | "cancelled";

/** Persistent definition. One per logical reminder. */
export interface Reminder {
  id: ReminderId;
  title: string;
  /** Optional richer body for notification. */
  body?: string;
  /** Initial fire time, ISO. */
  dueAt: string;
  recurrence?: RecurrenceRule;
  source: ReminderSource;
  /** Notification channels the user opted into for this reminder. */
  channels: readonly NotificationChannel[];
  priority: "low" | "normal" | "high" | "urgent";
  status: ReminderStatus;
  createdAt: string;
  updatedAt: string;
  /** Snoozed-until ISO, when status === "snoozed". */
  snoozedUntil?: string;
}

/**
 * Materialized firing of a recurring reminder. Stored per-occurrence so
 * "completed" / "dismissed" decisions don't bleed across occurrences.
 */
export interface ReminderInstance {
  id: string;
  reminderId: ReminderId;
  scheduledFor: string;
  firedAt?: string;
  status: Extract<ReminderStatus, "scheduled" | "fired" | "completed" | "dismissed" | "snoozed">;
}

export type NotificationChannel =
  | "in-app"
  | "push" // web push / FCM later
  | "local" // device local notification (Flutter)
  | "email"; // far future

/** Engine API surface. UI + automation talk to this, never to storage. */
export interface ReminderEngine {
  schedule(input: Omit<Reminder, "id" | "status" | "createdAt" | "updatedAt">): Promise<Reminder>;
  reschedule(id: ReminderId, patch: Partial<Pick<Reminder, "dueAt" | "recurrence" | "priority" | "title" | "body" | "channels">>): Promise<Reminder>;
  snooze(id: ReminderId, until: string): Promise<Reminder>;
  complete(id: ReminderId): Promise<Reminder>;
  dismiss(id: ReminderId): Promise<Reminder>;
  cancel(id: ReminderId): Promise<void>;
  /** Upcoming instances within a window. */
  upcoming(opts: { from?: string; until: string; limit?: number }): Promise<readonly ReminderInstance[]>;
  /** All reminders attached to a record. */
  forRecord(entityType: string, recordId: string): Promise<readonly Reminder[]>;
}
