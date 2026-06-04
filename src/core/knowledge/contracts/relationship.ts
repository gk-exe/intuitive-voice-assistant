/**
 * Relationship Graph — Contracts
 * ------------------------------
 * The knowledge model is a property graph: canonical entities are nodes,
 * relationships are typed, directional edges with their own attributes.
 *
 * Many-to-many is the default — a person can be tenant of several
 * properties; a property can have many tenants over time. Edges carry
 * their own lifecycle (start/end), strength (for AI ranking), and
 * provenance.
 *
 * This file is contract-only. The runtime graph store extends
 * `core/relations/contracts.ts` (which already covers module-level
 * coordination) with the canonical-entity vocabulary defined here.
 */

import type {
  CanonicalEntityKind,
  EntityId,
  ISODateString,
  AttributionSource,
} from "./entity";

/**
 * Curated, stable vocabulary. Additive only — never rename.
 * Roles describe WHAT one entity is to another, independent of module.
 */
export type RelationshipType =
  // social / organizational
  | "knows"
  | "family_of"
  | "works_with"
  | "employs"
  | "client_of"
  | "vendor_of"
  // property
  | "owns_property"
  | "tenant_of"
  | "manages_property"
  // financial
  | "owes"
  | "owed_by"
  | "paid"
  | "received_from"
  // operational links
  | "assigned_to"
  | "responsible_for"
  | "scheduled_for"
  | "participates_in"
  // structural / derivation
  | "part_of"
  | "derived_from"
  | "mirrors"
  | "references";

/**
 * Symmetric vs directed. Directed edges read "from → to" using the
 * RelationshipType verb (e.g. "Rajeev — tenant_of → Kakkanad").
 */
export type RelationshipDirection = "directed" | "symmetric";

export interface RelationshipEndpoint {
  entityId: EntityId;
  /** Cached kind — avoids a lookup at traversal time. */
  kind: CanonicalEntityKind;
}

export interface Relationship {
  id: string;
  type: RelationshipType;
  direction: RelationshipDirection;

  from: RelationshipEndpoint;
  to: RelationshipEndpoint;

  /**
   * Optional structured attributes specific to the edge — e.g.
   * { amount: 15000, currency: "INR" } on an `owes` edge. The AI may
   * read these directly when building context.
   */
  attributes?: Record<string, unknown>;

  /** Lifecycle of the relationship itself (not the endpoints). */
  startedAt?: ISODateString;
  endedAt?: ISODateString;

  /**
   * 0..1 — used for ranking when multiple paths exist (e.g. closest
   * contact, primary tenant). Decays over time via the AI layer.
   */
  strength?: number;

  source: AttributionSource;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface RelationshipQuery {
  from?: Partial<RelationshipEndpoint>;
  to?: Partial<RelationshipEndpoint>;
  types?: readonly RelationshipType[];
  /** Include relationships in either direction. */
  undirected?: boolean;
  activeAt?: ISODateString;
  limit?: number;
}

/**
 * Result of a multi-hop traversal — used by the AI layer to build
 * context graphs ("everything related to Rajeev within 2 hops").
 */
export interface RelationshipPath {
  nodes: readonly EntityId[];
  edges: readonly Relationship[];
  /** Sum of (1 - strength) on each edge; lower = stronger path. */
  cost: number;
}

export interface RelationshipGraph {
  link(rel: Omit<Relationship, "id" | "createdAt" | "updatedAt">): Promise<Relationship>;
  unlink(id: string): Promise<void>;
  query(q: RelationshipQuery): Promise<readonly Relationship[]>;
  neighbors(entityId: EntityId, types?: readonly RelationshipType[]): Promise<readonly Relationship[]>;
  /** Bounded traversal — depth-limited for tractable AI prompts. */
  traverse(from: EntityId, opts: { maxDepth: number; types?: readonly RelationshipType[] }): Promise<readonly RelationshipPath[]>;
}
