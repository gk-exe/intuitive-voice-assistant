/**
 * Confirmation — Contracts
 * ------------------------
 * The confirmation layer renders the platform's universal
 * "we understood this as…" preview before any high-impact action
 * commits. The same contract serves manual quick-add, voice, and AI
 * suggestions so the user always sees the same calm review surface.
 *
 * The layer is presentation-data ONLY. It returns the user's decision
 * (`accept | edit | reject`) and lets the orchestrator handle commit.
 */

import type { CaptureAction, CaptureActionBatch } from "./action";
import type { GeneratedCapture } from "./pipeline";

/** A single human-readable line in the preview, e.g. "Person: Rajeev". */
export interface ConfirmationField {
  /** i18n key or literal label. */
  label: string;
  /** Display value; formatter responsibility lies with the renderer. */
  value: string;
  /** Source role from the extraction (e.g. "debtor", "amount"). */
  role?: string;
  /** True when the field was inferred low-confidence — UI flags it. */
  uncertain?: boolean;
  /** Path inside the action payload, enabling inline edits. */
  payloadPath?: string;
}

export interface ConfirmationItem {
  action: CaptureAction;
  /** Short headline e.g. "Finance entry · 15,000". */
  title: string;
  /** Grouped fields for the review card. */
  fields: readonly ConfirmationField[];
  /** Optional icon hint (module id). */
  moduleId?: string;
}

export interface ConfirmationPreview {
  captureId: string;
  items: readonly ConfirmationItem[];
  /** Overall confidence from the generated capture. */
  confidence: number;
  /** Friendly summary line: "We understood this as 1 finance entry". */
  summary: string;
}

export type ConfirmationDecision =
  | { kind: "accept"; preview: ConfirmationPreview }
  | { kind: "edit"; preview: ConfirmationPreview; actions: CaptureActionBatch }
  | { kind: "reject"; preview: ConfirmationPreview; reason?: string };

/** Pure projector: GeneratedCapture → ConfirmationPreview. */
export interface ConfirmationProjector {
  project(generated: GeneratedCapture): ConfirmationPreview;
}

/** Policy: should we even show the confirmation step? */
export interface ConfirmationPolicy {
  shouldConfirm(generated: GeneratedCapture): boolean;
}
