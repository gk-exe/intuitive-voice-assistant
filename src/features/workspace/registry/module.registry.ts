/**
 * Module Registry
 * ---------------
 * The single source of truth for "what modules can the workspace engine
 * compose?" Each entry extends the corresponding CategoryDefinition with:
 *   - default widget composition (calm empty states, no fake data)
 *   - quick actions (intent strings, not handlers)
 *   - AI orchestration hooks (intents the AI may emit to address this module)
 *
 * Adding a module is additive:
 *   1. Add a CategoryDefinition in `core/categories/registry.ts`.
 *   2. Add a ModuleSpec below.
 *   3. (Optional) register a new widget kind / renderer.
 *
 * Each `MODULE_SPECS` entry is intentionally a flat object so we can split
 * them into one-file-per-module under `./modules/` later without changing
 * the consumer API.
 */

import {
  CATEGORIES,
  getCategory,
  type CategoryId,
  type CategoryDefinition,
} from "@/core/categories/registry";
import type {
  ModuleDefinition,
  QuickAction,
  WidgetDescriptor,
  ModuleAIHooks,
  ModuleSize,
} from "../contracts";

/**
 * The per-module specifics layered on top of CategoryDefinition.
 * Visual identity (icon, color, blurb, order) stays in the category registry.
 */
interface ModuleSpec {
  size: ModuleSize;
  widgets: readonly WidgetDescriptor[];
  quickActions: readonly QuickAction[];
  ai: ModuleAIHooks;
}

/**
 * Standard empty-state widget every module ships with by default.
 * The renderer pulls copy from i18n key `modules.<id>.empty`.
 */
function emptyState(id: CategoryId): WidgetDescriptor {
  return {
    id: "empty",
    kind: "empty-state",
    props: { messageKey: `modules.${id}.empty` },
  };
}

function quickActions(actions: readonly QuickAction[]): WidgetDescriptor {
  return {
    id: "quick-actions",
    kind: "quick-actions",
    props: { actions },
  };
}

/** Helper to define a module with empty-state + quick-actions composition. */
function defaultWidgets(id: CategoryId, actions: readonly QuickAction[]): readonly WidgetDescriptor[] {
  return [emptyState(id), quickActions(actions)];
}

// ────────────────────────────────────────────────────────────────────────────
// Per-module specs. One block per module; split into separate files if these
// grow real logic.
// ────────────────────────────────────────────────────────────────────────────

const FINANCE_ACTIONS: readonly QuickAction[] = [
  { id: "add-entry", labelKey: "modules.finance.actions.addEntry", icon: "Plus", intent: "finance.add-entry", emphasis: "primary" },
  { id: "log-payment", labelKey: "modules.finance.actions.logPayment", icon: "ArrowDownRight", intent: "finance.log-payment" },
];

const GROCERIES_ACTIONS: readonly QuickAction[] = [
  { id: "add-item", labelKey: "modules.groceries.actions.addItem", icon: "Plus", intent: "groceries.add-item", emphasis: "primary" },
  { id: "voice-list", labelKey: "modules.groceries.actions.voiceList", icon: "Mic", intent: "groceries.voice-list" },
];

const RENT_ACTIONS: readonly QuickAction[] = [
  { id: "add-tenant", labelKey: "modules.rent.actions.addTenant", icon: "UserPlus", intent: "rent.add-tenant", emphasis: "primary" },
  { id: "log-rent", labelKey: "modules.rent.actions.logRent", icon: "Receipt", intent: "rent.log-payment" },
];

const PROPERTY_SALE_ACTIONS: readonly QuickAction[] = [
  { id: "add-listing", labelKey: "modules.property-sale.actions.addListing", icon: "Plus", intent: "property-sale.add-listing", emphasis: "primary" },
  { id: "add-buyer", labelKey: "modules.property-sale.actions.addBuyer", icon: "UserPlus", intent: "property-sale.add-buyer" },
];

const BILLS_ACTIONS: readonly QuickAction[] = [
  { id: "add-bill", labelKey: "modules.bills.actions.addBill", icon: "Plus", intent: "bills.add-bill", emphasis: "primary" },
  { id: "mark-paid", labelKey: "modules.bills.actions.markPaid", icon: "Check", intent: "bills.mark-paid" },
];

const TASKS_ACTIONS: readonly QuickAction[] = [
  { id: "add-task", labelKey: "modules.tasks.actions.addTask", icon: "Plus", intent: "tasks.add", emphasis: "primary" },
];

const GOALS_ACTIONS: readonly QuickAction[] = [
  { id: "add-goal", labelKey: "modules.goals.actions.addGoal", icon: "Plus", intent: "goals.add", emphasis: "primary" },
];

const CLIENT_MGMT_ACTIONS: readonly QuickAction[] = [
  { id: "add-client", labelKey: "modules.client-management.actions.addClient", icon: "UserPlus", intent: "client-management.add", emphasis: "primary" },
  { id: "log-followup", labelKey: "modules.client-management.actions.logFollowup", icon: "PhoneCall", intent: "client-management.log-followup" },
];

const SMALL_BIZ_ACTIONS: readonly QuickAction[] = [
  { id: "add-sale", labelKey: "modules.small-business.actions.addSale", icon: "Plus", intent: "small-business.add-sale", emphasis: "primary" },
  { id: "add-stock", labelKey: "modules.small-business.actions.addStock", icon: "Package", intent: "small-business.add-stock" },
];

