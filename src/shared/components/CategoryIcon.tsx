/**
 * CategoryIcon — resolves a lucide icon name (string) at render time.
 *
 * Keeps the category registry framework-agnostic: it stores icon *names*,
 * not React components, so the same data can later be consumed by Flutter
 * or a server endpoint without dragging react/lucide into them.
 */

import * as Lucide from "lucide-react";
import type { LucideProps } from "lucide-react";

type LucideIcon = (props: LucideProps) => JSX.Element;

interface Props extends LucideProps {
  name: string;
}

export function CategoryIcon({ name, ...rest }: Props) {
  const Icon = (Lucide as unknown as Record<string, LucideIcon>)[name] ??
    (Lucide as unknown as Record<string, LucideIcon>).Circle;
  return <Icon {...rest} />;
}
