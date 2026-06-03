/**
 * Voice Processing Layer — Contracts
 * ----------------------------------
 * Framework-agnostic shapes for the voice pipeline. No runtime here:
 * implementations (Web Speech API, native STT plugin, server STT) plug
 * into these contracts and remain swappable web ↔ Flutter.
 *
 * Pipeline:
 *   mic → AudioCapture → SpeechRecognizer → VoiceTranscript
 *        → LanguageDetector → NormalizedUtterance → (intelligence layer)
 *
 * The transcript carries enough metadata for the intelligence layer to
 * decide language strategy (e.g. Manglish: ml-Latn segments inside an
 * en utterance) without re-running STT.
 */

export type BCP47 = string; // "en", "ml", "hi", "en-IN", "ml-Latn", …

export type VoiceSessionId = string;
export type CaptureId = string;

/** Lifecycle of a single voice capture session. */
export type VoiceSessionStatus =
  | "idle"
  | "listening"
  | "processing"
  | "completed"
  | "cancelled"
  | "error";

/** Raw audio metadata. The PCM/blob itself stays in the adapter layer. */
export interface AudioCaptureMeta {
  id: CaptureId;
  startedAt: string; // ISO
  endedAt?: string;
  durationMs: number;
  sampleRate?: number;
  /** Locale the recognizer was primed with (best-guess UI language). */
  primedLocale: BCP47;
}

/** Partial / final transcript chunk from the recognizer. */
export interface TranscriptChunk {
  text: string;
  isFinal: boolean;
  confidence?: number; // 0..1
  /** Detected per-segment language, when the recognizer supports it. */
  language?: BCP47;
}

/** Composed result for one capture. */
export interface VoiceTranscript {
  captureId: CaptureId;
  /** Full text after merging final chunks. */
  text: string;
  /** Per-segment chunks, preserved for language/intent reasoning. */
  chunks: readonly TranscriptChunk[];
  /** Dominant language detected across chunks. */
  primaryLanguage: BCP47;
  /** Detected languages, ordered by share of tokens. */
  detectedLanguages: readonly BCP47[];
  /** True if the utterance mixes scripts/languages (e.g. Manglish). */
  isCodeSwitched: boolean;
  meta: AudioCaptureMeta;
}

/** Normalized, intent-ready utterance. */
export interface NormalizedUtterance {
  captureId: CaptureId;
  /** Lower-cased, punctuation-trimmed, number-words → digits, etc. */
  normalizedText: string;
  /** Original transcript preserved for audit / re-processing. */
  source: VoiceTranscript;
  /** Language strategy the intelligence layer should use. */
  languageStrategy: "single" | "code-switched";
}

/** Adapter contract — Web today, Flutter plugin tomorrow. */
export interface SpeechRecognizer {
  isSupported(): boolean;
  start(opts: { locale: BCP47; sessionId: VoiceSessionId }): Promise<void>;
  stop(): Promise<VoiceTranscript>;
  cancel(): Promise<void>;
  onChunk(handler: (chunk: TranscriptChunk) => void): () => void;
  onError(handler: (err: VoiceError) => void): () => void;
}

export interface LanguageDetector {
  detect(text: string, hint?: BCP47): {
    primary: BCP47;
    candidates: readonly BCP47[];
    codeSwitched: boolean;
  };
}

export interface VoiceError {
  code:
    | "permission-denied"
    | "no-speech"
    | "network"
    | "aborted"
    | "unsupported"
    | "unknown";
  message: string;
  cause?: unknown;
}
