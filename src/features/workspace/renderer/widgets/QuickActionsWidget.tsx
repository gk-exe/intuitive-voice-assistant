/**
 * QuickActionsWidget
 * ------------------
 * Renders a row of quick actions for a module. Each action carries an
 * `intent` string — the future voice/AI orchestrator dispatches against
 * these, so this widget is purely presentational today. No handlers,
 * no routing, no business logic.
 *
 * Wiring real dispatch happens via a top-level IntentBus in a later phase;
 * this component will subscribe to that bus without changing its props.
 */

import { useTranslation } from "react-i18next";

import { CategoryIcon } from "@/shared/components/CategoryIcon";
import type { QuickAction } from "../../contracts";

interface Props {
  actions?: readonly QuickAction[];
  /** Optional callback; if absent, the action is a no-op (intent-only). */
  onDispatch?: (intent: string) => void;
}

export function QuickActionsWidget({ actions = [], onDispatch }: Props) {
  const { t } = useTranslation();
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const isPrimary = action.emphasis === "primary";
        return (
          <button
            key={action.id}
            type="button"
            onClick={() => onDispatch?.(action.intent)}
            data-intent={action.intent}
            className={[
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm touch-target",
              "transition-colors duration-150",
              isPrimary
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-muted text-foreground/80 hover:bg-muted/70",
            ].join(" ")}
          >
            <CategoryIcon name={action.icon} className="size-4" strokeWidth={1.5} />
            <span>{t(action.labelKey, { defaultValue: action.id })}</span>
          </button>
        );
      })}
    </div>
  );
}
