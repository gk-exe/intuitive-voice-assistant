/**
 * Entity Registry
 * ---------------
 * The catalog of operational entities — one primary entity per module.
 * Each schema describes the fields, lifecycle, grouping, and reminder
 * compatibility needed to render a full mini-OS for that module
 * (list → form → detail → status).
 *
 * Adding a module's entity is additive:
 *   1. Add an `EntitySchema` below.
 *   2. Register it in `MODULE_PRIMARY_ENTITY`.
 *   3. Add i18n keys under `records.<entityId>.*`.
 *
 * A module may grow into multiple entities (e.g. rent → properties +
 * payments). When that lands, expose `entitiesForModule(moduleId)` and
 * keep this primary map as a sane default. Schemas stay pure data so an
 * AI layer can later emit them directly.
 */

import type { CategoryId } from "@/core/categories/registry";
import type { EntitySchema } from "../contracts";

// ────────────────────────────────────────────────────────────────────────────
// Shared option presets — keep stable; persisted on records.
// ────────────────────────────────────────────────────────────────────────────

const RECURRENCE_OPTIONS = [
  { value: "none", labelKey: "records.recurrence.none" },
  { value: "weekly", labelKey: "records.recurrence.weekly" },
  { value: "monthly", labelKey: "records.recurrence.monthly" },
  { value: "yearly", labelKey: "records.recurrence.yearly" },
] as const;

// ────────────────────────────────────────────────────────────────────────────
// Schemas
// ────────────────────────────────────────────────────────────────────────────

const FINANCE_ENTRY: EntitySchema = {
  id: "finance.entry",
  moduleId: "finance",
  pluralKey: "records.finance.plural",
  singularKey: "records.finance.singular",
  addLabelKey: "records.finance.add",
  emptyKey: "records.finance.empty",
  titleField: "personName",
  subtitleField: "notes",
  amountField: "amountPending",
  dueField: "dueDate",
  fields: [
    { key: "personName", type: "text", labelKey: "records.fields.personName", required: true },
    { key: "amountPending", type: "money", labelKey: "records.finance.fields.amountPending", required: true, currency: "INR" },
    { key: "amountPaid", type: "money", labelKey: "records.finance.fields.amountPaid", currency: "INR" },
    { key: "dueDate", type: "date", labelKey: "records.fields.dueDate" },
    { key: "phone", type: "phone", labelKey: "records.fields.phone" },
    { key: "notes", type: "longtext", labelKey: "records.fields.notes" },
  ],
  statuses: [
    { key: "pending", labelKey: "records.finance.status.pending", tone: "warning" },
    { key: "partial", labelKey: "records.finance.status.partial", tone: "accent" },
    { key: "paid", labelKey: "records.finance.status.paid", tone: "success" },
  ],
  defaultStatus: "pending",
  groupBy: "status",
  reminderCompatible: true,
};

const GROCERY_ITEM: EntitySchema = {
  id: "groceries.item",
  moduleId: "groceries",
  pluralKey: "records.groceries.plural",
  singularKey: "records.groceries.singular",
  addLabelKey: "records.groceries.add",
  emptyKey: "records.groceries.empty",
  titleField: "name",
  subtitleField: "quantity",
  fields: [
    { key: "name", type: "text", labelKey: "records.groceries.fields.name", required: true },
    { key: "quantity", type: "text", labelKey: "records.groceries.fields.quantity" },
    {
      key: "category",
      type: "select",
      labelKey: "records.groceries.fields.category",
      options: [
        { value: "produce", labelKey: "records.groceries.category.produce" },
        { value: "dairy", labelKey: "records.groceries.category.dairy" },
        { value: "pantry", labelKey: "records.groceries.category.pantry" },
        { value: "household", labelKey: "records.groceries.category.household" },
        { value: "other", labelKey: "records.groceries.category.other" },
      ],
    },
    { key: "recurring", type: "select", labelKey: "records.fields.recurring", options: RECURRENCE_OPTIONS },
  ],
  statuses: [
    { key: "toBuy", labelKey: "records.groceries.status.toBuy", tone: "warning" },
    { key: "bought", labelKey: "records.groceries.status.bought", tone: "success" },
  ],
  defaultStatus: "toBuy",
  groupBy: "status",
  reminderCompatible: false,
};

