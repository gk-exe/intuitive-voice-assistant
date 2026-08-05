/**
 * useCategorization
 * -----------------
 * The capture screen's single source of "what did we understand?".
 *
 * Strategy:
 *   1. Show the deterministic local parse immediately (zero latency).
 *   2. Debounce, then ask the AI categorizer on the server.
 *   3. Replace the preview with the AI result when it wins.
 *   4. On any AI failure, silently keep the local result and mark the
 *      engine as degraded — capture NEVER blocks on the network.
 */

import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { categorizeCapture } from "@/lib/ai/categorize.functions";
import { LOW_CONFIDENCE } from "@/core/intelligence/categorization";
import { parseCapture, type CaptureCandidate } from "./parser";
import { toCandidates } from "./ai-mapper";

const DEBOUNCE_MS = 700;
const MIN_CHARS = 3;

export interface CategorizationState {
  candidates: CaptureCandidate[];
  engine: "ai" | "local";
  thinking: boolean;
  /** Set when the AI path failed and we fell back to local parsing. */
  degradedReason?: string;
  /** True when the result is a guess — the UI asks the user to confirm. */
  lowConfidence: boolean;
}

export function useCategorization(
  text: string,
  source: "text" | "voice",
): CategorizationState {
  const runCategorize = useServerFn(categorizeCapture);
  const [state, setState] = useState<CategorizationState>({
    candidates: [],
    engine: "local",
    thinking: false,
    lowConfidence: false,
  });
  const runIdRef = useRef(0);

  useEffect(() => {
    const trimmed = text.trim();
    const runId = ++runIdRef.current;

    const local = parseCapture(trimmed);
    if (trimmed.length < MIN_CHARS) {
      setState({ candidates: local, engine: "local", thinking: false, lowConfidence: false });
      return;
    }

    setState({
      candidates: local,
      engine: "local",
      thinking: true,
      lowConfidence: false,
    });

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const response = await runCategorize({
            data: { text: trimmed, nowIso: new Date().toISOString(), source },
          });
          if (runIdRef.current !== runId) return;

          if (!response.ok) {
            setState({
              candidates: local,
              engine: "local",
              thinking: false,
              degradedReason: response.message,
              lowConfidence: local.length === 0,
            });
            return;
          }

          const candidates = toCandidates(response.result.items);
          if (candidates.length === 0) {
            setState({
              candidates: local,
              engine: "local",
              thinking: false,
              degradedReason: "AI found nothing to save.",
              lowConfidence: local.length === 0,
            });
            return;
          }

          setState({
            candidates,
            engine: "ai",
            thinking: false,
            lowConfidence: response.result.confidence < LOW_CONFIDENCE,
          });
        } catch {
          if (runIdRef.current !== runId) return;
          setState({
            candidates: local,
            engine: "local",
            thinking: false,
            degradedReason: "AI is unavailable right now.",
            lowConfidence: local.length === 0,
          });
        }
      })();
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [text, source, runCategorize]);

  return state;
}
