/**
 * Cross-Module Coordination — Contracts
 * -------------------------------------
 * Modules are designed as vertical slices, but real life crosses them:
 * a rent property has finance entries; a bill is also a calendar event;
 * a grocery item recurs every week.
 *
 * Rather than letting features import each other, every cross-module
 * link goes through a typed `RelationGraph`. Each edge is a declarative
 * `RelationDef` stored alongside the record. Coordinators (workspace,
 * automation, reminders) traverse the graph instead of hard-coding
 * relationships.
 */

import type { CategoryId } from "@/core/categories/registry";

export type RelationKind =
  /** A → B owns / contains B (rent property → its finance entries). */
  | "owns"
  /** A ↔ B mirror each other (bill ↔ calendar event). */
  | "mirrors"
  /** A derives B (recurring grocery → suggested grocery item). */
  | "derives"
  /** A references B (finance entry → contact). */
  | "references";

export interface RelationEndpoint {
  moduleId: CategoryId;
  entityType: string;
  recordId: string;
}

export interface RelationDef {
  id: string;
  kind: RelationKind;
  from: RelationEndpoint;
  to: RelationEndpoint;
  /** Optional role label, e.g. "tenant", "debtor", "next-occurrence". */
  role?: string;
  createdAt: string;
}

export interface RelationQuery {
  from?: Partial<RelationEndpoint>;
  to?: Partial<RelationEndpoint>;
  kind?: RelationKind;
}

export interface RelationGraph {
  link(rel: Omit<RelationDef, "id" | "createdAt">): Promise<RelationDef>;
  unlink(id: string): Promise<void>;
  query(q: RelationQuery): Promise<readonly RelationDef[]>;
  /** Convenience: all neighbors of a record, any kind. */
  neighbors(endpoint: RelationEndpoint): Promise<readonly RelationDef[]>;
}

/**
 * Declarative coordination policies — read by the automation engine
 * and the workspace summarizer. Example: when a rent property's
 * `paymentStatus` flips to "overdue", surface the linked finance entry
 * on the dashboard with elevated priority.
 *
 * Policies live in `features/<module>/coordination.ts` and are
 * registered centrally. No feature imports another feature directly.
 */
export interface CoordinationPolicy {
  id: string;
  description: string;
  /** Module that OWNS the policy (for attribution + disabling). */
  ownerModule: CategoryId;
  /** Event(s) the policy reacts to — same names as the platform bus. */
  reactsTo: readonly string[];
  /**
   * Pure function described as data: produced relations + dispatched
   * actions. Implementations live in the coordinator runtime, not here.
   */
  effects: readonly CoordinationEffect[];
}

export type CoordinationEffect =
  | { kind: "link"; relation: RelationKind; targetEntity: string; role?: string }
  | { kind: "dispatch-action"; actionType: string }
  | { kind: "raise-priority"; targetEntity: string }
  | { kind: "suggest-record"; targetEntity: string };
