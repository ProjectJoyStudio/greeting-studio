import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { AuthField, AuthShell } from "@/components/auth/AuthShell";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();
    if (!email || !password) {
      setError("Please enter your email and a password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { display_name: name || email.split("@")[0] },
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        toast.error(signUpError.message);
        return;
      }
      if (data.session) {
        toast.success("Account created. Welcome to Project Joy!");
        navigate({ to: "/dashboard" });
        return;
      }
      // No session returned → email confirmation required.
      setInfo(
        "Check your inbox to confirm your email address. Once confirmed, you can sign in.",
      );
      toast.success("Account created. Please confirm your email to sign in.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error creating account.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

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
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <AuthField id="name" label={t("auth_field_name")} autoComplete="name" />
        <AuthField id="email" label={t("auth_field_email")} type="email" autoComplete="email" />
        <AuthField
          id="password"
          label={t("auth_field_password")}
          type="password"
          autoComplete="new-password"
        />
        {error && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
        {info && (
          <p role="status" className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground">
            {info}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold-gradient px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-warm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
          )}
          {loading ? "Creating account…" : t("auth_signup")}
        </button>
        <p className="text-center text-xs text-muted-foreground">{t("auth_terms")}</p>
      </form>
    </AuthShell>
  );
}