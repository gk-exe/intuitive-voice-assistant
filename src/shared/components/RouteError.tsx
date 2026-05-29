/**
 * RouteError / RouteNotFound
 * --------------------------
 * Shared calm fallbacks for per-route `errorComponent` and
 * `notFoundComponent`. The product should never visually break — when
 * something goes wrong, the user lands on familiar warm surfaces with a
 * clear next step.
 */

import { Link, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Screen } from "./Screen";
import { TouchButton } from "./TouchButton";

export function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const { t } = useTranslation();

  if (typeof console !== "undefined") {
    console.error("[route error]", error);
  }

  return (
    <Screen>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
        <h1 className="font-display text-3xl text-foreground">
          {t("errors.somethingWrong", { defaultValue: "Something went off." })}
        </h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          {t("errors.tryAgain", {
            defaultValue: "Let's try that again. Your data is safe.",
          })}
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <TouchButton
            onClick={() => {
              void router.invalidate();
              reset();
            }}
          >
            {t("errors.retry", { defaultValue: "Try again" })}
          </TouchButton>
          <Link to="/home" className="contents">
            <TouchButton variant="ghost">
              {t("errors.goHome", { defaultValue: "Go home" })}
            </TouchButton>
          </Link>
        </div>
      </main>
    </Screen>
  );
}

export function RouteNotFound() {
  const { t } = useTranslation();
  return (
    <Screen>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
        <h1 className="font-display text-3xl text-foreground">
          {t("errors.notFoundTitle", { defaultValue: "Not here." })}
        </h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          {t("errors.notFoundBody", {
            defaultValue: "That space doesn't exist. Let's head back.",
          })}
        </p>
        <Link to="/home" className="contents">
          <TouchButton>
            {t("errors.goHome", { defaultValue: "Go home" })}
          </TouchButton>
        </Link>
      </main>
    </Screen>
  );
}
