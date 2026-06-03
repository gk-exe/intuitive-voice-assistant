/**
 * Automation Engine — Contracts
 * -----------------------------
 * Rule-based, event-driven automation. The engine listens on the
 * platform event bus (`core/events/contracts.ts`), evaluates rules
 * against current state + memory, and dispatches `IntentAction`s
 * (the same action shape produced by the intelligence layer) so the
 * downstream executors don't care whether a user, the AI, or a rule
 * authored the action.
 *
 * Rules are DATA, not code, so they can be:
 *   - persisted per-user,
 *   - authored by the AI,
 *   - shipped as built-in starter packs,
 *   - rendered & edited by a future "Automations" UI.
 */

import type { IntentAction } from "@/core/intelligence/contracts";
import type { PlatformEventName } from "@/core/events/contracts";

export type AutomationRuleId = string;

/** Trigger: when does this rule consider firing? */
export type AutomationTrigger =
  | { kind: "event"; event: PlatformEventName }
  | { kind: "schedule"; cron: string }
  /** Relative to a record's due date. */
  | { kind: "due-relative"; entityType: string; offsetMinutes: number };

/** Condition: should this rule actually fire right now? */
export type AutomationCondition =
  | { kind: "always" }
  | { kind: "field-equals"; path: string; value: string | number | boolean | null }
  | { kind: "field-gt"; path: string; value: number }
  | { kind: "field-lt"; path: string; value: number }
  | { kind: "status-in"; statuses: readonly string[] }
  /** Composed conditions. */
  | { kind: "all"; of: readonly AutomationCondition[] }
  | { kind: "any"; of: readonly AutomationCondition[] };

/** Action: declarative — handed to existing executors. */
export interface AutomationAction extends IntentAction {
  /** Optional human-readable label for audit log. */
  label?: string;
}

export interface AutomationRule {
  id: AutomationRuleId;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  condition: AutomationCondition;
  actions: readonly AutomationAction[];
  /** Throttle: minimum minutes between fires per (rule, target). */
  cooldownMinutes?: number;
  /** Free-form tags for grouping ("rent", "finance", "starter-pack"). */
  tags?: readonly string[];
  createdAt: string;
  updatedAt: string;
  /** "user" | "system" | "ai". */
  authoredBy: string;
}

export interface AutomationRunRecord {
  id: string;
  ruleId: AutomationRuleId;
  firedAt: string;
  outcome: "executed" | "skipped-condition" | "skipped-cooldown" | "error";
  message?: string;
  /** Snapshot of the dispatched actions for audit. */
  actions: readonly AutomationAction[];
}

export interface AutomationEngine {
  list(): Promise<readonly AutomationRule[]>;
  upsert(rule: Omit<AutomationRule, "id" | "createdAt" | "updatedAt"> & { id?: AutomationRuleId }): Promise<AutomationRule>;
  remove(id: AutomationRuleId): Promise<void>;
  setEnabled(id: AutomationRuleId, enabled: boolean): Promise<void>;
  /** Manually evaluate a rule against current state — useful for tests. */
  evaluate(id: AutomationRuleId): Promise<AutomationRunRecord>;
  history(opts?: { ruleId?: AutomationRuleId; limit?: number }): Promise<readonly AutomationRunRecord[]>;
}

/** Executor registry: maps `IntentAction.type` → handler. */
export interface ActionExecutor {
  readonly type: string;
  execute(action: AutomationAction): Promise<void>;
}
