/**
 * Capture Service — Contracts
 * ---------------------------
 * High-level façade UI surfaces depend on. It wires the pipeline,
 * draft service, confirmation projector, committer, and history
 * recorder into a single coherent flow.
 *
 * UI surfaces (Quick Add bar, voice mic, AI suggestion banner, module
 * forms) all call into this one entry point. They never reach into
 * repositories, the event bus, or the intelligence layer directly.
 */

import type { CaptureInput, GeneratedCapture } from "./pipeline";
import type { CaptureActionBatch, ActionCommitResult } from "./action";
import type { CaptureDraft } from "./draft";
import type {
  ConfirmationPreview,
  ConfirmationDecision,
} from "./confirmation";

export interface CaptureSubmitOptions {
  /** Skip confirmation even if policy normally requires it (e.g. trusted form). */
  skipConfirmation?: boolean;
  /** Persist as a draft if commit doesn't happen this turn. */
  persistDraft?: boolean;
  origin?: CaptureDraft["origin"];
}

export interface CaptureSubmitResult {
  captureId: string;
  generated: GeneratedCapture;
  preview?: ConfirmationPreview;
  draft?: CaptureDraft;
  /** Present only when committed inline (no confirmation needed). */
  commits?: readonly ActionCommitResult[];
}

export interface CaptureService {
  /** End-to-end: input → preview (or commit when policy allows). */
  submit(input: CaptureInput, options?: CaptureSubmitOptions): Promise<CaptureSubmitResult>;

  /** Resume an existing draft through the pipeline. */
  resumeDraft(draftId: string): Promise<CaptureSubmitResult>;

  /** Apply the user's confirmation decision. */
  finalize(decision: ConfirmationDecision): Promise<readonly ActionCommitResult[]>;

  /** Direct commit for surfaces that bypass the pipeline (e.g. typed form submit). */
  commitDirect(actions: CaptureActionBatch): Promise<readonly ActionCommitResult[]>;
}

/** Quick Add is just a thin UI over `CaptureService.submit({ kind: "text" })`. */
export interface QuickAddEntryPoint {
  open(prefill?: string): void;
  close(): void;
  submitText(text: string): Promise<CaptureSubmitResult>;
}
