# Architecture — Voice (Phase 1)

A voice-first life-ops PWA. Built React + TanStack Start + Tailwind, structured
so the boundaries map cleanly to a future Flutter port.

## Folder layout

```
src/
  core/                       # Framework-agnostic primitives
    config/                   # APP_CONFIG, constants
    types/                    # Domain data contracts (Reminder, FinanceEntry, …)
    categories/               # Life-domain catalog (id, icon, color, keywords)
  features/                   # Vertical slices — one folder per product module
    auth/                     # Sign-in / sign-up UI + store (scaffold)
    voice/                    # MicButton, voice capture (UI only in Phase 1)
    settings/                 # Language switcher, theme toggle
    onboarding/               # Conversational onboarding flow + steps
    workspace/                # ── Workspace Intelligence Engine ──
      contracts/              #    Pure-data types: ModuleDefinition, Widget, Composition
      registry/               #    Module registry (modules built from categories + spec)
      engine/                 #    composeWorkspace(prefs) → WorkspaceComposition
      renderer/               #    WorkspaceRenderer + ModuleCard + WidgetRenderer
        widgets/              #    WidgetKind → component (empty-state, quick-actions, …)
      layouts/                #    Layout strategies (StackLayout; grid/adaptive later)
      state/                  #    Zustand store + selectors
      components/             #    Orchestrator (Workspace), EditControls, Empty state
  shared/                     # Cross-feature UI primitives
    components/               # Screen, TouchButton, TextField, CategoryIcon
  services/                   # Side-effect adapters (i18n, mock-intelligence, future: STT)
    i18n/                     # i18next bootstrap + locale JSONs (en, ml, hi)
    mock-intelligence/        # Keyword-based stand-in for the real AI intent layer
  repositories/               # Data-access contracts (CRUD interfaces) — the only data door
  store/                      # Zustand stores for app-wide UI state (theme, locale)
  hooks/                      # Generic React hooks
  integrations/               # Generated SDK clients (Supabase, Lovable broker)
  routes/                     # TanStack Router file-based routes
```

## Workspace Intelligence Engine (Phase 3)

Pipeline: **state → engine → renderer**.

1. **State** (`features/workspace/state`) holds the user's preferences:
   which modules are enabled, in what order, what's hidden, and what they
   said during onboarding. Persisted under `voice.workspace` (versioned).
2. **Engine** (`features/workspace/engine/composer.ts`) is a pure function
   `(WorkspacePreferences) → WorkspaceComposition`. No React, no I/O.
   The future AI orchestrator will emit a `WorkspaceComposition` directly,
   bypassing the composer — same downstream code path.
3. **Registry** (`features/workspace/registry`) is the catalog of module
   definitions. Each module declares default widgets, quick actions, and
   AI intent hooks. Adding a module is additive (no engine changes).
4. **Renderer** (`features/workspace/renderer`) walks the composition.
   `WidgetRenderer` resolves `WidgetKind → component` via a registry, so
   new widget kinds plug in without touching the engine.
5. **Layouts** (`features/workspace/layouts`) own visual arrangement —
   `StackLayout` today; grid/adaptive ship as siblings selected via
   `WorkspaceComposition.strategy`.

Honest empty states: data-bound widget kinds (`summary`, `list`,
`reminder`) currently render the empty-state widget. No fake numbers,
no demo content. Each kind is upgraded when its feature module lands.

### Why this shape

- **`features/*` are self-contained vertical slices.** Each feature owns its
  UI, hooks, store, and types. Cross-feature imports go through `shared/` or
  `repositories/`, never directly into a sibling feature.
- **`repositories/` is the only door to data.** Features depend on
  interfaces, not on Supabase. Swap the implementation, the UI doesn't move.
- **`core/types/domain.ts` is the canonical contract.** It's the same shape
  the Flutter port will model in Dart. Keep it serializable.
- **`services/` are adapters around platforms** (i18n, STT, push). Each
  service has a tiny interface so a Flutter equivalent can be slotted in.

## Future Flutter parity

| Web (now) | Flutter (later) |
|-----------|-----------------|
| TanStack Router file routes | GoRouter route tree |
| Zustand stores | Riverpod providers |
| TanStack Query | Riverpod async notifiers |
| i18next + JSON | Flutter `intl` + ARB files (same key shape) |
| `repositories/*.ts` interfaces | `repositories/*.dart` abstract classes |
| `core/types/domain.ts` | `models/*.dart` (same field names) |
| Supabase JS client | `supabase_flutter` |

Keep the **public surface of each feature** stable (component names,
repository methods, store actions). The internals can be rewritten.

## Voice-first UX rules

- Mic button is the centerpiece. 168px tap target. Idle "breathing" ring.
- Minimum tap target everywhere: 56px (`.touch-target`).
- Generous radii (1rem default). Soft shadows. No corporate hard edges.
- Typography: Instrument Serif (display) + Work Sans (body) — warm, calm.
- Color: warm sand background, terracotta primary. Not blue. Not purple.
- Safe-area aware (iOS notches).

## Localization

Three languages out of the box: English, Malayalam, Hindi.
Detected from browser → persisted to `localStorage` under `voice.locale`.
The Manglish / code-switching intelligence requested in the PRD is an
**AI-layer** problem (handled later in the intent service) — i18next only
handles UI strings.

## PWA

Manifest-only (no service worker). The app is installable to home screen
and runs in `standalone` display mode, but does not cache offline. Service
workers interfere with Lovable's preview iframe and aren't needed yet.

## Not in Phase 1

- No real auth wiring (Supabase enabled in Phase 2)
- No voice capture (Phase 3)
- No reminders/finance/grocery/bills modules (Phase 4+)
- No notifications

Repository interfaces and domain types are in place so those phases plug in
without rearranging the codebase.
