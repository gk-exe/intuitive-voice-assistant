import { useCallback, useEffect, useRef, useState } from "react";

import type { RecognitionStatus, UseSpeechRecognition } from "./useSpeechRecognition";

const MAX_RECORDING_MS = 90_000;
const TARGET_SAMPLE_RATE = 16_000;

interface ActiveCapture {
  context: AudioContext;
  stream: MediaStream;
  source: MediaStreamAudioSourceNode;
  processor: ScriptProcessorNode;
  silence: GainNode;
  chunks: Float32Array[];
  timer: ReturnType<typeof setTimeout>;
}

function cleanDuplicatePhrases(input: string): string {
  const words = input.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const key = (word: string) => word.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const output: string[] = [];

  for (let index = 0; index < words.length; ) {
    let duplicateLength = 0;
    const maxLength = Math.min(8, Math.floor((words.length - index) / 2));
    for (let length = maxLength; length >= 1; length -= 1) {
      const first = words
        .slice(index, index + length)
        .map(key)
        .join(" ");
      const second = words
        .slice(index + length, index + length * 2)
        .map(key)
        .join(" ");
      if (first && first === second) {
        duplicateLength = length;
        break;
      }
    }

    if (duplicateLength === 0) {
      const word = words[index];
      if (word) output.push(word);
      index += 1;
      continue;
    }

    const phrase = words.slice(index, index + duplicateLength);
    const phraseKey = phrase.map(key).join(" ");
    output.push(...phrase);
    index += duplicateLength;
    while (
      words
        .slice(index, index + duplicateLength)
        .map(key)
        .join(" ") === phraseKey
    ) {
      index += duplicateLength;
    }
  }

  return output.join(" ");
}

function encodeWav(chunks: Float32Array[], inputRate: number): Blob {
  const inputLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const input = new Float32Array(inputLength);
  let offset = 0;
  for (const chunk of chunks) {
    input.set(chunk, offset);
    offset += chunk.length;
  }

  const ratio = inputRate / TARGET_SAMPLE_RATE;
  const outputLength = Math.max(0, Math.floor(input.length / ratio));
  const samples = new Float32Array(outputLength);
  for (let outputIndex = 0; outputIndex < outputLength; outputIndex += 1) {
    const start = Math.floor(outputIndex * ratio);
    const end = Math.min(input.length, Math.floor((outputIndex + 1) * ratio));
    let sum = 0;
    for (let inputIndex = start; inputIndex < end; inputIndex += 1) sum += input[inputIndex] ?? 0;
    samples[outputIndex] = end > start ? sum / (end - start) : 0;
  }

  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (position: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(position + index, value.charCodeAt(index));
    }
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, TARGET_SAMPLE_RATE, true);
  view.setUint32(28, TARGET_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + index * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  });
  return new Blob([buffer], { type: "audio/wav" });
}

function transcriptionMessage(status: number): string {
  if (status === 400 || status === 415)
    return "That recording could not be heard clearly. Please try again.";
  if (status === 402) return "Voice transcription credits are unavailable right now.";
  if (status === 403 || status === 404) return "Voice transcription is not available right now.";
  if (status === 413) return "That recording was too long. Please record a shorter note.";
  if (status === 429) return "Voice transcription is busy. Please wait a moment and try again.";
  return "Transcription failed. Check your connection and try again.";
}