const STUDY_ACTIONS: readonly QuickAction[] = [
  { id: "add-deadline", labelKey: "modules.study.actions.addDeadline", icon: "Plus", intent: "study.add-deadline", emphasis: "primary" },
];

const HEALTH_ACTIONS: readonly QuickAction[] = [
  { id: "add-reminder", labelKey: "modules.health.actions.addReminder", icon: "Plus", intent: "health.add-reminder", emphasis: "primary" },
];

const FAMILY_ACTIONS: readonly QuickAction[] = [
  { id: "add-note", labelKey: "modules.family.actions.addNote", icon: "Plus", intent: "family.add-note", emphasis: "primary" },
];

const MODULE_SPECS: Record<CategoryId, ModuleSpec> = {
  finance: {
    size: "md",
    widgets: defaultWidgets("finance", FINANCE_ACTIONS),
    quickActions: FINANCE_ACTIONS,
    ai: {
      intents: ["finance.add-entry", "finance.log-payment", "finance.summary"],
      examplePhrases: ["Ravi owes me 2000", "Paid the milkman 300"],
    },
  },
  groceries: {
    size: "md",
    widgets: defaultWidgets("groceries", GROCERIES_ACTIONS),
    quickActions: GROCERIES_ACTIONS,
    ai: {
      intents: ["groceries.add-item", "groceries.remove-item", "groceries.list"],
      examplePhrases: ["Add 2kg rice to groceries", "I need onions and milk"],
    },
  },
  rent: {
    size: "md",
    widgets: defaultWidgets("rent", RENT_ACTIONS),
    quickActions: RENT_ACTIONS,
    ai: {
      intents: ["rent.add-tenant", "rent.log-payment", "rent.due-soon"],
      examplePhrases: ["Tenant in 2B paid rent", "Remind me about rent on the 5th"],
    },
  },
  "property-sale": {
    size: "md",
    widgets: defaultWidgets("property-sale", PROPERTY_SALE_ACTIONS),
    quickActions: PROPERTY_SALE_ACTIONS,
    ai: {
      intents: ["property-sale.add-listing", "property-sale.add-buyer", "property-sale.follow-up"],
    },
  },
  bills: {
    size: "md",
    widgets: defaultWidgets("bills", BILLS_ACTIONS),
    quickActions: BILLS_ACTIONS,
    ai: {
      intents: ["bills.add-bill", "bills.mark-paid", "bills.upcoming"],
      examplePhrases: ["Electricity bill due on the 15th"],
    },
  },
  tasks: {
    size: "sm",
    widgets: defaultWidgets("tasks", TASKS_ACTIONS),
    quickActions: TASKS_ACTIONS,
    ai: {
      intents: ["tasks.add", "tasks.complete", "tasks.today"],
      examplePhrases: ["Remind me to call mom"],
    },
  },
  goals: {
    size: "md",
    widgets: defaultWidgets("goals", GOALS_ACTIONS),
    quickActions: GOALS_ACTIONS,
    ai: { intents: ["goals.add", "goals.progress"] },
  },
  "client-management": {
    size: "md",
    widgets: defaultWidgets("client-management", CLIENT_MGMT_ACTIONS),
    quickActions: CLIENT_MGMT_ACTIONS,
    ai: { intents: ["client-management.add", "client-management.log-followup"] },
  },
  "small-business": {
    size: "lg",
    widgets: defaultWidgets("small-business", SMALL_BIZ_ACTIONS),
    quickActions: SMALL_BIZ_ACTIONS,
    ai: { intents: ["small-business.add-sale", "small-business.add-stock"] },
  },
  study: {
    size: "md",
    widgets: defaultWidgets("study", STUDY_ACTIONS),
    quickActions: STUDY_ACTIONS,
    ai: { intents: ["study.add-deadline", "study.today"] },
  },
  health: {
    size: "md",
    widgets: defaultWidgets("health", HEALTH_ACTIONS),
    quickActions: HEALTH_ACTIONS,
    ai: { intents: ["health.add-reminder", "health.today"] },
  },
  family: {
    size: "md",
    widgets: defaultWidgets("family", FAMILY_ACTIONS),
    quickActions: FAMILY_ACTIONS,
    ai: { intents: ["family.add-note"] },
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

function compose(cat: CategoryDefinition, spec: ModuleSpec): ModuleDefinition {
  return {
    id: cat.id,
    titleKey: `categories.${cat.id}`,
    blurbKey: `modules.${cat.id}.blurb`,
    icon: cat.icon,
    colorToken: cat.colorToken,
    layout: { defaultOrder: cat.dashboard.defaultOrder, size: spec.size },
    widgets: spec.widgets,
    quickActions: spec.quickActions,
    ai: spec.ai,
  };
}

const MODULE_INDEX: ReadonlyMap<CategoryId, ModuleDefinition> = new Map(
  CATEGORIES.map((c) => [c.id, compose(c, MODULE_SPECS[c.id])]),
);

export function getModule(id: CategoryId): ModuleDefinition | undefined {
  return MODULE_INDEX.get(id);
}

export function listModules(): readonly ModuleDefinition[] {
  return Array.from(MODULE_INDEX.values());
}

/** True if this id corresponds to a registered module. */
export function isKnownModule(id: string): id is CategoryId {
  return MODULE_INDEX.has(id as CategoryId);
}

/** Convenience re-export so consumers don't have to dual-import. */
export { getCategory };
