/**
 * Mock Intelligence — Natural Language → Category Detector
 * --------------------------------------------------------
 * This is a temporary, deterministic, keyword-based stand-in for the real
 * AI intent layer that arrives in a later phase. It exists so the rest of
 * the app (onboarding, dashboard generation, conversational UX) can be
 * built and demoed end-to-end with realistic behavior.
 *
 * Contract:
 *   detectCategories(text) → CategoryId[]   (unique, ordered by relevance)
 *
 * When the real AI lands, only this file changes. The shape of the output
 * — a `CategoryId[]` — is what the rest of the app depends on.
 */

import {
  CATEGORIES,
  type CategoryId,
} from "@/core/categories/registry";

interface Match {
  id: CategoryId;
  score: number;
}

/**
 * Normalize free text into a comparable token stream:
 *  - lowercase
 *  - strip punctuation
 *  - collapse whitespace
 */
function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Count keyword hits for each category. Multi-word keywords are matched as
 * substrings so phrases like "real estate" or "follow up" work.
 */
export function detectCategories(rawText: string): CategoryId[] {
  if (!rawText || !rawText.trim()) return [];

  const text = " " + normalize(rawText) + " ";
  const matches: Match[] = [];

  for (const cat of CATEGORIES) {
    let score = 0;
    for (const kw of cat.keywords) {
      const needle = " " + normalize(kw) + " ";
      // Count every occurrence (cheap; lists are tiny).
      let idx = text.indexOf(needle);
      while (idx !== -1) {
        score += 1;
        idx = text.indexOf(needle, idx + needle.length);
      }
    }
    if (score > 0) matches.push({ id: cat.id, score });
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.map((m) => m.id);
}

/** Convenience: same as detectCategories but returns full definitions. */
export function detectCategoryDefinitions(rawText: string) {
  const ids = new Set(detectCategories(rawText));
  return CATEGORIES.filter((c) => ids.has(c.id));
}
