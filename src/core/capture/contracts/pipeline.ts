/**
 * Capture Pipeline — Contracts
 * ----------------------------
 * One reusable pipeline turns ANY input (text, voice, form, AI) into a
 * reviewable, committable `CaptureActionBatch`. Each stage is a pure,
 * swappable adapter so the same flow powers manual entry today and
 * voice + AI tomorrow.
 *
 *   Input → Normalize → Classify → Extract → Generate → Preview →
 *   Confirm → Commit
 *
 * The pipeline NEVER mutates state. The commit stage delegates to the
 * `ActionCommitter` (see action.ts), keeping the mutation boundary
 * single-doored.
 */

import type {
  IntentClassification,
  EntityExtraction,
  IntentInput,
} from "@/core/intelligence/contracts";
import type { CaptureAction, CaptureActionBatch } from "./action";

/** Every capture starts here. Polymorphic over surface and modality. */
export type CaptureInput =
  | { kind: "text"; text: string; locale?: string }
  | { kind: "voice"; utteranceId: string; intentInput: IntentInput }
  | { kind: "form"; moduleId: string; entityType: string; fields: Record<string, unknown> }
  | { kind: "ai-suggestion"; agent: string; draftActions: CaptureActionBatch };

/** Normalized, source-agnostic representation handed to the classifier. */
export interface NormalizedCapture {
  id: string;
  raw: CaptureInput;
  /** Lowercased, whitespace-collapsed text projection where applicable. */
  text?: string;
  locale?: string;
  receivedAt: string;
}

/** Output of the generate stage — the heart of the pipeline. */
export interface GeneratedCapture {
  normalized: NormalizedCapture;
  classification?: IntentClassification;
  extraction?: EntityExtraction;
  actions: CaptureActionBatch;
  /** Aggregate confidence across produced actions. */
  confidence: number;
  /** When true, the confirmation layer MUST show a preview. */
  requiresConfirmation: boolean;
}

/* ── Stage adapter contracts ──────────────────────────────────────── */

export interface CaptureNormalizer {
  normalize(input: CaptureInput): Promise<NormalizedCapture>;
}
export interface CaptureClassifier {
  classify(normalized: NormalizedCapture): Promise<IntentClassification | undefined>;
}
export interface CaptureExtractor {
  extract(
    normalized: NormalizedCapture,
    classification: IntentClassification | undefined,
  ): Promise<EntityExtraction | undefined>;
}
export interface ActionGenerator {
  generate(
    normalized: NormalizedCapture,
    classification: IntentClassification | undefined,
    extraction: EntityExtraction | undefined,
  ): Promise<CaptureActionBatch>;
}

/** Façade. UI calls this; UI never composes stages directly. */
export interface CapturePipeline {
  run(input: CaptureInput): Promise<GeneratedCapture>;
  /** Re-run only the generator (used when the user edits a preview). */
  regenerate(
    normalized: NormalizedCapture,
    overrides: { actions?: CaptureActionBatch },
  ): Promise<GeneratedCapture>;
}

/** Hooks let features observe pipeline progress without coupling. */
export type CaptureStage =
  | "normalize"
  | "classify"
  | "extract"
  | "generate"
  | "preview"
  | "confirm"
  | "commit";

export interface CaptureStageEvent {
  stage: CaptureStage;
  captureId: string;
  at: string;
  status: "started" | "completed" | "failed";
  error?: { code: string; message: string };
}

/** Single-action shortcut for surfaces that produce one action deterministically. */
export interface DirectActionInput {
  action: CaptureAction;
}
