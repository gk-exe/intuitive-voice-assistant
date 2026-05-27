import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Screen } from "@/shared/components/Screen";
import { MicButton } from "@/features/voice/components/MicButton";
import { LanguageSwitcher } from "@/features/settings/components/LanguageSwitcher";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — Voice" },
      {
        name: "description",
        content: "Your day at a glance. Tap the mic to add anything.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { t } = useTranslation();

  return (
    <Screen>
      <header className="flex items-center justify-between pt-6">
        <div>
          <p className="text-sm text-muted-foreground">{t("home.greeting")}</p>
          <h1 className="text-2xl text-foreground">{t("app.name")}</h1>
        </div>
        <LanguageSwitcher />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-10 py-10">
        <p className="max-w-xs text-center text-lg text-muted-foreground">
          {t("home.prompt")}
        </p>
        <MicButton label={t("home.micHint")} />
      </main>

      <section className="safe-bottom flex flex-col gap-3 pb-6">
        <div className="rounded-3xl bg-surface p-5 shadow-soft">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t("home.sections.today")}
          </h2>
          <p className="mt-2 text-foreground/80">{t("home.empty")}</p>
        </div>
      </section>
    </Screen>
  );
}
