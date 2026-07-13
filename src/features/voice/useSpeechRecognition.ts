/**
 * useSpeechRecognition — thin, stable wrapper around the Web Speech API.
 *
 * ROOT CAUSE of the "remind remind remind me…" bug
 * ------------------------------------------------
 * The Web Speech API is fundamentally an *incremental* stream. On every
 * `onresult` event it re-emits a `results` list; `event.resultIndex` marks
 * where the *newly changed* items start. Two things make a naive delta
 * assembler duplicate words:
 *
 *   1. React StrictMode invokes state updaters twice in dev. Any
 *      `setX(prev => prev + delta)` accumulator therefore appends the same
 *      delta twice.
 *   2. Chrome (esp. Android + Malayalam/Hindi locales) re-emits finalized
 *      segments at the same or a later `resultIndex` when it revises its
 *      confidence. Iterating from `resultIndex` and appending the returned
 *      transcript effectively re-adds words that were already committed.
 *
 * STABILITY STRATEGY
 * ------------------
 * Treat the recognizer's `results` array as the single source of truth.
 * On every `onresult`, walk ALL entries from index 0 and rebuild:
 *
 *   - `finalsRef` — a Map<index, transcript> for finalized segments
 *   - `interim`   — the concatenation of non-final segments
 *
 * Then assign the assembled strings to state (never a functional updater).
 * This is idempotent under StrictMode, under browser re-emits, and under
 * out-of-order events. Each spoken phrase can only appear once because it
 * only exists once in `event.results`.
 *
 * The `committedRef` prefix carries text across `resume()` calls (user
 * pauses, then adds more) and across manual edits, so subsequent sessions
 * append cleanly instead of overwriting.
 */

import { useCallback, useEffect, useRef, useState } from "react";

type SRConstructor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SREventLike) => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SREventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string; confidence: number };
    length: number;
  }>;
}

function getCtor(): SRConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type RecognitionStatus =
  | "idle"
  | "listening"
  | "processing"
  | "error"
  | "unsupported";

export interface UseSpeechRecognition {
  isSupported: boolean;
  status: RecognitionStatus;
  /** Stable, fully-final transcript (across pauses, if resuming). */
  finalText: string;
  /** Latest interim (in-flight) transcript — replaced on every chunk. */
  interimText: string;
  /** finalText + interimText, for read-only display. */
  liveText: string;
  errorMessage: string | null;
  /** Start a fresh session, clearing any previous transcript. */
  start: (locale: string) => void;
  /** Resume into the existing transcript (appends new finals after a space). */
  resume: (locale: string) => void;
  stop: () => void;
  cancel: () => void;
  reset: () => void;
  /** Allow the user to edit the assembled transcript by hand. */
  setTranscript: (text: string) => void;
}

/** Whitespace normaliser. Intentionally does NOT collapse adjacent duplicate
 *  words — legitimate phrases like "that that thing" must survive. */
