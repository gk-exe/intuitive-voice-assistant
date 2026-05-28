/**
 * ModuleCard
 * ----------
 * Renders one composed module as a calm card: identity strip
 * (icon + title + blurb) followed by the stack of widgets the engine
 * resolved for it. The card is dumb — it does not know about reordering,
 * editing, or the workspace as a whole.
 */

import { useTranslation } from "react-i18next";

import { CategoryIcon } from "@/shared/components/CategoryIcon";
import type { ComposedModule } from "../contracts";
import { WidgetRenderer } from "./WidgetRenderer";

interface Props {
  composed: ComposedModule;
}

/**
 * Map color token → tailwind classes. Centralized so a future theme swap
 * touches one place, and individual modules stay framework-agnostic.
 */
const ICON_BG: Record<string, string> = {
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent/15 text-accent-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  secondary: "bg-secondary text-secondary-foreground",
};

export function ModuleCard({ composed }: Props) {
  const { t } = useTranslation();
  const { module, widgets } = composed;
  const iconClass = ICON_BG[module.colorToken] ?? ICON_BG.primary;

  return (
    <article
      className="rounded-3xl bg-surface p-5 shadow-soft"
      data-module-id={module.id}
    >
      <header className="flex items-center gap-3">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClass}`}
        >
          <CategoryIcon name={module.icon} className="size-5" strokeWidth={1.5} />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-base font-medium text-foreground">
            {t(module.titleKey, { defaultValue: module.id })}
          </h3>
          <p className="truncate text-sm text-muted-foreground">
            {t(module.blurbKey, { defaultValue: "" })}
          </p>
        </div>
      </header>

      <div className="mt-4 flex flex-col gap-4">
        {widgets.map((w) => (
          <WidgetRenderer key={w.id} widget={w} />
        ))}
      </div>
    </article>
  );
}
