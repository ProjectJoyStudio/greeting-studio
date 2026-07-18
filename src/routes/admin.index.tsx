import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import {
  ShoppingBag, CheckCircle2, Users, Coins, TrendingUp, Wallet,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: OverviewPage,
});

const METRICS = [
  { key: "admin_metric_active_orders", value: "—", icon: ShoppingBag },
  { key: "admin_metric_completed_orders", value: "—", icon: CheckCircle2 },
  { key: "admin_metric_users", value: "—", icon: Users },
  { key: "admin_metric_credits_sold", value: "—", icon: Coins },
  { key: "admin_metric_revenue", value: "—", icon: TrendingUp },
  { key: "admin_metric_costs", value: "—", icon: Wallet },
];

function OverviewPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[Fraunces] text-3xl font-semibold text-foreground">
          {t("admin_overview_title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("admin_overview_note")}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {METRICS.map(({ key, value, icon: Icon }) => (
          <div
            key={key}
            className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t(key)}
              </span>
              <Icon className="h-4 w-4 text-primary/70" />
            </div>
            <div className="mt-3 font-[Fraunces] text-3xl font-semibold text-foreground">
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
