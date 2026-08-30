import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, Loader2, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { CREDIT_BALANCE_KEY } from "@/lib/credits/useCreditBalance";
import {
  adjustTestCredits,
  listTestAccounts,
  listTestHistory,
  resetTestCredits,
  setDevTestAccount,
} from "@/lib/credits/dev-credits";
import { useLocal } from "./i18n";

const QUICK = [100, 500, 1000, 5000];

const inputCls =
  "w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary/60";

type Pending = { kind: "add" | "remove" | "reset"; amount: number };

const REASONS = ["dtc_reason_testing", "dtc_reason_compensation", "dtc_reason_promotion", "dtc_reason_gift", "dtc_reason_other"];

export function DevCreditsPage() {
  const { lang } = useI18n();
  const L = useLocal(lang);
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState(500);
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);

  const accounts = useQuery({ queryKey: ["dev-credits", "accounts"], queryFn: listTestAccounts });
  const history = useQuery({
    queryKey: ["dev-credits", "history", selected],
    queryFn: () => listTestHistory(selected),
  });

  const allRows = accounts.data ?? [];
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((r) =>
      [r.email, r.display_name].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [allRows, search]);
  const current = useMemo(() => allRows.find((r) => r.user_id === selected) ?? null, [allRows, selected]);
  const who = current?.email ?? current?.display_name ?? current?.user_id ?? "";

  const after = () => {
    void queryClient.invalidateQueries({ queryKey: ["dev-credits"] });
    void queryClient.invalidateQueries({ queryKey: CREDIT_BALANCE_KEY });
    setPending(null);
    toast.success(L("dtc_done"));
  };
  const fail = (e: unknown) => toast.error(e instanceof Error ? e.message : "Error");

  const adjust = useMutation({
    mutationFn: (delta: number) => adjustTestCredits(selected!, delta, reason || undefined),
    onSuccess: after,
    onError: fail,
  });
  const reset = useMutation({
    mutationFn: () => resetTestCredits(selected!),
    onSuccess: after,
    onError: fail,
  });
  const flag = useMutation({
    mutationFn: (enabled: boolean) => setDevTestAccount(selected!, enabled),
    onSuccess: after,
    onError: fail,
  });

  const busy = adjust.isPending || reset.isPending || flag.isPending;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-[Fraunces] text-2xl font-semibold">{L("dtc_title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{L("dtc_sub")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{L("dtc_payments_off")}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="rounded-xl border border-border/60 bg-card/70 p-3">
          <h2 className="px-1 pb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {L("dtc_accounts")}
          </h2>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={L("dtc_search")}
              className={`${inputCls} pl-8`}
            />
          </div>
          {accounts.isLoading && <Loader2 className="m-3 h-4 w-4 animate-spin text-muted-foreground" />}
          {!accounts.isLoading && rows.length === 0 && (
            <p className="px-1 py-3 text-xs text-muted-foreground">{L("dtc_no_match")}</p>
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
                  <span className="block truncate font-medium">{r.email ?? r.display_name ?? r.user_id}</span>
                  <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <Coins className="h-3 w-3" />
                    {r.balance}
                    {r.is_dev_test_account && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                        <ShieldCheck className="h-3 w-3" />
                        {L("dtc_flag")}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-6">
          {current && (
            <div className="rounded-xl border border-border/60 bg-card/70 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{L("dtc_selected_user")}</p>
                  <p className="text-sm font-medium">{current.display_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{current.email ?? current.user_id}</p>
                  <p className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">{L("dtc_balance")}</p>
                  <p className="font-[Fraunces] text-3xl font-semibold">{current.balance}</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => flag.mutate(!current.is_dev_test_account)}
                  className="rounded-md border border-border/60 px-3 py-1.5 text-xs transition hover:bg-muted/50 disabled:opacity-60"
                >
                  {current.is_dev_test_account ? L("dtc_disable") : L("dtc_enable")}
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-muted-foreground">
                  {L("dtc_amount")}
                  <input
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 0))}
                    className={`mt-1 ${inputCls}`}
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  {L("dtc_reason")}
                  <input value={reason} onChange={(e) => setReason(e.target.value)} className={`mt-1 ${inputCls}`} />
                </label>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAmount(q)}
                    className="rounded-full border border-border/60 px-3 py-1 text-xs transition hover:border-primary/50"
                  >
                    +{q}
                  </button>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => adjust.mutate(amount)}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  {adjust.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {L("dtc_add")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => adjust.mutate(-amount)}
                  className="rounded-full border border-border/60 px-4 py-2 text-sm transition hover:bg-muted/50 disabled:opacity-60"
                >
                  {L("dtc_remove")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => reset.mutate()}
                  className="inline-flex items-center gap-2 rounded-full border border-destructive/40 px-4 py-2 text-sm text-destructive transition hover:bg-destructive/10 disabled:opacity-60"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {L("dtc_reset")}
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border/60 bg-card/70 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{L("dtc_history")}</h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                {L("dtc_all_accounts")}
              </button>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">{L("dtc_col_when")}</th>
                    <th className="py-2 pr-4">{L("dtc_col_account")}</th>
                    <th className="py-2 pr-4">{L("dtc_col_type")}</th>
                    <th className="py-2 pr-4 text-right">{L("dtc_col_amount")}</th>
                    <th className="py-2 pr-4 text-right">{L("dtc_col_after")}</th>
                    <th className="py-2">{L("dtc_col_desc")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(history.data ?? []).map((t) => (
                    <tr key={t.id} className="border-t border-border/50">
                      <td className="py-2 pr-4 text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 text-xs">{t.email ?? t.user_id}</td>
                      <td className="py-2 pr-4 text-xs">{t.txn_type}</td>
                      <td className={`py-2 pr-4 text-right font-medium ${t.amount < 0 ? "text-destructive" : "text-emerald-600"}`}>
                        {t.amount > 0 ? `+${t.amount}` : t.amount}
                      </td>
                      <td className="py-2 pr-4 text-right">{t.balance_after}</td>
                      <td className="py-2 text-xs text-muted-foreground">{t.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(history.data?.length ?? 0) === 0 && !history.isLoading && (
                <p className="py-6 text-sm text-muted-foreground">{L("dtc_no_history")}</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
