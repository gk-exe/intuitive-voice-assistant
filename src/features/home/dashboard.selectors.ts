/**
 * Dashboard Selectors
 * -------------------
 * Pure derivations on top of the records store for the operational
 * sections of the home screen. Surfacing real, user-owned data — never
 * fake counts or invented analytics.
 */

import { useMemo } from "react";

import {
  getEntitySchema,
  useRecords,
} from "@/features/records";
import { useRecordsStore } from "@/features/records/state/records.store";
import type { RecordEntity, EntitySchema } from "@/features/records";

export interface DashboardItem {
  record: RecordEntity;
  schema: EntitySchema;
  /** ISO due date when present, for sort. */
  dueAt?: string;
}

function isOpen(record: RecordEntity, schema: EntitySchema): boolean {
  if (!schema.statuses || !record.status) return true;
  // "Open" means: not a terminal success state.
  return !["paid", "done", "closed"].includes(record.status);
}

function dueMs(record: RecordEntity, schema: EntitySchema): number | null {
  if (!schema.dueField) return null;
  const v = record.values[schema.dueField];
  if (!v) return null;
  const t = new Date(String(v)).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Open items due today or earlier across reminder-capable entities. */
export function useTodayReminders(): DashboardItem[] {
  const records = useRecordsStore((s) => s.records);
  return useMemo(() => {
    const now = Date.now();
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const limit = endOfToday.getTime();
    const items: DashboardItem[] = [];
    for (const r of records) {
      const schema = getEntitySchema(r.entityType);
      if (!schema || !schema.dueField) continue;
      if (!isOpen(r, schema)) continue;
      const t = dueMs(r, schema);
      if (t == null) continue;
      if (t <= limit) items.push({ record: r, schema, dueAt: new Date(t).toISOString() });
    }
    items.sort((a, b) => (a.dueAt! < b.dueAt! ? -1 : 1));
    return items.slice(0, 6);
  }, [records]);
}

/** Bills due within the next 7 days that are still open. */
export function useUpcomingBills(): DashboardItem[] {
  const records = useRecords("bills.bill");
  const schema = getEntitySchema("bills.bill");
  return useMemo(() => {
    if (!schema) return [];
    const now = Date.now();
    const horizon = now + 7 * 86400000;
    const items: DashboardItem[] = [];
    for (const r of records) {
      if (!isOpen(r, schema)) continue;
      const t = dueMs(r, schema);
      if (t == null) continue;
      if (t <= horizon) items.push({ record: r, schema, dueAt: new Date(t).toISOString() });
    }
    items.sort((a, b) => (a.dueAt! < b.dueAt! ? -1 : 1));
    return items.slice(0, 5);
  }, [records, schema]);
}

/** Pending or partial finance entries. */
export function usePendingFinance(): DashboardItem[] {
  const records = useRecords("finance.entry");
  const schema = getEntitySchema("finance.entry");
  return useMemo(() => {
    if (!schema) return [];
    const items = records
      .filter((r) => r.status === "pending" || r.status === "partial")
      .map((r) => ({ record: r, schema }));
    return items.slice(0, 5);
  }, [records, schema]);
}

export interface PendingFinanceSummary {
  count: number;
  totalPending: number;
}

export function usePendingFinanceSummary(): PendingFinanceSummary {
  const items = usePendingFinance();
  return useMemo(() => {
    let total = 0;
    for (const it of items) {
      const v = it.record.values["amountPending"];
      if (typeof v === "number") total += v;
    }
    return { count: items.length, totalPending: total };
  }, [items]);
}
