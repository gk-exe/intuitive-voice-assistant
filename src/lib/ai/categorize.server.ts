/**
 * OpenAI Categorization Provider (server-only)
 * --------------------------------------------
 * Implements `CategorizationProvider` against the Lovable AI Gateway,
 * which exposes OpenAI models over an OpenAI-compatible API. The key
 * never leaves the server; this module is `.server.ts` so it can never
 * be pulled into a client bundle.
 *
 * Notes:
 *   - Reasoning models can run long, so the call streams and we join the
 *     text server-side. One-shot semantics, streaming transport.
 *   - Output is constrained by a strict JSON schema, so we never have to
 *     "hope" the model returned parseable JSON.
 *   - Every failure is non-fatal: we throw a typed error and the caller
 *     degrades to the deterministic local parser.
 */

import {
  type CategorizationRequest,
  type CategorizationResult,
  type CategorizedItem,
} from "@/core/intelligence/categorization";
import { CATEGORIES, type CategoryId } from "@/core/categories/registry";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-5.4-mini";

const MODULE_IDS = CATEGORIES.map((c) => c.id);
const MODULE_ID_SET = new Set<string>(MODULE_IDS);

export class CategorizationError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "CategorizationError";
  }
}

function buildSystemPrompt(nowIso: string, locale?: string): string {
  const catalog = CATEGORIES.map((c) => `- ${c.id}: ${c.blurb}`).join("\n");
  return [
    "You categorize short, messy, real-life notes into life-domain modules.",
    "The user may write in English, Malayalam, Hindi, or a mix (Manglish).",
    "",
    "Available modules:",
    catalog,
    "",
    `Current date-time: ${nowIso}.`,
    locale ? `User locale hint: ${locale}.` : "",
    "",
    "Rules:",
    "- Split genuine lists into separate items (e.g. groceries).",
    "- Otherwise return exactly one item.",
    "- title: a short human headline. For money owed, use the person's name.",
    "- amount: plain number, no symbols. Understand 'k', 'lakh'. null if absent.",
    "- dueDate: resolve relative dates against the current date-time. YYYY-MM-DD or null.",
    "- notes: extra context worth keeping, else null.",
    "- confidence: honest 0..1. Use below 0.55 when the module is a guess.",
    "- reason: 2-4 words, e.g. 'Finance entry', 'Grocery item'.",
    "- Never invent facts that are not in the input.",
  ]
    .filter(Boolean)
    .join("\n");
}

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          moduleId: { type: "string", enum: MODULE_IDS },
          title: { type: "string" },
          amount: { type: ["number", "null"] },
          dueDate: { type: ["string", "null"] },
          notes: { type: ["string", "null"] },
          confidence: { type: "number" },
          reason: { type: "string" },
        },
        required: ["moduleId", "title", "amount", "dueDate", "notes", "confidence", "reason"],
      },
    },
  },
  required: ["items"],
} as const;

/** Reads the SSE body and returns the joined output text. */
async function readStreamedText(response: Response): Promise<string> {
  const body = response.body;
  if (!body) throw new CategorizationError("Empty response body from AI gateway.");

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let completedText: string | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          response?: { output_text?: string };
        };
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
          text += event.delta;
        } else if (event.type === "response.completed") {
          const final = event.response?.output_text;
          if (typeof final === "string" && final.length > 0) completedText = final;
        }
      } catch {
        // Ignore malformed keep-alive frames.
      }
    }
  }

  return (completedText ?? text).trim();
}

function coerceItem(raw: unknown): CategorizedItem | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const moduleId = typeof r["moduleId"] === "string" ? r["moduleId"] : "";
  if (!MODULE_ID_SET.has(moduleId)) return null;
  const title = typeof r["title"] === "string" ? r["title"].trim() : "";
  if (!title) return null;

  const amount = typeof r["amount"] === "number" && Number.isFinite(r["amount"]) ? r["amount"] : null;
  const dueRaw = typeof r["dueDate"] === "string" ? r["dueDate"].slice(0, 10) : null;
  const dueDate = dueRaw && /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? dueRaw : null;
  const notes = typeof r["notes"] === "string" && r["notes"].trim() ? r["notes"].trim() : null;
  const confidence =
    typeof r["confidence"] === "number" && Number.isFinite(r["confidence"])
      ? Math.min(1, Math.max(0, r["confidence"]))
      : 0.5;
  const reason = typeof r["reason"] === "string" && r["reason"].trim() ? r["reason"].trim() : "Detected";

  return {
    moduleId: moduleId as CategoryId,
    title,
    amount,
    dueDate,
    notes,
    confidence,
    reason,
  };
}

export async function categorizeWithOpenAI(
  request: CategorizationRequest,
): Promise<CategorizationResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new CategorizationError("AI is not configured.");

  const nowIso = request.nowIso ?? new Date().toISOString();

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      input: [
        { role: "system", content: [{ type: "input_text", text: buildSystemPrompt(nowIso, request.locale) }] },
        { role: "user", content: [{ type: "input_text", text: request.text }] },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "categorization",
          strict: true,
          schema: RESPONSE_SCHEMA,
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 429) throw new CategorizationError("AI is busy right now.", 429);
    if (response.status === 402) throw new CategorizationError("AI credits exhausted.", 402);
    throw new CategorizationError(detail.slice(0, 300) || "AI request failed.", response.status);
  }

  const text = await readStreamedText(response);
  if (!text) throw new CategorizationError("AI returned an empty result.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new CategorizationError("AI returned unreadable output.");
  }

  const rawItems = (parsed as { items?: unknown }).items;
  const items = Array.isArray(rawItems)
    ? rawItems.map(coerceItem).filter((i): i is CategorizedItem => i !== null)
    : [];

  if (items.length === 0) throw new CategorizationError("AI found nothing to save.");

  const confidence = items.reduce((sum, i) => sum + i.confidence, 0) / items.length;

  return { items, confidence, engine: "ai" };
}
