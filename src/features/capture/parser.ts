/**
 * Local Capture Parser
 * --------------------
 * Deterministic, keyword-based natural-language → structured record(s).
 * A temporary stand-in for the real AI intent layer.
 *
 * Contract:
 *   parseCapture(text) → CaptureCandidate[]
 *
 * One candidate per detected record. Multiple are produced when the
 * input clearly contains a list ("buy rice and milk" → 2 grocery items).
 * Falls back to a single Task when nothing else matches but the text
 * is non-empty — the user can edit the type in the review step.
 *
 * Replace the body when the AI lands; keep the return shape stable.
 */

import {
  getEntitySchema,
  type EntitySchema,
} from "@/features/records";
import type { CategoryId } from "@/core/categories/registry";

export interface CaptureCandidate {
  entityType: string;
  moduleId: CategoryId;
  schema: EntitySchema;
  values: Record<string, string | number | null>;
  status?: string;
  reminderAt?: string;
  /** 0..1 — purely informational, shown subtly in the review step. */
  confidence: number;
  /** Why we chose this type (single short phrase, used for the chip). */
  reason: string;
}

const MONTHS = [
  "january","february","march","april","may","june",
  "july","august","september","october","november","december",
] as const;

const WEEKDAYS = [
  "sunday","monday","tuesday","wednesday","thursday","friday","saturday",
] as const;

const GROCERY_WORDS = new Set([
  "milk","rice","bread","onion","onions","tomato","tomatoes","vegetable","vegetables",
  "sugar","salt","tea","coffee","eggs","flour","oil","atta","dal","wheat",
  "fruit","fruits","apple","apples","banana","bananas","potato","potatoes",
  "butter","cheese","yogurt","curd","chicken","fish","mutton","biscuits","snacks",
]);

const BILL_WORDS = /\b(electricity|water|internet|wifi|gas|phone bill|broadband|recharge|maintenance|rent)\b/i;
const FINANCE_VERBS = /\b(owe|owes|owed|lent|lend|borrow|borrowed|paid me|owes me|pay me back|gave me|loan)\b/i;
const TASK_VERBS = /\b(remind|remember|call|meet|email|message|text|visit|pick up|drop|send|book)\b/i;
const PROPERTY_WORDS = /\b(flat|apartment|tenant|vacant|rented|property|plot|villa|house|landlord)\b/i;
const HEALTH_WORDS = /\b(medicine|tablet|doctor|appointment|hospital|clinic|checkup|pill)\b/i;

const STOPWORDS = new Set([
  "i","me","my","you","your","the","a","an","is","are","was","were","be","to","at","on","in","of","and","or","for","with","that","this","tomorrow","today","tonight","yesterday","please","need","want","have","has","still","also","just","only","by","from","about","into",
  ...MONTHS, ...WEEKDAYS,
]);

function findAmount(text: string): number | null {
  // Matches "15000", "15,000", "rs 1500", "₹1500", "1.5k"
  const km = text.match(/(?:rs\.?|₹|inr)?\s*([\d][\d,]*(?:\.\d+)?)\s*(k|lakh|lac)?/i);
  if (!km) return null;
  const raw = km[1].replace(/,/g, "");
  let n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const unit = (km[2] ?? "").toLowerCase();
  if (unit === "k") n *= 1000;
  if (unit === "lakh" || unit === "lac") n *= 100000;
  // Filter out obvious non-amounts like phone fragments / years.
  if (n < 10) return null;
  return Math.round(n);
}

function findPersonName(text: string): string | null {
  // "Rajeev owes me", "owe Suresh", "call Anil", "remind Priya"
  const patterns = [
    /\b([A-Z][a-z]{1,20})\s+(?:owes?|owed)\b/,
    /\bowe\s+([A-Z][a-z]{1,20})\b/i,
    /\b(?:call|meet|message|text|email|visit|remind)\s+([A-Z][a-z]{1,20})\b/i,
    /\b(?:to|for|from)\s+([A-Z][a-z]{1,20})\b/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const w = m[1];
      if (!STOPWORDS.has(w.toLowerCase())) return w;
    }
  }
  // Fallback: first capitalized non-stopword token (skip leading sentence cap).
  const tokens = text.split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i].replace(/[^\w]/g, "");
    if (i === 0) continue; // skip sentence-start cap
    if (/^[A-Z][a-z]{1,20}$/.test(t) && !STOPWORDS.has(t.toLowerCase())) return t;
  }
  return null;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(9, 0, 0, 0);
  return x;
}

