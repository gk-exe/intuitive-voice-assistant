/**
 * RecordRow
 * ---------
 * One-line representation of a record inside the list view. Tappable,
 * touch-friendly. Shows headline + secondary line + amount (if relevant)
 * + status pill (if relevant). Stays read-only: the row never edits.
 */

import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import type { EntitySchema, RecordEntity } from "../contracts";
import {
  formatDate,
  formatMoney,
  getFieldDef,
  getRecordTitle,
} from "./formatters";
import { StatusPill } from "./StatusPill";

interface Props {
  record: RecordEntity;
  schema: EntitySchema;
  moduleId: string;
}

export function RecordRow({ record, schema, moduleId }: Props) {
  const title = getRecordTitle(record, schema);
  const subtitleField = getFieldDef(schema, schema.subtitleField);
  const subtitleVal = subtitleField ? record.values[subtitleField.key] : null;
  const amountField = getFieldDef(schema, schema.amountField);
  const dueField = getFieldDef(schema, schema.dueField);
  const status = schema.statuses?.find((s) => s.key === record.status);
  const amount =
    amountField && typeof record.values[amountField.key] === "number"
      ? formatMoney(record.values[amountField.key] as number, amountField.currency)
      : null;
  const due = dueField ? record.values[dueField.key] : null;

  return (
    <Link
      to="/modules/$moduleId/$recordId"
      params={{ moduleId, recordId: record.id }}
      className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 touch-target-lg shadow-soft hover:bg-surface/80 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-base font-medium text-foreground">{title}</span>
          {status && <StatusPill status={status} />}
        </div>
        {(subtitleVal || due) && (
          <p className="truncate text-sm text-muted-foreground">
            {subtitleVal && <span>{String(subtitleVal)}</span>}
            {subtitleVal && due ? <span> · </span> : null}
            {due && <span>{formatDate(String(due))}</span>}
          </p>
        )}
      </div>
      {amount && (
        <span className="shrink-0 text-base font-medium text-foreground">{amount}</span>
      )}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
    </Link>
  );
}
