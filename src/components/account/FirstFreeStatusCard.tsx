import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Gift, Check, Loader2 } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthContext";
import { getFirstFreeStatus } from "@/lib/entitlements/first-free.functions";

/** Visible entitlement status inside the user account. */
export function FirstFreeStatusCard() {
  const { t, lang } = useI18n();
  const { isAuthenticated } = useAuth();
  const fetchStatus = useServerFn(getFirstFreeStatus);

  const { data, isLoading } = useQuery({
    queryKey: ["first-free-status"],
    queryFn: () => fetchStatus(),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) return null;

  const used = data?.used ?? false;

  return (
    <section className="rounded-2xl border border-border/60 bg-card/70 p-5 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-gradient shadow-warm">
            {used ? (
              <Check className="h-4 w-4 text-primary-foreground" />
            ) : (
              <Gift className="h-4 w-4 text-primary-foreground" />
            )}
          </span>
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : used ? (
                t("ff_status_used")
              ) : (
                t("ff_status_available")
              )}
            </h2>
            {used && data?.usedAt ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("ff_used_on")}: {new Date(data.usedAt).toLocaleDateString(lang)}
                {data.productType
                  ? ` · ${t(data.productType === "card" ? "ff_card" : "ff_animated")}`
                  : ""}
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">{t("ff_sub")}</p>
            )}
          </div>
        </div>
        <Link
          to={used ? "/studio" : "/free-greeting"}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-2 text-sm font-medium transition hover:border-primary/40"
        >
          {used ? t("ff_go_studio") : t("ff_claim_cta")}
        </Link>
      </div>
    </section>
  );
}