function findDueDate(text: string, now = new Date()): string | null {
  const lower = ` ${text.toLowerCase()} `;

  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(now); d.setDate(d.getDate() + 1);
    return startOfDay(d).toISOString();
  }
  if (/\btoday\b|\btonight\b/.test(lower)) {
    return startOfDay(now).toISOString();
  }
  if (/\byesterday\b/.test(lower)) {
    const d = new Date(now); d.setDate(d.getDate() - 1);
    return startOfDay(d).toISOString();
  }
  const inDays = lower.match(/\bin\s+(\d{1,2})\s+days?\b/);
  if (inDays) {
    const d = new Date(now); d.setDate(d.getDate() + Number(inDays[1]));
    return startOfDay(d).toISOString();
  }
  // "next monday" / "on friday"
  for (let i = 0; i < WEEKDAYS.length; i++) {
    const re = new RegExp(`\\b(?:next\\s+|on\\s+)?${WEEKDAYS[i]}\\b`);
    if (re.test(lower)) {
      const d = new Date(now);
      const cur = d.getDay();
      let diff = (i - cur + 7) % 7;
      if (diff === 0) diff = 7;
      d.setDate(d.getDate() + diff);
      return startOfDay(d).toISOString();
    }
  }
  // "on the 15th", "on 15", "by the 5"
  const dayMatch = lower.match(/\b(?:on|by)\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (dayMatch) {
    const day = Number(dayMatch[1]);
    if (day >= 1 && day <= 31) {
      const d = new Date(now);
      d.setDate(day);
      if (d.getTime() < now.getTime()) d.setMonth(d.getMonth() + 1);
      return startOfDay(d).toISOString();
    }
  }
  // "dec 15", "december 15th"
  for (let i = 0; i < MONTHS.length; i++) {
    const re = new RegExp(`\\b${MONTHS[i].slice(0,3)}[a-z]*\\s+(\\d{1,2})\\b`);
    const m = lower.match(re);
    if (m) {
      const day = Number(m[1]);
      const d = new Date(now);
      d.setMonth(i); d.setDate(day);
      if (d.getTime() < now.getTime() - 86400000) d.setFullYear(d.getFullYear() + 1);
      return startOfDay(d).toISOString();
    }
  }
  return null;
}

function extractGroceryItems(text: string): string[] {
  // Look at the segment after "buy/get/need/pick up"
  const m = text.match(/\b(?:buy|get|need|pick up|grab)\b\s+(.*)/i);
  const target = m ? m[1] : text;
  return target
    .split(/,|\band\b|&/i)
    .map((s) => s.replace(/[^\w\s]/g, "").trim())
    .filter((s) => s.length > 0 && s.length < 40);
}

