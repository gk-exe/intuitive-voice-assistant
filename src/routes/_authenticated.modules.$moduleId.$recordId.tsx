/**
 * /modules/$moduleId/$recordId
 * ----------------------------
 * Detail view for a single record. Delegates to <RecordDetail/>, which
 * handles read, status changes, edit (via shared form sheet), and delete.
 */

import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";

import { Screen } from "@/shared/components/Screen";
import { TouchButton } from "@/shared/components/TouchButton";
import { isKnownModule } from "@/features/workspace/registry";
import {
  RecordDetail,
  getPrimaryEntityForModule,
  useRecord,
} from "@/features/records";

export const Route = createFileRoute("/_authenticated/modules/$moduleId/$recordId")({
  component: RecordDetailPage,
});

function RecordDetailPage() {
  const { t } = useTranslation();
  const { moduleId, recordId } = Route.useParams();
  const navigate = useNavigate();

  const valid = isKnownModule(moduleId);
  const schema = valid ? getPrimaryEntityForModule(moduleId) : undefined;
  const record = useRecord(recordId);

  if (!valid || !schema || !record || record.entityType !== schema.id) {
    return (
      <Screen>
        <main className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
          <p className="text-muted-foreground">
            {t("records.notFound", { defaultValue: "We couldn't find that." })}
          </p>
          <Link
            to="/modules/$moduleId"
            params={{ moduleId }}
            search={{}}
            className="contents"
          >
            <TouchButton variant="ghost">{t("common.back")}</TouchButton>
          </Link>
        </main>
      </Screen>
    );
  }

  return (
    <Screen>
      <header className="flex items-center justify-between pt-6">
        <Link
          to="/modules/$moduleId"
          params={{ moduleId }}
          search={{}}
          className="flex items-center gap-1 rounded-full px-2 py-2 text-sm text-muted-foreground touch-target"
        >
          <ArrowLeft className="size-5" strokeWidth={1.5} />
          {t(schema.pluralKey)}
        </Link>
      </header>

      <main className="flex flex-col gap-6 py-4 pb-12">
        <RecordDetail
          record={record}
          schema={schema}
          onDeleted={() =>
            navigate({ to: "/modules/$moduleId", params: { moduleId }, search: {} })
          }
        />
      </main>
    </Screen>
  );
}