const RENT_PROPERTY: EntitySchema = {
  id: "rent.property",
  moduleId: "rent",
  pluralKey: "records.rent.plural",
  singularKey: "records.rent.singular",
  addLabelKey: "records.rent.add",
  emptyKey: "records.rent.empty",
  titleField: "propertyName",
  subtitleField: "tenantName",
  amountField: "rentAmount",
  dueField: "dueDate",
  fields: [
    { key: "propertyName", type: "text", labelKey: "records.rent.fields.propertyName", required: true },
    { key: "tenantName", type: "text", labelKey: "records.rent.fields.tenantName" },
    { key: "rentAmount", type: "money", labelKey: "records.rent.fields.rentAmount", currency: "INR" },
    { key: "dueDate", type: "date", labelKey: "records.rent.fields.dueDate" },
    { key: "phone", type: "phone", labelKey: "records.fields.phone" },
    { key: "notes", type: "longtext", labelKey: "records.fields.notes" },
  ],
  statuses: [
    { key: "active", labelKey: "records.rent.status.active", tone: "success" },
    { key: "vacant", labelKey: "records.rent.status.vacant", tone: "warning" },
    { key: "closed", labelKey: "records.rent.status.closed", tone: "neutral" },
  ],
  defaultStatus: "active",
  groupBy: "status",
  reminderCompatible: true,
};

const PROPERTY_LISTING: EntitySchema = {
  id: "property-sale.listing",
  moduleId: "property-sale",
  pluralKey: "records.property-sale.plural",
  singularKey: "records.property-sale.singular",
  addLabelKey: "records.property-sale.add",
  emptyKey: "records.property-sale.empty",
  titleField: "title",
  subtitleField: "buyerName",
  amountField: "price",
  fields: [
    { key: "title", type: "text", labelKey: "records.property-sale.fields.title", required: true },
    { key: "price", type: "money", labelKey: "records.property-sale.fields.price", currency: "INR" },
    { key: "buyerName", type: "text", labelKey: "records.property-sale.fields.buyerName" },
    { key: "phone", type: "phone", labelKey: "records.fields.phone" },
    { key: "notes", type: "longtext", labelKey: "records.fields.notes" },
  ],
  statuses: [
    { key: "listed", labelKey: "records.property-sale.status.listed", tone: "accent" },
    { key: "inTalks", labelKey: "records.property-sale.status.inTalks", tone: "warning" },
    { key: "closed", labelKey: "records.property-sale.status.closed", tone: "success" },
  ],
  defaultStatus: "listed",
  groupBy: "status",
  reminderCompatible: true,
};

const BILL: EntitySchema = {
  id: "bills.bill",
  moduleId: "bills",
  pluralKey: "records.bills.plural",
  singularKey: "records.bills.singular",
  addLabelKey: "records.bills.add",
  emptyKey: "records.bills.empty",
  titleField: "label",
  amountField: "amount",
  dueField: "dueDate",
  fields: [
    { key: "label", type: "text", labelKey: "records.bills.fields.label", required: true },
    { key: "amount", type: "money", labelKey: "records.bills.fields.amount", currency: "INR" },
    { key: "dueDate", type: "date", labelKey: "records.fields.dueDate" },
    { key: "recurring", type: "select", labelKey: "records.fields.recurring", options: RECURRENCE_OPTIONS },
    { key: "notes", type: "longtext", labelKey: "records.fields.notes" },
  ],
  statuses: [
    { key: "due", labelKey: "records.bills.status.due", tone: "warning" },
    { key: "paid", labelKey: "records.bills.status.paid", tone: "success" },
    { key: "overdue", labelKey: "records.bills.status.overdue", tone: "danger" },
  ],
  defaultStatus: "due",
  groupBy: "status",
  reminderCompatible: true,
};

