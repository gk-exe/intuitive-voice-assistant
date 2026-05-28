/**
 * RecordList
 * ----------
 * Grouped list view for an entity. Groups by schema.groupBy (today:
 * "status" or "none"). Section headers show count; empty groups stay
 * mounted so the user understands the lifecycle even before there's data.
 */

import { useTranslation } from "react-i18next";

import type { EntitySchema, RecordEntity } from "../contracts";
import { groupRecords } from "../state/selectors";
import { RecordRow } from "./RecordRow";

interface Props {
  records: readonly RecordEntity[];
  schema: EntitySchema;
  moduleId: string;
}

export function RecordList({ records, schema, moduleId }: Props) {
  const { t } = useTranslation();
  const groups = groupRecords(records, schema).filter(
    (g) => g.records.length > 0 || schema.groupBy === "status",
  );

  if (groups.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-2">
          {group.status && (
            <header className="flex items-baseline justify-between px-1">
              <h3 className="text-sm font-medium text-muted-foreground">
                {t(group.status.labelKey, { defaultValue: group.status.key })}
              </h3>
              <span className="text-xs text-muted-foreground/70">{group.records.length}</span>
            </header>
          )}
          {group.records.length === 0 ? (
            <p className="rounded-2xl bg-surface/60 px-4 py-3 text-sm text-muted-foreground">
              {t("records.empty.group", { defaultValue: "Nothing here." })}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {group.records.map((r) => (
                <RecordRow key={r.id} record={r} schema={schema} moduleId={moduleId} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
