/**
 * OperationalDashboard
 * --------------------
 * Real, derived sections that make the home screen feel useful: today's
 * reminders, upcoming bills, pending finance, recent activity. Every
 * section is empty by default with a calm one-liner — no fake demo data.
 */

import { Link } from "@tanstack/react-router";
import { CalendarClock, Coins, Receipt, Sparkle, History } from "lucide-react";

import { CategoryIcon } from "@/shared/components/CategoryIcon";
import { formatMoney, formatDate, getRecordTitle } from "@/features/records/components/formatters";
import { getModule } from "@/features/workspace/registry";
import { useActivityStore } from "@/features/activity";
import {
  useTodayReminders,
  useUpcomingBills,
  usePendingFinance,
  usePendingFinanceSummary,
  type DashboardItem,
} from "../dashboard.selectors";

function Section({
  icon, title, children,
}: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <header className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {title}
      </header>
      <div className="rounded-3xl bg-surface p-3 shadow-soft">{children}</div>
    </section>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="px-1 py-3 text-sm text-muted-foreground">{text}</p>;
}

function ItemRow({ item, rightSlot }: { item: DashboardItem; rightSlot?: React.ReactNode }) {
  const mod = getModule(item.schema.moduleId);
  const title = getRecordTitle(item.record, item.schema);
  return (
    <Link
      to="/modules/$moduleId/$recordId"
      params={{ moduleId: item.schema.moduleId, recordId: item.record.id }}
      className="flex items-center gap-3 rounded-2xl px-2 py-2 text-foreground hover:bg-background/60 touch-target"
    >
      {mod && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <CategoryIcon name={mod.icon} className="size-4" strokeWidth={1.5} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        {item.dueAt && (
          <p className="truncate text-xs text-muted-foreground">{formatDate(item.dueAt)}</p>
        )}
      </div>
      {rightSlot}
    </Link>
  );
}

function TodaySection() {
  const items = useTodayReminders();
  return (
    <Section icon={<CalendarClock className="size-4" strokeWidth={1.5} />} title="Today">
      {items.length === 0 ? (
        <EmptyLine text="No reminders today." />
      ) : (
        <ul className="flex flex-col">
          {items.map((it) => <li key={it.record.id}><ItemRow item={it} /></li>)}
        </ul>
      )}
    </Section>
  );
}

function BillsSection() {
  const items = useUpcomingBills();
  return (
    <Section icon={<Receipt className="size-4" strokeWidth={1.5} />} title="Upcoming bills">
      {items.length === 0 ? (
        <EmptyLine text="No bills coming up." />
      ) : (
        <ul className="flex flex-col">
          {items.map((it) => {
            const amt = it.record.values["amount"];
            return (
              <li key={it.record.id}>
                <ItemRow
                  item={it}
                  rightSlot={
                    typeof amt === "number" ? (
                      <span className="shrink-0 text-sm text-foreground/80">
                        {formatMoney(amt)}
                      </span>
                    ) : undefined
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

function FinanceSection() {
  const items = usePendingFinance();
  const summary = usePendingFinanceSummary();
  return (
    <Section icon={<Coins className="size-4" strokeWidth={1.5} />} title="Pending finance">
      {items.length === 0 ? (
        <EmptyLine text="No pending payments." />
      ) : (
        <>
          <div className="mb-1 flex items-center justify-between px-2 pb-1 text-xs text-muted-foreground">
            <span>{summary.count} open</span>
            {summary.totalPending > 0 && (
              <span>{formatMoney(summary.totalPending)}</span>
            )}
          </div>
          <ul className="flex flex-col">
            {items.map((it) => {
              const amt = it.record.values["amountPending"];
              return (
                <li key={it.record.id}>
                  <ItemRow
                    item={it}
                    rightSlot={
                      typeof amt === "number" ? (
                        <span className="shrink-0 text-sm text-foreground/80">
                          {formatMoney(amt)}
                        </span>
                      ) : undefined
                    }
                  />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Section>
  );
}

function ActivitySection() {
  const items = useActivityStore((s) => s.items).slice(0, 6);
  return (
    <Section icon={<History className="size-4" strokeWidth={1.5} />} title="Recent activity">
      {items.length === 0 ? (
        <EmptyLine text="Nothing yet. Capture your first thing." />
      ) : (
        <ul className="flex flex-col">
          {items.map((it) => {
            const mod = getModule(it.moduleId);
            return (
              <li key={it.id}>
                <Link
                  to="/modules/$moduleId/$recordId"
                  params={{ moduleId: it.moduleId, recordId: it.recordId }}
                  className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-background/60 touch-target"
                >
                  {mod && (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                      <CategoryIcon name={mod.icon} className="size-4" strokeWidth={1.5} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {it.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {it.kind === "created" ? "Added" : it.kind}
                      {it.detail ? ` · ${it.detail}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {relativeTime(it.at)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

export function OperationalDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/capture"
        className="flex items-center justify-between gap-3 rounded-3xl bg-primary px-5 py-4 text-primary-foreground shadow-lifted touch-target-lg"
      >
        <span className="flex items-center gap-2">
          <Sparkle className="size-5" strokeWidth={1.75} />
          <span className="font-medium">Quick add anything</span>
        </span>
        <span className="text-sm opacity-80">→</span>
      </Link>

      <TodaySection />
      <BillsSection />
      <FinanceSection />
      <ActivitySection />
    </div>
  );
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const delta = Date.now() - t;
  const m = Math.round(delta / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}
