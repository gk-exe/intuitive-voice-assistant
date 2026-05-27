/**
 * Domain data contracts.
 *
 * These are the canonical shapes shared across the app — UI, repositories,
 * services, and (eventually) the Flutter port. Keep them:
 *   - serializable (JSON-safe, no Date objects at the boundary — use ISO strings)
 *   - framework-agnostic (no React, no Supabase, no zod imports here)
 *   - additive (extend, don't rename, to preserve mobile parity)
 *
 * Business logic lives in /features/<module>/services and /repositories.
 * UI never reads/writes these directly without going through a repository.
 */

export type ID = string;
export type ISODateString = string;

export type IntentCategory =
  | "reminder"
  | "finance"
  | "grocery"
  | "property_rent"
  | "property_sale"
  | "goal"
  | "bill"
  | "note"
  | "call"
  | "calendar_event";

export type Priority = "low" | "normal" | "high" | "urgent";

export interface BaseEntity {
  id: ID;
  ownerId: ID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** A raw voice capture, before intent classification. */
export interface VoiceCapture extends BaseEntity {
  transcript: string;
  language: string; // BCP-47, e.g. "en", "ml", "hi", "en-IN"
  durationMs: number;
  audioUrl?: string;
}

/** Result of the AI intent layer. UI uses this for the confirmation step. */
export interface ParsedIntent {
  category: IntentCategory;
  summary: string;
  entities: Record<string, string | number | null>;
  confidence: number; // 0..1
  sourceCaptureId?: ID;
}

export interface Reminder extends BaseEntity {
  title: string;
  dueAt: ISODateString;
  recurrence?: "daily" | "weekly" | "monthly" | "yearly" | null;
  priority: Priority;
  completed: boolean;
}

export interface FinanceEntry extends BaseEntity {
  personName: string;
  amountPending: number;
  amountPaid: number;
  currency: string; // ISO 4217, e.g. "INR"
  dueAt?: ISODateString;
  phone?: string;
  notes?: string;
}

export interface GroceryItem extends BaseEntity {
  name: string;
  quantity?: string;
  category?: string;
  checked: boolean;
}

export interface BillEntry extends BaseEntity {
  label: string;
  amount?: number;
  currency: string;
  dueAt?: ISODateString;
  recurring: boolean;
  paid: boolean;
}
