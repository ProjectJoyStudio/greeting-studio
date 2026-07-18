import { createFileRoute, Link } from "@tanstack/react-router";

import { AuthField, AuthPrimaryButton, AuthShell } from "@/components/auth/AuthShell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — Project Joy" },
      { name: "description", content: "Recover access to your Project Joy account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { t } = useI18n();
  return (
    <AuthShell
      title={t("auth_forgot_title")}
      subtitle={t("auth_forgot_sub")}
      footer={
        <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          {t("auth_back_login")}
        </Link>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <AuthField id="email" label={t("auth_field_email")} type="email" autoComplete="email" />
        <AuthPrimaryButton>{t("auth_send_reset")}</AuthPrimaryButton>
      </form>
    </AuthShell>
  );
}