const TASK: EntitySchema = {
  id: "tasks.task",
  moduleId: "tasks",
  pluralKey: "records.tasks.plural",
  singularKey: "records.tasks.singular",
  addLabelKey: "records.tasks.add",
  emptyKey: "records.tasks.empty",
  titleField: "title",
  dueField: "dueDate",
  fields: [
    { key: "title", type: "text", labelKey: "records.tasks.fields.title", required: true },
    { key: "dueDate", type: "date", labelKey: "records.fields.dueDate" },
    { key: "notes", type: "longtext", labelKey: "records.fields.notes" },
  ],
  statuses: [
    { key: "open", labelKey: "records.tasks.status.open", tone: "warning" },
    { key: "done", labelKey: "records.tasks.status.done", tone: "success" },
  ],
  defaultStatus: "open",
  groupBy: "status",
  reminderCompatible: true,
};

const GOAL: EntitySchema = {
  id: "goals.goal",
  moduleId: "goals",
  pluralKey: "records.goals.plural",
  singularKey: "records.goals.singular",
  addLabelKey: "records.goals.add",
  emptyKey: "records.goals.empty",
  titleField: "title",
  dueField: "targetDate",
  fields: [
    { key: "title", type: "text", labelKey: "records.goals.fields.title", required: true },
    { key: "targetDate", type: "date", labelKey: "records.goals.fields.targetDate" },
    { key: "notes", type: "longtext", labelKey: "records.fields.notes" },
  ],
  statuses: [
    { key: "active", labelKey: "records.goals.status.active", tone: "warning" },
    { key: "done", labelKey: "records.goals.status.done", tone: "success" },
  ],
  defaultStatus: "active",
  groupBy: "status",
  reminderCompatible: true,
};

const CLIENT: EntitySchema = {
  id: "client-management.client",
  moduleId: "client-management",
  pluralKey: "records.client-management.plural",
  singularKey: "records.client-management.singular",
  addLabelKey: "records.client-management.add",
  emptyKey: "records.client-management.empty",
  titleField: "name",
  subtitleField: "phone",
  dueField: "nextFollowUp",
  fields: [
    { key: "name", type: "text", labelKey: "records.client-management.fields.name", required: true },
    { key: "phone", type: "phone", labelKey: "records.fields.phone" },
    { key: "nextFollowUp", type: "date", labelKey: "records.client-management.fields.nextFollowUp" },
    { key: "notes", type: "longtext", labelKey: "records.fields.notes" },
  ],
  statuses: [
    { key: "active", labelKey: "records.client-management.status.active", tone: "success" },
    { key: "dormant", labelKey: "records.client-management.status.dormant", tone: "neutral" },
  ],
  defaultStatus: "active",
  groupBy: "status",
  reminderCompatible: true,
};

const BUSINESS_RECORD: EntitySchema = {
  id: "small-business.record",
  moduleId: "small-business",
  pluralKey: "records.small-business.plural",
  singularKey: "records.small-business.singular",
  addLabelKey: "records.small-business.add",
  emptyKey: "records.small-business.empty",
  titleField: "title",
  amountField: "amount",
  fields: [
    { key: "title", type: "text", labelKey: "records.small-business.fields.title", required: true },
    {
      key: "kind",
      type: "select",
      labelKey: "records.small-business.fields.kind",
      options: [
        { value: "sale", labelKey: "records.small-business.kind.sale" },
        { value: "expense", labelKey: "records.small-business.kind.expense" },
        { value: "stock", labelKey: "records.small-business.kind.stock" },
      ],
    },
    { key: "amount", type: "money", labelKey: "records.small-business.fields.amount", currency: "INR" },
    { key: "notes", type: "longtext", labelKey: "records.fields.notes" },
  ],
  statuses: [
    { key: "open", labelKey: "records.small-business.status.open", tone: "warning" },
    { key: "closed", labelKey: "records.small-business.status.closed", tone: "success" },
  ],
  defaultStatus: "open",
  groupBy: "status",
  reminderCompatible: true,
};

