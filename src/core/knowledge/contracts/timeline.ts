/**
 * Universal Timeline — Contracts
 * ------------------------------
 * Every meaningful change in the system — record created, payment
 * settled, reminder fired, goal updated — is projected into a single
 * append-only timeline of `ActivityEvent`s.
 *
 * The timeline is the substrate for:
 *   - per-entity activity feeds ("everything that happened to Rajeev")
 *   - cross-entity narratives ("this month with the Kakkanad property")
 *   - AI context windows (recent salient events with decay)
 *   - audit trails for automations
 *
 * It is NOT the platform event bus (`core/events/contracts.ts`). The bus
 * is in-proc and transient; the timeline is persistent and queryable.
 * Bus events FEED the timeline via a projector.
 */

import type {
  AttributionSource,
  CanonicalEntityKind,
  EntityId,
  ISODateString,
} from "./entity";

/**
 * Activity verbs — stable, curated. Tense-agnostic ("create", not
 * "created") so rendering can localize freely.
 */
export type ActivityVerb =
  | "create"
  | "update"
  | "delete"
  | "complete"
  | "cancel"
  | "archive"
  | "restore"
  | "link"
  | "unlink"
  | "schedule"
  | "fire"
  | "snooze"
  | "pay"
  | "receive"
  | "settle"
  | "note"
  | "tag"
  | "mention"
  | "observe";

export interface ActivityActor {
  kind: "user" | "system" | "automation" | "ai";
  id?: string;
  label?: string;
}

export interface ActivitySubject {
  entityId: EntityId;
  entityKind: CanonicalEntityKind;
}

/**
 * A single, immutable event in the timeline.
 * `subject` is the primary entity the event is "about"; `related`
 * captures additional entities whose feeds should also surface it.
 */
export interface ActivityEvent {
  id: string;
  ownerId: string;

  verb: ActivityVerb;
  subject: ActivitySubject;
  related?: readonly ActivitySubject[];

  /** Human-readable summary; AI may use as fallback when attributes are sparse. */
  summary: string;
  /** Verb-specific structured payload (e.g. { from: "pending", to: "paid" }). */
  payload?: Record<string, unknown>;

  actor: ActivityActor;
  source: AttributionSource;

  /** When the underlying action happened (may differ from indexedAt). */
  occurredAt: ISODateString;
  /** When the projector wrote the event. */
  indexedAt: ISODateString;

  /** 0..1 — drives AI context selection + UI grouping density. */
  salience: number;
}

export interface ActivityQuery {
  entityId?: EntityId;
  entityKinds?: readonly CanonicalEntityKind[];
  verbs?: readonly ActivityVerb[];
  since?: ISODateString;
  until?: ISODateString;
  minSalience?: number;
  limit?: number;
  cursor?: string;
}

export interface TimelineProjector {
  /** Called by the event bus subscriber for every platform event. */
  project(event: ActivityEvent): Promise<void>;
}

export interface TimelineRepository {
  append(event: Omit<ActivityEvent, "id" | "indexedAt">): Promise<ActivityEvent>;
  query(q: ActivityQuery): Promise<readonly ActivityEvent[]>;
  /** Materialized feed for one entity, newest first. */
  feed(entityId: EntityId, opts?: { limit?: number; cursor?: string }): Promise<readonly ActivityEvent[]>;
}
