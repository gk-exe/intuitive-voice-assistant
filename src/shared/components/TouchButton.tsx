import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "soft" | "ghost" | "outline";
type Size = "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95 shadow-soft",
  soft:
    "bg-primary-soft text-foreground hover:bg-primary-soft/80",
  ghost: "bg-transparent text-foreground hover:bg-muted",
  outline:
    "bg-transparent text-foreground border border-border hover:bg-muted",
};

const sizeClasses: Record<Size, string> = {
  md: "touch-target px-5 text-base rounded-2xl",
  lg: "touch-target-lg px-6 text-lg rounded-2xl",
};

/**
 * TouchButton — designed for fingers, not cursors.
 * Min 56px tap target, generous padding, soft radii. The default for all
 * interactive controls in this app.
 */
export const TouchButton = forwardRef<HTMLButtonElement, Props>(function TouchButton(
  { variant = "primary", size = "lg", fullWidth, className = "", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={[
        "inline-flex items-center justify-center gap-2 font-medium",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...rest}
    />
  );
});
