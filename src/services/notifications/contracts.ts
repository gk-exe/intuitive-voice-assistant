/**
 * Notification Architecture — Contracts
 * -------------------------------------
 * Delivery layer for reminders + system messages. The reminder engine
 * decides WHEN; the notification layer decides HOW (in-app toast, web
 * push, native local notification on Flutter, …).
 *
 * Each channel is a swappable adapter. The dispatcher fans out to the
 * channels the user has consented to for that reminder.
 */

import type { NotificationChannel } from "@/features/reminders/contracts";

export interface NotificationPayload {
  /** Stable id, matches the reminder/instance that produced it. */
  id: string;
  title: string;
  body?: string;
  /** Deep link inside the app, e.g. "/modules/finance/abc123". */
  deepLink?: string;
  /** Tag for collapsing duplicates in OS notification trays. */
  collapseKey?: string;
  priority: "low" | "normal" | "high" | "urgent";
  /** Free-form metadata, surfaced back on user interaction. */
  data?: Record<string, string>;
}

/** A channel = one delivery mechanism. */
export interface NotificationChannelAdapter {
  readonly channel: NotificationChannel;
  isAvailable(): Promise<boolean>;
  requestPermission(): Promise<"granted" | "denied" | "default">;
  deliver(payload: NotificationPayload): Promise<NotificationDeliveryResult>;
}

export interface NotificationDeliveryResult {
  channel: NotificationChannel;
  status: "delivered" | "skipped" | "failed";
  reason?: string;
}

/** Per-user preferences — persisted via memory or settings store. */
export interface NotificationPreferences {
  enabledChannels: readonly NotificationChannel[];
  /** "Do not disturb" windows in local time, "HH:mm-HH:mm". */
  quietHours?: readonly string[];
  /** Per-module mute list. */
  mutedModules?: readonly string[];
}

export interface NotificationDispatcher {
  /** Pick channels, apply preferences/quiet hours, fan out. */
  dispatch(
    payload: NotificationPayload,
    requestedChannels: readonly NotificationChannel[],
  ): Promise<readonly NotificationDeliveryResult[]>;
  registerChannel(adapter: NotificationChannelAdapter): void;
  setPreferences(prefs: NotificationPreferences): Promise<void>;
  getPreferences(): Promise<NotificationPreferences>;
}
