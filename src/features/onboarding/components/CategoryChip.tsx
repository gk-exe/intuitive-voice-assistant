/**
 * CategoryChip — large, touch-friendly toggle for one category.
 * Used in onboarding selection and "add module" sheet.
 */

import { Check } from "lucide-react";

import {
  getCategory,
  type CategoryId,
} from "@/core/categories/registry";
import { CategoryIcon } from "@/shared/components/CategoryIcon";

interface Props {
  id: CategoryId;
  selected: boolean;
  onToggle: (id: CategoryId) => void;
}

export function CategoryChip({ id, selected, onToggle }: Props) {
  const cat = getCategory(id);
  if (!cat) return null;

  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      aria-pressed={selected}
      className={[
        "group relative flex w-full items-center gap-4 rounded-3xl px-5 py-4 text-left",
        "transition-all duration-150 touch-target-lg",
        selected
          ? "bg-primary-soft text-foreground shadow-soft"
          : "bg-surface text-foreground hover:bg-muted",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70",
        ].join(" ")}
      >
        <CategoryIcon name={cat.icon} className="size-6" strokeWidth={1.5} />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="text-base font-medium leading-tight">{cat.title}</span>
        <span className="text-sm text-muted-foreground">{cat.blurb}</span>
      </span>
      {selected && (
        <Check className="size-5 text-primary" strokeWidth={2} aria-hidden />
      )}
    </button>
  );
}
