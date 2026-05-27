/**
 * Dashboard Card Registry
 * -----------------------
 * Maps a category to the React component that renders its dashboard card.
 * Cards are intentionally minimal stubs in Phase 2 — they read no real
 * data, just show calm "empty state" copy for the chosen module. Phase 4+
 * replaces each renderer with a data-bound version (reminders, finance, …).
 *
 * To add a custom renderer for a category, register it here. Unregistered
 * categories fall back to a generic placeholder card that still respects
 * the design system.
 */

import {
  getCategory,
  type CategoryId,
} from "@/core/categories/registry";
import { CategoryIcon } from "@/shared/components/CategoryIcon";

interface CardProps {
  id: CategoryId;
}

function GenericCard({ id }: CardProps) {
  const cat = getCategory(id);
  if (!cat) return null;

  return (
    <article className="rounded-3xl bg-surface p-5 shadow-soft">
      <header className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <CategoryIcon name={cat.icon} className="size-5" strokeWidth={1.5} />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-base font-medium text-foreground">{cat.title}</h3>
          <p className="truncate text-sm text-muted-foreground">{cat.blurb}</p>
        </div>
      </header>
      <p className="mt-4 text-sm text-muted-foreground">
        Nothing here yet. Tap the mic and tell me anything.
      </p>
    </article>
  );
}

/**
 * Registry — key is the renderer string from CategoryDefinition.dashboard.renderer.
 * Today all three renderers share GenericCard; later phases swap in real ones.
 */
const RENDERERS: Record<string, (props: CardProps) => JSX.Element | null> = {
  summary: GenericCard,
  list: GenericCard,
  reminder: GenericCard,
};

export function DashboardCard({ id }: CardProps) {
  const cat = getCategory(id);
  if (!cat) return null;
  const Renderer = RENDERERS[cat.dashboard.renderer] ?? GenericCard;
  return <Renderer id={id} />;
}
