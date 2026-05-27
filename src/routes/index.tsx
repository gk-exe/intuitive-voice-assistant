import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { Screen } from "@/shared/components/Screen";
import { TouchButton } from "@/shared/components/TouchButton";
import { LanguageSwitcher } from "@/features/settings/components/LanguageSwitcher";
import { useWorkspaceStore } from "@/store/workspace.store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Voice — Talk naturally. Stay organized." },
      {
        name: "description",
        content:
          "A calm voice-first assistant. Speak; the app listens, understands, and organizes everything for you.",
      },
    ],
  }),
  component: WelcomePage,
});

function WelcomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const onboardingComplete = useWorkspaceStore((s) => s.onboardingComplete);

  // If the user has already finished onboarding, send them home.
  useEffect(() => {
    if (onboardingComplete) {
      void navigate({ to: "/_authenticated/home" as never, replace: true });
    }
  }, [onboardingComplete, navigate]);

  return (
    <Screen>
      <div className="flex justify-end pt-6">
        <LanguageSwitcher />
      </div>

      <main className="flex flex-1 flex-col justify-center gap-8 py-12">
        <div className="flex flex-col gap-3">
          <span className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
            {t("app.name")}
          </span>
          <h1 className="text-5xl leading-tight text-foreground">
            {t("auth.welcomeTitle")}.
          </h1>
          <p className="text-lg text-muted-foreground">{t("auth.welcomeSubtitle")}</p>
        </div>
      </main>

      <footer className="safe-bottom flex flex-col gap-3 pb-6">
        <Link to={"/onboarding" as never} className="contents">
          <TouchButton fullWidth>{t("auth.getStarted")}</TouchButton>
        </Link>
        <Link to="/login" className="contents">
          <TouchButton variant="ghost" fullWidth>
            {t("auth.haveAccount")}
          </TouchButton>
        </Link>
      </footer>
    </Screen>
  );
}
