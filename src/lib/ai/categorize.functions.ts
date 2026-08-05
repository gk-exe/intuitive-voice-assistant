/**
 * Categorization — server function boundary
 * -----------------------------------------
 * Thin wrapper only. All runtime logic lives in `categorize.server.ts`
 * (server-fn splitting removes siblings from this module at build time).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { categorizeWithOpenAI, CategorizationError } from "./categorize.server";

export const categorizeCapture = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      text: z.string().trim().min(1).max(1000),
      locale: z.string().max(16).optional(),
      nowIso: z.string().max(40).optional(),
      source: z.enum(["text", "voice"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const result = await categorizeWithOpenAI(data);
      return { ok: true as const, result };
    } catch (error) {
      const message =
        error instanceof CategorizationError ? error.message : "AI is unavailable.";
      const status = error instanceof CategorizationError ? error.status : undefined;
      return { ok: false as const, message, status };
    }
  });
