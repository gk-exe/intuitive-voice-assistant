/**
 * /modules/$moduleId
 * ------------------
 * The list view for a single module's primary entity. Wraps the
 * generic RecordList + RecordsEmpty + RecordFormSheet — no module-
 * specific UI. Add this once, every module benefits.
 */

import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Plus } from "lucide-react";

import { Screen } from "@/shared/components/Screen";
import { CategoryIcon } from "@/shared/components/CategoryIcon";
import { TouchButton } from "@/shared/components/TouchButton";
import { RouteError, RouteNotFound } from "@/shared/components/RouteError";
import { isKnownModule, getModule } from "@/features/workspace/registry";
import {
  RecordFormSheet,
  RecordList,
  RecordsEmpty,
  getPrimaryEntityForModule,
  recordsRepository,
  useModuleSummary,
  useRecords,
} from "@/features/records";
import { formatMoney } from "@/features/records/components/formatters";

export const Route = createFileRoute("/_authenticated/modules/$moduleId")({
  validateSearch: (search: Record<string, unknown>) => ({
    new: search.new === "1" || search.new === 1 ? "1" : undefined,
  }),
  component: ModuleListPage,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
});


function ModuleListPage() {
  const { t } = useTranslation();
  const { moduleId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const valid = isKnownModule(moduleId);
  const module = valid ? getModule(moduleId) : undefined;
  const schema = valid ? getPrimaryEntityForModule(moduleId) : undefined;
  const records = useRecords(schema?.id ?? "");
  const summary = useModuleSummary(valid ? moduleId : ("finance" as const));

  const [addOpen, setAddOpen] = useState(false);

  // Honor `?new=1` from quick-action dispatch (workspace card → add intent).
  useEffect(() => {
    if (search.new === "1") {
      setAddOpen(true);
      void navigate({
        to: "/modules/$moduleId",
        params: { moduleId },
        search: {},
        replace: true,
      });
    }
  }, [search.new, moduleId, navigate]);

  if (!valid || !module || !schema) {
    return (
      <Screen>
        <main className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
          <p className="text-muted-foreground">
            {t("records.unknownModule", { defaultValue: "That space doesn't exist." })}
          </p>
          <Link to="/home" className="contents">
            <TouchButton variant="ghost">{t("common.back")}</TouchButton>
          </Link>
        </main>
      </Screen>
    );
  }

  const isEmpty = records.length === 0;

  return (
    <Screen>
      <header className="flex items-center justify-between pt-6">
        <Link
          to="/home"
          className="flex items-center gap-1 rounded-full px-2 py-2 text-sm text-muted-foreground touch-target"
        >
          <ArrowLeft className="size-5" strokeWidth={1.5} />
          {t("common.back")}
        </Link>
      </header>

      <main className="flex flex-col gap-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <CategoryIcon name={module.icon} className="size-6" strokeWidth={1.5} />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-3xl text-foreground">
              {t(schema.pluralKey)}
            </h1>
            <p className="text-sm text-muted-foreground">{t(module.blurbKey)}</p>
          </div>
        </div>

        {!isEmpty && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface/60 px-4 py-3 text-sm text-muted-foreground">
            <span>
              {t("records.summary.total", { defaultValue: "Total" })}: {summary.total}
            </span>
            {summary.totalAmount != null && summary.totalAmount > 0 && schema.amountField && (
              <span>
                · {t("records.summary.value", { defaultValue: "Value" })}:{" "}
                {formatMoney(
                  summary.totalAmount,
                  schema.fields.find((f) => f.key === schema.amountField)?.currency,
                )}
              </span>
            )}
          </div>
        )}

        {isEmpty ? (
          <RecordsEmpty schema={schema} onAdd={() => setAddOpen(true)} />
        ) : (
          <RecordList records={records} schema={schema} moduleId={moduleId} />
        )}
      </main>

      {!isEmpty && (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label={t(schema.addLabelKey)}
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lifted active:scale-95 transition-transform"
        >
          <Plus className="size-6" strokeWidth={1.75} />
        </button>
      )}

      <RecordFormSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        schema={schema}
        onSubmit={(input) => {
          recordsRepository.create(schema.id, input);
        }}
      />
    </Screen>
  );
}
