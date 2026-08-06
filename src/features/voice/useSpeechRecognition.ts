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

const MAX_RECORDING_MS = 90_000;

/** Words that are commonly repeated intentionally in natural speech. */
const NATURAL_DOUBLE_WORDS = new Set(["bye", "had", "is", "no", "that", "very", "yes"]);

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

export type RecognitionStatus = "idle" | "listening" | "processing" | "error" | "unsupported";

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

/**
 * Removes recognizer stutter without broadly rewriting the user's words.
 * Three-or-more identical adjacent words are always collapsed. A pair is
 * collapsed except for a small set of words commonly doubled on purpose.
 */
function cleanRecognitionStutter(input: string): string {
  const words = normalize(input).split(" ").filter(Boolean);
  const collapsedWords: string[] = [];

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    if (!word) continue;
    const comparable = word.toLocaleLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    let runEnd = index + 1;
    while (runEnd < words.length) {
      const candidate = words[runEnd];
      const candidateComparable = candidate
        ?.toLocaleLowerCase()
        .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
      if (!comparable || candidateComparable !== comparable) break;
      runEnd += 1;
    }

    const runLength = runEnd - index;
    const keepCount = runLength === 2 && NATURAL_DOUBLE_WORDS.has(comparable) ? 2 : 1;
    collapsedWords.push(...words.slice(index, index + keepCount));
    index = runEnd - 1;
  }

  const comparable = (word: string) => word.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const cleaned: string[] = [];
  for (let index = 0; index < collapsedWords.length; ) {
    let repeatedPhraseLength = 0;
    const maxPhraseLength = Math.min(8, Math.floor((collapsedWords.length - index) / 2));
    for (let length = maxPhraseLength; length >= 2; length -= 1) {
      const first = collapsedWords
        .slice(index, index + length)
        .map(comparable)
        .join(" ");
      const second = collapsedWords
        .slice(index + length, index + length * 2)
        .map(comparable)
        .join(" ");
      if (first && first === second) {
        repeatedPhraseLength = length;
        break;
      }
    }

    if (repeatedPhraseLength > 0) {
      const phrase = collapsedWords.slice(index, index + repeatedPhraseLength);
      const phraseKey = phrase.map(comparable).join(" ");
      cleaned.push(...phrase);
      index += repeatedPhraseLength;
      while (
        collapsedWords
          .slice(index, index + repeatedPhraseLength)
          .map(comparable)
          .join(" ") === phraseKey
      ) {
        index += repeatedPhraseLength;
      }
    } else {
      const word = collapsedWords[index];
      if (word) cleaned.push(word);
      index += 1;
    }
  }

  return cleaned.join(" ");
}

/** Merge a final and last interim snapshot without repeating their overlap. */
function mergeWithoutOverlap(finalText: string, interimText: string): string {
  const finalWords = normalize(finalText).split(" ").filter(Boolean);
  const interimWords = normalize(interimText).split(" ").filter(Boolean);
  if (finalWords.length === 0) return interimWords.join(" ");
  if (interimWords.length === 0) return finalWords.join(" ");

  const comparable = (word: string) => word.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const maxOverlap = Math.min(finalWords.length, interimWords.length);
  let overlap = 0;
  for (let size = maxOverlap; size > 0; size -= 1) {
    const suffix = finalWords.slice(-size).map(comparable).join(" ");
    const prefix = interimWords.slice(0, size).map(comparable).join(" ");
    if (suffix === prefix) {
      overlap = size;
      break;
    }
  }

  return [...finalWords, ...interimWords.slice(overlap)].join(" ");
}

export function useSpeechRecognition(): UseSpeechRecognition {
  const Ctor = getCtor();
  const isSupported = Ctor !== null;

  const [status, setStatus] = useState<RecognitionStatus>(isSupported ? "idle" : "unsupported");
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const startingRef = useRef(false);
  const cancelledRef = useRef(false);
  const interimRef = useRef("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Absolute store of finalized segments keyed by their results-array index. */
  const finalsRef = useRef<Map<number, string>>(new Map());
  /** Text locked in before the current session (from previous resume/edit). */
  const committedRef = useRef("");

  const teardown = useCallback((rec?: SpeechRecognitionLike) => {
    const active = rec ?? recRef.current;
    if (!active) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    active.onresult = null;
    active.onerror = null;
    active.onend = null;
    active.onstart = null;
    if (recRef.current === active) recRef.current = null;
    startingRef.current = false;
  }, []);

  useEffect(
    () => () => {
      cancelledRef.current = true;
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }
      teardown();
    },
    [teardown],
  );

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
    setFinalText(cleanRecognitionStutter(assembled));
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
        interimRef.current = "";
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
        interimRef.current = "";
      }

      const rec = new Ctor();
      rec.lang = locale;
      // A single utterance is more consistently finalized on mobile than an
      // indefinitely continuous session. Users can explicitly resume.
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 3;

      rec.onstart = () => {
        if (recRef.current !== rec) return;
        startingRef.current = false;
        setStatus("listening");
        timeoutRef.current = setTimeout(() => {
          if (recRef.current !== rec) return;
          setErrorMessage(
            "Recording stopped after 90 seconds. Review your transcript or add more.",
          );
          setStatus("processing");
          try {
            rec.stop();
          } catch {
            /* noop */
          }
        }, MAX_RECORDING_MS);
      };

      rec.onresult = (event) => {
        if (recRef.current !== rec || cancelledRef.current) return;
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
        interimRef.current = normalize(interim);
        setInterimText(interimRef.current);
      };

      rec.onerror = (event) => {
        if (recRef.current !== rec || cancelledRef.current) return;
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
        if (recRef.current !== rec) return;
        const keys = Array.from(finalsRef.current.keys()).sort((a, b) => a - b);
        const sessionFinal = keys
          .map((key) => finalsRef.current.get(key) ?? "")
          .filter(Boolean)
          .join(" ");
        const completedSession = mergeWithoutOverlap(sessionFinal, interimRef.current);
        const completed = cleanRecognitionStutter(
          committedRef.current ? `${committedRef.current} ${completedSession}` : completedSession,
        );

        committedRef.current = completed;
        finalsRef.current = new Map();
        interimRef.current = "";
        setFinalText(completed);
        setInterimText("");
        if (!completed && !cancelledRef.current) {
          setErrorMessage("I didn't catch any speech. Try recording again.");
          setStatus("error");
        } else {
          setStatus((current) => (current === "error" ? "error" : "idle"));
        }
        teardown(rec);
      };

      try {
        recRef.current = rec;
        rec.start();
      } catch {
        startingRef.current = false;
        setErrorMessage("Couldn't start the microphone. Try again.");
        setStatus("error");
        teardown(rec);
      }
    },
    [Ctor, flushFinals, teardown],
  );

  const start = useCallback((locale: string) => beginSession(locale, "fresh"), [beginSession]);
  const resume = useCallback((locale: string) => beginSession(locale, "resume"), [beginSession]);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    setStatus("processing");
    try {
      rec.stop();
    } catch {
      /* noop */
    }
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    const rec = recRef.current;
    if (rec) {
      try {
        rec.abort();
      } catch {
        /* noop */
      }
    }
    finalsRef.current = new Map();
    committedRef.current = "";
    interimRef.current = "";
    setInterimText("");
    setFinalText("");
    setErrorMessage(null);
    setStatus(isSupported ? "idle" : "unsupported");
  }, [isSupported]);

  const reset = useCallback(() => {
    finalsRef.current = new Map();
    committedRef.current = "";
    interimRef.current = "";
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
    interimRef.current = "";
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
