import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Screen } from "@/shared/components/Screen";
import { TouchButton } from "@/shared/components/TouchButton";
import { TextField } from "@/shared/components/TextField";
import { AuthCard } from "@/features/auth/components/AuthCard";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Voice" },
      { name: "description", content: "Sign in to your Voice account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();

  // Scaffold only — wiring happens in the auth phase.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <Screen>
      <AuthCard title={t("auth.loginTitle")} subtitle={t("auth.loginSubtitle")}>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <TextField
            id="email"
            type="email"
            autoComplete="email"
            label={t("auth.email")}
            placeholder="you@example.com"
          />
          <TextField
            id="password"
            type="password"
            autoComplete="current-password"
            label={t("auth.password")}
            placeholder="••••••••"
          />
          <TouchButton type="submit" fullWidth className="mt-2">
            {t("auth.signIn")}
          </TouchButton>
        </form>

        <p className="pt-4 text-center text-sm text-muted-foreground">
          {t("auth.noAccount")}{" "}
          <Link to="/signup" className="text-primary underline-offset-4 hover:underline">
            {t("auth.signUp")}
          </Link>
        </p>
      </AuthCard>
    </Screen>
  );
}
