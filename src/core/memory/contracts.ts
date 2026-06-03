/**
 * User Memory Layer — Contracts
 * -----------------------------
 * Long-lived, privacy-scoped memory the intelligence layer uses to
 * personalize understanding and suggestions. NOT a key-value cache —
 * every memory entry is typed, scoped, and has an explicit update rule
 * so the future AI orchestrator can reason about staleness/consent.
 *
 * Memory is read-mostly. Writes happen via the `MemoryWriter` only,
 * never directly from UI. This is the seam where a future "forget"
 * / GDPR endpoint will hook in.
 */

/** Where a memory entry lives — drives privacy + sync boundaries. */
export type MemoryScope =
  /** Device-only. Never leaves the client. */
  | "device"
  /** Per-user, syncs across the user's devices (Supabase). */
  | "account"
  /** Per-workspace/household, shared with co-members in the future. */
  | "shared";

/** Sensitivity tier — drives encryption + export policy. */
export type MemorySensitivity = "low" | "personal" | "financial" | "secret";

/** How an entry is refreshed. */
export type MemoryUpdateRule =
  /** Overwritten on every observation. */
  | "replace"
  /** Counter incremented on each observation (for recurrence detection). */
  | "increment"
  /** Append to a bounded ring buffer (recent items). */
  | "append-bounded"
  /** Merged via shallow object merge. */
  | "merge";

/** Stable namespaces. Add, never rename. */
export type MemoryNamespace =
  | "profile" // displayName, locale, timezone
  | "preferences" // theme, default currency, modules
  | "contacts" // recurring people
  | "properties" // recurring properties
  | "items" // recurring grocery / bill names
  | "language" // utterance language stats
  | "intent-history" // recent intents (for disambiguation)
  | "module-affinity"; // workspace personalization signals

export interface MemoryEntry<T = unknown> {
  id: string;
  namespace: MemoryNamespace;
  /** Stable key inside the namespace, e.g. "contacts:rajeev". */
  key: string;
  value: T;
  scope: MemoryScope;
  sensitivity: MemorySensitivity;
  updateRule: MemoryUpdateRule;
  /** Free-form provenance: "voice", "manual", "ai-inferred". */
  source: string;
  /** Decay hint, in days. `null` = never. */
  ttlDays: number | null;
  createdAt: string;
  updatedAt: string;
  /** Monotonic counter, useful for `increment` rule. */
  observationCount: number;
}

export interface MemoryQuery {
  namespace: MemoryNamespace;
  /** Optional key prefix match. */
  keyPrefix?: string;
  /** Filter by scope (defaults to all readable scopes). */
  scope?: MemoryScope;
  limit?: number;
}

export interface MemoryObservation<T = unknown> {
  namespace: MemoryNamespace;
  key: string;
  value: T;
  source: string;
  /** Defaults inferred from namespace policy when omitted. */
  scope?: MemoryScope;
  sensitivity?: MemorySensitivity;
}

export interface MemoryReader {
  get<T>(namespace: MemoryNamespace, key: string): Promise<MemoryEntry<T> | null>;
  query<T>(q: MemoryQuery): Promise<readonly MemoryEntry<T>[]>;
}

export interface MemoryWriter {
  observe<T>(obs: MemoryObservation<T>): Promise<MemoryEntry<T>>;
  forget(namespace: MemoryNamespace, key: string): Promise<void>;
  /** Wipe an entire namespace — used by privacy controls. */
  forgetNamespace(namespace: MemoryNamespace, scope?: MemoryScope): Promise<void>;
}

export interface MemoryService extends MemoryReader, MemoryWriter {}

/**
 * Namespace policy: declares the default sensitivity, scope, update
 * rule, and TTL for each namespace. The writer applies these whenever
 * an observation omits them — keeping calling code minimal and policy
 * centralized.
 */
export interface MemoryNamespacePolicy {
  namespace: MemoryNamespace;
  defaultScope: MemoryScope;
  defaultSensitivity: MemorySensitivity;
  defaultUpdateRule: MemoryUpdateRule;
  defaultTtlDays: number | null;
  /** Hard cap for `append-bounded` entries. */
  maxItems?: number;
}
