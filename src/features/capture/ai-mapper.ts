/**
 * AI → Candidate mapper
 * ---------------------
 * Translates provider-agnostic `CategorizedItem`s into the existing
 * `CaptureCandidate` shape the review UI already understands. Keeping
 * this translation in the feature layer means the AI provider never
 * learns about entity schemas, and the review UI never learns about AI.
 */

import { getPrimaryEntityForModule, type EntitySchema } from "@/features/records";
import type { CategorizedItem } from "@/core/intelligence/categorization";
import type { CategoryId } from "@/core/categories/registry";
import type { CaptureCandidate } from "./parser";

function reminderIsoFor(dueDate: string | null): string | undefined {
  if (!dueDate) return undefined;
  const d = new Date(`${dueDate}T09:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function buildValues(
  schema: EntitySchema,
  item: CategorizedItem,
): Record<string, string | number | null> {
  const values: Record<string, string | number | null> = {};
  for (const field of schema.fields) values[field.key] = null;

  values[schema.titleField] = item.title;
  if (schema.amountField) values[schema.amountField] = item.amount;
  if (schema.dueField) values[schema.dueField] = item.dueDate;
  if ("notes" in values) values["notes"] = item.notes;
  return values;
}

/** Map one AI item onto its module's primary entity. */
export function toCandidate(item: CategorizedItem): CaptureCandidate | null {
  const schema = getPrimaryEntityForModule(item.moduleId);
  if (!schema) return null;
  return {
    entityType: schema.id,
    moduleId: schema.moduleId,
    schema,
    values: buildValues(schema, item),
    status: schema.defaultStatus,
    reminderAt: schema.reminderCompatible ? reminderIsoFor(item.dueDate) : undefined,
    confidence: item.confidence,
    reason: item.reason,
  };
}

export function toCandidates(items: readonly CategorizedItem[]): CaptureCandidate[] {
  return items.map(toCandidate).filter((c): c is CaptureCandidate => c !== null);
}

/**
 * Re-target an existing candidate at a different module, preserving what
 * still makes sense (title, amount, due date, notes). Powers the manual
 * category override in the review step.
 */
export function recategorize(
  candidate: CaptureCandidate,
  moduleId: CategoryId,
): CaptureCandidate {
  const schema = getPrimaryEntityForModule(moduleId);
  if (!schema) return candidate;

  const prev = candidate.schema;
  const title = candidate.values[prev.titleField];
  const amount = prev.amountField ? candidate.values[prev.amountField] : null;
  const due = prev.dueField ? candidate.values[prev.dueField] : null;
  const notes = "notes" in candidate.values ? candidate.values["notes"] : null;

  const item: CategorizedItem = {
    moduleId,
    title: title == null ? "" : String(title),
    amount: typeof amount === "number" ? amount : null,
    dueDate: typeof due === "string" && due ? due : null,
    notes: typeof notes === "string" && notes ? notes : null,
    confidence: 1,
    reason: "Chosen by you",
  };

  return {
    ...(toCandidate(item) as CaptureCandidate),
    confidence: 1,
    reason: "Chosen by you",
  };
}
