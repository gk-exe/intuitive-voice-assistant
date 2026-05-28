/**
 * Repository Facade
 * -----------------
 * The only door between feature code and the persistence layer for
 * records. Today it wraps the in-memory Zustand store; tomorrow it will
 * wrap a Supabase-backed adapter. Swap the implementation, the UI does
 * not move.
 *
 * This is the seam where TanStack Query will plug in (queryKey: ['records',
 * entityType] / ['record', id]) without rewriting components.
 */

import type {
  RecordCreateInput,
  RecordEntity,
  RecordUpdateInput,
} from "./contracts";
import { useRecordsStore } from "./state";

export const recordsRepository = {
  list(entityType: string): RecordEntity[] {
    return useRecordsStore.getState().list(entityType);
  },
  get(id: string): RecordEntity | undefined {
    return useRecordsStore.getState().get(id);
  },
  create(entityType: string, input: RecordCreateInput): RecordEntity {
    return useRecordsStore.getState().create(entityType, input);
  },
  update(id: string, input: RecordUpdateInput): RecordEntity | undefined {
    return useRecordsStore.getState().update(id, input);
  },
  remove(id: string): void {
    useRecordsStore.getState().remove(id);
  },
  setStatus(id: string, status: string): void {
    useRecordsStore.getState().setStatus(id, status);
  },
};

export type RecordsRepository = typeof recordsRepository;
