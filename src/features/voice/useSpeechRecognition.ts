/**
 * useSpeechRecognition — thin wrapper around the Web Speech API.
 *
 * Goals for the launch MVP:
 *   - Reliable start/stop with proper cleanup
 *   - Live (interim) transcription
 *   - Graceful fallback when unsupported
 *   - Swappable locale (en-IN, ml-IN, hi-IN…)
 *
 * Not goals (intentionally):
 *   - True multi-language detection. The browser API requires a single
 *     `lang`. Users pick a language; mixed-language speech still often
 *     works because Chrome's recognizer is forgiving.
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
  finalText: string;
  interimText: string;
  /** finalText + interimText, convenient for display. */
  liveText: string;
  errorMessage: string | null;
  start: (locale: string) => void;
  stop: () => void;
  cancel: () => void;
  reset: () => void;
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

  const start = useCallback(
    (locale: string) => {
      if (!Ctor) {
        setStatus("unsupported");
        return;
      }
      // If already running, ignore.
      if (recRef.current) return;

      setErrorMessage(null);
      setFinalText("");
      setInterimText("");
      cancelledRef.current = false;

      const rec = new Ctor();
      rec.lang = locale;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => setStatus("listening");

      rec.onresult = (event) => {
        let interim = "";
        let finalDelta = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const transcript = res[0]?.transcript ?? "";
          if (res.isFinal) finalDelta += transcript;
          else interim += transcript;
        }
        if (finalDelta) {
          setFinalText((prev) => (prev ? `${prev} ${finalDelta}`.trim() : finalDelta.trim()));
        }
        setInterimText(interim.trim());
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
        if (cancelledRef.current) {
          setStatus("idle");
        } else {
          setStatus((s) => (s === "error" ? "error" : "processing"));
        }
      };

      try {
        rec.start();
        recRef.current = rec;
      } catch (err) {
        setErrorMessage("Couldn't start the microphone.");
        setStatus("error");
        teardown();
      }
    },
    [Ctor, teardown],
  );

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
    setInterimText("");
    setFinalText("");
    setStatus(isSupported ? "idle" : "unsupported");
  }, [isSupported]);

  const reset = useCallback(() => {
    setFinalText("");
    setInterimText("");
    setErrorMessage(null);
    setStatus(isSupported ? "idle" : "unsupported");
  }, [isSupported]);

  const liveText = [finalText, interimText].filter(Boolean).join(" ").trim();

  return {
    isSupported,
    status,
    finalText,
    interimText,
    liveText,
    errorMessage,
    start,
    stop,
    cancel,
    reset,
  };
}
