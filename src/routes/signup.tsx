import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Screen } from "@/shared/components/Screen";
import { TouchButton } from "@/shared/components/TouchButton";
import { TextField } from "@/shared/components/TextField";
import { AuthCard } from "@/features/auth/components/AuthCard";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your space — Voice" },
      { name: "description", content: "Create your Voice account in under a minute." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { t } = useTranslation();
  const handleSubmit = (e: React.FormEvent) => e.preventDefault();

  return (
    <Screen>
      <AuthCard title={t("auth.signupTitle")} subtitle={t("auth.signupSubtitle")}>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <TextField id="name" label={t("auth.name")} placeholder="—" autoComplete="name" />
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
            autoComplete="new-password"
            label={t("auth.password")}
            placeholder="••••••••"
          />
          <TouchButton type="submit" fullWidth className="mt-2">
            {t("auth.signUp")}
          </TouchButton>
        </form>

        <p className="pt-4 text-center text-sm text-muted-foreground">
          {t("auth.yesAccount")}{" "}
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            {t("auth.signIn")}
          </Link>
        </p>
      </AuthCard>
    </Screen>
  );
}
