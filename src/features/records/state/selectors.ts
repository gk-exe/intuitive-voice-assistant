/**
 * Selectors
 * ---------
 * Memo-friendly derivations on top of the records store. Components
 * subscribe to these (not the raw store) so future stores (e.g. server
 * cache via TanStack Query) drop in without component churn.
 */

import { useMemo } from "react";

import type { CategoryId } from "@/core/categories/registry";
import type { EntitySchema, RecordEntity, StatusDef } from "../contracts";
import { getPrimaryEntityForModule } from "../registry";
import { useRecordsStore } from "./records.store";

export function useRecords(entityType: string): RecordEntity[] {
  // Subscribe to the underlying array, derive a filtered view in render.
  const records = useRecordsStore((s) => s.records);
  return useMemo(
    () => records.filter((r) => r.entityType === entityType),
    [records, entityType],
  );
}

export function useRecord(id: string | undefined): RecordEntity | undefined {
  const records = useRecordsStore((s) => s.records);
  return useMemo(() => (id ? records.find((r) => r.id === id) : undefined), [records, id]);
}

export interface ModuleSummary {
  entity: EntitySchema | undefined;
  total: number;
  /** Count keyed by status key. Undefined if entity has no statuses. */
  byStatus?: Record<string, number>;
  /** Total of `amountField` across records (when present). */
  totalAmount?: number;
}

export function useModuleSummary(moduleId: CategoryId): ModuleSummary {
  const entity = getPrimaryEntityForModule(moduleId);
  const records = useRecordsStore((s) => s.records);

  return useMemo(() => {
    if (!entity) return { entity: undefined, total: 0 };
    const mine = records.filter((r) => r.entityType === entity.id);
    const summary: ModuleSummary = { entity, total: mine.length };
    if (entity.statuses) {
      summary.byStatus = Object.fromEntries(entity.statuses.map((s) => [s.key, 0]));
      for (const r of mine) {
        if (r.status && summary.byStatus[r.status] !== undefined) {
          summary.byStatus[r.status] += 1;
        }
      }
    }
    if (entity.amountField) {
      summary.totalAmount = mine.reduce((acc, r) => {
        const v = r.values[entity.amountField as string];
        return acc + (typeof v === "number" ? v : 0);
      }, 0);
    }
    return summary;
  }, [entity, records]);
}

/** Records grouped by status (preserving schema status order). */
export interface RecordGroup {
  key: string;
  status?: StatusDef;
  records: RecordEntity[];
}

export function groupRecords(
  records: readonly RecordEntity[],
  schema: EntitySchema,
): RecordGroup[] {
  if (schema.groupBy !== "status" || !schema.statuses) {
    return [{ key: "all", records: [...records] }];
  }
  return schema.statuses.map((status) => ({
    key: status.key,
    status,
    records: records.filter((r) => r.status === status.key),
  }));
}
