/**
 * Intelligence Layer — Contracts
 * ------------------------------
 * The intelligence layer turns a `NormalizedUtterance` (or a typed text
 * command) into a structured `IntentResult` the rest of the system can
 * act on. It is intentionally split into THREE pure stages so each can
 * be replaced independently (rules → on-device model → server LLM):
 *
 *   1. IntentClassifier      → which module/action this is about
 *   2. EntityExtractor       → who, when, how much, where
 *   3. IntentResolver        → final IntentResult, ready for execution
 *
 * Nothing here imports React, Supabase, or any provider SDK. The mock
 * implementation in `services/mock-intelligence` already satisfies the
 * classifier contract for Phase 2; later phases swap it for the real one.
 */

import type { NormalizedUtterance, BCP47 } from "@/core/voice/contracts";
import type { CategoryId } from "@/core/categories/registry";

/** Coarse intent kinds the platform understands today. Additive. */
export type IntentKind =
  | "reminder.create"
  | "reminder.complete"
  | "finance.add"
  | "finance.mark-paid"
  | "grocery.add"
  | "grocery.check"
  | "rent.add-property"
  | "rent.set-vacancy"
  | "bill.add"
  | "bill.mark-paid"
  | "task.add"
  | "task.complete"
  | "goal.add"
  | "note.add"
  | "call.add"
  | "calendar.add"
  | "unknown";

export interface IntentInputText {
  source: "text";
  text: string;
  locale?: BCP47;
}
export interface IntentInputVoice {
  source: "voice";
  utterance: NormalizedUtterance;
}
export type IntentInput = IntentInputText | IntentInputVoice;

/** Score for each candidate category, used by the workspace engine too. */
export interface IntentCandidate {
  kind: IntentKind;
  moduleId: CategoryId;
  /** 0..1 — calibrated, comparable across classifiers. */
  confidence: number;
}

/** Output of the classifier stage. */
export interface IntentClassification {
  primary: IntentCandidate;
  alternates: readonly IntentCandidate[];
}

/* ── Entity Extraction ─────────────────────────────────────────────── */

export type EntityKind =
  | "person"
  | "amount"
  | "currency"
  | "date"
  | "time"
  | "duration"
  | "recurrence"
  | "location"
  | "property"
  | "item"
  | "phone"
  | "category"
  | "free-text";

/** One extracted span, with provenance back into the source text. */
export interface EntitySpan<TValue = unknown> {
  kind: EntityKind;
  /** Stable role inside an intent, e.g. "debtor", "amount", "dueAt". */
  role: string;
  value: TValue;
  /** Original surface form, e.g. "fifteen thousand". */
  rawText: string;
  /** Character offsets in the normalized utterance. */
  span?: { start: number; end: number };
  confidence: number;
}

/** A normalized bag of entities for one utterance. */
export interface EntityExtraction {
  entities: readonly EntitySpan[];
  /** Role → value lookup helper, populated by the resolver. */
  byRole: Record<string, EntitySpan | undefined>;
}

/* ── Final Intent Result ──────────────────────────────────────────── */

/** The contract the automation/reminder/records layers consume. */
export interface IntentResult {
  id: string;
  createdAt: string;
  input: IntentInput;
  classification: IntentClassification;
  extraction: EntityExtraction;
  /**
   * The action the orchestrator should perform. Decoupled from intent
   * kind so one classification can map to multiple actions over time.
   */
  action: IntentAction;
  /** Aggregate confidence — drives confirmation UI threshold. */
  confidence: number;
  /** True if user confirmation is required before execution. */
  requiresConfirmation: boolean;
}

export interface IntentAction {
  /** e.g. "records.create", "records.update-status", "reminders.schedule". */
  type: string;
  /** JSON-safe payload consumed by the corresponding handler. */
  payload: Record<string, unknown>;
}

/* ── Adapter contracts ────────────────────────────────────────────── */

export interface IntentClassifier {
  classify(input: IntentInput): Promise<IntentClassification>;
}
export interface EntityExtractor {
  extract(
    input: IntentInput,
    classification: IntentClassification,
  ): Promise<EntityExtraction>;
}
export interface IntentResolver {
  resolve(
    input: IntentInput,
    classification: IntentClassification,
    extraction: EntityExtraction,
  ): Promise<IntentResult>;
}

/** Façade the UI/voice layer calls. Composes the three stages. */
export interface IntelligenceOrchestrator {
  process(input: IntentInput): Promise<IntentResult>;
}
