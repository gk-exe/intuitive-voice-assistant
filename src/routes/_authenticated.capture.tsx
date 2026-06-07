/**
 * /capture
 * --------
 * The unified capture experience. One screen, one input. The user types
 * (or, later, speaks) natural language; the local parser converts that
 * into one or more structured candidate records; the user confirms or
 * tweaks; we commit.
 *
 * Design notes:
 *   - Large, calm, single-column. Mobile-first.
 *   - Parses on each keystroke (cheap, deterministic). The preview is a
 *     reassurance, not a verdict — every field stays editable.
 *   - "We understood this as…" is the central trust pattern.
 *   - Voice slot is reserved (Mic icon, disabled hint) so the layout
 *     does not move when STT lands.
 */

import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, Mic, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Screen } from "@/shared/components/Screen";
import { TouchButton } from "@/shared/components/TouchButton";
import { CategoryIcon } from "@/shared/components/CategoryIcon";
import { getModule } from "@/features/workspace/registry";
import { parseCapture, type CaptureCandidate } from "@/features/capture/parser";
import { CAPTURE_TEMPLATES } from "@/features/capture/templates";
import { commitRecord } from "@/features/capture/commit";

export const Route = createFileRoute("/_authenticated/capture")({
  head: () => ({
    meta: [
      { title: "Quick Add — Voice" },
      { name: "description", content: "Capture anything in one line. We'll organize it." },
    ],
  }),
  component: CapturePage,
});

type DraftCandidate = CaptureCandidate & { _key: string };

function withKeys(cs: CaptureCandidate[]): DraftCandidate[] {
  return cs.map((c, i) => ({ ...c, _key: `${c.entityType}-${i}-${Math.random().toString(36).slice(2, 7)}` }));
}

