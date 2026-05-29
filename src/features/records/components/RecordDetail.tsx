/**
 * RecordDetail
 * ------------
 * Read-focused detail view of a single record. Shows every populated
 * field in a calm two-column layout, alongside status, optional
 * reminder summary, and edit/delete affordances. Edits open the shared
 * RecordFormSheet — same form, same schema, different mode.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import { TouchButton } from "@/shared/components/TouchButton";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import type { EntitySchema, RecordEntity } from "../contracts";
import { recordsRepository } from "../repository";
import {
  formatDate,
  formatFieldValue,
  getRecordTitle,
} from "./formatters";
import { RecordFormSheet } from "./RecordFormSheet";
import { StatusPill } from "./StatusPill";

interface Props {
  record: RecordEntity;
  schema: EntitySchema;
  onDeleted: () => void;
}

export function RecordDetail({ record, schema, onDeleted }: Props) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const status = schema.statuses?.find((s) => s.key === record.status);


  function resolveDisplay(fieldKey: string, raw: unknown): string {
    const field = schema.fields.find((f) => f.key === fieldKey);
    if (!field) return raw == null ? "—" : String(raw);
    if (field.type === "select" && raw != null) {
      const opt = field.options?.find((o) => o.value === String(raw));
      return opt ? t(opt.labelKey) : String(raw);
    }
    return formatFieldValue(field, (raw as string | number | null) ?? null);
  }

  const populated = schema.fields.filter(
    (f) => f.key !== schema.titleField && record.values[f.key] != null && record.values[f.key] !== "",
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 rounded-3xl bg-surface p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-3xl leading-tight text-foreground">
            {getRecordTitle(record, schema)}
          </h2>
          {status && <StatusPill status={status} />}
        </div>

        {schema.statuses && (
          <div className="flex flex-wrap gap-2 pt-1">
            {schema.statuses.map((s) => {
              const active = record.status === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => recordsRepository.setStatus(record.id, s.key)}
                  className={[
                    "rounded-full px-3 py-1.5 text-xs touch-target",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70",
                  ].join(" ")}
                >
                  {t(s.labelKey)}
                </button>
              );
            })}
          </div>
        )}
      </header>

      <section className="flex flex-col gap-3 rounded-3xl bg-surface p-5 shadow-soft">
        <h3 className="text-sm font-medium text-muted-foreground">
          {t("records.detail.details", { defaultValue: "Details" })}
        </h3>
        {populated.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("records.detail.noDetails", { defaultValue: "No extra details yet." })}
          </p>
        ) : (
          <dl className="flex flex-col divide-y divide-border/60">
            {populated.map((f) => (
              <div key={f.key} className="flex items-baseline justify-between gap-4 py-3">
                <dt className="text-sm text-muted-foreground">{t(f.labelKey)}</dt>
                <dd className="text-right text-base text-foreground">
                  {resolveDisplay(f.key, record.values[f.key])}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {schema.reminderCompatible && (
        <section className="rounded-3xl bg-surface p-5 shadow-soft">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t("records.detail.reminder", { defaultValue: "Reminder" })}
          </h3>
          {record.reminder ? (
            <p className="mt-2 text-base text-foreground">
              {formatDate(record.reminder.dueAt)}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              {t("records.detail.noReminder", {
                defaultValue: "No reminder set yet. We'll surface this when reminders launch.",
              })}
            </p>
          )}
        </section>
      )}

      <div className="flex flex-col gap-2">
        <TouchButton onClick={() => setEditing(true)}>
          <Pencil className="size-4" strokeWidth={1.5} />
          {t("common.edit")}
        </TouchButton>
        <TouchButton
          variant="ghost"
          onClick={() => {
            if (confirm(t("records.detail.confirmDelete", { defaultValue: "Delete this?" }))) {
              recordsRepository.remove(record.id);
              onDeleted();
            }
          }}
        >
          <Trash2 className="size-4" strokeWidth={1.5} />
          {t("common.delete")}
        </TouchButton>
      </div>

      <RecordFormSheet
        open={editing}
        onOpenChange={setEditing}
        schema={schema}
        record={record}
        onSubmit={(input) => {
          recordsRepository.update(record.id, input);
        }}
      />
    </div>
  );
}
