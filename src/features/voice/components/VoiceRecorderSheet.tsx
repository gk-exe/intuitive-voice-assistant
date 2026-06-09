/**
 * VoiceRecorderSheet
 * ------------------
 * Bottom sheet for capturing voice. Calm, single-purpose, mobile-first.
 *
 * Flow:
 *   open → pick language (default en-IN) → tap mic to record
 *        → live transcript appears → tap stop → "Use this" fills capture
 *
 * The sheet never commits records itself — it returns transcript text to
 * the parent (the Quick Add screen) so voice and typing share the exact
 * same review/confirm pipeline.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, X, Check } from "lucide-react";

import { useSpeechRecognition } from "@/features/voice/useSpeechRecognition";

export type VoiceLocale = "en-IN" | "ml-IN" | "hi-IN";

const LANGS: { code: VoiceLocale; label: string; sub: string }[] = [
  { code: "en-IN", label: "EN", sub: "English" },
  { code: "ml-IN", label: "ML", sub: "മലയാളം" },
  { code: "hi-IN", label: "HI", sub: "हिन्दी" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onTranscript: (text: string) => void;
}

export function VoiceRecorderSheet({ open, onClose, onTranscript }: Props) {
  const [locale, setLocale] = useState<VoiceLocale>("en-IN");
  const sr = useSpeechRecognition();

  // Reset state whenever the sheet is opened.
  useEffect(() => {
    if (open) sr.reset();
    // We intentionally don't include `sr` — its identity changes each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-stop on close.
  useEffect(() => {
    if (!open) sr.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleUse() {
    const text = sr.finalText || sr.liveText;
    if (text.trim()) {
      onTranscript(text.trim());
      onClose();
    }
  }

  const recording = sr.status === "listening";
  const hasText = (sr.finalText || sr.interimText).trim().length > 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              sr.cancel();
              onClose();
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Voice capture"
            className="safe-bottom fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-background p-5 shadow-lifted"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />

            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl text-foreground">Speak</h2>
              <button
                type="button"
                onClick={() => { sr.cancel(); onClose(); }}
                aria-label="Close"
                className="touch-target rounded-full p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Language picker */}
            <div className="mb-5 flex gap-2">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    if (recording) sr.stop();
                    setLocale(l.code);
                  }}
                  className={[
                    "flex-1 rounded-2xl px-3 py-2 text-center transition-colors",
                    locale === l.code
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface text-foreground",
                  ].join(" ")}
                >
                  <div className="text-sm font-semibold">{l.label}</div>
                  <div className={[
                    "text-[11px]",
                    locale === l.code ? "text-primary-foreground/80" : "text-muted-foreground",
                  ].join(" ")}>{l.sub}</div>
                </button>
              ))}
            </div>

            {/* Mic + visual feedback */}
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="relative flex items-center justify-center">
                {recording && (
                  <>
                    <span aria-hidden className="absolute inset-0 rounded-full bg-primary/25 animate-ping" />
                    <span aria-hidden className="absolute -inset-3 rounded-full bg-primary/10 animate-pulse" />
                  </>
                )}
                {!recording && sr.isSupported && (
                  <span aria-hidden className="absolute inset-0 rounded-full bg-primary/15 animate-breathe" />
                )}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  disabled={!sr.isSupported}
                  onClick={() => {
                    if (recording) sr.stop();
                    else sr.start(locale);
                  }}
                  aria-label={recording ? "Stop recording" : "Start recording"}
                  className={[
                    "relative flex items-center justify-center rounded-full shadow-lifted transition-colors",
                    recording ? "bg-destructive text-destructive-foreground"
                              : "bg-primary text-primary-foreground",
                    !sr.isSupported && "opacity-60",
                  ].filter(Boolean).join(" ")}
                  style={{ width: 128, height: 128 }}
                >
                  {recording
                    ? <Square className="size-12" strokeWidth={1.5} />
                    : <Mic className="size-12" strokeWidth={1.5} />}
                </motion.button>
              </div>

              <p className="text-sm text-muted-foreground">
                {!sr.isSupported && "Voice isn't supported on this browser."}
                {sr.isSupported && sr.status === "idle" && "Tap the mic to start."}
                {sr.status === "listening" && "Listening…"}
                {sr.status === "processing" && "Got it."}
                {sr.status === "error" && (sr.errorMessage ?? "Something went wrong.")}
              </p>
            </div>

            {/* Live transcript */}
            <div
              aria-live="polite"
              className="min-h-[88px] rounded-2xl bg-surface p-4 text-base leading-relaxed text-foreground"
            >
              {hasText ? (
                <>
                  <span>{sr.finalText}</span>
                  {sr.interimText && (
                    <span className="text-muted-foreground"> {sr.interimText}</span>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground/70">
                  {sr.isSupported
                    ? "Your words will appear here as you speak."
                    : "Type instead — close this sheet and use the text box."}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => { sr.cancel(); onClose(); }}
                className="touch-target flex-1 rounded-2xl bg-surface px-4 py-3 text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUse}
                disabled={!hasText}
                className="touch-target flex-[2] inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-primary-foreground disabled:opacity-50"
              >
                <Check className="size-5" strokeWidth={1.75} />
                Use this
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
