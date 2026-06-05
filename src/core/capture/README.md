# `core/capture/` — Unified Capture & Action Architecture (Phase 8)

The capture layer is the **central nervous system** of the platform.
Every mutation — manual form submit, voice command, AI suggestion,
automation rule, future third-party integration — enters through the
same pipeline, produces the same `CaptureAction` shape, and commits
through a single `ActionCommitter`. Repositories are never called
directly from UI.

This phase ships **contracts only**. No runtime, no UI, no AI. Each
later phase plugs adapters into these seams without disturbing
callers.

## Why one pipeline

Today every module has its own creation flow. That fragmentation
blocks voice, AI assistants, drafts, undo, and cross-module
coordination. A single capture spine fixes all of them at once:

- Voice and forms produce the same `CaptureAction`s.
- AI agents are just another `ActionSource`.
- Drafts work for any surface because the input shape is unified.
- The action history is total and replayable.
- Confirmation UX is consistent regardless of origin.

## Layered flow

```
   ┌─────────────────────────────────────────────────────────────┐
   │   Surfaces: Quick Add · Voice · Forms · AI · Integrations   │
   └──────────────────────────────┬──────────────────────────────┘
                                  │ CaptureInput
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │            CaptureService.submit() — single façade          │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  Pipeline:  Normalize → Classify → Extract → Generate       │
   │              → Preview → (Confirm) → Commit                  │
   └────────┬───────────────────────────────────────┬────────────┘
            │ GeneratedCapture                      │ Drafts
            ▼                                       ▼
   ConfirmationProjector            DraftService (resume later)
            │
            ▼
   ConfirmationDecision (accept | edit | reject)
            │
            ▼
   ActionCommitter — the ONLY mutator
            │
            ▼
   ActionHistoryService (append-only audit + undo source)
```

Every arrow is a typed contract in this folder.

## Contracts

| File             | Owns                                                   |
|------------------|---------------------------------------------------------|
| `action.ts`      | `CaptureAction`, `ActionType`, payload map, committer  |
| `pipeline.ts`    | `CaptureInput`, stage adapters, `CapturePipeline`      |
| `draft.ts`       | `CaptureDraft`, `DraftService`                          |
| `confirmation.ts`| `ConfirmationPreview`, projector, policy, decision     |
| `history.ts`     | `ActionHistoryEntry`, query, reversal builder          |
| `service.ts`     | `CaptureService` façade + `QuickAddEntryPoint`         |

## Folder layout

```
core/capture/
  contracts/
    action.ts          Unified action model
    pipeline.ts        Capture pipeline stages
    draft.ts           Drafts (resume later)
    confirmation.ts    Universal review/confirmation surface
    history.ts         Append-only action history
    service.ts         CaptureService façade + QuickAdd entry point
    index.ts           Barrel
  README.md
```

Implementations land later under:

```
features/capture/                  UI surfaces (QuickAdd bar, preview sheet)
services/capture/                  Pipeline + projector + committer impl
features/drafts/                   Drafts list & resume UI
features/history/                  Activity feed UI
```

## Integration with existing layers

- **Intelligence (Phase 6)** — pipeline `classify`/`extract` stages
  delegate to `IntentClassifier` and `EntityExtractor`. Today's mock
  classifier already satisfies the contract; an LLM swaps in later
  without touching `CaptureService`.
- **Knowledge (Phase 7)** — actions reference `CanonicalEntityRef`, so
  every commit feeds the timeline and relationship graph for free.
- **Event bus** — the committer emits `intent.executed` and the
  domain-specific events that exist today (`records.created`, etc.).
- **Reminders / Automation** — read history + events; they never need
  to know who produced an action.
- **Records repository** — becomes an internal detail of the committer.
  Forms migrate from "call repository" to "build action, submit".

## Future AI integration points

1. `ActionGenerator` — today: form-to-action mapper. Later: LLM that
   converts free text into a `CaptureActionBatch` directly.
2. `ConfirmationPolicy.shouldConfirm` — risk model. AI low-confidence
   batches always confirm; deterministic form submits skip.
3. `CaptureInput { kind: "ai-suggestion" }` — first-class source so
   assistant-proposed actions flow through the same review surface
   as voice and manual entry.
4. `ActionHistoryEntry.source.kind === "ai"` — already in the schema;
   enables explainability ("why did the assistant do this?").

## Future voice integration points

1. `CaptureInput { kind: "voice" }` carries the existing
   `IntentInput` so the voice pipeline reuses Phase 6 contracts.
2. The conversation layer dispatches to `CaptureService.submit()`
   instead of bypassing into repositories. Voice becomes a surface,
   not a parallel system.
3. Partial transcripts may produce open `CaptureDraft`s the user can
   resume by tapping the mic again.

## Scalability & portability

- All contracts are JSON-safe and free of framework types — they
  port 1:1 to Dart for the future Flutter client.
- The committer can be local-only today and a Supabase-backed RPC
  tomorrow without changing call sites.
- The pipeline is stage-pure — easy to move heavy stages
  (classification, extraction) server-side.

## Not in this phase

- No pipeline implementation, no QuickAdd UI, no preview sheet, no
  draft store, no history feed.
- No changes to existing module forms. They will be migrated to
  `commitDirect()` in a later phase.
- No new events, no automation hooks, no notifications.
