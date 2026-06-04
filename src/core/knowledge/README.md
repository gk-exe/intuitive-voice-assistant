# `core/knowledge/` — Canonical Knowledge Model (Phase 7)

The long-term memory of the platform. Modules come and go; this model
stays. Everything the AI reasons about — people, properties, money,
intentions, time — lives here as **canonical entities** and **typed
relationships**, projected into a **universal timeline** and surfaced
through a single **knowledge service**.

This phase ships CONTRACTS ONLY. No UI, no runtime, no mock data.

## Why a knowledge model (not a module model)

Modules are presentation. The AI does not think "open finance" — it
thinks "Rajeev owes 15000, due Friday, tenant at Kakkanad". The model
below encodes that vocabulary directly.

## Layout

```
core/knowledge/
  contracts/
    entity.ts         Canonical entities (Person, Property, …) + envelope
    relationship.ts   Typed, directional, attributed edges; m:n
    timeline.ts       ActivityEvent + projector + repository
    context.ts        ContextSnapshot + ContextFact + ranking budget
    search.ts         Universal search across all canonical entities
    ai.ts             KnowledgeService — the AI's single read surface
    index.ts          Public barrel
```

## The eight pillars

1. **Canonical Entity System** (`entity.ts`)
   - One envelope (`CanonicalEntityBase`) for every kind.
   - Kind-specific `attributes`; cross-cutting metadata lives in the envelope.
   - `sourceRecordRef` links back to the module record that projected the entity — so presentation and knowledge stay in sync without coupling.
   - `AttributedValue<T>` and `AttributionSource` capture provenance (user / voice / ai / automation) and confidence.

2. **Relationship Graph** (`relationship.ts`)
   - Property graph with curated `RelationshipType` vocabulary (`tenant_of`, `owes`, `owns_property`, …).
   - Many-to-many by default, with `startedAt` / `endedAt` for temporal edges.
   - Edge `attributes` carry domain detail (e.g. `{ amount, currency }` on `owes`).
   - Bounded `traverse(maxDepth)` keeps AI prompts tractable.

3. **Timeline Model** (`timeline.ts`)
   - Append-only `ActivityEvent` stream per owner.
   - Curated `ActivityVerb`s; tense-agnostic for i18n.
   - `subject` + `related[]` so one event can surface on multiple entity feeds.
   - `salience` drives both UI density and AI context selection.

4. **Context Model** (`context.ts`)
   - `ContextSnapshot` = the AI's view of an entity at an instant: roles, top relationships, recent activity, ranked `ContextFact`s.
   - Pure derivation — same inputs, same snapshot.
   - `ContextBudget` makes truncation explicit.

5. **Universal Search** (`search.ts`)
   - `SearchProvider` is a swappable adapter (lexical → semantic → hybrid).
   - Hits are entities, not records, so "Rajeev" returns one Person whose feed contains every related record.
   - Filters support entity-anchored queries (`relatedTo`) — the building block for "everything about Rajeev".

6. **AI Knowledge Layer** (`ai.ts`)
   - `KnowledgeService` is the *only* surface the AI orchestrator depends on.
   - `resolve` → `context` → `subgraph` → `search` → `suggest`.
   - `Suggestion` carries `grounding: EntityId[]` so the UI can always show "based on these records".

7. **Cross-Module References**
   - `SourceRecordRef` on every entity ties presentation to knowledge.
   - The relationship graph replaces feature-to-feature imports.

8. **Future AI Knowledge Architecture**
   - `EntityAIMetadata` reserves space for embeddings, topics, and observations without changing the envelope.
   - `SearchMode = "semantic" | "hybrid"` is in the contract from day one.
   - `Suggestion` + `AutomationRule.authoredBy === "ai"` (Phase 6) close the loop: AI reads the graph, proposes actions, and writes audited rules.

## Data flow

```
module record (e.g. finance.entry)
        │  repository.upsertFromRecord(ref)
        ▼
CanonicalEntity ──► RelationshipGraph
        │                   │
        │                   └── informs ContextService
        ▼
TimelineProjector ─► ActivityEvent (append)
        │
        ▼
SearchIndexer.index(SearchDocument)
        │
        ▼
KnowledgeService (resolve / context / subgraph / search / suggest)
        │
        ▼
AI Orchestrator (Phase 6 contracts)
```

## Relationship to earlier phases

| Earlier contract                          | Role under the knowledge model                |
|-------------------------------------------|-----------------------------------------------|
| `core/relations/contracts.ts`             | Module-level coordination policies; now layered on top of the canonical RelationshipGraph. |
| `core/events/contracts.ts`                | Transient bus; FEEDS the timeline via a projector. |
| `core/memory/contracts.ts`                | Scoped key-value memory; supplements ContextFacts but is not the same store. |
| `core/intelligence/contracts.ts`          | Consumes `KnowledgeService.resolve` for entity binding during extraction. |
| `features/records/registry`               | Module-level record schemas; project into canonical entities via `sourceRecordRef`. |

## Scalability considerations

- **Read façade, swappable storage.** Every interface (`EntityRepository`, `RelationshipGraph`, `TimelineRepository`, `SearchProvider`, `KnowledgeService`) hides storage. Local store today, Postgres + pgvector later, no caller changes.
- **Pure context derivation.** Snapshots are deterministic; safe to cache, parallelize, or pre-compute server-side.
- **Salience + budget everywhere.** Activity, facts, and traversal all carry explicit bounds — the AI prompt never grows unboundedly with user data.
- **Curated vocabularies.** `RelationshipType`, `ActivityVerb`, `CanonicalEntityKind` are additive stable unions — safe to evolve without breaking the AI's mental model.
- **Provenance first-class.** `AttributionSource` is required on facts, observations, and edges — required before AI is allowed to author records.

## Flutter portability

| Web concept                       | Flutter equivalent                          |
|-----------------------------------|---------------------------------------------|
| `EntityRepository` (TS interface) | Dart abstract class; Isar/Drift impl        |
| `RelationshipGraph`               | Same JSON shape on Isar or Supabase         |
| `TimelineRepository`              | Isar collection + Supabase mirror           |
| `SearchProvider` (lexical)        | `sqflite_fts5` or `drift` FTS               |
| `SearchProvider` (semantic)       | On-device ONNX embeddings → server fallback |
| `KnowledgeService`                | Dart interface; identical method signatures |

All shapes are JSON-safe with stable string unions, so the Dart port
models them as enums + value classes without translation.

## Not in this phase

- No `EntityRepository` / `RelationshipGraph` / `KnowledgeService` implementations.
- No projector wiring from the platform event bus to the timeline.
- No search adapter.
- No UI: no global search bar, no entity pages, no timeline view.

Phases 8+ implement these against the contracts defined here.
