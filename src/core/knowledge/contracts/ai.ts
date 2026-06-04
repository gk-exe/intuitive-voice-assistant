/**
 * AI Knowledge Layer — Contracts
 * ------------------------------
 * The AI does not query modules. It queries the knowledge graph through
 * a single, narrow surface: `KnowledgeService`. This keeps prompts
 * stable as the underlying storage, embedding, and ranking layers
 * evolve.
 *
 * Capabilities exposed to the AI:
 *   - resolve an entity by natural-language reference ("Rajeev")
 *   - fetch a `ContextSnapshot` for an entity
 *   - traverse relationships to build a sub-graph
 *   - retrieve activity for narrative summarization
 *   - generate suggestions grounded in the graph
 *
 * The service is read-side. Writes happen through normal repositories
 * and propagate to the AI layer via projectors + indexers.
 */

import type {
  CanonicalEntity,
  CanonicalEntityKind,
  EntityId,
  ISODateString,
} from "./entity";
import type { Relationship, RelationshipType } from "./relationship";
import type { ActivityEvent } from "./timeline";
import type { ContextSnapshot, ContextRequest } from "./context";
import type { SearchQuery, SearchResultSet } from "./search";

/**
 * Result of resolving a natural-language mention to an entity.
 * Multiple candidates are returned so the orchestrator can ask for
 * disambiguation ("Did you mean Rajeev (tenant) or Rajeev (cousin)?").
 */
export interface EntityResolution {
  query: string;
  candidates: readonly EntityResolutionCandidate[];
}

export interface EntityResolutionCandidate {
  entityId: EntityId;
  kind: CanonicalEntityKind;
  displayName: string;
  /** 0..1 — higher is better. */
  score: number;
  /** Short disambiguation hint, e.g. "tenant at Kakkanad". */
  hint?: string;
}

/**
 * A bounded sub-graph centered on one entity — the AI's preferred shape
 * for "give me everything about X".
 */
export interface KnowledgeSubgraph {
  root: CanonicalEntity;
  entities: readonly CanonicalEntity[];
  relationships: readonly Relationship[];
  activity: readonly ActivityEvent[];
  generatedAt: ISODateString;
}

export interface SubgraphRequest {
  entityId: EntityId;
  maxHops: number;
  relationshipTypes?: readonly RelationshipType[];
  includeActivitySince?: ISODateString;
  /** Hard cap so the AI prompt stays bounded. */
  maxEntities?: number;
}

/**
 * AI-grounded suggestions. The orchestrator may surface these as
 * proactive nudges or as candidate intents during a conversation.
 */
export interface Suggestion {
  id: string;
  kind: SuggestionKind;
  /** Short, user-facing text. */
  title: string;
  rationale: string;
  /** Entities the suggestion is grounded in (for provenance / UI). */
  grounding: readonly EntityId[];
  /** 0..1 — confidence the suggestion is useful. */
  confidence: number;
  expiresAt?: ISODateString;
}

export type SuggestionKind =
  | "create-reminder"
  | "follow-up"
  | "settle-balance"
  | "link-entities"
  | "archive-stale"
  | "create-recurring"
  | "ask-clarification";

export interface SuggestionRequest {
  /** Anchor entity, when the suggestion is about something specific. */
  entityId?: EntityId;
  /** Free-form intent hint from the orchestrator. */
  intentHint?: string;
  limit?: number;
}

/**
 * The single read surface AI consumers depend on. All other knowledge
 * primitives (entity repo, relationship graph, timeline, search,
 * context) are implementation details behind this façade.
 */
export interface KnowledgeService {
  resolve(query: string, opts?: { kinds?: readonly CanonicalEntityKind[]; limit?: number }): Promise<EntityResolution>;
  context(req: ContextRequest): Promise<ContextSnapshot>;
  subgraph(req: SubgraphRequest): Promise<KnowledgeSubgraph>;
  search(query: SearchQuery): Promise<SearchResultSet>;
  suggest(req: SuggestionRequest): Promise<readonly Suggestion[]>;
}
