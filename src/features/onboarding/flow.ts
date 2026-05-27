/**
 * Onboarding Flow Engine
 * ----------------------
 * Defines the sequence of conversational steps the app uses to learn what
 * the user wants help with. The flow is data, not hard-coded JSX, so:
 *   - steps can be reordered without touching screen components
 *   - future voice-only or AI-driven flows can swap definitions in/out
 *   - localization keys are co-located with each step
 *
 * Each step is one of:
 *   - "prompt"    — free text / voice input
 *   - "select"    — pick categories (multi-select chips)
 *   - "confirm"   — review and finish
 *
 * The screen component (OnboardingFlow) walks through `ONBOARDING_STEPS`
 * one at a time. No backend, no AI — yet.
 */

import type { CategoryId } from "@/core/categories/registry";

export type OnboardingInputSource = "text" | "voice" | "tap";

interface BaseStep {
  id: string;
  /** i18n key for the assistant's prompt bubble. */
  promptKey: string;
}

export interface PromptStep extends BaseStep {
  kind: "prompt";
  /** i18n key for the placeholder. */
  placeholderKey: string;
  /** Suggested example phrases shown as soft chips. */
  exampleKeys: string[];
  /** If true, the step can be skipped. */
  optional?: boolean;
}

export interface SelectStep extends BaseStep {
  kind: "select";
  /** When provided, restricts selectable categories. Default: all. */
  candidates?: CategoryId[];
  optional?: boolean;
}

export interface ConfirmStep extends BaseStep {
  kind: "confirm";
}

export type OnboardingStep = PromptStep | SelectStep | ConfirmStep;

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: "describe-life",
    kind: "prompt",
    promptKey: "onboarding.steps.describe.prompt",
    placeholderKey: "onboarding.steps.describe.placeholder",
    exampleKeys: [
      "onboarding.steps.describe.example1",
      "onboarding.steps.describe.example2",
      "onboarding.steps.describe.example3",
    ],
    optional: true,
  },
  {
    id: "pick-modules",
    kind: "select",
    promptKey: "onboarding.steps.pick.prompt",
  },
  {
    id: "confirm",
    kind: "confirm",
    promptKey: "onboarding.steps.confirm.prompt",
  },
];
