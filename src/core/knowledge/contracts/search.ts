/**
 * Universal Search — Contracts
 * ----------------------------
 * One search input answers questions across every module by querying
 * canonical entities, relationships, and the timeline. A search hit is
 * an entity (the noun the user cares about) — module-specific records
 * are reached by following `sourceRecordRef`.
 *
 * Search is a swappable adapter (`SearchProvider`). Today: an in-memory
 * lexical index. Tomorrow: SQLite FTS, Postgres tsvector, or a vector
 * store — all behind the same interface.
 */

import type {
  CanonicalEntity,
  CanonicalEntityKind,
  EntityId,
  EntityTag,
  ISODateString,
} from "./entity";
import type { RelationshipType } from "./relationship";

export type SearchMode = "lexical" | "semantic" | "hybrid";

export interface SearchQuery {
  /** Free-text query — may be code-switched (Manglish/Hinglish). */
  text: string;
  mode?: SearchMode;
  filters?: SearchFilters;
  /** Bias scoring toward entities recently touched by the user. */
  recencyBoost?: boolean;
  limit?: number;
  cursor?: string;
}

export interface SearchFilters {
  kinds?: readonly CanonicalEntityKind[];
  tags?: readonly EntityTag[];
  /** Restrict to entities related to this anchor (e.g. "everything for Rajeev"). */
  relatedTo?: { entityId: EntityId; via?: readonly RelationshipType[] };
  updatedSince?: ISODateString;
}

export interface SearchHit {
  entityId: EntityId;
  kind: CanonicalEntityKind;
  /** Display title — usually `entity.displayName` at index time. */
  title: string;
  /** Short reason this hit matched, suitable for UI subtext. */
  snippet?: string;
  /** 0..1 — higher is better. */
  score: number;
  /** Field-level highlights for the UI to render. */
  highlights?: readonly SearchHighlight[];
  /** Resolved entity, when the provider can include it cheaply. */
  entity?: CanonicalEntity;
}

export interface SearchHighlight {
  field: string;
  fragment: string;
}

export interface SearchResultSet {
  hits: readonly SearchHit[];
  /** Counts per kind for faceted UI. */
  facets?: Partial<Record<CanonicalEntityKind, number>>;
  nextCursor?: string;
  /** True if the lexical layer was bypassed/augmented by the semantic layer. */
  semanticUsed: boolean;
}

/** Document fed to the indexer; one per entity. */
export interface SearchDocument {
  entityId: EntityId;
  kind: CanonicalEntityKind;
  ownerId: string;
  title: string;
  /** Pre-composed searchable body — names, aliases, tags, notes, etc. */
  body: string;
  tags: readonly EntityTag[];
  updatedAt: ISODateString;
}

export interface SearchIndexer {
  index(doc: SearchDocument): Promise<void>;
  remove(entityId: EntityId): Promise<void>;
  /** Bulk rebuild — used after schema migrations. */
  reindexAll(): Promise<void>;
}

export interface SearchProvider {
  search(query: SearchQuery): Promise<SearchResultSet>;
}
