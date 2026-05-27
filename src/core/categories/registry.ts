/**
 * Category Registry
 * -----------------
 * The modular catalog of "life domains" the app can help with.
 *
 * Each entry is pure data — no React, no Supabase, no business logic.
 * UI consumes this through selectors; the dashboard system uses
 * `dashboard` config to pick a renderer; the mock parser uses `keywords`
 * to classify free-text descriptions.
 *
 * Adding a new category later is additive: append to `CATEGORIES`,
 * (optionally) register a card renderer in
 * `features/workspace/dashboard.registry.tsx`, done.
 *
 * Future Flutter parity: this file maps 1:1 to a Dart enum + metadata
 * map. Keep keys stable; never rename `id`s.
 */

export type CategoryId =
  | "finance"
  | "groceries"
  | "rent"
  | "property-sale"
  | "bills"
  | "tasks"
  | "goals"
  | "client-management"
  | "small-business"
  | "study"
  | "health"
  | "family";

/** Visual + behavioral metadata for a single life-domain module. */
export interface CategoryDefinition {
  id: CategoryId;
  /** i18n key under `categories.<id>.title` (with sensible English default). */
  title: string;
  /** Short calm one-liner shown on cards. */
  blurb: string;
  /** lucide-react icon name — resolved at render time to keep this file framework-agnostic. */
  icon: string;
  /** Semantic color token (CSS variable name without `--color-` prefix). */
  colorToken: "primary" | "accent" | "success" | "warning" | "secondary";
  /** Keyword stems used by the mock parser (lowercase, no punctuation). */
  keywords: string[];
  /** Dashboard renderer hint — what kind of card to show. */
  dashboard: {
    /** Renderer key, resolved in features/workspace/dashboard.registry.tsx. */
    renderer: "summary" | "list" | "reminder";
    /** Default sort weight on the dashboard (lower = higher). */
    defaultOrder: number;
  };
}

export const CATEGORIES: readonly CategoryDefinition[] = [
  {
    id: "finance",
    title: "Finance",
    blurb: "Money owed, money paid.",
    icon: "Wallet",
    colorToken: "primary",
    keywords: ["money", "finance", "payment", "owe", "lend", "borrow", "salary", "cash", "income", "expense"],
    dashboard: { renderer: "summary", defaultOrder: 10 },
  },
  {
    id: "groceries",
    title: "Groceries",
    blurb: "What to pick up next.",
    icon: "ShoppingBasket",
    colorToken: "accent",
    keywords: ["grocery", "groceries", "vegetable", "milk", "rice", "shopping", "kitchen", "supermarket"],
    dashboard: { renderer: "list", defaultOrder: 20 },
  },
  {
    id: "rent",
    title: "Rent",
    blurb: "Tenants and rent reminders.",
    icon: "Home",
    colorToken: "warning",
    keywords: ["rent", "tenant", "lease", "rental", "landlord"],
    dashboard: { renderer: "reminder", defaultOrder: 30 },
  },
  {
    id: "property-sale",
    title: "Property Sale",
    blurb: "Buyers, listings, follow-ups.",
    icon: "Building2",
    colorToken: "secondary",
    keywords: ["property", "sale", "sell", "buyer", "listing", "real estate", "plot", "house"],
    dashboard: { renderer: "summary", defaultOrder: 40 },
  },
  {
    id: "bills",
    title: "Bills",
    blurb: "Utilities and recurring payments.",
    icon: "Receipt",
    colorToken: "warning",
    keywords: ["bill", "bills", "electricity", "water", "internet", "phone", "utility", "subscription"],
    dashboard: { renderer: "reminder", defaultOrder: 50 },
  },
  {
    id: "tasks",
    title: "Tasks",
    blurb: "Small things to remember.",
    icon: "ListChecks",
    colorToken: "primary",
    keywords: ["task", "todo", "remind", "reminder", "remember", "do"],
    dashboard: { renderer: "list", defaultOrder: 60 },
  },
  {
    id: "goals",
    title: "Goals",
    blurb: "What you're working toward.",
    icon: "Target",
    colorToken: "accent",
    keywords: ["goal", "goals", "dream", "save up", "plan", "ambition", "milestone"],
    dashboard: { renderer: "summary", defaultOrder: 70 },
  },
  {
    id: "client-management",
    title: "Clients",
    blurb: "People who depend on you.",
    icon: "Users",
    colorToken: "secondary",
    keywords: ["client", "clients", "customer", "customers", "follow up", "lead"],
    dashboard: { renderer: "list", defaultOrder: 80 },
  },
  {
    id: "small-business",
    title: "Business",
    blurb: "Your work, simplified.",
    icon: "Store",
    colorToken: "primary",
    keywords: ["business", "shop", "store", "inventory", "orders", "sales"],
    dashboard: { renderer: "summary", defaultOrder: 90 },
  },
  {
    id: "study",
    title: "Study",
    blurb: "Lessons, deadlines, notes.",
    icon: "BookOpen",
    colorToken: "accent",
    keywords: ["study", "studies", "exam", "class", "assignment", "homework", "school", "college"],
    dashboard: { renderer: "list", defaultOrder: 100 },
  },
  {
    id: "health",
    title: "Health",
    blurb: "Medicines, appointments, routines.",
    icon: "HeartPulse",
    colorToken: "success",
    keywords: ["health", "medicine", "medical", "doctor", "appointment", "pill", "tablet", "hospital"],
    dashboard: { renderer: "reminder", defaultOrder: 110 },
  },
  {
    id: "family",
    title: "Family",
    blurb: "The people closest to you.",
    icon: "Users2",
    colorToken: "accent",
    keywords: ["family", "kids", "children", "parents", "home", "household", "spouse", "wife", "husband"],
    dashboard: { renderer: "summary", defaultOrder: 120 },
  },
] as const;

const CATEGORY_INDEX = new Map<CategoryId, CategoryDefinition>(
  CATEGORIES.map((c) => [c.id, c]),
);

export function getCategory(id: CategoryId): CategoryDefinition | undefined {
  return CATEGORY_INDEX.get(id);
}

export function listCategories(): readonly CategoryDefinition[] {
  return CATEGORIES;
}
