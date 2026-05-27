import { forwardRef, type InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

/**
 * TextField — minimal, low-friction. Voice-first apps still need occasional
 * typing (email at signup, names). Keep these visually quiet and large.
 */
export const TextField = forwardRef<HTMLInputElement, Props>(function TextField(
  { label, className = "", id, ...rest },
  ref,
) {
  return (
    <label className="flex flex-col gap-2 w-full" htmlFor={id}>
      {label && (
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      )}
      <input
        ref={ref}
        id={id}
        className={[
          "touch-target w-full rounded-2xl bg-surface px-4",
          "border border-border focus:border-ring focus:outline-none",
          "text-base text-foreground placeholder:text-muted-foreground/60",
          "transition-colors",
          className,
        ].join(" ")}
        {...rest}
      />
    </label>
  );
});
