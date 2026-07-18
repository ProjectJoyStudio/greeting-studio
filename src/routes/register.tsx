import { createFileRoute, Link } from "@tanstack/react-router";

import { AuthField, AuthPrimaryButton, AuthShell } from "@/components/auth/AuthShell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — Project Joy" },
      { name: "description", content: "Create your Project Joy account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { t } = useI18n();
  return (
    <AuthShell
      title={t("auth_register_title")}
      subtitle={t("auth_register_sub")}
      footer={
        <>
          {t("auth_have_account")}{" "}
          <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            {t("auth_signin")}
          </Link>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <AuthField id="name" label={t("auth_field_name")} autoComplete="name" />
        <AuthField id="email" label={t("auth_field_email")} type="email" autoComplete="email" />
        <AuthField
          id="password"
          label={t("auth_field_password")}
          type="password"
          autoComplete="new-password"
        />
        <AuthPrimaryButton>{t("auth_signup")}</AuthPrimaryButton>
        <p className="text-center text-xs text-muted-foreground">{t("auth_terms")}</p>
      </form>
    </AuthShell>
  );
}