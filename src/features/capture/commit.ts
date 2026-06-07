/**
 * commitRecord
 * ------------
 * The single door through which a structured record enters the system.
 * Wraps the records repository + activity feed so every entry point
 * (capture screen, module form, future voice) produces consistent
 * activity, regardless of caller.
 */

import {
  getEntitySchema,
  recordsRepository,
  type RecordCreateInput,
  type RecordEntity,
} from "@/features/records";
import { getRecordTitle, formatMoney } from "@/features/records/components/formatters";
import { useActivityStore, type ActivitySource } from "@/features/activity";

export interface CommitOptions {
  source?: ActivitySource;
}

export function commitRecord(
  entityType: string,
  input: RecordCreateInput,
  options: CommitOptions = {},
): RecordEntity {
  const record = recordsRepository.create(entityType, input);
  const schema = getEntitySchema(entityType);
  if (!schema) return record;

  const title = getRecordTitle(record, schema);
  let detail: string | undefined;
  if (schema.amountField) {
    const v = record.values[schema.amountField];
    if (typeof v === "number" && v > 0) {
      const def = schema.fields.find((f) => f.key === schema.amountField);
      detail = formatMoney(v, def?.currency);
    }
  }

  useActivityStore.getState().log({
    kind: "created",
    entityType,
    moduleId: schema.moduleId,
    recordId: record.id,
    title,
    detail,
    source: options.source ?? "manual",
  });

  return record;
}
