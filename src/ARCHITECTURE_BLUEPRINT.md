# Voice, AI & Automation Architecture Blueprint (Phase 6)

This is the long-term system architecture for the platform. It declares
the **service boundaries, data contracts, and event flow** that every
later phase must respect. No implementation is shipped in this phase;
each system below has a corresponding `*/contracts.ts` file that
encodes the boundary in TypeScript and ports 1:1 to Dart for Flutter.

## Layered overview

```
        ┌──────────────────────────────────────────────────────────┐
 INPUT  │  Voice Layer        │   Text / UI Input                  │
        │  (mic, STT,         │   (forms, quick-actions)           │
        │   language detect)  │                                    │
        └─────────┬───────────┴───────────────┬──────────────────-─┘
                  │ NormalizedUtterance       │ IntentInputText
                  ▼                           ▼
        ┌──────────────────────────────────────────────────────────┐
 BRAIN  │             Intelligence Orchestrator                    │
        │   ┌────────────┐  ┌─────────────┐  ┌────────────────┐    │
        │   │ Classifier │→ │  Extractor  │→ │   Resolver     │    │
        │   └────────────┘  └─────────────┘  └────────┬───────┘    │
        └──────────────────────────────────────────┬──┴───────-────┘
                                                   │ IntentResult
                                                   ▼
        ┌──────────────────────────────────────────────────────────┐
 SPINE  │                  Event Bus (typed, in-proc)              │
        └──┬───────────┬────────────┬────────────┬─────────────────┘
           │           │            │            │
           ▼           ▼            ▼            ▼
        Records   Reminder    Automation    Memory Writer
        Repo      Engine      Engine        + Workspace Engine
                                  │
                                  ▼
                          Notification Dispatcher → (in-app | push | local | email)
```

Every arrow is a typed contract in `src/core/**` or `src/features/**/contracts.ts`.

---

## 1. Voice Processing Layer

**Contracts:** `src/core/voice/contracts.ts`

Stages: `AudioCapture → SpeechRecognizer → VoiceTranscript →
LanguageDetector → NormalizedUtterance`.

- `SpeechRecognizer` and `LanguageDetector` are adapter interfaces.
  Web ships a Web Speech API adapter; Flutter swaps in a native plugin
  without any caller-side change.
- The transcript carries **per-chunk language tags** so the intelligence
  layer can handle Manglish / Hinglish without re-running STT.
- `primedLocale` captures the recognizer's input bias for telemetry —
  helps tune language hints over time.

**Why this shape:** STT is a swappable detail. Everything downstream
consumes a `NormalizedUtterance`, never a raw audio buffer.

## 2. Conversation Layer

The conversation layer is a **stateful wrapper around the intelligence
orchestrator**. It owns turn-taking, confirmation prompts, and short-
term dialogue context (last 5–10 turns). It is NOT a chatbot — it is the
input modality that powers the mic flow.

Boundaries:
- Reads: current `NormalizedUtterance`, recent intent history (from
  memory), open clarification questions.
- Writes: dispatches `IntentInput` to the orchestrator, emits
  `voice.session-*` events, persists each turn to memory namespace
  `intent-history`.

Implementation lands in `features/voice/conversation/` later. The
contracts it depends on already exist.

## 3. Intent Detection Layer

**Contracts:** `src/core/intelligence/contracts.ts` (`IntentClassifier`).

- Output: `IntentClassification` with a primary `IntentCandidate` plus
  calibrated alternates (so the UI can offer "did you mean…?").
- `IntentKind` is the union of stable intent names; it grows additively.
- Today: `services/mock-intelligence` is the keyword classifier.
  Tomorrow: an on-device classifier; ultimately a server LLM.
  All three satisfy the same interface.

## 4. Entity Extraction Layer

**Contracts:** `src/core/intelligence/contracts.ts` (`EntityExtractor`).

- `EntitySpan` carries `kind`, intent-specific `role`, normalized
  `value`, original `rawText`, character `span`, and `confidence`.
- The resolver collapses spans into a role-keyed map so executors
  consume `payload.debtor`, `payload.amount`, `payload.dueAt` instead
  of scanning arrays.
- Entity kinds (`person`, `amount`, `date`, `recurrence`, `location`,
  `property`, `item`, `phone`, …) are intentionally generic so the
  extractor stays module-agnostic.

## 5. Workspace Intelligence Layer

Already shipped in Phase 3 (`features/workspace/`). The blueprint adds
two upgrades that this phase reserves contracts for, not code:

- `module-affinity` memory namespace feeds the composer so frequently
  used modules float up.
- The `intent.executed` event triggers re-composition when affinity
  signals cross a threshold.

