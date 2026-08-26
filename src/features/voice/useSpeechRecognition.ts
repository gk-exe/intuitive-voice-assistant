import { useCallback, useEffect, useRef, useState } from "react";

type SRConstructor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SREventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
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

const MAX_RECORDING_MS = 90_000;
const START_TIMEOUT_MS = 10_000;

function getConstructor(): SRConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as unknown as {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export type RecognitionStatus =
  | "idle"
  | "starting"
  | "listening"
  | "stopping"
  | "complete"
  | "processing"
  | "error"
  | "unsupported";

export interface UseSpeechRecognition {
  isSupported: boolean;
  status: RecognitionStatus;
  finalText: string;
  interimText: string;
  liveText: string;
  errorMessage: string | null;
  start: (locale: string) => void;
  resume: (locale: string) => void;
  stop: () => void;
  cancel: () => void;
  reset: () => void;
  setTranscript: (text: string) => void;
}

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Only collapse unmistakable recognizer stutter within one recognition result. */
function cleanObviousStutter(text: string): string {
  const words = normalize(text).split(" ").filter(Boolean);
  const comparable = (word: string) =>
    word.toLocaleLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  const output: string[] = [];

  for (let index = 0; index < words.length; ) {
    const word = words[index];
    if (!word) {
      index += 1;
      continue;
    }
    const key = comparable(word);
    let end = index + 1;
    while (end < words.length && key && comparable(words[end] ?? "") === key) end += 1;
    const runLength = end - index;
    output.push(...words.slice(index, runLength >= 3 ? index + 1 : end));
    index = end;
  }

  return output.join(" ");
}

/**
 * Join recognition results without repeating an overlap between adjacent
 * browser segments. Repetition inside one segment is left intact so natural
 * speech such as "no no, wait" is preserved.
 */
function joinSegments(parts: string[]): string {
  const comparable = (word: string) =>
    word.toLocaleLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  const output: string[] = [];

  for (const part of parts) {
    const words = normalize(part).split(" ").filter(Boolean);
    let overlap = 0;
    const maxOverlap = Math.min(output.length, words.length);
    for (let size = maxOverlap; size > 0; size -= 1) {
      const existing = output.slice(-size).map(comparable).join(" ");
      const incoming = words.slice(0, size).map(comparable).join(" ");
      if (existing && existing === incoming) {
        overlap = size;
        break;
      }
    }
    output.push(...words.slice(overlap));
  }

  return output.join(" ");
}

function joinParts(...parts: string[]): string {
  return normalize(parts.filter(Boolean).join(" "));
}

function errorMessageFor(code: string): string | null {
  if (code === "aborted") return null;
  if (code === "no-speech") return "I didn't catch any speech. Try recording again.";
  if (code === "not-allowed" || code === "service-not-allowed") {
    return "Microphone permission is blocked. Enable it in browser settings and try again.";
  }
  if (code === "audio-capture")
    return "No microphone is available. Check your device and try again.";
  if (code === "network")
    return "Speech recognition lost its connection. Check your network and try again.";
  return "Speech recognition stopped unexpectedly. Please try again.";
}

export function useSpeechRecognition(): UseSpeechRecognition {
  const isSupported = getConstructor() !== null;
  const [status, setStatus] = useState<RecognitionStatus>(isSupported ? "idle" : "unsupported");
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const sessionRef = useRef(0);
  const finalizedRef = useRef(false);
  const cancelledRef = useRef(false);
  const acceptingResultsRef = useRef(false);
  const committedRef = useRef("");
  const finalSegmentsRef = useRef<Map<number, string>>(new Map());
  const interimSegmentsRef = useRef<Map<number, string>>(new Map());
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    recordingTimerRef.current = null;
    stopTimerRef.current = null;
  }, []);

  const detach = useCallback(
    (recognition: SpeechRecognitionLike) => {
      clearTimers();
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      if (recognitionRef.current === recognition) recognitionRef.current = null;
    },
    [clearTimers],
  );

  const assembleFinal = useCallback(() => {
    const finals = Array.from(finalSegmentsRef.current.entries())
      .sort(([left], [right]) => left - right)
      .map(([, text]) => text);
    return cleanObviousStutter(joinSegments([committedRef.current, ...finals]));
  }, []);

  const assembleInterim = useCallback(() => {
    return joinSegments(
      Array.from(interimSegmentsRef.current.entries())
        .sort(([left], [right]) => left - right)
        .map(([, text]) => text),
    );
  }, []);

  const finishSession = useCallback(
    (recognition: SpeechRecognitionLike, sessionId: number, failure?: string) => {
      if (sessionRef.current !== sessionId || finalizedRef.current) return;
      finalizedRef.current = true;
      acceptingResultsRef.current = false;

      const final = assembleFinal();
      const interim = assembleInterim();
      // Some browsers end before marking the last result final. Preserve that
      // last observed phrase once rather than returning an empty transcript.
      const completed = cleanObviousStutter(joinParts(final, interim));
      committedRef.current = completed;
      finalSegmentsRef.current.clear();
      interimSegmentsRef.current.clear();
      setFinalText(completed);
      setInterimText("");
      detach(recognition);

      if (cancelledRef.current) {
        setStatus(isSupported ? "idle" : "unsupported");
        return;
      }
      const failureMessage = failure ? errorMessageFor(failure) : null;
      if (failureMessage && !completed) {
        setErrorMessage(failureMessage);
        setStatus("error");
      } else if (!completed) {
        setErrorMessage("I didn't catch any speech. Try recording again.");
        setStatus("error");
      } else {
        setErrorMessage(null);
        setStatus("complete");
      }
    },
    [assembleFinal, assembleInterim, detach, isSupported],
  );

  const stopActive = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setStatus((current) =>
        current === "starting" || current === "listening" || current === "stopping"
          ? "idle"
          : current,
      );
      return;
    }
    const sessionId = sessionRef.current;
    setStatus("stopping");
    acceptingResultsRef.current = false;
    try {
      recognition.stop();
    } catch {
      // Finalize the transcript already received even when stop() itself fails.
    }
    // Do not rely on onend: some implementations never dispatch it after a
    // permission interruption or an immediate stop. Preserve the latest
    // interim snapshot once, detach listeners, and leave recording now.
    finishSession(recognition, sessionId);
  }, [finishSession]);

  const beginSession = useCallback(
    (locale: string, resume: boolean) => {
      const Constructor = getConstructor();
      if (!Constructor) {
        setErrorMessage("Voice recognition isn't available in this browser. You can type instead.");
        setStatus("unsupported");
        return;
      }
      if (recognitionRef.current) return;

      const sessionId = sessionRef.current + 1;
      sessionRef.current = sessionId;
      finalizedRef.current = false;
      cancelledRef.current = false;
      acceptingResultsRef.current = true;
      clearTimers();
      setErrorMessage(null);
      setInterimText("");
      finalSegmentsRef.current = new Map();
      interimSegmentsRef.current = new Map();
      committedRef.current = resume ? finalText.trim() : "";
      if (!resume) setFinalText("");

      const recognition = new Constructor();
      recognitionRef.current = recognition;
      recognition.lang = locale;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (sessionRef.current !== sessionId || recognitionRef.current !== recognition) return;
        setStatus("listening");
        clearTimers();
        recordingTimerRef.current = setTimeout(stopActive, MAX_RECORDING_MS);
      };

      recognition.onresult = (event) => {
        if (
          !acceptingResultsRef.current ||
          sessionRef.current !== sessionId ||
          recognitionRef.current !== recognition
        )
          return;
        // Rebuild from the recognizer's absolute result list. This is
        // idempotent when Chrome revises or re-emits an existing result.
        const nextFinals = new Map<number, string>();
        const nextInterims = new Map<number, string>();
        for (let index = 0; index < event.results.length; index += 1) {
          const result = event.results[index];
          if (!result) continue;
          const transcript = normalize(result[0]?.transcript ?? "");
          if (result.isFinal) {
            if (transcript) nextFinals.set(index, transcript);
          } else {
            if (transcript) nextInterims.set(index, transcript);
          }
        }
        finalSegmentsRef.current = nextFinals;
        interimSegmentsRef.current = nextInterims;
        const nextFinal = assembleFinal();
        const nextInterim = assembleInterim();
        setFinalText(nextFinal);
        setInterimText(nextInterim);
      };

      recognition.onerror = (event) => {
        if (sessionRef.current !== sessionId || recognitionRef.current !== recognition) return;
        if (event.error === "aborted" && cancelledRef.current) return;
        finishSession(recognition, sessionId, event.error);
      };

      recognition.onend = () => {
        finishSession(recognition, sessionId);
      };

      setStatus("starting");
      recordingTimerRef.current = setTimeout(() => {
        if (sessionRef.current !== sessionId || recognitionRef.current !== recognition) return;
        finishSession(recognition, sessionId, "start-timeout");
        try {
          recognition.abort();
        } catch {
          // The session has already returned to a usable error state.
        }
      }, START_TIMEOUT_MS);
      try {
        recognition.start();
      } catch {
        finishSession(recognition, sessionId, "start-failed");
      }
    },
    [assembleFinal, assembleInterim, clearTimers, finalText, finishSession, stopActive],
  );

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    acceptingResultsRef.current = false;
    sessionRef.current += 1;
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.abort();
      } catch {
        // Detaching still prevents stale events.
      }
      detach(recognition);
    }
    committedRef.current = "";
    finalSegmentsRef.current.clear();
    interimSegmentsRef.current.clear();
    setFinalText("");
    setInterimText("");
    setErrorMessage(null);
    setStatus(isSupported ? "idle" : "unsupported");
  }, [detach, isSupported]);

  const reset = useCallback(() => {
    cancel();
  }, [cancel]);

  useEffect(() => cancel, [cancel]);

  const setTranscript = useCallback((text: string) => {
    committedRef.current = text;
    finalSegmentsRef.current.clear();
    interimSegmentsRef.current.clear();
    setFinalText(text);
    setInterimText("");
    setErrorMessage(null);
    setStatus(text.trim() ? "complete" : "idle");
  }, []);

  return {
    isSupported,
    status,
    finalText,
    interimText,
    liveText: joinParts(finalText, interimText),
    errorMessage,
    start: (locale) => beginSession(locale, false),
    resume: (locale) => beginSession(locale, true),
    stop: stopActive,
    cancel,
    reset,
    setTranscript,
  };
}
