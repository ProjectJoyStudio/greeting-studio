import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { AuthField, AuthShell } from "@/components/auth/AuthShell";
import { useI18n } from "@/lib/i18n";
import { sanitizeRedirect } from "@/lib/entitlements/first-free";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === "string" ? { redirect: sanitizeRedirect(search.redirect, "/dashboard") } : {},
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
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const destination = sanitizeRedirect(redirectTo, "/dashboard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        toast.error(signInError.message);
        return;
      }
      toast.success("Signed in.");
      navigate({ to: destination });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error signing in.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

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
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
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
        {error && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
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
          {loading ? "Signing in…" : t("auth_signin")}
        </button>
        <p className="text-center text-xs text-muted-foreground">{t("auth_terms")}</p>
      </form>
    </AuthShell>
  );
}