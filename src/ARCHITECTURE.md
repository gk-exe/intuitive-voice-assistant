# Architecture — Voice (Phase 1)

A voice-first life-ops PWA. Built React + TanStack Start + Tailwind, structured
so the boundaries map cleanly to a future Flutter port.

## Folder layout

```
src/
  core/                 # Framework-agnostic primitives
    config/             # APP_CONFIG, constants
    types/              # Domain data contracts (Reminder, FinanceEntry, …)
  features/             # Vertical slices — one folder per product module
    auth/               # Sign-in / sign-up UI + store (scaffold)
    voice/              # MicButton, voice capture (UI only in Phase 1)
    settings/           # Language switcher, theme toggle
  shared/               # Cross-feature UI primitives
    components/         # Screen, TouchButton, TextField
  services/             # Side-effect adapters (i18n, future: STT, notifications)
    i18n/               # i18next bootstrap + locale JSONs (en, ml, hi)
  repositories/         # Data-access contracts (CRUD interfaces)
  store/                # Zustand stores for client-only UI state
  hooks/                # Generic React hooks
  integrations/         # Generated SDK clients (Supabase, Lovable broker)
  routes/               # TanStack Router file-based routes
```

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