function normalize(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function useSpeechRecognition(): UseSpeechRecognition {
  const Ctor = getCtor();
  const isSupported = Ctor !== null;

  const [status, setStatus] = useState<RecognitionStatus>(
    isSupported ? "idle" : "unsupported",
  );
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const startingRef = useRef(false);
  const cancelledRef = useRef(false);
  /** Absolute store of finalized segments keyed by their results-array index. */
  const finalsRef = useRef<Map<number, string>>(new Map());
  /** Text locked in before the current session (from previous resume/edit). */
  const committedRef = useRef("");

  const teardown = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    rec.onstart = null;
    recRef.current = null;
    startingRef.current = false;
  }, []);

  useEffect(() => () => {
    cancelledRef.current = true;
    try { recRef.current?.abort(); } catch { /* noop */ }
    teardown();
  }, [teardown]);

  /** Rebuild the finalText string from committedRef + finalsRef. */
  const flushFinals = useCallback(() => {
    const keys = Array.from(finalsRef.current.keys()).sort((a, b) => a - b);
    const finals = keys
      .map((k) => (finalsRef.current.get(k) ?? "").trim())
      .filter(Boolean)
      .join(" ");
    const assembled = committedRef.current
      ? normalize(`${committedRef.current} ${finals}`)
      : normalize(finals);
    setFinalText(assembled);
  }, []);

  const beginSession = useCallback(
    (locale: string, mode: "fresh" | "resume") => {
      if (!Ctor) {
        setStatus("unsupported");
        return;
      }
      // Guard against a StrictMode double-invoke or a rapid double click
      // spawning two recognizers.
      if (recRef.current || startingRef.current) return;
      startingRef.current = true;

      setErrorMessage(null);
      cancelledRef.current = false;

      if (mode === "fresh") {
        finalsRef.current = new Map();
        committedRef.current = "";
        setFinalText("");
        setInterimText("");
      } else {
        // Bake the current transcript into the committed prefix so the new
        // session's results-array starts fresh at index 0 without colliding
        // with the previous session's indices.
        const carry = [committedRef.current]
          .concat(
            Array.from(finalsRef.current.keys())
              .sort((a, b) => a - b)
              .map((k) => finalsRef.current.get(k) ?? ""),
          )
          .filter(Boolean)
          .join(" ");
        committedRef.current = normalize(carry);
        finalsRef.current = new Map();
        setInterimText("");
      }

      const rec = new Ctor();
      rec.lang = locale;
      // continuous:true lets slow speakers pause without ending the session.
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        startingRef.current = false;
        setStatus("listening");
      };

      rec.onresult = (event) => {
        // IMPORTANT: iterate from 0, not from event.resultIndex.
        // Doing an absolute re-scan on every event makes assembly idempotent
        // under StrictMode double-invoke and under browser result revisions.
        const nextFinals = new Map<number, string>();
        let interim = "";
        const len = event.results.length;
        for (let i = 0; i < len; i++) {
          const res = event.results[i];
          if (!res) continue;
          const transcript = (res[0]?.transcript ?? "").trim();
          if (!transcript) continue;
          if (res.isFinal) {
            nextFinals.set(i, transcript);
          } else {
            interim += (interim ? " " : "") + transcript;
          }
        }
        finalsRef.current = nextFinals;
        flushFinals();
        setInterimText(normalize(interim));
      };

      rec.onerror = (event) => {
        startingRef.current = false;
        switch (event.error) {
          case "no-speech":
            setErrorMessage("I didn't catch that. Try again.");
            break;
          case "not-allowed":
          case "service-not-allowed":
            setErrorMessage("Microphone permission is blocked. Enable it in browser settings.");
            setStatus("error");
            break;
          case "audio-capture":
            setErrorMessage("No microphone found.");
            setStatus("error");
            break;
          case "network":
            setErrorMessage("Network hiccup — check your connection and try again.");
            setStatus("error");
            break;
          case "aborted":
            // User-initiated. Silent.
            break;
          default:
            setErrorMessage("Something went wrong. Try again.");
            setStatus("error");
        }
      };

      rec.onend = () => {
        teardown();
        setInterimText("");
        setStatus((s) => (s === "error" ? "error" : "idle"));
      };

      try {
        rec.start();
        recRef.current = rec;
      } catch {
        startingRef.current = false;
        setErrorMessage("Couldn't start the microphone. Try again.");
        setStatus("error");
        teardown();
      }
    },
    [Ctor, flushFinals, teardown],
  );

  const start = useCallback((locale: string) => beginSession(locale, "fresh"), [beginSession]);
  const resume = useCallback((locale: string) => beginSession(locale, "resume"), [beginSession]);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    try { rec.stop(); } catch { /* noop */ }
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    const rec = recRef.current;
    if (rec) {
      try { rec.abort(); } catch { /* noop */ }
    }
    finalsRef.current = new Map();
    committedRef.current = "";
    setInterimText("");
    setFinalText("");
    setErrorMessage(null);
    setStatus(isSupported ? "idle" : "unsupported");
  }, [isSupported]);

  const reset = useCallback(() => {
    finalsRef.current = new Map();
    committedRef.current = "";
    setFinalText("");
    setInterimText("");
    setErrorMessage(null);
    setStatus(isSupported ? "idle" : "unsupported");
  }, [isSupported]);

  const setTranscript = useCallback((text: string) => {
    // The user edited the transcript directly. Lock it into committedRef so
    // that any subsequent resume() appends after their edit instead of
    // overwriting it.
    committedRef.current = text;
    finalsRef.current = new Map();
    setFinalText(text);
    setInterimText("");
  }, []);

  const liveText = [finalText, interimText].filter(Boolean).join(" ").trim();

  return {
    isSupported,
    status,
    finalText,
    interimText,
    liveText,
    errorMessage,
    start,
    resume,
    stop,
    cancel,
    reset,
    setTranscript,
  };
}
