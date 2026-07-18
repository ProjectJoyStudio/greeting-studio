import { createFileRoute, Link } from "@tanstack/react-router";

import { AuthField, AuthPrimaryButton, AuthShell } from "@/components/auth/AuthShell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Project Joy" },
      { name: "description", content: "Sign in to your Project Joy account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useI18n();
  return (
    <AuthShell
      title={t("auth_login_title")}
      subtitle={t("auth_login_sub")}
      footer={
        <>
          {t("auth_no_account")}{" "}
          <Link to="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
            {t("auth_signup")}
          </Link>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <AuthField id="email" label={t("auth_field_email")} type="email" autoComplete="email" />
        <AuthField
          id="password"
          label={t("auth_field_password")}
          type="password"
          autoComplete="current-password"
        />
        <div className="flex items-center justify-between text-xs">
          <label className="inline-flex items-center gap-2 text-muted-foreground">
            <input type="checkbox" className="h-3.5 w-3.5 rounded border-border/70" />
            {t("auth_field_remember")}
          </label>
          <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground">
            {t("auth_forgot_link")}
          </Link>
        </div>
        <AuthPrimaryButton>{t("auth_signin")}</AuthPrimaryButton>
        <p className="text-center text-xs text-muted-foreground">{t("auth_terms")}</p>
      </form>
    </AuthShell>
  );
}