import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Coins, Loader2, Search } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { listCreditAccounts, listPurchasedHistory } from "@/lib/credits/your-credits";
import { useLocal } from "./i18n";

const inputCls =
  "w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary/60";

export function YourCreditsPage() {
  const { lang } = useI18n();
  const L = useLocal(lang);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const accounts = useQuery({ queryKey: ["your-credits", "accounts"], queryFn: listCreditAccounts });
  const history = useQuery({
    queryKey: ["your-credits", "history", selected],
    queryFn: () => listPurchasedHistory(selected),
    enabled: !!selected,
  });

  const allRows = accounts.data ?? [];
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((r) =>
      [r.email, r.display_name].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [allRows, search]);
  const current = useMemo(
    () => allRows.find((r) => r.user_id === selected) ?? null,
    [allRows, selected],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-[Fraunces] text-2xl font-semibold">{L("yc_title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{L("yc_sub")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{L("yc_payments_off")}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="rounded-xl border border-border/60 bg-card/70 p-3">
          <h2 className="px-1 pb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {L("yc_accounts")}
          </h2>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={L("yc_search")}
              className={`${inputCls} pl-8`}
            />
          </div>
          {accounts.isLoading && <Loader2 className="m-3 h-4 w-4 animate-spin text-muted-foreground" />}
          {!accounts.isLoading && rows.length === 0 && (
            <p className="px-1 py-3 text-xs text-muted-foreground">{L("yc_no_match")}</p>
          )}
          <ul className="space-y-1">
            {rows.map((r) => (
              <li key={r.user_id}>
                <button
                  type="button"
                  onClick={() => setSelected(r.user_id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    selected === r.user_id ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                  }`}
                >
                  <span className="block truncate font-medium">
                    {r.email ?? r.display_name ?? r.user_id}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <Coins className="h-3 w-3" />
                    {r.total_balance}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-6">
          {!current && (
            <p className="rounded-xl border border-border/60 bg-card/70 p-5 text-sm text-muted-foreground">
              {L("yc_select_hint")}
            </p>
          )}

          {current && (
            <div className="rounded-xl border border-border/60 bg-card/70 p-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{L("yc_selected")}</p>
              <p className="text-sm font-medium">{current.display_name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{current.email ?? current.user_id}</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border/50 p-3">
                  <p className="text-xs text-muted-foreground">{L("yc_your")}</p>
                  <p className="font-[Fraunces] text-2xl font-semibold">{current.purchased_balance}</p>
                </div>
                <div className="rounded-lg border border-border/50 p-3">
                  <p className="text-xs text-muted-foreground">{L("yc_bonus")}</p>
                  <p className="font-[Fraunces] text-2xl font-semibold">{current.bonus_balance}</p>
                </div>
                <div className="rounded-lg border border-primary/40 bg-primary/[0.04] p-3">
                  <p className="text-xs text-muted-foreground">{L("yc_total")}</p>
                  <p className="font-[Fraunces] text-2xl font-semibold">{current.total_balance}</p>
                </div>
              </div>
            </div>
          )}

          {current && (
            <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/70 p-5">
              <h2 className="pb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {L("yc_history")}
              </h2>
              {history.isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {!history.isLoading && (history.data?.length ?? 0) === 0 && (
                <p className="py-3 text-sm text-muted-foreground">{L("yc_empty")}</p>
              )}
              {(history.data?.length ?? 0) > 0 && (
                <table className="w-full text-left text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-1 pr-3 font-medium">{L("yc_col_when")}</th>
                      <th className="py-1 pr-3 font-medium">{L("yc_col_type")}</th>
                      <th className="py-1 pr-3 text-right font-medium">{L("yc_col_amount")}</th>
                      <th className="py-1 pr-3 text-right font-medium">{L("yc_col_before")}</th>
                      <th className="py-1 pr-3 text-right font-medium">{L("yc_col_after")}</th>
                      <th className="py-1 pr-3 font-medium">{L("yc_col_source")}</th>
                      <th className="py-1 pr-3 font-medium">{L("yc_col_status")}</th>
                      <th className="py-1 pr-3 font-medium">{L("yc_col_ref")}</th>
                      <th className="py-1 font-medium">{L("yc_col_desc")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(history.data ?? []).map((tx) => (
                      <tr key={tx.id} className="border-t border-border/40">
                        <td className="py-1.5 pr-3 text-muted-foreground">
                          {new Date(tx.created_at).toLocaleString()}
                        </td>
                        <td className="py-1.5 pr-3">{tx.txn_type}</td>
                        <td
                          className={`py-1.5 pr-3 text-right font-medium ${
                            tx.amount < 0 ? "text-destructive" : "text-emerald-600"
                          }`}
                        >
                          {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                        </td>
                        <td className="py-1.5 pr-3 text-right text-muted-foreground">
                          {tx.balance_before ?? "—"}
                        </td>
                        <td className="py-1.5 pr-3 text-right text-muted-foreground">{tx.balance_after}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">{tx.source ?? "—"}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">{tx.status}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">
                          {tx.reference_id ?? tx.order_id ?? "—"}
                        </td>
                        <td className="py-1.5 text-muted-foreground">{tx.description ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
