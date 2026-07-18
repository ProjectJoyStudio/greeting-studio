import { createFileRoute, Link } from "@tanstack/react-router";

import { AuthField, AuthPrimaryButton, AuthShell } from "@/components/auth/AuthShell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Project Joy" },
      { name: "description", content: "Set a new password for your Project Joy account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useI18n();
  return (
    <AuthShell
      title={t("auth_reset_title")}
      subtitle={t("auth_reset_sub")}
      footer={
        <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          {t("auth_back_login")}
        </Link>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <AuthField
          id="password"
          label={t("auth_field_password")}
          type="password"
          autoComplete="new-password"
        />
        <AuthField
          id="password_confirm"
          label={t("auth_field_password_confirm")}
          type="password"
          autoComplete="new-password"
        />
        <AuthPrimaryButton>{t("auth_reset_password")}</AuthPrimaryButton>
      </form>
    </AuthShell>
  );
}