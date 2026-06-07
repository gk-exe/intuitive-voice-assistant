import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Screen } from "@/shared/components/Screen";
import { MicButton } from "@/features/voice/components/MicButton";
import { LanguageSwitcher } from "@/features/settings/components/LanguageSwitcher";
import { Workspace } from "@/features/workspace/components/Workspace";
import { OperationalDashboard } from "@/features/home/components/OperationalDashboard";

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
  const navigate = useNavigate();

  return (
    <Screen>
      <header className="flex items-center justify-between pt-6">
        <div>
          <p className="text-sm text-muted-foreground">{t("home.greeting")}</p>
          <h1 className="text-2xl text-foreground">{t("app.name")}</h1>
        </div>
        <LanguageSwitcher />
      </header>

      <main className="flex flex-col gap-10 py-8">
        <div className="flex flex-col items-center gap-3 py-2">
          <MicButton
            label={t("home.micHint")}
            onPress={() => navigate({ to: "/capture" })}
          />
          <p className="max-w-xs text-center text-sm text-muted-foreground">
            {t("home.prompt")}
          </p>
        </div>

        <OperationalDashboard />

        <Workspace />
      </main>

      <div className="safe-bottom pb-6" />
    </Screen>
  );
}
