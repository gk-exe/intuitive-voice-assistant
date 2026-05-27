import type { ReactNode } from "react";

/**
 * Screen — top-level mobile-first page container.
 *
 * Centers content within a max phone-width column on larger viewports so the
 * app keeps its mobile feel on tablets/desktops (it's a phone app at heart).
 */
export function Screen({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className={`mx-auto flex min-h-screen w-full max-w-md flex-col px-5 ${className}`}>
        {children}
      </div>
    </div>
  );
}
