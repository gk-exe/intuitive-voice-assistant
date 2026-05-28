/**
 * formatters
 * ----------
 * Tiny pure helpers used by list / detail / form renderers. Kept here so
 * the renderers stay focused on layout.
 */

import type { EntitySchema, FieldDef, FieldValue, RecordEntity } from "../contracts";

export function formatMoney(value: number | null | undefined, currency = "INR"): string {
  if (value == null || Number.isNaN(value)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
}

export function formatDate(value: string | null | undefined, locale?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function getFieldDef(schema: EntitySchema, key: string | undefined): FieldDef | undefined {
  if (!key) return undefined;
  return schema.fields.find((f) => f.key === key);
}

export function getRecordTitle(record: RecordEntity, schema: EntitySchema): string {
  const v = record.values[schema.titleField];
  return v != null && v !== "" ? String(v) : "—";
}

export function formatFieldValue(
  field: FieldDef,
  value: FieldValue,
  locale?: string,
): string {
  if (value == null || value === "") return "—";
  switch (field.type) {
    case "money":
      return formatMoney(typeof value === "number" ? value : Number(value), field.currency);
    case "date":
      return formatDate(String(value), locale);
    case "number":
      return String(value);
    case "select":
      // Caller is expected to translate via the field's options list.
      return String(value);
    default:
      return String(value);
  }
}
