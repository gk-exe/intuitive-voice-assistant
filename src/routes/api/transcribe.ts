import { createFileRoute } from "@tanstack/react-router";

const TRANSCRIPTION_URL = "https://ai.gateway.lovable.dev/v1/audio/transcriptions";
const MODEL = "openai/gpt-4o-transcribe";
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const contentType = request.headers.get("content-type") ?? "";
        if (!contentType.startsWith("multipart/form-data")) {
          return Response.json({ error: "Expected an audio upload." }, { status: 400 });
        }

        const form = await request.formData();
        const audio = form.get("file");
        const language = form.get("language");

        if (!(audio instanceof File) || audio.size < 2_048) {
          return Response.json(
            { error: "That recording was empty. Please record it again." },
            { status: 400 },
          );
        }
        if (audio.size > MAX_AUDIO_BYTES) {
          return Response.json(
            { error: "That recording is too large. Please record a shorter note." },
            { status: 413 },
          );
        }
        if (audio.type !== "audio/wav" && audio.type !== "audio/x-wav") {
          return Response.json({ error: "Only complete WAV recordings are accepted." }, { status: 415 });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return Response.json({ error: "Voice transcription is not configured." }, { status: 503 });
        }

        const upstream = new FormData();
        upstream.append("model", MODEL);
        upstream.append("file", audio, "recording.wav");
        upstream.append("stream", "true");
        if (typeof language === "string" && /^(en|ml|hi)$/.test(language)) {
          upstream.append("language", language);
        }

        const response = await fetch(TRANSCRIPTION_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: upstream,
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          return Response.json(
            { error: detail.slice(0, 500) || "Transcription failed. Please try again." },
            { status: response.status },
          );
        }

        return new Response(response.body, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});