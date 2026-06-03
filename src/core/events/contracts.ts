/**
 * Platform Event Bus — Contracts
 * ------------------------------
 * Every meaningful state change in the platform emits a typed event.
 * The bus is the spine that lets the automation engine, reminder
 * engine, notification layer, memory writer, and cross-module
 * coordinators react WITHOUT each feature importing every other
 * feature.
 *
 * Rules:
 *   - Events are past-tense, immutable, JSON-safe.
 *   - Producers don't know consumers. Consumers subscribe by name.
 *   - Naming: "<domain>.<entity>.<verb>" — stable, additive.
 */

export type PlatformEventName =
  // Records
  | "records.created"
  | "records.updated"
  | "records.status-changed"
  | "records.deleted"
  // Reminders
  | "reminders.scheduled"
  | "reminders.fired"
  | "reminders.completed"
  | "reminders.snoozed"
  | "reminders.cancelled"
  // Intelligence
  | "intent.resolved"
  | "intent.executed"
  | "intent.rejected"
  // Voice
  | "voice.session-started"
  | "voice.transcript-finalized"
  | "voice.session-ended"
  // Workspace
  | "workspace.module-enabled"
  | "workspace.module-disabled"
  | "workspace.reordered"
  // Memory
  | "memory.observed"
  | "memory.forgotten"
  // Automation
  | "automation.rule-fired";

export interface PlatformEvent<TName extends PlatformEventName = PlatformEventName, TPayload = unknown> {
  name: TName;
  /** Stable v4 uuid. */
  id: string;
  /** ISO. */
  occurredAt: string;
  /** Optional correlation id linking events from the same user action. */
  correlationId?: string;
  payload: TPayload;
}

export type EventHandler<E extends PlatformEvent = PlatformEvent> = (event: E) => void | Promise<void>;

export interface EventBus {
  publish<E extends PlatformEvent>(event: E): void;
  subscribe<E extends PlatformEvent>(name: E["name"], handler: EventHandler<E>): () => void;
  /** Multi-name subscription, for engines that listen broadly. */
  subscribeMany(names: readonly PlatformEventName[], handler: EventHandler): () => void;
}
