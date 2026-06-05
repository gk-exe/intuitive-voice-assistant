/**
 * Drafts — Contracts
 * ------------------
 * A draft is an UNCOMMITTED capture the user can leave and resume.
 * Drafts are first-class so the UI never loses input — whether from
 * a half-filled form, an interrupted voice command, or an AI
 * suggestion awaiting review.
 *
 * Drafts are NOT records. They live in their own scoped store and
 * become actions only when committed via the capture pipeline.
 */

import type { CaptureInput, GeneratedCapture } from "./pipeline";

export type DraftStatus =
  | "open"        // user is editing
  | "pending"    // awaiting confirmation
  | "abandoned"  // explicitly discarded
  | "committed";  // promoted into actions

export type DraftScope = "device" | "account";

export interface CaptureDraft {
  id: string;
  scope: DraftScope;
  status: DraftStatus;
  /** Original input — replayable through the pipeline. */
  input: CaptureInput;
  /** Last generated preview, cached for fast resume. */
  generated?: GeneratedCapture;
  /** Free-form user notes attached to the draft. */
  note?: string;
  /** Optional surface hint — where the draft was opened. */
  origin?: "quick-add" | "module-detail" | "voice" | "ai";
  createdAt: string;
  updatedAt: string;
  /** TTL hint for housekeeping; null = keep until explicit action. */
  expiresAt?: string;
}

export interface DraftService {
  create(input: CaptureInput, origin?: CaptureDraft["origin"]): Promise<CaptureDraft>;
  update(id: string, patch: Partial<Pick<CaptureDraft, "input" | "generated" | "note">>): Promise<CaptureDraft>;
  list(filter?: { status?: DraftStatus; scope?: DraftScope }): Promise<readonly CaptureDraft[]>;
  get(id: string): Promise<CaptureDraft | undefined>;
  abandon(id: string): Promise<void>;
  markCommitted(id: string): Promise<void>;
}
