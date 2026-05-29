import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { Screen } from "@/shared/components/Screen";
import { TouchButton } from "@/shared/components/TouchButton";
import { LanguageSwitcher } from "@/features/settings/components/LanguageSwitcher";
import { useWorkspaceStore } from "@/features/workspace/state";
import { useHasMounted } from "@/hooks/useHasMounted";

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
  const mounted = useHasMounted();
  const onboardingComplete = useWorkspaceStore((s) => s.onboardingComplete);

  // Redirect returning users straight to /home. We wait for client mount so
  // the persisted Zustand store is hydrated — otherwise SSR renders the
  // welcome page and we'd briefly flash it before navigating.
  useEffect(() => {
    if (mounted && onboardingComplete) {
      void navigate({ to: "/home", replace: true });
    }
  }, [mounted, onboardingComplete, navigate]);

  // While hydrating, render a calm holding state matching the page surface so
  // there is no jarring flicker between SSR and first client paint.
  if (!mounted || onboardingComplete) {
    return <Screen><div aria-hidden className="flex-1" /></Screen>;
  }


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
        <Link to="/onboarding" className="contents">
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
