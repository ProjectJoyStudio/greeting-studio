import { useCallback, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Coins, Gift, Layers, Timer } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthContext";
import { useCreditBalance } from "@/lib/credits/useCreditBalance";
import {
  CREDIT_MAX,
  CREDIT_MIN,
  CREDIT_STEP,
  EXTRA_LEAF_STANDARD,
  EXTRA_LEAF_VIDEO,
  EXTRA_STORAGE_MONTH,
  EXTRA_STORAGE_WEEK,
  MEMORY_BOOK_PACKAGES,
  creditsToEuro,
  formatEuro,
} from "@/lib/memory-book/packages";
import {
  purchaseMemoryBookPackage,
  startCreditPurchase,
} from "@/lib/memory-book/packages.functions";

export const Route = createFileRoute("/memory-book-packages")({
  head: () => ({
    meta: [
      { title: "Memory Book packages — Project Joy" },
      { name: "description", content: "Packages for the Project Joy Book of Memories and Greetings." },
      { property: "og:title", content: "Memory Book packages — Project Joy" },
      { property: "og:description", content: "Packages for the Project Joy Book of Memories and Greetings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MemoryBookPackagesPage,
});

/** Small local helper: the shared dictionary stores plain strings. */
function fill(text: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (out, [key, value]) => out.replaceAll(`{${key}}`, String(value)),
    text,
  );
}

function MemoryBookPackagesPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { total, loading, refresh } = useCreditBalance();

  const buyPackage = useServerFn(purchaseMemoryBookPackage);
  const startPurchase = useServerFn(startCreditPurchase);

  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState(CREDIT_MIN);
  const [creditNotice, setCreditNotice] = useState<string | null>(null);
  const [creditBusy, setCreditBusy] = useState(false);

  // One stable key per package attempt: repeated clicks reuse it, so the
  // database can never charge twice or create a second book.
  const purchaseKeys = useRef<Record<string, string>>({});
  const keyFor = useCallback((code: string) => {
    const existing = purchaseKeys.current[code];
    if (existing) return existing;
    const generated =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${code}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    purchaseKeys.current[code] = generated;
    return generated;
  }, []);

  const euroForSlider = useMemo(() => creditsToEuro(creditAmount), [creditAmount]);

  async function choosePackage(code: string) {
    if (busy) return;
    setNotice(null);
    if (!isAuthenticated) {
      setNotice(t("mbp_err_auth"));
      return;
    }
    setBusy(code);
    try {
      const res = await buyPackage({ data: { packageCode: code, purchaseKey: keyFor(code) } });
      await refresh();
      if (res.ok && res.bookId) {
        void navigate({ to: "/memory-book-create", search: { book: res.bookId } });
        return;
      }
      setNotice(res.error === "insufficient_credits" ? t("mbp_err_credits") : t("mbp_err_failed"));
    } catch {
      setNotice(t("mbp_err_failed"));
    } finally {
      setBusy(null);
    }
  }

  async function buyCredits() {
    if (creditBusy) return;
    setCreditNotice(null);
    if (!isAuthenticated) {
      setCreditNotice(t("mbp_err_auth"));
      return;
    }
    setCreditBusy(true);
    try {
      await startPurchase({ data: { credits: creditAmount } });
      // No payment provider is connected: nothing is credited yet.
      setCreditNotice(t("mbp_payment_pending"));
    } catch {
      setCreditNotice(t("mbp_err_failed"));
    } finally {
      setCreditBusy(false);
    }
  }

  return (
    <SiteLayout>
      <PageHeader eyebrow={t("brand")} title={t("mbp_packages_heading")}>
        <Breadcrumbs
          items={[
            { label: t("bc_home"), to: "/" },
            { label: t("gift_memory_book"), to: "/memory-book" },
            { label: t("mbp_packages_heading") },
          ]}
        />
      </PageHeader>

      <section className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
        {/* One combined balance for the customer. */}
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-border/70 bg-card px-4 py-3 text-sm font-medium">
          <Coins className="h-4 w-4 text-primary" aria-hidden />
          {isAuthenticated
            ? fill(t("mbp_balance"), { n: loading ? "…" : total })
            : t("mbp_balance_sign_in")}
        </div>

        {/* Three main packages */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MEMORY_BOOK_PACKAGES.map((pkg) => (
            <div
              key={pkg.code}
              className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-5 shadow-warm"
            >
              <BookOpen className="h-6 w-6 text-primary" aria-hidden />
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>{fill(t("mbp_leaves"), { n: pkg.leaves })}</li>
                <li>{fill(t("mbp_pages"), { n: pkg.internalPages })}</li>
                <li>{fill(t("mbp_videos"), { n: pkg.videos })}</li>
              </ul>
              <p className="font-display text-lg font-semibold">
                {fill(t("mbp_price"), { c: pkg.credits, e: formatEuro(pkg.euro) })}
              </p>
              <Button
                className="mt-auto"
                disabled={busy !== null}
                onClick={() => void choosePackage(pkg.code)}
              >
                {busy === pkg.code ? t("mbp_buying") : t("mbp_choose")}
              </Button>
            </div>
          ))}
        </div>

        {notice ? (
          <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
            {notice}
          </p>
        ) : null}

        {/* Counting rules */}
        <div className="mt-8 rounded-2xl border border-border/70 bg-card p-5">
          <h2 className="mb-2 font-display text-lg font-semibold">{t("mbp_rules_title")}</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>{t("mbp_rule_leaf")}</li>
            <li>{t("mbp_rule_cover")}</li>
            <li>{t("mbp_rule_max")}</li>
            <li>{t("mbp_rule_videos")}</li>
          </ul>
        </div>

        {/* Additional leaves — information only in this stage */}
        <div className="mt-6 rounded-2xl border border-border/70 bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
            <Layers className="h-5 w-5 text-primary" aria-hidden />
            {t("mbp_extra_leaves_title")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 p-4">
              <p className="font-medium">{t("mbp_extra_leaf_std")}</p>
              <p className="mt-1 font-display text-base font-semibold">
                {fill(t("mbp_price"), {
                  c: EXTRA_LEAF_STANDARD.credits,
                  e: formatEuro(EXTRA_LEAF_STANDARD.euro),
                })}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>{t("mbp_extra_leaf_std_1")}</li>
                <li>{t("mbp_extra_leaf_std_2")}</li>
                <li>{t("mbp_extra_leaf_std_3")}</li>
              </ul>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <p className="font-medium">{t("mbp_extra_leaf_video")}</p>
              <p className="mt-1 font-display text-base font-semibold">
                {fill(t("mbp_price"), {
                  c: EXTRA_LEAF_VIDEO.credits,
                  e: formatEuro(EXTRA_LEAF_VIDEO.euro),
                })}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>{t("mbp_extra_leaf_video_1")}</li>
                <li>{t("mbp_extra_leaf_video_2")}</li>
                <li>{t("mbp_extra_leaf_video_3")}</li>
              </ul>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("mbp_display_only")}</p>
        </div>

        {/* Additional storage — information only in this stage */}
        <div className="mt-6 rounded-2xl border border-border/70 bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
            <Timer className="h-5 w-5 text-primary" aria-hidden />
            {t("mbp_storage_title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("mbp_storage_included")}</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              {t("mbp_storage_week")}:{" "}
              {fill(t("mbp_price"), {
                c: EXTRA_STORAGE_WEEK.credits,
                e: formatEuro(EXTRA_STORAGE_WEEK.euro),
              })}
            </li>
            <li>
              {t("mbp_storage_month")}:{" "}
              {fill(t("mbp_price"), {
                c: EXTRA_STORAGE_MONTH.credits,
                e: formatEuro(EXTRA_STORAGE_MONTH.euro),
              })}
            </li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">{t("mbp_display_only")}</p>
        </div>

        {/* Buy credits */}
        <div className="mt-6 rounded-2xl border border-border/70 bg-card p-5">
          <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold">
            <Coins className="h-5 w-5 text-primary" aria-hidden />
            {t("mbp_buy_credits_title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("mbp_credit_rate")}</p>

          <div className="mt-4">
            <Slider
              value={[creditAmount]}
              min={CREDIT_MIN}
              max={CREDIT_MAX}
              step={CREDIT_STEP}
              onValueChange={(v) => setCreditAmount(v[0] ?? CREDIT_MIN)}
              aria-label={t("mbp_buy_credits_title")}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="font-display text-lg font-semibold">
                {fill(t("mbp_selected"), { c: creditAmount, e: formatEuro(euroForSlider) })}
              </p>
              <Button onClick={() => void buyCredits()} disabled={creditBusy}>
                {creditBusy ? t("mbp_buying") : t("mbp_buy")}
              </Button>
            </div>
          </div>

          <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
            <Gift className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
            {t("mbp_gift")}
          </p>

          {creditNotice ? (
            <p className="mt-3 rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-sm">
              {creditNotice}
            </p>
          ) : null}
        </div>
      </section>
    </SiteLayout>
  );
}
