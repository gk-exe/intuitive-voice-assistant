/**
 * Context Model — Contracts
 * -------------------------
 * "Context" is the AI's working understanding of an entity at a moment
 * in time. It is derived (never user-edited) by composing:
 *   - the canonical entity itself
 *   - its strongest relationships
 *   - recent + salient activity events
 *   - relevant memory entries
 *
 * A `ContextSnapshot` is what the AI receives in its prompt window —
 * trimmed, ranked, and budget-aware. The snapshot is reproducible:
 * given the same inputs, the same snapshot is produced.
 */

import type {
  CanonicalEntity,
  CanonicalEntityKind,
  EntityId,
  ISODateString,
} from "./entity";
import type { Relationship } from "./relationship";
import type { ActivityEvent } from "./timeline";

/**
 * A single fact the AI can reason about. Facts are normalized so the
 * model sees a consistent shape regardless of source.
 */
export interface ContextFact {
  id: string;
  /** Short natural-language statement. */
  statement: string;
  /** Where the fact came from. */
  derivedFrom: ContextFactSource;
  /** 0..1 — used for inclusion + ordering when the budget is tight. */
  salience: number;
  /** When the fact became true. */
  asOf: ISODateString;
  /** Optional expiry (e.g. "due tomorrow" is stale after the date). */
  expiresAt?: ISODateString;
}

export type ContextFactSource =
  | { kind: "entity"; entityId: EntityId; field: string }
  | { kind: "relationship"; relationshipId: string }
  | { kind: "activity"; activityId: string }
  | { kind: "memory"; namespace: string; key: string }
  | { kind: "ai-inference"; model: string };

/**
 * Roles the entity plays — derived from relationships. Stable strings
 * because the AI prompt references them directly.
 */
export type ContextRole =
  | "tenant"
  | "landlord"
  | "owner"
  | "debtor"
  | "creditor"
  | "vendor"
  | "client"
  | "family"
  | "colleague"
  | "participant"
  | "responsible"
  | string; // free-form roles allowed

export interface ContextSnapshot {
  subject: CanonicalEntity;
  generatedAt: ISODateString;

  roles: readonly ContextRole[];

  /** Top-N relationships by strength, capped by budget. */
  relationships: readonly Relationship[];
  /** Top-N activity events by recency × salience, capped by budget. */
  recentActivity: readonly ActivityEvent[];
  /** Composed, ranked facts — the primary AI input surface. */
  facts: readonly ContextFact[];

  /**
   * Resource accounting — lets the orchestrator decide whether to
   * request more context or proceed.
   */
  budget: ContextBudget;
}

export interface ContextBudget {
  /** Soft cap on facts + activity in the snapshot. */
  maxItems: number;
  /** Approx token budget the snapshot was sized against. */
  approxTokens: number;
  /** True when budget forced the snapshot to drop low-salience items. */
  truncated: boolean;
}

export interface ContextRequest {
  entityId: EntityId;
  /** Bias selection toward facts relevant to the intent at hand. */
  intentHint?: string;
  budget?: Partial<ContextBudget>;
  /** Include indirect context up to N hops in the relationship graph. */
  maxHops?: number;
  /** Restrict the snapshot to these entity kinds when traversing. */
  expandKinds?: readonly CanonicalEntityKind[];
}

/**
 * The context service is pure — same inputs, same snapshot. It does
 * not write; it only reads from repositories.
 */
export interface ContextService {
  snapshot(req: ContextRequest): Promise<ContextSnapshot>;
}