function strip(text: string, remove: (string | null)[]): string {
  let out = text;
  for (const r of remove) {
    if (!r) continue;
    out = out.replace(new RegExp(`\\b${r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "");
  }
  return out.replace(/\s+/g, " ").trim();
}

// ─────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────

export function parseCapture(rawText: string, now = new Date()): CaptureCandidate[] {
  const text = rawText.trim();
  if (!text) return [];

  const amount = findAmount(text);
  const person = findPersonName(text);
  const dueAt = findDueDate(text, now);

  const schemaFor = (id: string) => getEntitySchema(id)!;

  // ── Finance ────────────────────────────────────────────────────────
  if (FINANCE_VERBS.test(text) || (amount && person && /\b(owe|paid|pay|gave|gave me)\b/i.test(text))) {
    const schema = schemaFor("finance.entry");
    return [{
      entityType: schema.id,
      moduleId: schema.moduleId,
      schema,
      values: {
        personName: person ?? "",
        amountPending: amount ?? null,
        amountPaid: null,
        dueDate: dueAt ? dueAt.slice(0, 10) : null,
        phone: null,
        notes: text,
      },
      status: "pending",
      reminderAt: dueAt ?? undefined,
      confidence: amount && person ? 0.85 : 0.6,
      reason: "Finance entry",
    }];
  }

  // ── Bills ──────────────────────────────────────────────────────────
  if (BILL_WORDS.test(text) && /\b(bill|due|pay|recharge)\b/i.test(text)) {
    const schema = schemaFor("bills.bill");
    const labelMatch = text.match(BILL_WORDS);
    const label = labelMatch ? labelMatch[0] : "Bill";
    return [{
      entityType: schema.id,
      moduleId: schema.moduleId,
      schema,
      values: {
        label: capitalize(label) + (text.toLowerCase().includes("bill") ? " bill" : ""),
        amount: amount ?? null,
        dueDate: dueAt ? dueAt.slice(0, 10) : null,
        recurring: "none",
        notes: text,
      },
      status: "due",
      reminderAt: dueAt ?? undefined,
      confidence: dueAt ? 0.8 : 0.6,
      reason: "Bill",
    }];
  }

  // ── Groceries (list-aware) ─────────────────────────────────────────
  if (/\bbuy\b|\bget\b|\bpick up\b|\bgrab\b/i.test(text) ||
      [...GROCERY_WORDS].some((w) => new RegExp(`\\b${w}\\b`, "i").test(text))) {
    const schema = schemaFor("groceries.item");
    const items = extractGroceryItems(text);
    if (items.length > 0) {
      return items.map((name) => ({
        entityType: schema.id,
        moduleId: schema.moduleId,
        schema,
        values: { name: capitalize(name), quantity: null, category: null, notes: null },
        status: undefined,
        confidence: 0.75,
        reason: "Grocery item",
      }));
    }
  }

  // ── Property update (rent module) ──────────────────────────────────
  if (PROPERTY_WORDS.test(text)) {
    const schema = schemaFor("rent.property");
    if (schema) {
      const titleGuess = strip(text, [
        ...["is","the","my"], ...MONTHS as unknown as string[],
      ]).slice(0, 60);
      return [{
        entityType: schema.id,
        moduleId: schema.moduleId,
        schema,
        values: {
          ...defaultValuesFor(schema),
          ...(schema.fields.find((f) => f.key === "title") ? { title: titleGuess } : {}),
          ...(schema.fields.find((f) => f.key === "name") ? { name: titleGuess } : {}),
          ...(schema.titleField ? { [schema.titleField]: titleGuess } : {}),
          notes: text,
        },
        status: schema.defaultStatus,
        confidence: 0.55,
        reason: "Property update",
      }];
    }
  }

  // ── Health ─────────────────────────────────────────────────────────
  if (HEALTH_WORDS.test(text)) {
    const schema = schemaFor("health.reminder");
    return [{
      entityType: schema.id,
      moduleId: schema.moduleId,
      schema,
      values: {
        title: capitalize(strip(text, ["tomorrow","today","tonight"])).slice(0, 80),
        dueDate: dueAt ? dueAt.slice(0, 10) : null,
        recurring: "none",
        notes: text,
      },
      status: "active",
      reminderAt: dueAt ?? undefined,
      confidence: 0.7,
      reason: "Health reminder",
    }];
  }

  // ── Task / reminder fallback ───────────────────────────────────────
  const isTaskLike = TASK_VERBS.test(text) || !!dueAt;
  if (isTaskLike) {
    const schema = schemaFor("tasks.task");
    return [{
      entityType: schema.id,
      moduleId: schema.moduleId,
      schema,
      values: {
        title: capitalize(strip(text, ["remind","me","to","tomorrow","today","tonight"])).slice(0, 80) || text.slice(0, 80),
        dueDate: dueAt ? dueAt.slice(0, 10) : null,
        notes: null,
      },
      status: "open",
      reminderAt: dueAt ?? undefined,
      confidence: dueAt ? 0.75 : 0.55,
      reason: "Task",
    }];
  }

  // ── Last resort: task with the raw text ────────────────────────────
  const schema = schemaFor("tasks.task");
  return [{
    entityType: schema.id,
    moduleId: schema.moduleId,
    schema,
    values: { title: capitalize(text).slice(0, 80), dueDate: null, notes: null },
    status: "open",
    confidence: 0.35,
    reason: "Task (guessed)",
  }];
}

function capitalize(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return t[0].toUpperCase() + t.slice(1);
}

function defaultValuesFor(schema: EntitySchema): Record<string, string | number | null> {
  const out: Record<string, string | number | null> = {};
  for (const f of schema.fields) out[f.key] = null;
  return out;
}
