/**
 * Unified Action Model — Contracts
 * --------------------------------
 * A single, framework-agnostic shape for every mutation that flows
 * through the platform. Manual forms, voice utterances, AI assistants,
 * and future integrations all produce `CaptureAction`s; the commit
 * layer is the ONLY door to records, reminders, and relations.
 *
 * Rules:
 *   - JSON-safe. No functions, no class instances, no Date objects.
 *   - Additive `ActionType` union. Never repurpose an existing type.
 *   - `payload` shape is keyed by `type` via the discriminated union
 *     `CaptureActionPayloadMap` so handlers stay type-safe.
 *   - Actions are inert data until the commit layer dispatches them.
 */

import type { CategoryId } from "@/core/categories/registry";
import type { CanonicalEntityRef } from "@/core/knowledge/contracts/entity";

/** The closed set of operations the platform understands today. Grows additively. */
export type ActionType =
  | "entity.create"
  | "entity.update"
  | "entity.archive"
  | "entity.delete"
  | "record.status-change"
  | "reminder.create"
  | "reminder.complete"
  | "reminder.snooze"
  | "reminder.cancel"
  | "payment.record"
  | "task.complete"
  | "relation.link"
  | "relation.unlink"
  | "noop";

/** Where the action originated. Drives audit, confirmation policy, and AI training. */
export type ActionSource =
  | { kind: "manual"; surface: "form" | "quick-add" | "detail-page" }
  | { kind: "voice"; utteranceId: string }
  | { kind: "ai"; agent: string; promptId?: string }
  | { kind: "automation"; ruleId: string }
  | { kind: "integration"; provider: string };

/** Payload shapes per action type. Handlers narrow on `type`. */
export interface CaptureActionPayloadMap {
  "entity.create": {
    moduleId: CategoryId;
    entityType: string;
    fields: Record<string, unknown>;
  };
  "entity.update": {
    ref: CanonicalEntityRef;
    fields: Record<string, unknown>;
  };
  "entity.archive": { ref: CanonicalEntityRef };
  "entity.delete": { ref: CanonicalEntityRef };
  "record.status-change": {
    ref: CanonicalEntityRef;
    status: string;
  };
  "reminder.create": {
    title: string;
    dueAt: string;
    entityRef?: CanonicalEntityRef;
    recurrence?: string;
  };
  "reminder.complete": { reminderId: string };
  "reminder.snooze": { reminderId: string; untilAt: string };
  "reminder.cancel": { reminderId: string };
  "payment.record": {
    entryRef: CanonicalEntityRef;
    amount: number;
    paidAt: string;
    method?: string;
  };
  "task.complete": { ref: CanonicalEntityRef };
  "relation.link": {
    from: CanonicalEntityRef;
    to: CanonicalEntityRef;
    relation: string;
  };
  "relation.unlink": {
    from: CanonicalEntityRef;
    to: CanonicalEntityRef;
    relation: string;
  };
  "noop": Record<string, never>;
}

/** A single unit of mutation. Inert until committed. */
export interface CaptureAction<T extends ActionType = ActionType> {
  id: string;
  type: T;
  payload: CaptureActionPayloadMap[T];
  /** 0..1 — drives whether confirmation is required. */
  confidence: number;
  source: ActionSource;
  /** Optional human-readable summary for the confirmation layer. */
  summary?: string;
  /** Stable correlation id linking related actions from one capture. */
  correlationId?: string;
  createdAt: string;
}

/** A capture may produce more than one action (e.g. "buy milk and rice"). */
export type CaptureActionBatch = readonly CaptureAction[];

/** Result of committing one action. */
export interface ActionCommitResult {
  actionId: string;
  status: "committed" | "failed" | "skipped";
  /** Refs to any entities created/affected — feeds the timeline + history. */
  affected?: readonly CanonicalEntityRef[];
  error?: { code: string; message: string };
}

/** The commit layer is the ONLY mutator. Repositories never get called directly from UI. */
export interface ActionCommitter {
  commit(action: CaptureAction): Promise<ActionCommitResult>;
  commitBatch(batch: CaptureActionBatch): Promise<readonly ActionCommitResult[]>;
}
