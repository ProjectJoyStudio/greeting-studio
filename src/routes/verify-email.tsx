import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";

import { AuthShell } from "@/components/auth/AuthShell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/verify-email")({
  head: () => ({
    meta: [
      { title: "Verify email — Project Joy" },
      { name: "description", content: "Verify your Project Joy email address." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { t } = useI18n();
  return (
    <AuthShell
      title={t("auth_verify_title")}
      subtitle={t("auth_verify_sub")}
      footer={
        <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          {t("auth_back_login")}
        </Link>
      }
    >
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-secondary text-primary">
          <MailCheck className="h-6 w-6" />
        </span>
        <p className="text-sm font-medium text-foreground">{t("auth_check_inbox")}</p>
        <p className="text-sm text-muted-foreground">{t("auth_verify_body")}</p>
        <button
          type="button"
          className="mt-2 inline-flex items-center justify-center rounded-full border border-border/70 bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
        >
          {t("auth_resend")}
        </button>
      </div>
    </AuthShell>
  );
}