function CapturePage() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<DraftCandidate[]>([]);
  const [touched, setTouched] = useState(false);

  // Re-parse whenever text changes; small enough to be cheap.
  const parsed = useMemo(() => parseCapture(text), [text]);

  // Keep drafts in sync with parser output, unless the user has manually
  // edited a field. We reset drafts whenever the parser produces a fresh
  // set (i.e. text changed). Manual edits live as overrides on _key items
  // by re-using the same _key when reasonable.
  useEffect(() => {
    setDrafts(withKeys(parsed));
    setTouched(false);
  }, [parsed]);

  const canSave = drafts.length > 0 && drafts.some((d) => hasTitle(d));

  function updateDraft(key: string, patch: Record<string, string | number | null>) {
    setDrafts((prev) =>
      prev.map((d) =>
        d._key === key ? { ...d, values: { ...d.values, ...patch } } : d,
      ) as DraftCandidate[],
    );
    setTouched(true);
  }

  function removeDraft(key: string) {
    setDrafts((prev) => prev.filter((d) => d._key !== key));
    setTouched(true);
  }

  function handleSave() {
    let count = 0;
    for (const d of drafts) {
      if (!hasTitle(d)) continue;
      const reminder = d.reminderAt ? { dueAt: d.reminderAt } : null;
      commitRecord(
        d.entityType,
        { values: d.values, status: d.status, reminder },
        { source: "capture" },
      );
      count += 1;
    }
    if (count === 0) {
      toast.error("Add at least one detail to save.");
      return;
    }
    toast.success(count === 1 ? "Saved." : `${count} saved.`);
    setText("");
    setDrafts([]);
    navigate({ to: "/home" });
  }

  return (
    <Screen>
      <header className="flex items-center justify-between pt-6">
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center gap-1 rounded-full px-2 py-2 text-sm text-muted-foreground touch-target"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" strokeWidth={1.5} />
          Back
        </button>
        {touched && (
          <span className="text-xs text-muted-foreground">Edited</span>
        )}
      </header>

      <main className="flex flex-col gap-6 py-6">
        <div>
          <h1 className="font-display text-3xl text-foreground">Quick add</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Type naturally. I'll figure out what kind of thing it is.
          </p>
        </div>

        <div className="rounded-3xl bg-surface p-4 shadow-soft">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Rajeev owes me 15000"
            rows={3}
            autoFocus
            className="w-full resize-none bg-transparent text-lg leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          <div className="flex items-center justify-between gap-2 pt-2">
            <button
              type="button"
              disabled
              title="Voice coming soon"
              className="flex items-center gap-1 rounded-full bg-primary-soft px-3 py-2 text-sm text-foreground/70 opacity-70 touch-target"
            >
              <Mic className="size-4" strokeWidth={1.5} />
              Voice (soon)
            </button>
            {text.trim() && (
              <button
                type="button"
                onClick={() => setText("")}
                className="rounded-full px-3 py-2 text-sm text-muted-foreground touch-target"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {!text.trim() && (
          <section aria-label="Examples" className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Try saying</p>
            <div className="flex flex-col gap-2">
              {CAPTURE_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setText(t.text)}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-surface/60 px-4 py-3 text-left text-foreground touch-target hover:bg-surface"
                >
                  <span className="truncate">{t.text}</span>
                  <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-xs text-foreground/70">
                    {t.hint}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {drafts.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-4 text-primary" strokeWidth={1.5} />
              We understood this as
            </div>
            {drafts.map((d) => (
              <CandidateCard
                key={d._key}
                draft={d}
                onChange={(patch) => updateDraft(d._key, patch)}
                onRemove={() => removeDraft(d._key)}
              />
            ))}
          </section>
        )}

        {drafts.length > 0 && (
          <div className="safe-bottom sticky bottom-4 flex flex-col gap-2 pt-2">
            <TouchButton
              onClick={handleSave}
              disabled={!canSave}
              fullWidth
              className="gap-2"
            >
              <Check className="size-5" strokeWidth={1.75} />
              {drafts.length === 1 ? "Save" : `Save ${drafts.length}`}
            </TouchButton>
          </div>
        )}
      </main>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────────────

function hasTitle(d: DraftCandidate): boolean {
  const v = d.values[d.schema.titleField];
  return v != null && String(v).trim() !== "";
}

interface CandidateCardProps {
  draft: DraftCandidate;
  onChange: (patch: Record<string, string | number | null>) => void;
  onRemove: () => void;
}

function CandidateCard({ draft, onChange, onRemove }: CandidateCardProps) {
  const { schema } = draft;
  const mod = getModule(draft.moduleId);
  // Show: title, amount (if any), due (if any). Notes hidden by default.
  const titleField = schema.fields.find((f) => f.key === schema.titleField);
  const amountField = schema.amountField ? schema.fields.find((f) => f.key === schema.amountField) : undefined;
  const dueField = schema.dueField ? schema.fields.find((f) => f.key === schema.dueField) : undefined;

  return (
    <div className="rounded-3xl bg-surface p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {mod && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <CategoryIcon name={mod.icon} className="size-5" strokeWidth={1.5} />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{draft.reason}</p>
            <p className="truncate text-xs text-muted-foreground">
              {Math.round(draft.confidence * 100)}% confident
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="rounded-full p-2 text-muted-foreground hover:bg-muted touch-target"
        >
          <X className="size-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {titleField && (
          <InlineField
            label={humanize(titleField.key)}
            value={(draft.values[titleField.key] as string | null) ?? ""}
            placeholder="—"
            onChange={(v) => onChange({ [titleField.key]: v })}
          />
        )}
        {amountField && (
          <InlineField
            label="Amount"
            value={
              draft.values[amountField.key] == null
                ? ""
                : String(draft.values[amountField.key])
            }
            placeholder="0"
            inputMode="decimal"
            onChange={(v) => {
              const n = Number(v.replace(/[,\s]/g, ""));
              onChange({ [amountField.key]: v === "" ? null : Number.isFinite(n) ? n : null });
            }}
          />
        )}
        {dueField && (
          <InlineField
            label="Due"
            type="date"
            value={(draft.values[dueField.key] as string | null) ?? ""}
            onChange={(v) => onChange({ [dueField.key]: v || null })}
          />
        )}
      </div>
    </div>
  );
}

interface InlineFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: "text" | "decimal" | "numeric" | "tel";
  placeholder?: string;
}

function InlineField({ label, value, onChange, type = "text", inputMode, placeholder }: InlineFieldProps) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl bg-background/60 px-3 py-2">
      <span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-right text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
      />
    </label>
  );
}
