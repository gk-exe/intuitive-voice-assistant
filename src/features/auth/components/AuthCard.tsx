import type { ReactNode } from "react";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-8 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl text-foreground">{title}</h1>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}
