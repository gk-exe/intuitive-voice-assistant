import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check } from "lucide-react";

import { Screen } from "@/shared/components/Screen";
import { TouchButton } from "@/shared/components/TouchButton";
import { ConversationalInput } from "@/features/onboarding/components/ConversationalInput";
import { CategoryChip } from "@/features/onboarding/components/CategoryChip";
import {
  ONBOARDING_STEPS,
  type OnboardingStep,
} from "@/features/onboarding/flow";
import {
  listCategories,
  type CategoryId,
} from "@/core/categories/registry";
import { detectCategories } from "@/services/mock-intelligence";
import { useWorkspaceStore } from "@/store/workspace.store";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome — Voice" },
      {
        name: "description",
        content:
          "A short, calm conversation so the app can shape itself around your life.",
      },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const recordAnswer = useWorkspaceStore((s) => s.recordAnswer);
  const setModules = useWorkspaceStore((s) => s.setModules);
  const completeOnboarding = useWorkspaceStore((s) => s.completeOnboarding);

  const [stepIndex, setStepIndex] = useState(0);
  const [draftText, setDraftText] = useState("");
  const [picked, setPicked] = useState<Set<CategoryId>>(new Set());

  const step: OnboardingStep = ONBOARDING_STEPS[stepIndex];
  const isLast = stepIndex === ONBOARDING_STEPS.length - 1;

  const togglePicked = (id: CategoryId) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const advance = () => {
    // Persist the answer for the step we're leaving.
    if (step.kind === "prompt") {
      const detected = detectCategories(draftText);
      // Auto-pre-pick detected categories so the next step feels personal.
      if (detected.length > 0) {
        setPicked((prev) => {
          const next = new Set(prev);
          for (const id of detected) next.add(id);
          return next;
        });
      }
      recordAnswer({
        questionId: step.id,
        text: draftText.trim() || undefined,
        selections: detected,
        source: "text",
        at: new Date().toISOString(),
      });
    } else if (step.kind === "select") {
      const selections = Array.from(picked);
      recordAnswer({
        questionId: step.id,
        selections,
        source: "tap",
        at: new Date().toISOString(),
      });
    }

    if (isLast) {
      finish();
      return;
    }
    setStepIndex((i) => i + 1);
  };

  const finish = () => {
    setModules(Array.from(picked));
    completeOnboarding();
    void navigate({ to: "/home" });
  };

  const canAdvance = useMemo(() => {
    if (step.kind === "prompt") return true; // optional
    if (step.kind === "select") return picked.size > 0;
    return true;
  }, [step, picked]);

  return (
    <Screen>
      <header className="flex items-center justify-between pt-6">
        <StepDots total={ONBOARDING_STEPS.length} current={stepIndex} />
        {stepIndex > 0 && (
          <button
            type="button"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted touch-target"
          >
            {t("common.back")}
          </button>
        )}
      </header>

      <main className="flex flex-1 flex-col gap-6 py-8">
        <p className="text-2xl leading-snug text-foreground">
          {t(step.promptKey)}
        </p>

        {step.kind === "prompt" && (
          <PromptStepBody
            step={step}
            value={draftText}
            onChange={setDraftText}
          />
        )}

        {step.kind === "select" && (
          <div className="flex flex-col gap-2">
            {listCategories().map((c) => (
              <CategoryChip
                key={c.id}
                id={c.id}
                selected={picked.has(c.id)}
                onToggle={togglePicked}
              />
            ))}
          </div>
        )}

        {step.kind === "confirm" && (
          <ConfirmSummary picked={picked} />
        )}
      </main>

      <footer className="safe-bottom flex flex-col gap-3 pb-6">
        <TouchButton fullWidth onClick={advance} disabled={!canAdvance}>
          {isLast ? (
            <>
              <Check className="size-5" /> {t("onboarding.finish")}
            </>
          ) : (
            <>
              {t("common.continue")} <ArrowRight className="size-5" />
            </>
          )}
        </TouchButton>
      </footer>
    </Screen>
  );
}

function PromptStepBody({
  step,
  value,
  onChange,
}: {
  step: Extract<OnboardingStep, { kind: "prompt" }>;
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <ConversationalInput
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t(step.placeholderKey)}
      />
      <div className="flex flex-wrap gap-2">
        {step.exampleKeys.map((k) => {
          const example = t(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => onChange(example)}
              className="rounded-full bg-primary-soft px-4 py-2 text-sm text-foreground/85 hover:bg-primary-soft/80 touch-target"
            >
              {example}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ConfirmSummary({ picked }: { picked: Set<CategoryId> }) {
  const { t } = useTranslation();
  const ids = Array.from(picked);

  if (ids.length === 0) {
    return (
      <p className="rounded-3xl bg-surface p-5 text-foreground/80 shadow-soft">
        {t("onboarding.nothingPicked")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-base text-muted-foreground">
        {t("onboarding.willEnable", { count: ids.length })}
      </p>
      <ul className="flex flex-wrap gap-2">
        {ids.map((id) => (
          <li
            key={id}
            className="rounded-full bg-primary-soft px-4 py-2 text-sm text-foreground/85"
          >
            {t(`categories.${id}`, { defaultValue: id })}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={[
            "h-1.5 rounded-full transition-all",
            i === current ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30",
          ].join(" ")}
        />
      ))}
    </div>
  );
}
