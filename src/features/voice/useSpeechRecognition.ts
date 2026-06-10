/**
 * useSpeechRecognition — thin, stable wrapper around the Web Speech API.
 *
 * Why this exists in its current shape
 * ------------------------------------
 * The first cut used a functional state updater:
 *   setFinalText(prev => prev + delta)
 * That doubled (or tripled) the first words of every utterance, e.g.
 *   "remind remind remind me to buy groceries"
 *
 * Two compounding causes:
 *   1. React StrictMode invokes state updaters TWICE in development to
 *      surface side-effects. Because `delta` was captured in the closure,
 *      each `onresult` event appended the same delta twice.
 *   2. Some browsers (Chrome on Android in particular) re-emit the same
 *      final result with a later `resultIndex` if the recognizer revises
 *      its confidence. A delta-based assembler counts those twice.
 *
 * Fix: never accumulate via functional state. Instead, keep a ref keyed
 * by `resultIndex` that maps to the latest known transcript for that
 * index. On every `onresult`, recompute the absolute final + interim
 * strings and `setState` to the absolute value. This is idempotent under
 * StrictMode and under browser re-emits.
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
  /** Stable, fully-final transcript so far (across pauses, if appending). */
  finalText: string;
  /** Latest interim (in-flight) transcript — replaced on every chunk. */
  interimText: string;
  /** finalText + interimText, convenient for read-only display. */
  liveText: string;
  errorMessage: string | null;
  /** Start a fresh session, clearing previous transcript. */
  start: (locale: string) => void;
  /** Resume into the existing transcript (appends new finals after a space). */
  resume: (locale: string) => void;
  stop: () => void;
  cancel: () => void;
  reset: () => void;
  /** Allow the user to edit the assembled transcript by hand. */
  setTranscript: (text: string) => void;
}

/** Tidy whitespace + remove accidental adjacent-word duplicates (case-insensitive). */
function tidy(input: string): string {
  const s = input.replace(/\s+/g, " ").trim();
  if (!s) return s;
  const out: string[] = [];
  for (const w of s.split(" ")) {
    const prev = out[out.length - 1];
    if (prev && prev.toLowerCase() === w.toLowerCase()) continue;
    out.push(w);
  }
  return out.join(" ");
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
  const cancelledRef = useRef(false);
  /** Absolute store of final segments keyed by resultIndex. */
  const finalsRef = useRef<Map<number, string>>(new Map());
  /** Index offset added to a session's resultIndex so resume() doesn't collide. */
  const indexOffsetRef = useRef(0);
  /** Text the user has manually committed (locked in) before the current session. */
  const committedRef = useRef("");

  const teardown = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    rec.onstart = null;
    recRef.current = null;
  }, []);

  useEffect(() => () => {
    try { recRef.current?.abort(); } catch { /* noop */ }
    teardown();
  }, [teardown]);

  /** Recompute absolute text from the finals map and push to state. */
  const flush = useCallback(() => {
    // Sort by index to keep transcript order stable even if browsers
    // re-emit out of order.
    const keys = Array.from(finalsRef.current.keys()).sort((a, b) => a - b);
    const finals = keys.map((k) => finalsRef.current.get(k) ?? "").join(" ");
    const assembled = tidy(
      committedRef.current ? `${committedRef.current} ${finals}` : finals,
    );
    setFinalText(assembled);
  }, []);

  const beginSession = useCallback(
    (locale: string, mode: "fresh" | "resume") => {
      if (!Ctor) {
        setStatus("unsupported");
        return;
      }
      if (recRef.current) return; // already running

      setErrorMessage(null);
      cancelledRef.current = false;

      if (mode === "fresh") {
        finalsRef.current = new Map();
        indexOffsetRef.current = 0;
        committedRef.current = "";
        setFinalText("");
        setInterimText("");
      } else {
        // Bake current transcript into the committed prefix so the new
        // session starts cleanly from index 0 without colliding.
        committedRef.current = tidy(
          [committedRef.current, ...finalsRef.current.values()]
            .filter(Boolean)
            .join(" "),
        );
        finalsRef.current = new Map();
        indexOffsetRef.current = 0;
        setInterimText("");
      }

      const rec = new Ctor();
      rec.lang = locale;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => setStatus("listening");

      rec.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const transcript = (res[0]?.transcript ?? "").trim();
          if (!transcript) continue;
          if (res.isFinal) {
            // Absolute write — idempotent under StrictMode double-invoke
            // and under browser re-emits of the same index.
            finalsRef.current.set(i, transcript);
          } else {
            interim += (interim ? " " : "") + transcript;
          }
        }
        flush();
        setInterimText(tidy(interim));
      };

      rec.onerror = (event) => {
        if (event.error === "no-speech") {
          setErrorMessage("I didn't catch that. Try again.");
        } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setErrorMessage("Microphone permission is blocked.");
        } else if (event.error === "audio-capture") {
          setErrorMessage("No microphone found.");
        } else if (event.error !== "aborted") {
          setErrorMessage("Something went wrong. Try again.");
        }
        if (event.error !== "aborted" && event.error !== "no-speech") {
          setStatus("error");
        }
      };

      rec.onend = () => {
        teardown();
        setInterimText("");
        if (cancelledRef.current) {
          setStatus("idle");
        } else {
          setStatus((s) => (s === "error" ? "error" : "idle"));
        }
      };

      try {
        rec.start();
        recRef.current = rec;
      } catch {
        setErrorMessage("Couldn't start the microphone.");
        setStatus("error");
        teardown();
      }
    },
    [Ctor, flush, teardown],
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
    indexOffsetRef.current = 0;
    setInterimText("");
    setFinalText("");
    setStatus(isSupported ? "idle" : "unsupported");
  }, [isSupported]);

  const reset = useCallback(() => {
    finalsRef.current = new Map();
    committedRef.current = "";
    indexOffsetRef.current = 0;
    setFinalText("");
    setInterimText("");
    setErrorMessage(null);
    setStatus(isSupported ? "idle" : "unsupported");
  }, [isSupported]);

  const setTranscript = useCallback((text: string) => {
    // User edited the transcript directly. Lock it into committedRef so
    // subsequent resume() sessions append cleanly.
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
