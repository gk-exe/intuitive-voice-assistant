/**
 * Categorization — Contracts
 * --------------------------
 * The provider-agnostic boundary between "raw human input" and
 * "structured, categorized items". The capture pipeline depends on THIS
 * file only; the concrete provider (OpenAI today, on-device or another
 * vendor tomorrow) is injected behind `CategorizationProvider`.
 *
 * Pure data. No React, no SDK, no network. Flutter-portable 1:1.
 */

import type { CategoryId } from "@/core/categories/registry";

/** What we send to the categorizer. */
export interface CategorizationRequest {
  /** Raw natural-language input, exactly as the user typed or spoke it. */
  text: string;
  /** BCP-47 hint, e.g. "en-IN" | "ml-IN" | "hi-IN". Advisory only. */
  locale?: string;
  /** Client clock, so relative dates ("tomorrow") resolve correctly. */
  nowIso?: string;
  /** Source surface, used for telemetry and prompt hints. */
  source?: "text" | "voice";
}

/**
 * One categorized item. Deliberately shallow and schema-free: mapping
 * onto an entity schema happens in the feature layer, so a provider is
 * never coupled to the record registry.
 */
export interface CategorizedItem {
  /** Chosen life-domain module. */
  moduleId: CategoryId;
  /** Short headline, e.g. "Rajeev", "Electricity bill", "Milk". */
  title: string;
  /** Money amount in the user's default currency, if any. */
  amount: number | null;
  /** ISO date (YYYY-MM-DD) when this is due, if any. */
  dueDate: string | null;
  /** Anything worth keeping that didn't fit a field. */
  notes: string | null;
  /** 0..1 — the model's own calibrated certainty for THIS item. */
  confidence: number;
  /** One short human phrase explaining the choice ("Finance entry"). */
  reason: string;
}

/** What the categorizer returns. */
export interface CategorizationResult {
  items: readonly CategorizedItem[];
  /** 0..1 aggregate. Below `LOW_CONFIDENCE` the UI must ask the user. */
  confidence: number;
  /** Which engine produced this — surfaced subtly, logged always. */
  engine: "ai" | "local";
  /** Present when the AI path failed and we degraded to local parsing. */
  degradedReason?: string;
}

/** Below this, the confirmation UI asks the user to pick the category. */
export const LOW_CONFIDENCE = 0.55;

/** Swappable engine. One method, no lifecycle, trivially mockable. */
export interface CategorizationProvider {
  readonly id: string;
  categorize(request: CategorizationRequest): Promise<CategorizationResult>;
}
