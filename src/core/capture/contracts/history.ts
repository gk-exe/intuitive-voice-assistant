/**
 * Action History — Contracts
 * --------------------------
 * Every committed action is recorded as an immutable `ActionHistoryEntry`.
 * The history is the platform's audit log AND the substrate for undo,
 * activity feeds, and future AI explainability ("why did the assistant
 * do this?").
 *
 * History is append-only. Reversal is a NEW entry that references the
 * original via `reversesActionId` — never an in-place mutation.
 */

import type { CanonicalEntityRef } from "@/core/knowledge/contracts/entity";
import type { ActionType, ActionSource, CaptureAction } from "./action";

export type HistoryOutcome = "committed" | "failed" | "reversed";

export interface ActionHistoryEntry {
  id: string;
  actionId: string;
  type: ActionType;
  source: ActionSource;
  outcome: HistoryOutcome;
  /** Snapshot of the action at commit time, for replay/audit. */
  actionSnapshot: CaptureAction;
  affected: readonly CanonicalEntityRef[];
  /** Friendly description for activity feeds, e.g. "Payment added". */
  summary: string;
  occurredAt: string;
  correlationId?: string;
  /** Set when this entry undoes a prior action. */
  reversesActionId?: string;
}

export interface HistoryQuery {
  types?: readonly ActionType[];
  entity?: CanonicalEntityRef;
  source?: ActionSource["kind"];
  since?: string;
  until?: string;
  limit?: number;
  cursor?: string;
}

export interface HistoryPage {
  entries: readonly ActionHistoryEntry[];
  nextCursor?: string;
}

export interface ActionHistoryService {
  record(entry: ActionHistoryEntry): Promise<void>;
  query(q: HistoryQuery): Promise<HistoryPage>;
  /** Build a reversal action for a previously committed entry, if reversible. */
  buildReversal(entry: ActionHistoryEntry): Promise<CaptureAction | undefined>;
}