## 6. Reminder Engine

**Contracts:** `src/features/reminders/contracts.ts`.

- `Reminder` is the persistent definition; `ReminderInstance` is one
  materialized firing (critical for recurring reminders so each
  occurrence has independent state).
- Three sources: `manual`, `entity` (auto-derived from a record's
  `dueField`), `automation` (from a rule).
- The engine OWNS scheduling + state and EMITS events
  (`reminders.scheduled|fired|completed|…`). It does NOT deliver
  notifications — the dispatcher does.

## 7. Automation Engine

**Contracts:** `src/core/automation/contracts.ts`.

- Rules are DATA: `trigger` + `condition` + `actions`. Authorable by
  user, system, or AI.
- Actions reuse `IntentAction` from the intelligence layer, so the same
  executor handles user-issued and rule-issued actions.
- Triggers: platform events, cron schedules, or due-date offsets.
- `cooldownMinutes` prevents loops + spam.
- `AutomationRunRecord` provides an audit log — required before AI is
  allowed to author rules.

Example rule (data-only):

```ts
{
  name: "Surface overdue rent",
  trigger: { kind: "event", event: "reminders.fired" },
  condition: { kind: "field-equals", path: "entityType", value: "rent.property" },
  actions: [{ type: "workspace.raise-priority", payload: { moduleId: "rent" } }],
}
```

## 8. User Memory Layer

**Contracts:** `src/core/memory/contracts.ts`.

Memory is **typed, scoped, and policy-driven** — not a key-value bag.

- `MemoryScope`: `device | account | shared` → privacy + sync boundary.
- `MemorySensitivity`: `low | personal | financial | secret` → encryption
  + export policy.
- `MemoryUpdateRule`: `replace | increment | append-bounded | merge`.
- `MemoryNamespacePolicy` centralizes defaults so writers stay terse.
- `forget` + `forgetNamespace` are first-class for GDPR / "wipe my data".

Read by: intent classifier (disambiguation), workspace engine
(affinity), automation engine (suggesting recurrence). Written by: the
conversation layer after every confirmed intent.

## 9. Notification Architecture

**Contracts:** `src/services/notifications/contracts.ts`.

- One `NotificationDispatcher` fans out to N `NotificationChannelAdapter`s.
- Channels: `in-app`, `push`, `local` (native Flutter), `email`.
- Preferences (`enabledChannels`, `quietHours`, `mutedModules`) gate
  delivery — the engine asks the dispatcher, never a specific channel.

## 10. Cross-Module Coordination

**Contracts:** `src/core/relations/contracts.ts`.

- `RelationGraph` stores typed edges (`owns | mirrors | derives |
  references`) between records across modules.
- `CoordinationPolicy` is declarative: which event a module reacts to,
  what edges to create, what actions to dispatch.
- Examples encoded as policies:
  - Finance ↔ Reminders: every `finance.entry` with `dueAt` creates an
    entity-linked reminder via the engine.
  - Rent → Finance: a rent property `derives` monthly finance entries.
  - Groceries → Memory: confirmed grocery items `observe` the
    `items` namespace; recurrence detection promotes a "suggested
    weekly" item.
  - Bills ↔ Calendar: a bill `mirrors` a calendar event.

No feature imports another feature. All cross-module behavior is a
policy + an edge.

---

## Event Flow — annotated trace

A single voice utterance traverses every layer:

```
mic                       → voice.session-started
SpeechRecognizer.stop()   → voice.transcript-finalized
NormalizedUtterance       ↘
                           IntelligenceOrchestrator.process()
                              ├─ classify     → IntentClassification
                              ├─ extract      → EntityExtraction
                              └─ resolve      → IntentResult
                                              → intent.resolved
(confirmation if needed)  → intent.executed
ActionExecutor            → records.created / reminders.scheduled / …
EventBus                  ↘
                           ├─ MemoryWriter.observe   (memory.observed)
                           ├─ AutomationEngine.run   (automation.rule-fired)
                           ├─ ReminderEngine.fire    (reminders.fired)
                           └─ WorkspaceEngine.recompose
NotificationDispatcher    → delivery results
```

Every node is a typed contract. Every arrow is a typed event or method.

---

## Folder structure (after Phase 6)

