/**
 * RecordFormSheet
 * ---------------
 * Schema-driven create/edit form, surfaced as a bottom drawer. One
 * component handles every entity in the system — no per-module forks,
 * no enterprise-admin clutter.
 *
 * Rendering rules:
 *   - One field per row, generous touch targets (≥ 56px).
 *   - Required fields blocked at submit; no inline scolding.
 *   - "money" parses to a number; empty fields persist as null, not "".
 *
 * The form does not know about navigation, toast, or persistence —
 * it calls back through `onSubmit` with a clean values payload, and the
 * caller decides what to do (create vs update, route away, etc.).
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { TouchButton } from "@/shared/components/TouchButton";
import type {
  EntitySchema,
  FieldDef,
  FieldValue,
  RecordCreateInput,
  RecordEntity,
} from "../contracts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: EntitySchema;
  /** When present, the form is in edit mode and prefilled. */
  record?: RecordEntity;
  onSubmit: (input: RecordCreateInput) => void;
}

type DraftValues = Record<string, string>;

function recordToDraft(record: RecordEntity | undefined, schema: EntitySchema): DraftValues {
  const out: DraftValues = {};
  for (const f of schema.fields) {
    const v = record?.values[f.key];
    out[f.key] = v == null ? "" : String(v);
  }
  return out;
}

function draftToValues(
  draft: DraftValues,
  schema: EntitySchema,
): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {};
  for (const f of schema.fields) {
    const raw = (draft[f.key] ?? "").trim();
    if (raw === "") {
      out[f.key] = null;
      continue;
    }
    if (f.type === "money" || f.type === "number") {
      const n = Number(raw.replace(/[,\s]/g, ""));
      out[f.key] = Number.isFinite(n) ? n : null;
    } else {
      out[f.key] = raw;
    }
  }
  return out;
}

export function RecordFormSheet({ open, onOpenChange, schema, record, onSubmit }: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<DraftValues>(() => recordToDraft(record, schema));
  const [error, setError] = useState<string | null>(null);

  // Reset draft whenever the sheet opens or the underlying record changes.
  useEffect(() => {
    if (open) {
      setDraft(recordToDraft(record, schema));
      setError(null);
    }
  }, [open, record, schema]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    for (const f of schema.fields) {
      if (f.required && (draft[f.key] ?? "").trim() === "") {
        setError(t(f.labelKey));
        return;
      }
    }
    const values = draftToValues(draft, schema);
    const status = record?.status ?? schema.defaultStatus;
    onSubmit({ values, status });
    onOpenChange(false);
  }

  const title = record
    ? t("records.actions.edit", { defaultValue: "Edit" }) + " · " + t(schema.singularKey)
    : t(schema.addLabelKey);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92dvh] bg-background">
        <DrawerHeader className="text-left">
          <DrawerTitle className="font-display text-2xl text-foreground">{title}</DrawerTitle>
          <DrawerDescription>
            {t("records.form.subtitle", { defaultValue: "Add only what you know. Edit anytime." })}
          </DrawerDescription>
        </DrawerHeader>

        <form
          onSubmit={handleSubmit}
          className="safe-bottom flex flex-col gap-4 overflow-y-auto px-4 pb-6"
        >
          {schema.fields.map((f) => (
            <FieldRow
              key={f.key}
              field={f}
              value={draft[f.key] ?? ""}
              onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
            />
          ))}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {t("records.form.required", { defaultValue: "Please fill in" })} {error}.
            </p>
          )}

          <div className="mt-2 flex flex-col gap-2 pt-2">
            <TouchButton type="submit" fullWidth>
              {t("common.save")}
            </TouchButton>
            <TouchButton
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </TouchButton>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

interface FieldRowProps {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
}

function FieldRow({ field, value, onChange }: FieldRowProps) {
  const { t } = useTranslation();
  const id = `field-${field.key}`;
  const label = (
    <label htmlFor={id} className="text-sm font-medium text-muted-foreground">
      {t(field.labelKey)}
      {field.required && <span className="ml-1 text-primary">*</span>}
    </label>
  );

  const baseInputClass =
    "w-full rounded-2xl border border-border bg-surface px-4 text-base text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none transition-colors";

  switch (field.type) {
    case "longtext":
      return (
        <div className="flex flex-col gap-2">
          {label}
          <textarea
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className={`${baseInputClass} py-3`}
          />
        </div>
      );
    case "select":
      return (
        <div className="flex flex-col gap-2">
          {label}
          <select
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`touch-target ${baseInputClass}`}
          >
            <option value="">{t("records.form.choose", { defaultValue: "Choose…" })}</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
        </div>
      );
    case "date":
      return (
        <div className="flex flex-col gap-2">
          {label}
          <input
            id={id}
            type="date"
            value={value ? value.slice(0, 10) : ""}
            onChange={(e) => onChange(e.target.value)}
            className={`touch-target ${baseInputClass}`}
          />
        </div>
      );
    case "money":
    case "number":
      return (
        <div className="flex flex-col gap-2">
          {label}
          <input
            id={id}
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`touch-target ${baseInputClass}`}
          />
        </div>
      );
    case "phone":
      return (
        <div className="flex flex-col gap-2">
          {label}
          <input
            id={id}
            type="tel"
            inputMode="tel"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`touch-target ${baseInputClass}`}
          />
        </div>
      );
    default:
      return (
        <div className="flex flex-col gap-2">
          {label}
          <input
            id={id}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`touch-target ${baseInputClass}`}
          />
        </div>
      );
  }
}
