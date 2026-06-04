# `core/` — Platform Contracts

Framework-agnostic, runtime-free contracts. Every cross-feature seam in
the platform is declared here as a TypeScript interface or data shape.
No React, no Supabase, no provider SDKs. These types port 1:1 to Dart
for the future Flutter app.

## Layout

```
core/
  config/         App-wide constants
  types/          Canonical domain entities (Reminder, FinanceEntry, …)
  categories/     Life-domain catalog (id, icon, color, keywords)
  voice/          Voice processing pipeline contracts (Phase 6)
  intelligence/   Intent classifier + entity extractor + resolver (Phase 6)
  memory/         User memory namespaces, scopes, update rules (Phase 6)
  events/         Platform event bus — the spine for reactive systems
  automation/     Rule-based automation engine contracts
  relations/      Module-level coordination policies (built on knowledge)
  knowledge/      Canonical entities, relationships, timeline, context,
                  search, and AI knowledge service (Phase 7)
```

Feature folders (`features/*`) and services (`services/*`) implement
these contracts. UI never depends on implementations directly — only
on the contracts and on repository façades.