```
src/
  core/
    config/            App-wide constants
    types/             Canonical domain entities
    categories/        Life-domain catalog
    voice/             ← Phase 6: contracts
    intelligence/      ← Phase 6: contracts
    memory/            ← Phase 6: contracts
    events/            ← Phase 6: platform event bus contract
    automation/        ← Phase 6: rule engine contracts
    relations/         ← Phase 6: relation graph + policies
  features/
    auth/
    voice/             Mic UI + (future) conversation layer
    onboarding/
    workspace/         Workspace Intelligence Engine
    records/           Structured entity & record management
    reminders/         ← Phase 6: contracts (engine impl later)
    settings/
  services/
    i18n/
    mock-intelligence/ Stand-in classifier; satisfies the contract
    notifications/     ← Phase 6: dispatcher + channel contracts
  shared/              Cross-feature UI primitives
  repositories/        Data-access seams (legacy + future Supabase)
  store/               App-wide UI state (theme, locale)
  hooks/
  integrations/        Generated SDK clients
  routes/              TanStack file-based routes
```

---

## Service & state boundaries

| Concern               | Owner                              | Reads from                   | Writes to                    |
|-----------------------|-------------------------------------|------------------------------|------------------------------|
| Audio + STT           | `core/voice` adapter                | mic                          | `VoiceTranscript` events     |
| Intent + entities     | `core/intelligence` orchestrator   | utterance, memory            | `IntentResult` + events      |
| Records CRUD          | `features/records/repository`      | records store / Supabase     | records store + events       |
| Reminders             | `features/reminders/engine`        | records, events              | reminders store + events     |
| Automation            | `core/automation/engine`           | events, rules, memory        | dispatches `IntentAction`s   |
| Memory                | `core/memory/service`              | scoped storage adapters      | scoped storage + events      |
| Notifications         | `services/notifications`           | reminder events + prefs      | OS channels                  |
| Cross-module relations| `core/relations` graph + policies  | events, records              | relation store               |
| Workspace composition | `features/workspace/engine`        | prefs, memory, relations     | composition (pure data)      |

State stays inside its owner. Cross-owner communication is **only**
through the event bus and repository façades.

---

## Future AI integration points

The architecture pre-declares where AI plugs in so feature code doesn't
move when it arrives:

1. **`IntentClassifier`** — swap mock with on-device or server LLM.
2. **`EntityExtractor`** — swap regex/keyword with structured-output LLM.
3. **`IntelligenceOrchestrator`** — can be replaced wholesale with a
   single tool-calling LLM that emits `IntentResult` directly.
4. **`AutomationRule.authoredBy === "ai"`** — AI may propose rules; the
   audit log is already in place.
5. **`WorkspaceComposition.meta.source === "ai"`** — composer is already
   bypassable by an AI that emits the composition directly.
6. **`MemoryService`** — same contract serves a future embedding store
   for semantic recall.

## Future voice integration points

1. **`SpeechRecognizer` adapter** — Web → native (Flutter) → server STT.
2. **`LanguageDetector` adapter** — heuristic → ML.
3. **Conversation layer** — adds barge-in, partial intents, clarification
   prompts. Contracts already cover partial chunks and code-switching.

## Scalability considerations

- **Pure functions at the seams.** Composer, classifier, extractor,
  policy evaluation — all pure. Easy to parallelize, easy to test,
  easy to move server-side.
- **Event bus is in-proc today, network-ready tomorrow.** The contract
  hides the transport; a Supabase Realtime adapter slots in without
  caller changes.
- **Records & reminders are generic over schemas.** Adding a new
  module is a registry entry plus optional coordination policy — never
  a fork of UI, store, or engine code.
- **Memory is scoped.** Device-only entries never traverse the network;
  account entries sync; shared entries are explicit. Privacy is a
  property of the contract, not a runtime afterthought.

## Flutter portability

| Web concept                                     | Flutter equivalent                              |
|------------------------------------------------|------------------------------------------------|
| `SpeechRecognizer` (Web Speech API)            | `speech_to_text` plugin                         |
| `LanguageDetector`                             | `mlkit_language_id`                            |
| `EventBus` (in-proc)                           | Riverpod `StreamProvider` or `event_bus` pkg   |
| `ReminderEngine` + `local` channel              | `flutter_local_notifications`                  |
| `push` channel                                  | `firebase_messaging`                           |
| `MemoryService` device scope                    | `flutter_secure_storage` / `isar`              |
| `RelationGraph`                                | Same JSON contract over `isar` / Supabase      |
| `AutomationEngine` rules                       | Identical JSON; Dart engine consumes them      |

All contracts are JSON-safe and use stable string unions so the Dart
port models them as enums + classes without translation.

---

## Not in this phase

- No real STT, no LLM, no push delivery.
- No engine implementations beyond what already exists (records,
  workspace). Phases 7+ implement the engines against these contracts.
- No UI for automations, memory inspection, or notification preferences.

Everything listed above is now **possible without further architectural
work** — features plug into existing contracts.