export function useAudioTranscription(): UseSpeechRecognition {
  const [isSupported, setIsSupported] = useState(false);
  const [status, setStatus] = useState<RecognitionStatus>("idle");
  const [finalText, setFinalText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const captureRef = useRef<ActiveCapture | null>(null);
  const committedRef = useRef("");
  const localeRef = useRef("en-IN");
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setIsSupported(
      typeof navigator !== "undefined" &&
        Boolean(navigator.mediaDevices?.getUserMedia) &&
        typeof AudioContext !== "undefined",
    );
  }, []);

  const cancelCapture = useCallback(async () => {
    const active = captureRef.current;
    captureRef.current = null;
    if (!active) return;
    clearTimeout(active.timer);
    active.processor.disconnect();
    active.source.disconnect();
    active.silence.disconnect();
    active.stream.getTracks().forEach((track) => track.stop());
    await active.context.close().catch(() => undefined);
  }, []);

  const transcribe = useCallback(async (blob: Blob) => {
    if (blob.size < 2_048) {
      setErrorMessage("That recording was empty. Please try again.");
      setStatus("error");
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    const body = new FormData();
    body.append("file", blob, "recording.wav");
    body.append("language", localeRef.current.slice(0, 2));

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(String(response.status));
      if (!response.body) throw new Error("500");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let transcript = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const event = JSON.parse(line.slice(5).trim()) as {
              type?: string;
              delta?: string;
              text?: string;
            };
            if (event.type === "transcript.text.delta" && event.delta) transcript += event.delta;
            if (event.type === "transcript.text.done" && event.text) transcript = event.text;
          } catch {
            // Ignore malformed keep-alive frames.
          }
        }
      }

      const clean = cleanDuplicatePhrases(transcript);
      const complete = cleanDuplicatePhrases(
        committedRef.current ? `${committedRef.current} ${clean}` : clean,
      );
      if (!complete) throw new Error("400");
      committedRef.current = complete;
      setFinalText(complete);
      setStatus("idle");
    } catch (error) {
      if (controller.signal.aborted) return;
      const parsedStatus = error instanceof Error ? Number(error.message) : 500;
      setErrorMessage(transcriptionMessage(Number.isFinite(parsedStatus) ? parsedStatus : 500));
      setStatus("error");
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  }, []);

  const stop = useCallback(async () => {
    const active = captureRef.current;
    if (!active) return;
    captureRef.current = null;
    clearTimeout(active.timer);
    active.processor.disconnect();
    active.source.disconnect();
    active.silence.disconnect();
    active.stream.getTracks().forEach((track) => track.stop());
    const blob = encodeWav(active.chunks, active.context.sampleRate);
    await active.context.close().catch(() => undefined);
    setStatus("processing");
    await transcribe(blob);
  }, [transcribe]);

  const begin = useCallback(
    async (locale: string, resume: boolean) => {
      if (captureRef.current || status === "processing") return;
      if (!isSupported) {
        setStatus("unsupported");
        return;
      }
      if (!resume) {
        committedRef.current = "";
        setFinalText("");
      } else {
        committedRef.current = finalText.trim();
      }
      localeRef.current = locale;
      setErrorMessage(null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
        });
        const context = new AudioContext();
        await context.resume();
        const source = context.createMediaStreamSource(stream);
        const processor = context.createScriptProcessor(4_096, 1, 1);
        const silence = context.createGain();
        silence.gain.value = 0;
        const chunks: Float32Array[] = [];
        processor.onaudioprocess = (event) => {
          chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
        };
        source.connect(processor);
        processor.connect(silence);
        silence.connect(context.destination);
        const timer = setTimeout(() => void stop(), MAX_RECORDING_MS);
        captureRef.current = { context, stream, source, processor, silence, chunks, timer };
        setStatus("listening");
      } catch {
        setErrorMessage("Microphone access is needed to record. Enable it in browser settings.");
        setStatus("error");
      }
    },
    [finalText, isSupported, status, stop],
  );

  const reset = useCallback(() => {
    void cancelCapture();
    requestRef.current?.abort();
    requestRef.current = null;
    committedRef.current = "";
    setFinalText("");
    setErrorMessage(null);
    setStatus(isSupported ? "idle" : "unsupported");
  }, [cancelCapture, isSupported]);

  useEffect(
    () => () => {
      void cancelCapture();
      requestRef.current?.abort();
    },
    [cancelCapture],
  );

  const setTranscript = useCallback((text: string) => {
    committedRef.current = text;
    setFinalText(text);
  }, []);

  return {
    isSupported,
    status,
    finalText,
    interimText: "",
    liveText: finalText,
    errorMessage,
    start: (locale) => void begin(locale, false),
    resume: (locale) => void begin(locale, true),
    stop: () => void stop(),
    cancel: reset,
    reset,
    setTranscript,
  };
}
