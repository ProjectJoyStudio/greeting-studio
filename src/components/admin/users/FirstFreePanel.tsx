import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Gift, Loader2, Search, RotateCcw } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { useAdminRole } from "@/lib/admin/role";
import {
  adminLookupFirstFree,
  adminRestoreFirstFree,
} from "@/lib/entitlements/first-free.functions";
import { firstFreeErrorKey, type FirstFreeStatus } from "@/lib/entitlements/first-free";

interface LookupResult {
  userId: string;
  email: string;
  registeredAt: string;
  status: FirstFreeStatus;
  orderNumber: string | null;
}

/** Admin view of the one-time first free greeting entitlement. */
export function FirstFreePanel() {
  const { t, lang } = useI18n();
  const { role } = useAdminRole();
  const lookup = useServerFn(adminLookupFirstFree);
  const restore = useServerFn(adminRestoreFirstFree);

  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isSuper = role === "super_admin";

  async function runLookup() {
    setBusy(true);
    setMessage(null);
    setResult(null);
    try {
      const res = await lookup({ data: { email } });
      if (!res.found) setMessage(t("ff_admin_notfound"));
      else
        setResult({
          userId: res.userId,
          email: res.email,
          registeredAt: res.registeredAt,
          status: res.status,
          orderNumber: res.orderNumber,
        });
    } catch (err) {
      setMessage(t(firstFreeErrorKey(err instanceof Error ? err.message : "")));
    } finally {
      setBusy(false);
    }
  }

  async function runRestore() {
    if (!result) return;
    setBusy(true);
    setMessage(null);
    try {
      await restore({ data: { userId: result.userId, reason } });
      setMessage(t("ff_admin_restored"));
      setReason("");
      await runLookup();
    } catch (err) {
      setMessage(t(firstFreeErrorKey(err instanceof Error ? err.message : "")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-border/60 bg-card/70 p-5 backdrop-blur">
      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4 text-primary" />
        <h2 className="font-display text-base font-semibold">{t("ff_admin_title")}</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t("ff_admin_sub")}</p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="min-w-[240px] flex-1 text-sm">
          <span className="text-muted-foreground">{t("ff_admin_email")}</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="mt-1.5 w-full rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/50"
          />
        </label>
        <button
          type="button"
          disabled={busy || !email.trim()}
          onClick={runLookup}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/70 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {t("ff_admin_lookup")}
        </button>
      </div>

      {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}

      {result ? (
        <div className="mt-4 rounded-xl border border-border/60 bg-background/50 p-4 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <Row label={t("ff_admin_email")} value={result.email} />
            <Row
              label={t("ff_admin_registered")}
              value={new Date(result.registeredAt).toLocaleDateString(lang)}
            />
            <Row
              label={t("ff_status_available")}
              value={result.status.used ? t("ff_status_used") : t("ff_status_available")}
            />
            {result.status.usedAt ? (
              <Row
                label={t("ff_used_on")}
                value={new Date(result.status.usedAt).toLocaleString(lang)}
              />
            ) : null}
            {result.status.productType ? (
              <Row
                label={t("ff_used_product")}
                value={t(result.status.productType === "card" ? "ff_card" : "ff_animated")}
              />
            ) : null}
            {result.orderNumber ? (
              <Row label={t("ff_used_order")} value={result.orderNumber} />
            ) : null}
          </div>

          {result.status.used ? (
            isSuper ? (
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <label className="min-w-[240px] flex-1 text-sm">
                  <span className="text-muted-foreground">{t("ff_admin_reason")}</span>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/50"
                  />
                </label>
                <button
                  type="button"
                  disabled={busy || reason.trim().length < 3}
                  onClick={runRestore}
                  className="inline-flex items-center gap-2 rounded-xl bg-gold-gradient px-4 py-2 text-sm font-medium text-primary-foreground shadow-warm disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  {t("ff_admin_restore")}
                </button>
              </div>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">{t("ff_admin_only_super")}</p>
            )
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}