const STUDY_DEADLINE: EntitySchema = {
  id: "study.deadline",
  moduleId: "study",
  pluralKey: "records.study.plural",
  singularKey: "records.study.singular",
  addLabelKey: "records.study.add",
  emptyKey: "records.study.empty",
  titleField: "title",
  subtitleField: "subject",
  dueField: "dueDate",
  fields: [
    { key: "title", type: "text", labelKey: "records.study.fields.title", required: true },
    { key: "subject", type: "text", labelKey: "records.study.fields.subject" },
    { key: "dueDate", type: "date", labelKey: "records.fields.dueDate" },
    { key: "notes", type: "longtext", labelKey: "records.fields.notes" },
  ],
  statuses: [
    { key: "upcoming", labelKey: "records.study.status.upcoming", tone: "warning" },
    { key: "done", labelKey: "records.study.status.done", tone: "success" },
  ],
  defaultStatus: "upcoming",
  groupBy: "status",
  reminderCompatible: true,
};

const HEALTH_REMINDER: EntitySchema = {
  id: "health.reminder",
  moduleId: "health",
  pluralKey: "records.health.plural",
  singularKey: "records.health.singular",
  addLabelKey: "records.health.add",
  emptyKey: "records.health.empty",
  titleField: "title",
  dueField: "dueDate",
  fields: [
    { key: "title", type: "text", labelKey: "records.health.fields.title", required: true },
    { key: "dueDate", type: "date", labelKey: "records.health.fields.when" },
    { key: "recurring", type: "select", labelKey: "records.fields.recurring", options: RECURRENCE_OPTIONS },
    { key: "notes", type: "longtext", labelKey: "records.fields.notes" },
  ],
  statuses: [
    { key: "active", labelKey: "records.health.status.active", tone: "warning" },
    { key: "done", labelKey: "records.health.status.done", tone: "success" },
  ],
  defaultStatus: "active",
  groupBy: "status",
  reminderCompatible: true,
};

const FAMILY_NOTE: EntitySchema = {
  id: "family.note",
  moduleId: "family",
  pluralKey: "records.family.plural",
  singularKey: "records.family.singular",
  addLabelKey: "records.family.add",
  emptyKey: "records.family.empty",
  titleField: "personName",
  subtitleField: "note",
  dueField: "date",
  fields: [
    { key: "personName", type: "text", labelKey: "records.family.fields.personName", required: true },
    { key: "note", type: "longtext", labelKey: "records.family.fields.note" },
    { key: "date", type: "date", labelKey: "records.family.fields.date" },
  ],
  groupBy: "none",
  reminderCompatible: true,
};

// ────────────────────────────────────────────────────────────────────────────
// Registry index
// ────────────────────────────────────────────────────────────────────────────

const SCHEMAS: readonly EntitySchema[] = [
  FINANCE_ENTRY,
  GROCERY_ITEM,
  RENT_PROPERTY,
  PROPERTY_LISTING,
  BILL,
  TASK,
  GOAL,
  CLIENT,
  BUSINESS_RECORD,
  STUDY_DEADLINE,
  HEALTH_REMINDER,
  FAMILY_NOTE,
];

const BY_ID: ReadonlyMap<string, EntitySchema> = new Map(SCHEMAS.map((s) => [s.id, s]));

/** Module → primary entity id. Future-friendly: multi-entity modules can opt in. */
export const MODULE_PRIMARY_ENTITY: Record<CategoryId, string> = {
  finance: FINANCE_ENTRY.id,
  groceries: GROCERY_ITEM.id,
  rent: RENT_PROPERTY.id,
  "property-sale": PROPERTY_LISTING.id,
  bills: BILL.id,
  tasks: TASK.id,
  goals: GOAL.id,
  "client-management": CLIENT.id,
  "small-business": BUSINESS_RECORD.id,
  study: STUDY_DEADLINE.id,
  health: HEALTH_REMINDER.id,
  family: FAMILY_NOTE.id,
};

export function getEntitySchema(id: string): EntitySchema | undefined {
  return BY_ID.get(id);
}

export function getPrimaryEntityForModule(moduleId: CategoryId): EntitySchema | undefined {
  return BY_ID.get(MODULE_PRIMARY_ENTITY[moduleId]);
}

export function listEntitySchemas(): readonly EntitySchema[] {
  return SCHEMAS;
}
