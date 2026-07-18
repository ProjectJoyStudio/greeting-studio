import { useEffect } from "react";
import { X, Coins, Sparkles, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";

// Placeholder pricing — real prices arrive with the payment integration.
type Pkg = {
  id: string;
  credits: number;
  price: string;
  nameKey: string;
  descKey: string;
  highlight?: boolean;
};

const PACKAGES: Pkg[] = [
  { id: "starter", credits: 20, price: "€9", nameKey: "credit_pkg_starter", descKey: "credit_pkg_starter_desc" },
  { id: "popular", credits: 50, price: "€19", nameKey: "credit_pkg_popular", descKey: "credit_pkg_popular_desc", highlight: true },
  { id: "value", credits: 100, price: "€35", nameKey: "credit_pkg_value", descKey: "credit_pkg_value_desc" },
  { id: "premium", credits: 250, price: "€79", nameKey: "credit_pkg_premium", descKey: "credit_pkg_premium_desc" },
];

export function CreditModal({
  open,
  onClose,
  balance,
}: {
  open: boolean;
  onClose: () => void;
  balance: number;
}) {
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-modal-title"
    >
      <div
        className="relative w-full max-w-3xl rounded-3xl border border-border/70 bg-card p-6 shadow-warm sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("credit_close")}
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-border/70 bg-background text-muted-foreground transition hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gold-gradient text-primary-foreground shadow-warm">
            <Coins className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2
              id="credit-modal-title"
              className="font-display text-xl font-semibold tracking-tight sm:text-2xl"
            >
              {t("credit_modal_title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("credit_modal_sub")}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-2xl border border-border/70 bg-background px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t("credit_modal_balance")}
          </span>
          <span className="font-display text-lg font-semibold">
            {balance} {t("studio_credits_word")}
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {PACKAGES.map((p) => (
            <article
              key={p.id}
              className={`relative flex flex-col rounded-2xl border p-5 transition ${
                p.highlight
                  ? "border-primary/60 bg-primary/[0.04] shadow-warm"
                  : "border-border bg-background"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-2 right-4 inline-flex items-center gap-1 rounded-full bg-gold-gradient px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground shadow-warm">
                  <Sparkles className="h-3 w-3" />
                  {t("credit_most_popular")}
                </span>
              )}
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-lg font-semibold tracking-tight">
                  {t(p.nameKey)}
                </h3>
                <span className="font-display text-base font-semibold text-primary">
                  {p.price}
                </span>
              </div>
              <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Coins className="h-3 w-3 text-primary" />
                {p.credits} {t("studio_credits_word")}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {t(p.descKey)}
              </p>
              <button
                type="button"
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-gold-gradient px-4 py-2 text-sm font-medium text-primary-foreground shadow-warm transition hover:opacity-95"
              >
                <Check className="h-4 w-4" />
                {t("credit_buy")}
              </button>
            </article>
          ))}
        </div>

        <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {t("credit_secure_note")}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex justify-center rounded-full border border-border bg-background px-5 py-2 text-sm font-medium text-foreground/80 transition hover:text-foreground"
          >
            {t("credit_cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}