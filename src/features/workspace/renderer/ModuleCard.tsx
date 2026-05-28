/**
 * ModuleCard
 * ----------
 * Renders one composed module as a tappable card: identity strip
 * (icon + title + blurb), an honest live summary when the module has
 * records, and the stack of widgets the engine resolved. Tapping the
 * card opens the module's list view. Quick actions short-circuit to
 * the same list (with `?new=1`) so "Add entry" lands in the form sheet.
 *
 * The card stays presentational: it does not own records, it just
 * displays counts the records repository computes.
 */

import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";

import { CategoryIcon } from "@/shared/components/CategoryIcon";
import { useModuleSummary } from "@/features/records";
import type { ComposedModule } from "../contracts";
import { WidgetRenderer } from "./WidgetRenderer";

interface Props {
  composed: ComposedModule;
}

const ICON_BG: Record<string, string> = {
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent/15 text-accent-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  secondary: "bg-secondary text-secondary-foreground",
};

export function ModuleCard({ composed }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { module, widgets } = composed;
  const iconClass = ICON_BG[module.colorToken] ?? ICON_BG.primary;
  const summary = useModuleSummary(module.id);

  const hasRecords = summary.total > 0;
  const statusLine = buildStatusLine(summary, t);

  const openModule = (search?: Record<string, string>) =>
    navigate({
      to: "/modules/$moduleId",
      params: { moduleId: module.id },
      search: search ?? {},
    });

  return (
    <article
      className="rounded-3xl bg-surface p-5 shadow-soft"
      data-module-id={module.id}
    >
      <button
        type="button"
        onClick={() => openModule()}
        className="flex w-full items-center gap-3 text-left touch-target"
        aria-label={t("workspace.openModule", {
          defaultValue: "Open",
          replace: { name: t(module.titleKey) },
        })}
      >
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClass}`}
        >
          <CategoryIcon name={module.icon} className="size-5" strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-medium text-foreground">
            {t(module.titleKey, { defaultValue: module.id })}
          </h3>
          <p className="truncate text-sm text-muted-foreground">
            {hasRecords ? statusLine : t(module.blurbKey, { defaultValue: "" })}
          </p>
        </div>
      </button>

      <div className="mt-4 flex flex-col gap-4">
        {widgets.map((w) => (
          <WidgetRenderer
            key={w.id}
            widget={w}
            onDispatch={(intent) => {
              // Any primary `*.add-*` intent routes to the module list with
              // the form sheet primed. Non-add intents are no-ops today —
              // the intent bus will pick them up in a later phase.
              if (intent.includes(".add-") || intent.endsWith(".add")) {
                openModule({ new: "1" });
              }
            }}
          />
        ))}
      </div>
    </article>
  );
}

function buildStatusLine(
  summary: ReturnType<typeof useModuleSummary>,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const parts: string[] = [
    t("workspace.summary.count", {
      defaultValue: "{{count}} items",
      count: summary.total,
    }),
  ];
  if (summary.byStatus && summary.entity?.statuses) {
    for (const status of summary.entity.statuses) {
      const n = summary.byStatus[status.key] ?? 0;
      if (n > 0) parts.push(`${n} ${t(status.labelKey).toLowerCase()}`);
    }
  }
  return parts.slice(0, 3).join(" · ");
}
