import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Gift, Mail, Sparkles, Check, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  claimFirstFreeGreeting,
  getFirstFreeStatus,
} from "@/lib/entitlements/first-free.functions";
import {
  firstFreeErrorKey,
  isFirstFreeEligibleProduct,
  type FirstFreeProduct,
} from "@/lib/entitlements/first-free";

export const Route = createFileRoute("/free-greeting")({
  validateSearch: (search: Record<string, unknown>): { product?: FirstFreeProduct } =>
    isFirstFreeEligibleProduct(search.product) ? { product: search.product } : {},
  head: () => ({
    meta: [
      { title: "First greeting free — Project Joy" },
      {
        name: "description",
        content:
          "Every Project Joy account includes one free greeting card or animated greeting. It never expires.",
      },
      { property: "og:title", content: "Your first greeting is free — Project Joy" },
      {
        property: "og:description",
        content: "One free greeting card or animated greeting per account. No expiry date.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FreeGreetingPage,
});

const PRODUCTS: { id: FirstFreeProduct; icon: typeof Mail; titleKey: string; descKey: string }[] = [
  { id: "card", icon: Mail, titleKey: "ff_card", descKey: "ff_card_desc" },
  { id: "animated", icon: Sparkles, titleKey: "ff_animated", descKey: "ff_animated_desc" },
];

function FreeGreetingPage() {
  const { t, lang } = useI18n();
  const { isAuthenticated, status: authStatus } = useAuth();
  const search = Route.useSearch();

  return (
    <SiteLayout>
      <PageHeader title={t("ff_title")} subtitle={t("ff_sub")} />
      <div className="mx-auto w-full max-w-3xl px-4 pb-20">
        {authStatus === "loading" ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : !isAuthenticated ? (
          <SignInGate />
        ) : (
          <ClaimFlow initialProduct={search.product} lang={lang} t={t} />
        )}
      </div>
    </SiteLayout>
  );
}

function SignInGate() {
  const { t } = useI18n();
  return (
    <div className="rounded-3xl border border-border/70 bg-card/80 p-8 text-center shadow-warm backdrop-blur">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gold-gradient shadow-warm">
        <Lock className="h-5 w-5 text-primary-foreground" />
      </span>
      <h2 className="mt-4 font-display text-xl font-semibold">{t("ff_signin_title")}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("ff_signin_body")}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          to="/login"
          search={{ redirect: "/free-greeting" }}
          className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-6 py-3 text-sm font-medium text-primary-foreground shadow-warm"
        >
          {t("ff_signin_cta")}
        </Link>
        <Link
          to="/register"
          search={{ redirect: "/free-greeting" }}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-6 py-3 text-sm font-medium"
        >
          {t("ff_register_cta")}
        </Link>
      </div>
    </div>
  );
}

function ClaimFlow({
  initialProduct,
  lang,
  t,
}: {
  initialProduct?: FirstFreeProduct;
  lang: string;
  t: (k: string) => string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchStatus = useServerFn(getFirstFreeStatus);
  const claim = useServerFn(claimFirstFreeGreeting);

  const [product, setProduct] = useState<FirstFreeProduct | null>(initialProduct ?? null);
  const [recipient, setRecipient] = useState("");
  const [occasion, setOccasion] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState<{ orderNumber: string | null } | null>(null);

  const statusQuery = useQuery({
    queryKey: ["first-free-status"],
    queryFn: () => fetchStatus(),
  });

  const mutation = useMutation({
    mutationFn: (p: FirstFreeProduct) =>
      claim({
        data: {
          productType: p,
          title: recipient ? `${t(p === "card" ? "ff_card" : "ff_animated")} — ${recipient}` : undefined,
          language: lang,
          recipientName: recipient || undefined,
          occasion: occasion || undefined,
          message: message || undefined,
        },
      }),
    onSuccess: (res) => {
      setDone({ orderNumber: res.orderNumber });
      queryClient.invalidateQueries({ queryKey: ["first-free-status"] });
      toast.success(t("ff_success_title"));
    },
    onError: (err: Error) => {
      const key = firstFreeErrorKey(err.message);
      toast.error(t(key));
      queryClient.invalidateQueries({ queryKey: ["first-free-status"] });
    },
  });

  if (statusQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-3xl border border-border/70 bg-card/80 p-8 text-center shadow-warm backdrop-blur">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gold-gradient shadow-warm">
          <Check className="h-5 w-5 text-primary-foreground" />
        </span>
        <h2 className="mt-4 font-display text-xl font-semibold">{t("ff_success_title")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("ff_success_body")}</p>
        {done.orderNumber ? (
          <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
            {t("ff_used_order")}: {done.orderNumber}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => navigate({ to: "/dashboard/orders" })}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold-gradient px-6 py-3 text-sm font-medium text-primary-foreground shadow-warm"
        >
          {t("ff_view_orders")}
        </button>
      </div>
    );
  }

  if (statusQuery.data?.used) {
    return <AlreadyUsed status={statusQuery.data} />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-warm backdrop-blur">
        <h2 className="font-display text-lg font-semibold">{t("ff_choose")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("ff_choose_hint")}</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {PRODUCTS.map(({ id, icon: Icon, titleKey, descKey }) => {
            const active = product === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setProduct(id)}
                aria-pressed={active}
                className={`rounded-2xl border p-5 text-left transition ${
                  active
                    ? "border-primary/60 bg-primary/5 shadow-warm"
                    : "border-border/70 bg-card/60 hover:border-primary/40"
                }`}
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold-gradient shadow-warm">
                  <Icon className="h-4 w-4 text-primary-foreground" />
                </span>
                <div className="mt-3 font-display text-base font-semibold">{t(titleKey)}</div>
                <p className="mt-1 text-sm text-muted-foreground">{t(descKey)}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  <Gift className="h-3 w-3" /> {t("free")}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-warm backdrop-blur">
        <h2 className="font-display text-lg font-semibold">{t("ff_details")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={t("ff_recipient")} value={recipient} onChange={setRecipient} />
          <Field label={t("ff_occasion")} value={occasion} onChange={setOccasion} />
        </div>
        <label className="mt-4 block text-sm">
          <span className="text-muted-foreground">{t("ff_message")}</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="mt-1.5 w-full rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary/50"
          />
        </label>

        <button
          type="button"
          disabled={!product || mutation.isPending}
          onClick={() => product && mutation.mutate(product)}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold-gradient px-6 py-3 text-sm font-medium text-primary-foreground shadow-warm transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {t("ff_submitting")}
            </>
          ) : (
            <>
              <Gift className="h-4 w-4" /> {t("ff_submit")}
            </>
          )}
        </button>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-2xl border border-border/70 bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
      />
    </label>
  );
}

export function AlreadyUsed({
  status,
}: {
  status: { usedAt: string | null; productType: string | null };
}) {
  const { t, lang } = useI18n();
  return (
    <div className="rounded-3xl border border-border/70 bg-card/80 p-8 text-center shadow-warm backdrop-blur">
      <h2 className="font-display text-xl font-semibold">{t("ff_used_title")}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("ff_used_body")}</p>
      {status.usedAt ? (
        <p className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
          {t("ff_used_on")}: {new Date(status.usedAt).toLocaleDateString(lang)}
          {status.productType
            ? ` · ${t(status.productType === "card" ? "ff_card" : "ff_animated")}`
            : ""}
        </p>
      ) : null}
      <Link
        to="/studio"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold-gradient px-6 py-3 text-sm font-medium text-primary-foreground shadow-warm"
      >
        {t("ff_go_studio")}
      </Link>
    </div>
  );
}