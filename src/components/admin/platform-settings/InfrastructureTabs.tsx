import { useMemo, useState } from "react";
import {
  CreditCard, Wallet, Receipt, ShieldCheck, PlayCircle, UserCog, KeyRound,
  Users, HardDrive, FolderTree, Timer, Boxes, Plug2, ArrowRightLeft, Rocket,
  Pause, Play, AlertTriangle, CheckCircle2, XCircle, Beaker,
} from "lucide-react";
import { useI18n, LANGS } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n/types";
import { INFRA_DICT } from "./infrastructure-i18n";
import {
  type InfrastructureState, type PaymentProviderKey, type PaymentProvider,
  type PaymentTx, type TxStatus, type PayoutStatus, type ProviderStatus,
  type StorageProvider, type ServiceConnection, type ServiceStatus, type Mode,
  type PlatformControlState, type PartialPauseFlags, type ReadinessStatus,
  type TestRole, providerTone, serviceStatusTone, readinessTone, readinessScore,
  computeConnectedSummary, PAUSE_CONFIRMATION_PHRASE,
} from "@/lib/admin/platform-infrastructure";

// Utility ------------------------------------------------------------------
export function useInfraT(lang: Lang) {
  return useMemo(
    () => ({ t: (k: string) => INFRA_DICT[k]?.[lang] ?? INFRA_DICT[k]?.en ?? k }),
    [lang],
  );
}

const card = "rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur";
const label = "text-xs font-medium uppercase tracking-wide text-muted-foreground";
const input = "w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60";
const btn = "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted/50";
const btnPri = "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90";
const kpi = "rounded-xl border border-border/60 bg-card/70 p-4 shadow-sm";
const chip = "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
}
function fmtDT(iso: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}
function money(n: number, c: string) {
  return `${n.toFixed(2)} ${c}`;
}

type T = (k: string) => string;

// ============================================================================
// PAYMENTS TAB
// ============================================================================
export function PaymentsTab({ state, setState, t }: {
  state: InfrastructureState;
  setState: React.Dispatch<React.SetStateAction<InfrastructureState>>;
  t: T;
}) {
  const p = state.payments;
  const [flowLog, setFlowLog] = useState<string[]>([]);
  const [txFilter, setTxFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<TxStatus | "all">("all");

  const gross = p.transactions.filter(t => t.status === "successful").reduce((a, x) => a + x.gross, 0);
  const fees = p.transactions.filter(t => t.status === "successful").reduce((a, x) => a + x.fee, 0);
  const successCount = p.transactions.filter(t => t.status === "successful").length;
  const failCount = p.transactions.filter(t => t.status === "failed").length;
  const refundCount = p.transactions.filter(t => t.status === "refunded" || t.status === "partial_refund").length;

  function runFlow(label: string, ok: boolean) {
    const steps = ok
      ? ["pt_flow_created", "pt_flow_success", "pt_flow_credits", "pt_flow_notif", "pt_flow_audit"]
      : ["pt_flow_created", "tx_failed", "pt_flow_notif", "pt_flow_audit"];
    setFlowLog([`▶ ${label}`, ...steps.map(s => `  • ${t(s)}`)]);
  }

  const providers = p.providers;
  function setProvider(id: PaymentProviderKey, mut: (pv: PaymentProvider) => PaymentProvider) {
    setState(s => ({
      ...s,
      payments: {
        ...s.payments,
        providers: s.payments.providers.map(x => x.id === id ? mut(x) : x),
      },
    }));
  }

  const filteredTx = p.transactions.filter(tx => {
    if (statusFilter !== "all" && tx.status !== statusFilter) return false;
    const q = txFilter.trim().toLowerCase();
    if (!q) return true;
    return tx.id.toLowerCase().includes(q) || tx.customer.toLowerCase().includes(q) || tx.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      <div className={card}>
        <h2 className="font-[Fraunces] text-xl font-semibold">{t("pay_title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("pay_subtitle")}</p>
        <p className="mt-1 text-xs text-amber-700">{t("demo_only")}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label={t("pay_kpi_providers")} value={providers.filter(x => x.enabled).length} />
        <Kpi label={t("pay_kpi_today")} value={p.transactions.length} />
        <Kpi label={t("pay_kpi_success")} value={successCount} tone="ok" />
        <Kpi label={t("pay_kpi_failed")} value={failCount} tone="err" />
        <Kpi label={t("pay_kpi_refunds")} value={refundCount} tone="warn" />
        <Kpi label={t("pay_kpi_gross")} value={money(gross, p.balance.currency)} />
        <Kpi label={t("pay_kpi_fees")} value={money(fees, p.balance.currency)} />
        <Kpi label={t("pay_kpi_net")} value={money(gross - fees, p.balance.currency)} />
        <Kpi label={t("pay_kpi_pending")} value={money(p.balance.pending, p.balance.currency)} />
        <Kpi label={t("pay_kpi_balance")} value={money(p.balance.available, p.balance.currency)} />
      </div>

      {/* Providers */}
      <div className={card}>
        <h3 className="font-semibold">{t("pay_providers_h")}</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {providers.map(pv => (
            <div key={pv.id} className="rounded-xl border border-border/60 bg-background p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <div className="font-semibold">{pv.name}</div>
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">ID: {pv.id}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`${chip} ${providerTone(pv.status)}`}>{t(`ps_${pv.status}`)}</span>
                  <span className={`${chip} ${pv.mode === "live" ? providerTone("connected") : providerTone("test")}`}>
                    {pv.mode === "live" ? t("badge_live") : t("badge_test")}
                  </span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div><span className={label}>{t("pay_countries")}</span><div>{pv.countries.slice(0, 4).join(", ") || "—"}</div></div>
                <div><span className={label}>{t("currency")}</span><div>{pv.currencies.join(", ") || "—"}</div></div>
                <div><span className={label}>{t("pay_methods")}</span><div>{pv.methods.join(", ") || "—"}</div></div>
                <div><span className={label}>{t("pay_fee_est")}</span><div>{pv.feePlaceholder}</div></div>
                <div><span className={label}>{t("pay_last_check")}</span><div>{fmtDT(pv.lastCheck)}</div></div>
                <div><span className={label}>{t("pay_last_ok")}</span><div>{fmtDate(pv.lastPayment)}</div></div>
                {pv.lastError && <div className="col-span-2 text-rose-600">{t("pay_last_err")}: {pv.lastError}</div>}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button className={btn}>{t("pay_action_configure")}</button>
                {pv.status === "not_connected" ? (
                  <button className={btn} onClick={() => setProvider(pv.id, x => ({ ...x, status: "test", enabled: true }))}>{t("pay_action_connect")}</button>
                ) : (
                  <button className={btn} onClick={() => setProvider(pv.id, x => ({ ...x, status: "not_connected", enabled: false }))}>{t("pay_action_disconnect")}</button>
                )}
                <button className={btn} onClick={() => setProvider(pv.id, x => ({ ...x, lastCheck: new Date().toISOString() }))}>{t("pay_action_test")}</button>
                <button className={btn}>{t("pay_action_test_pay")}</button>
                <button className={btn} onClick={() => setProvider(pv.id, x => ({ ...x, enabled: !x.enabled, status: x.enabled ? "disabled" : "test" }))}>
                  {pv.enabled ? t("btn_disable") : t("btn_enable")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Balance & Payouts */}
      <div className={card}>
        <h3 className="font-semibold">{t("pay_balance_h")}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t("pay_balance_intro")}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi label={t("pay_provider_balance")} value={money(p.balance.providerBalance, p.balance.currency)} />
          <Kpi label={t("pay_available")} value={money(p.balance.available, p.balance.currency)} tone="ok" />
          <Kpi label={t("pay_pending")} value={money(p.balance.pending, p.balance.currency)} tone="warn" />
          <Kpi label={t("pay_reserved")} value={money(p.balance.reservedForRefunds, p.balance.currency)} />
          <Kpi label={t("pay_fees")} value={money(p.balance.fees, p.balance.currency)} />
          <Kpi label={t("pay_last_payout")} value={fmtDate(p.balance.lastPayout)} />
          <Kpi label={t("pay_next_payout")} value={fmtDate(p.balance.nextEstimated)} />
          <Kpi label={t("pay_destination")} value={p.balance.destination} />
          <Kpi label={t("currency")} value={p.balance.currency} />
          <div>
            <div className={label}>{t("pay_schedule")}</div>
            <select
              className={input + " mt-1"}
              value={p.balance.schedule}
              onChange={(e) => setState(s => ({
                ...s, payments: { ...s.payments, balance: { ...s.payments.balance, schedule: e.target.value as any } },
              }))}
            >
              {(["manual","daily","weekly","monthly"] as const).map(sc => (
                <option key={sc} value={sc}>{t(`pay_sched_${sc}`)}</option>
              ))}
            </select>
          </div>
        </div>

        <h4 className="mt-6 text-sm font-semibold">{t("pay_payouts_h")}</h4>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">{t("pay_payout_id")}</th><th>{t("provider")}</th>
                <th>{t("date")}</th><th>{t("pay_gross")}</th><th>{t("pay_fee_col")}</th>
                <th>{t("pay_net")}</th><th>{t("currency")}</th><th>{t("pay_destination")}</th>
                <th>{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {p.payouts.map(po => (
                <tr key={po.id} className="border-t border-border/40">
                  <td className="py-1.5 font-mono">{po.id}</td>
                  <td>{po.provider}</td>
                  <td>{fmtDate(po.date)}</td>
                  <td>{po.gross.toFixed(2)}</td>
                  <td>{po.fees.toFixed(2)}</td>
                  <td>{po.net.toFixed(2)}</td>
                  <td>{po.currency}</td>
                  <td>{po.destination}</td>
                  <td><span className={`${chip} ${payoutTone(po.status)}`}>{t(`po_${po.status}`)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions */}
      <div className={card}>
        <h3 className="font-semibold">{t("pay_tx_h")}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <input className={input + " max-w-xs"} placeholder={t("search")} value={txFilter} onChange={(e) => setTxFilter(e.target.value)} />
          <select className={input + " max-w-xs"} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
            <option value="all">— {t("status")} —</option>
            {(["successful","processing","failed","refunded","partial_refund","cancelled"] as TxStatus[]).map(s =>
              <option key={s} value={s}>{t(`tx_${s}`)}</option>
            )}
          </select>
          <button className={btn} onClick={() => { setTxFilter(""); setStatusFilter("all"); }}>{t("reset_filters")}</button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">{t("pay_tx_id")}</th><th>{t("date")}</th>
                <th>{t("pay_customer")}</th><th>{t("provider")}</th>
                <th>{t("pay_purchase_type")}</th><th>{t("pay_gross")}</th>
                <th>{t("pay_fee_col")}</th><th>{t("pay_net")}</th>
                <th>{t("mode")}</th><th>{t("status")}</th><th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.map(tx => (
                <tr key={tx.id} className="border-t border-border/40">
                  <td className="py-1.5 font-mono">{tx.id}</td>
                  <td>{fmtDate(tx.date)}</td>
                  <td><div>{tx.customer}</div><div className="text-[10px] text-muted-foreground">{tx.email}</div></td>
                  <td>{tx.provider}</td>
                  <td>{t(`pt_${tx.purchaseType}`)}</td>
                  <td>{tx.gross.toFixed(2)} {tx.currency}</td>
                  <td>{tx.fee.toFixed(2)}</td>
                  <td>{tx.net.toFixed(2)}</td>
                  <td><span className={`${chip} ${tx.mode === "live" ? providerTone("connected") : providerTone("test")}`}>{tx.mode === "live" ? t("badge_live") : t("badge_test")}</span></td>
                  <td><span className={`${chip} ${txTone(tx.status)}`}>{t(`tx_${tx.status}`)}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button className={btn}>{t("tx_action_open")}</button>
                      <button className={btn}>{t("tx_action_refund")}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety */}
      <div className={card}>
        <h3 className="font-semibold">{t("pay_safety_h")}</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {(["duplicateProtection","confirmationRequired","refundManualReview","suspiciousReview","failedNotifications","webhookPlaceholder"] as const).map(k => (
            <Toggle
              key={k}
              label={t(`saf_${k === "duplicateProtection" ? "dup" : k === "confirmationRequired" ? "conf" : k === "refundManualReview" ? "refund" : k === "suspiciousReview" ? "susp" : k === "failedNotifications" ? "notif" : "webhook"}`)}
              checked={p.safety[k] as boolean}
              onChange={(v) => setState(s => ({ ...s, payments: { ...s.payments, safety: { ...s.payments.safety, [k]: v } } }))}
            />
          ))}
          <div>
            <div className={label}>{t("saf_maxauto")}</div>
            <input type="number" className={input} value={p.safety.maxAutoRefund}
              onChange={(e) => setState(s => ({ ...s, payments: { ...s.payments, safety: { ...s.payments.safety, maxAutoRefund: +e.target.value || 0 } } }))} />
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{t("saf_rules_intro")}</p>
        <ul className="mt-2 space-y-1 text-xs">
          {["saf_r1","saf_r2","saf_r3","saf_r4","saf_r5","saf_r6","saf_r7","saf_r8","saf_r9","saf_r10"].map(k => (
            <li key={k} className="flex items-start gap-1.5"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />{t(k)}</li>
          ))}
        </ul>
        <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800">
          <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
          {t("live_switch_warn")}
        </div>
      </div>

      {/* Test payments */}
      <div className={card}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{t("pay_test_h")}</h3>
          <span className={`${chip} border-sky-500/40 bg-sky-500/10 text-sky-700`}>{t("test_no_money")}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("pay_test_intro")}</p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {[
            ["pt_scenario_ok", true],["pt_scenario_fail", false],
            ["pt_scenario_mo", true],["pt_scenario_yr", true],
            ["pt_scenario_renew_ok", true],["pt_scenario_renew_fail", false],
            ["pt_scenario_full_ref", true],["pt_scenario_part_ref", true],
            ["pt_scenario_dup", true],["pt_scenario_delayed", true],
          ].map(([k, ok]) => (
            <button key={String(k)} className={btn} onClick={() => runFlow(t(String(k)), Boolean(ok))}>
              <PlayCircle className="h-3 w-3" />{t(String(k))}
            </button>
          ))}
        </div>
        {flowLog.length > 0 && (
          <pre className="mt-3 max-h-48 overflow-auto rounded-md border border-border/60 bg-muted/30 p-3 text-xs">{flowLog.join("\n")}</pre>
        )}
      </div>
    </div>
  );
}

function txTone(s: TxStatus): string {
  if (s === "successful") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700";
  if (s === "failed" || s === "cancelled" || s === "disputed") return "border-rose-500/40 bg-rose-500/10 text-rose-700";
  if (s === "refunded" || s === "partial_refund") return "border-amber-500/40 bg-amber-500/10 text-amber-700";
  return "border-sky-500/40 bg-sky-500/10 text-sky-700";
}
function payoutTone(s: PayoutStatus): string {
  if (s === "paid") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700";
  if (s === "failed" || s === "cancelled") return "border-rose-500/40 bg-rose-500/10 text-rose-700";
  return "border-sky-500/40 bg-sky-500/10 text-sky-700";
}

function Kpi({ label: l, value, tone }: { label: string; value: React.ReactNode; tone?: "ok" | "warn" | "err" }) {
  const cls =
    tone === "ok" ? "text-emerald-700" :
    tone === "warn" ? "text-amber-700" :
    tone === "err" ? "text-rose-700" : "text-foreground";
  return (
    <div className={kpi}>
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{l}</div>
      <div className={`mt-1 font-[Fraunces] text-lg font-semibold ${cls}`}>{value}</div>
    </div>
  );
}

function Toggle({ label: l, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background px-3 py-2 text-xs">
      <span>{l}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
    </label>
  );
}

// ============================================================================
// AUTHENTICATION TAB
// ============================================================================
export function AuthTab({ state, setState, t }: {
  state: InfrastructureState;
  setState: React.Dispatch<React.SetStateAction<InfrastructureState>>;
  t: T;
}) {
  const a = state.auth;
  const [scenario, setScenario] = useState<string | null>(null);

  const setReg = <K extends keyof typeof a.registration>(k: K, v: (typeof a.registration)[K]) =>
    setState(s => ({ ...s, auth: { ...s.auth, registration: { ...s.auth.registration, [k]: v } } }));
  const setSec = <K extends keyof typeof a.security>(k: K, v: (typeof a.security)[K]) =>
    setState(s => ({ ...s, auth: { ...s.auth, security: { ...s.auth.security, [k]: v } } }));

  return (
    <div className="space-y-5">
      <div className={card}>
        <h2 className="font-[Fraunces] text-xl font-semibold">{t("auth_title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth_subtitle")}</p>
      </div>

      <div className={card}>
        <h3 className="font-semibold">{t("auth_reg_h")}</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <Toggle label={t("reg_allow")} checked={a.registration.allowNew} onChange={(v) => setReg("allowNew", v)} />
          <Toggle label={t("reg_verify")} checked={a.registration.requireEmailVerification} onChange={(v) => setReg("requireEmailVerification", v)} />
          <Toggle label={t("reg_guest_prev")} checked={a.registration.allowGuestPreview} onChange={(v) => setReg("allowGuestPreview", v)} />
          <Toggle label={t("reg_guest_free")} checked={a.registration.allowGuestFreeCard} onChange={(v) => setReg("allowGuestFreeCard", v)} />
          <Toggle label={t("reg_terms")} checked={a.registration.requireTerms} onChange={(v) => setReg("requireTerms", v)} />
          <Toggle label={t("reg_priv")} checked={a.registration.requirePrivacy} onChange={(v) => setReg("requirePrivacy", v)} />
          <Toggle label={t("reg_first_free")} checked={a.registration.firstVisitFree} onChange={(v) => setReg("firstVisitFree", v)} />
          <Toggle label={t("reg_prev_multi")} checked={a.registration.preventMultipleRewards} onChange={(v) => setReg("preventMultipleRewards", v)} />
          <NumberField label={t("reg_age")} value={a.registration.minAge} onChange={(v) => setReg("minAge", v)} />
          <NumberField label={t("reg_wcredits")} value={a.registration.welcomeCredits} onChange={(v) => setReg("welcomeCredits", v)} />
          <NumberField label={t("reg_rate")} value={a.registration.rateLimitPlaceholder} onChange={(v) => setReg("rateLimitPlaceholder", v)} />
          <div>
            <div className={label}>{t("reg_lang")}</div>
            <select className={input} value={a.registration.defaultLanguage} onChange={(e) => setReg("defaultLanguage", e.target.value)}>
              {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <div className={label}>{t("reg_country")}</div>
            <input className={input} value={a.registration.defaultCountry} onChange={(e) => setReg("defaultCountry", e.target.value)} />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground"><CheckCircle2 className="mr-1 inline h-3 w-3 text-emerald-600" />{t("reg_note_free")}</p>
      </div>

      <div className={card}>
        <h3 className="font-semibold">{t("auth_sec_h")}</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <NumberField label={t("sec_max_failed")} value={a.security.maxFailed} onChange={(v) => setSec("maxFailed", v)} />
          <NumberField label={t("sec_lock")} value={a.security.lockDurationMin} onChange={(v) => setSec("lockDurationMin", v)} />
          <NumberField label={t("sec_cust_sess")} value={a.security.customerSessionH} onChange={(v) => setSec("customerSessionH", v)} />
          <NumberField label={t("sec_admin_sess")} value={a.security.adminSessionH} onChange={(v) => setSec("adminSessionH", v)} />
          <NumberField label={t("sec_pw_min")} value={a.security.passwordMinLength} onChange={(v) => setSec("passwordMinLength", v)} />
          <NumberField label={t("sec_reset_exp")} value={a.security.resetLinkExpMin} onChange={(v) => setSec("resetLinkExpMin", v)} />
          <div>
            <div className={label}>{t("sec_pw_cmplx")}</div>
            <select className={input} value={a.security.passwordComplexity} onChange={(e) => setSec("passwordComplexity", e.target.value as any)}>
              <option value="basic">{t("sec_pw_basic")}</option>
              <option value="medium">{t("sec_pw_medium")}</option>
              <option value="strong">{t("sec_pw_strong")}</option>
            </select>
          </div>
          <Toggle label={t("sec_2fa_admin")} checked={a.security.requireAdmin2FA} onChange={(v) => setSec("requireAdmin2FA", v)} />
          <Toggle label={t("sec_2fa_cust")} checked={a.security.optionalCustomer2FA} onChange={(v) => setSec("optionalCustomer2FA", v)} />
          <Toggle label={t("sec_susp")} checked={a.security.suspiciousDetection} onChange={(v) => setSec("suspiciousDetection", v)} />
          <Toggle label={t("sec_newdev")} checked={a.security.newDeviceNotification} onChange={(v) => setSec("newDeviceNotification", v)} />
        </div>
      </div>

      <div className={card}>
        <h3 className="font-semibold">{t("auth_social_h")}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t("soc_placeholder")}</p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {(["google","apple","facebook"] as const).map(k => (
            <Toggle key={k} label={t(`soc_${k}`)} checked={a.socialLogin[k]}
              onChange={(v) => setState(s => ({ ...s, auth: { ...s.auth, socialLogin: { ...s.auth.socialLogin, [k]: v } } }))} />
          ))}
        </div>
      </div>

      <div className={card}>
        <h3 className="font-semibold">{t("auth_sess_h")}</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">{t("sess_account")}</th><th>{t("sess_role")}</th>
                <th>{t("sess_device")}</th><th>{t("sess_browser")}</th>
                <th>{t("sess_country")}</th><th>{t("sess_created")}</th>
                <th>{t("sess_last")}</th><th>{t("status")}</th><th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {a.sessions.map(se => (
                <tr key={se.id} className="border-t border-border/40">
                  <td className="py-1.5">{se.account}</td>
                  <td>{se.role}</td>
                  <td>{se.device}</td>
                  <td>{se.browser}</td>
                  <td>{se.country}</td>
                  <td>{fmtDate(se.createdAt)}</td>
                  <td>{fmtDate(se.lastActive)}</td>
                  <td><span className={`${chip} ${se.active ? providerTone("connected") : providerTone("disabled")}`}>{se.active ? t("sess_active") : t("sess_ended")}</span></td>
                  <td className="flex flex-wrap gap-1">
                    <button className={btn} onClick={() => setState(s => ({ ...s, auth: { ...s.auth, sessions: s.auth.sessions.map(x => x.id === se.id ? { ...x, active: false } : x) } }))}>{t("sess_end")}</button>
                    <button className={btn} onClick={() => setState(s => ({ ...s, auth: { ...s.auth, sessions: s.auth.sessions.map(x => x.id === se.id ? { ...x, trusted: true } : x) } }))}>{t("sess_trust")}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className={btn + " mt-3"} onClick={() => setState(s => ({ ...s, auth: { ...s.auth, sessions: s.auth.sessions.map(x => ({ ...x, active: false })) } }))}>{t("sess_end_others")}</button>
      </div>

      <div className={card}>
        <h3 className="font-semibold">{t("auth_test_h")}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t("auth_test_intro")}</p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {["at_reg_ok","at_reg_dup","at_verify","at_login_ok","at_login_bad","at_locked","at_reset","at_reset_exp","at_newdev","at_2fa"].map(k => (
            <button key={k} className={btn} onClick={() => setScenario(k)}>
              <Beaker className="h-3 w-3" />{t(k)}
            </button>
          ))}
        </div>
        {scenario && (
          <pre className="mt-3 rounded-md border border-border/60 bg-muted/30 p-3 text-xs">
▶ {t(scenario)}
  • {t("pt_flow_audit")}
          </pre>
        )}
      </div>
    </div>
  );
}

function NumberField({ label: l, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className={label}>{l}</div>
      <input type="number" className={input} value={value} onChange={(e) => onChange(+e.target.value || 0)} />
    </div>
  );
}

// ============================================================================
// STORAGE MANAGEMENT TAB
// ============================================================================
export function StorageMgmtTab({ state, setState, t }: {
  state: InfrastructureState;
  setState: React.Dispatch<React.SetStateAction<InfrastructureState>>;
  t: T;
}) {
  const st = state.storageMgmt;
  const setRet = <K extends keyof typeof st.retention>(k: K, v: number) =>
    setState(s => ({ ...s, storageMgmt: { ...s.storageMgmt, retention: { ...s.storageMgmt.retention, [k]: v } } }));

  return (
    <div className="space-y-5">
      <div className={card}>
        <h2 className="font-[Fraunces] text-xl font-semibold">{t("stg_title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("stg_subtitle")}</p>
      </div>

      <div className={card}>
        <h3 className="font-semibold">{t("stg_providers_h")}</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {st.providers.map(sp => {
            const pct = Math.round((sp.usedGb / sp.capacityGb) * 100);
            return (
              <div key={sp.id} className="rounded-xl border border-border/60 bg-background p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-primary" />
                      <div className="font-semibold">{sp.name}</div>
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">ID: {sp.id} · {t(`stg_type_${sp.type}`)}</div>
                  </div>
                  <span className={`${chip} ${providerTone(sp.status)}`}>{t(`ps_${sp.status}`)}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div><span className={label}>{t("stg_region")}</span><div>{sp.region}</div></div>
                  <div><span className={label}>{t("stg_priority")}</span><div>{sp.priority}</div></div>
                  <div><span className={label}>{t("stg_used")}</span><div>{sp.usedGb} GB</div></div>
                  <div><span className={label}>{t("stg_capacity")}</span><div>{sp.capacityGb} GB</div></div>
                  <div><span className={label}>{t("stg_files")}</span><div>{sp.files.toLocaleString()}</div></div>
                  <div><span className={label}>{t("stg_up_ms")}</span><div>{sp.avgUploadMs}ms</div></div>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className={`h-full ${pct > 85 ? "bg-rose-500" : pct > 65 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button className={btn}>{t("pay_action_configure")}</button>
                  <button className={btn}>{t("pay_action_test")}</button>
                  <button className={btn}>{t("stg_set_primary")}</button>
                  <button className={btn}>{t("stg_set_backup")}</button>
                  <button className={btn}>{t("stg_sync")}</button>
                  <button className={btn}>{t("stg_view_files")}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={card}>
        <h3 className="font-semibold">{t("stg_cat_h")}</h3>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
          {st.categories.map(c => (
            <div key={c.key} className="rounded-md border border-border/60 bg-background px-3 py-2 text-xs">
              <div className="font-medium">{t(`fc_${c.key}`)}</div>
              <div className="mt-0.5 text-muted-foreground">{c.files.toLocaleString()} · {c.sizeGb} GB</div>
            </div>
          ))}
        </div>
      </div>

      <div className={card}>
        <h3 className="font-semibold">{t("stg_ret_h")}</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <NumberField label={t("ret_temp")} value={st.retention.tempPreviewDays} onChange={(v) => setRet("tempPreviewDays", v)} />
          <NumberField label={t("ret_failed")} value={st.retention.failedProcessingDays} onChange={(v) => setRet("failedProcessingDays", v)} />
          <NumberField label={t("ret_done")} value={st.retention.completedOrderDays} onChange={(v) => setRet("completedOrderDays", v)} />
          <NumberField label={t("ret_upload")} value={st.retention.customerUploadDays} onChange={(v) => setRet("customerUploadDays", v)} />
          <NumberField label={t("ret_backup")} value={st.retention.backupDays} onChange={(v) => setRet("backupDays", v)} />
          <NumberField label={t("ret_archived")} value={st.retention.archivedDays} onChange={(v) => setRet("archivedDays", v)} />
          <NumberField label={t("ret_recovery")} value={st.retention.recoveryPeriodDays} onChange={(v) => setRet("recoveryPeriodDays", v)} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button className={btn}><Timer className="h-3 w-3" />{t("stg_run_cleanup")}</button>
          <button className={btn}>{t("stg_preview_delete")}</button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t("stg_rules_intro")}</p>
        <ul className="mt-1 space-y-1 text-xs">
          {["stg_rule_1","stg_rule_2","stg_rule_3","stg_rule_4","stg_rule_5"].map(k => (
            <li key={k} className="flex items-start gap-1.5"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />{t(k)}</li>
          ))}
        </ul>
      </div>

      <div className={card}>
        <h3 className="font-semibold">{t("stg_flow_h")}</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {["stg_flow_1","stg_flow_2","stg_flow_3","stg_flow_4","stg_flow_5","stg_flow_6","stg_flow_7"].map(k => (
            <div key={k} className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-2 text-xs">
              <ArrowRightLeft className="h-3 w-3 text-primary" />{t(k)}
            </div>
          ))}
        </div>
        <h4 className="mt-4 text-sm font-semibold">{t("stg_fo_hist")}</h4>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">{t("date")}</th><th>{t("stg_fo_from")}</th><th>{t("stg_fo_to")}</th>
                <th>{t("stg_fo_reason")}</th><th>{t("stg_fo_moved")}</th>
              </tr>
            </thead>
            <tbody>
              {st.failoverHistory.map(f => (
                <tr key={f.id} className="border-t border-border/40">
                  <td className="py-1.5">{fmtDate(f.date)}</td>
                  <td>{f.fromProvider}</td><td>{f.toProvider}</td>
                  <td>{f.reason}</td><td>{f.filesMoved.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SERVICE CONNECTIONS TAB
// ============================================================================
export function ServicesTab({ state, setState, t }: {
  state: InfrastructureState;
  setState: React.Dispatch<React.SetStateAction<InfrastructureState>>;
  t: T;
}) {
  const svcs = state.services;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [envF, setEnvF] = useState<string>("all");
  const [statusF, setStatusF] = useState<string>("all");

  const filtered = svcs.services.filter(s => {
    if (cat !== "all" && s.category !== cat) return false;
    if (envF !== "all" && s.environment !== envF) return false;
    if (statusF !== "all" && s.status !== statusF) return false;
    const qq = q.trim().toLowerCase();
    if (!qq) return true;
    return s.name.toLowerCase().includes(qq) || s.id.toLowerCase().includes(qq) || s.category.toLowerCase().includes(qq);
  });

  const summary = computeConnectedSummary(svcs.services);
  const generation = svcs.services.filter(s => ["image","video","animation","music","voice","overlay"].includes(s.category));

  return (
    <div className="space-y-5">
      <div className={card}>
        <h2 className="font-[Fraunces] text-xl font-semibold">{t("svc_title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("svc_subtitle")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("never_expose_secrets")}</p>
      </div>

      {/* Connected summary */}
      <div className={card}>
        <h3 className="font-semibold">{t("cs_h")}</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi label={t("cs_payments")} value={summary.paymentsConnected} />
          <Kpi label={t("cs_auth")} value={summary.authConnected} />
          <Kpi label={t("cs_generation")} value={summary.generationConnected} />
          <Kpi label={t("cs_translation")} value={summary.translationConnected} />
          <Kpi label={t("cs_storage")} value={summary.storageConnected} />
          <Kpi label={t("cs_notifications")} value={summary.notificationsConnected} />
          <Kpi label={t("cs_errors")} value={summary.withErrors} tone={summary.withErrors > 0 ? "warn" : "ok"} />
          <Kpi label={t("cs_test")} value={summary.inTest} />
          <Kpi label={t("cs_live")} value={summary.inLive} tone="ok" />
        </div>
      </div>

      {/* Filters */}
      <div className={card}>
        <div className="flex flex-wrap gap-2">
          <input className={input + " max-w-xs"} placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
          <select className={input + " max-w-[180px]"} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="all">— {t("category")} —</option>
            {["payments","authentication","image","video","animation","music","voice","translation","overlay","storage","email","sms","push","telegram","whatsapp","analytics","monitoring"].map(c =>
              <option key={c} value={c}>{t(`sc_${c}`)}</option>
            )}
          </select>
          <select className={input + " max-w-[140px]"} value={envF} onChange={(e) => setEnvF(e.target.value)}>
            <option value="all">— {t("mode")} —</option>
            <option value="test">{t("mode_test")}</option>
            <option value="live">{t("mode_live")}</option>
          </select>
          <select className={input + " max-w-[180px]"} value={statusF} onChange={(e) => setStatusF(e.target.value)}>
            <option value="all">— {t("status")} —</option>
            {(["not_configured","connected","warning","error","rate_limited","disabled","maintenance"] as ServiceStatus[]).map(s =>
              <option key={s} value={s}>{t(`ss_${s}`) === `ss_${s}` ? t(`ps_${s === "not_configured" ? "not_connected" : s}`) : t(`ss_${s}`)}</option>
            )}
          </select>
          <button className={btn} onClick={() => { setQ(""); setCat("all"); setEnvF("all"); setStatusF("all"); }}>{t("reset_filters")}</button>
        </div>
      </div>

      {/* Services table */}
      <div className={card}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">{t("svc_service")}</th>
                <th>{t("category")}</th>
                <th>{t("status")}</th>
                <th>{t("svc_env")}</th>
                <th>{t("svc_credential")}</th>
                <th>{t("pay_last_check")}</th>
                <th>{t("svc_response")}</th>
                <th>{t("svc_daily")}</th>
                <th>{t("svc_limit")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-t border-border/40">
                  <td className="py-1.5"><div className="font-medium">{s.name}</div><div className="text-[10px] text-muted-foreground">{s.id}</div></td>
                  <td>{t(`sc_${s.category}`)}</td>
                  <td><span className={`${chip} ${serviceStatusTone(s.status)}`}>{s.status === "not_configured" || s.status === "rate_limited" || s.status === "maintenance" ? t(`ss_${s.status}`) : t(`ps_${s.status}`)}</span></td>
                  <td><span className={`${chip} ${s.environment === "live" ? providerTone("connected") : providerTone("test")}`}>{s.environment === "live" ? t("badge_live") : t("badge_test")}</span></td>
                  <td className="font-mono">{s.credentialMasked}</td>
                  <td>{fmtDate(s.lastCheck)}</td>
                  <td>{s.responseMs}ms</td>
                  <td>{s.dailyUsage}</td>
                  <td>{s.usageLimit}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <button className={btn}>{t("pay_action_configure")}</button>
                      <button className={btn}>{t("pay_action_test")}</button>
                      <button className={btn}>{t("svc_action_rotate")}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generation slots */}
      <div className={card}>
        <h3 className="font-semibold">{t("svc_gen_h")}</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {generation.map(s => (
            <div key={s.id} className="rounded-xl border border-border/60 bg-background p-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{s.name}</div>
                <span className={`${chip} ${providerTone(s.role === "primary" ? "connected" : "test")}`}>
                  {s.role === "primary" ? t("svc_role_primary") : t("svc_role_backup")}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <div><span className={label}>{t("stg_priority")}</span><div>{s.priority ?? "—"}</div></div>
                <div><span className={label}>{t("svc_max_conc")}</span><div>{s.maxConcurrent ?? "—"}</div></div>
                <div><span className={label}>{t("svc_max_queue")}</span><div>{s.maxQueue ?? "—"}</div></div>
                <div><span className={label}>{t("svc_hourly")}</span><div>{s.hourlyLimit ?? "—"}</div></div>
                <div><span className={label}>{t("svc_daily_l")}</span><div>{s.dailyLimit ?? "—"}</div></div>
                <div><span className={label}>{t("svc_budget")}</span><div>{s.monthlyBudget ? `€${s.monthlyBudget}` : "—"}</div></div>
                <div><span className={label}>{t("svc_cost_unit")}</span><div>{s.costPerUnit ?? "—"}</div></div>
                <div><span className={label}>{t("svc_formats")}</span><div>{s.supportedFormats?.join(", ") ?? "—"}</div></div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {s.autoFailover && <span className={`${chip} ${providerTone("connected")}`}>{t("svc_auto_fo")}</span>}
                {s.autoDisableOnErrors && <span className={`${chip} ${providerTone("warning")}`}>{t("svc_auto_dis")}</span>}
                {s.manualReviewAfterFail && <span className={`${chip} ${providerTone("test")}`}>{t("svc_manual_rev")}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Routing */}
      <div className={card}>
        <h3 className="font-semibold">{t("svc_routing_h")}</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {(["best_available","lowest_queue","fastest","lowest_cost","highest_quality","balanced","manual_rules"] as const).map(r => (
            <label key={r} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${svcs.routingStrategy === r ? "border-primary bg-primary/5" : "border-border/60 bg-background"}`}>
              <input type="radio" checked={svcs.routingStrategy === r}
                onChange={() => setState(s => ({ ...s, services: { ...s.services, routingStrategy: r } }))} />
              {t(`rs_${r}`)}
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground"><ShieldCheck className="mr-1 inline h-3 w-3 text-emerald-600" />{t("svc_no_lose")}</p>
      </div>
    </div>
  );
}

// ============================================================================
// SANDBOX TAB
// ============================================================================
export function SandboxTab({ state, setState, t }: {
  state: InfrastructureState;
  setState: React.Dispatch<React.SetStateAction<InfrastructureState>>;
  t: T;
}) {
  const sb = state.sandbox;
  const setSw = <K extends keyof typeof sb.switches>(k: K, v: boolean) =>
    setState(s => ({ ...s, sandbox: { ...s.sandbox, switches: { ...s.sandbox.switches, [k]: v } } }));

  return (
    <div className="space-y-5">
      <div className={card}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-[Fraunces] text-xl font-semibold">{t("sb_title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("sb_subtitle")}</p>
          </div>
          <span className={`${chip} border-sky-500/40 bg-sky-500/10 text-sky-700`}>{t("test_no_money")}</span>
        </div>
      </div>

      <div className={card}>
        <Toggle label={t("sb_enable")} checked={sb.switches.enabled} onChange={(v) => setSw("enabled", v)} />
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <Toggle label={t("sb_sw_payments")} checked={sb.switches.testPayments} onChange={(v) => setSw("testPayments", v)} />
          <Toggle label={t("sb_sw_registration")} checked={sb.switches.testRegistration} onChange={(v) => setSw("testRegistration", v)} />
          <Toggle label={t("sb_sw_credits")} checked={sb.switches.testCredits} onChange={(v) => setSw("testCredits", v)} />
          <Toggle label={t("sb_sw_subscriptions")} checked={sb.switches.testSubscriptions} onChange={(v) => setSw("testSubscriptions", v)} />
          <Toggle label={t("sb_sw_generation")} checked={sb.switches.testGeneration} onChange={(v) => setSw("testGeneration", v)} />
          <Toggle label={t("sb_sw_translation")} checked={sb.switches.testTranslation} onChange={(v) => setSw("testTranslation", v)} />
          <Toggle label={t("sb_sw_overlay")} checked={sb.switches.testOverlay} onChange={(v) => setSw("testOverlay", v)} />
          <Toggle label={t("sb_sw_storage")} checked={sb.switches.testStorage} onChange={(v) => setSw("testStorage", v)} />
          <Toggle label={t("sb_sw_notifications")} checked={sb.switches.testNotifications} onChange={(v) => setSw("testNotifications", v)} />
          <Toggle label={t("sb_sw_scheduled")} checked={sb.switches.testScheduled} onChange={(v) => setSw("testScheduled", v)} />
        </div>
      </div>

      <div className={card}>
        <h3 className="font-semibold">{t("sb_rules_h")}</h3>
        <ul className="mt-2 space-y-1 text-xs">
          {["sb_r1","sb_r2","sb_r3","sb_r4","sb_r5","sb_r6","sb_r7"].map(k => (
            <li key={k} className="flex items-start gap-1.5"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />{t(k)}</li>
          ))}
        </ul>
      </div>

      <div className={card}>
        <h3 className="font-semibold">{t("sb_accounts_h")}</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">{t("sess_role")}</th><th>{t("pay_email")}</th>
                <th>{t("lri_credits")}</th><th>{t("pay_subscription")}</th>
                <th>{t("sess_created")}</th><th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {sb.accounts.map(a => (
                <tr key={a.id} className="border-t border-border/40">
                  <td className="py-1.5"><span className={`${chip} border-sky-500/40 bg-sky-500/10 text-sky-700`}>{t("badge_test")}</span> {t(`role_${a.role}`)}</td>
                  <td className="font-mono text-[10px]">{a.email}</td>
                  <td>{a.credits}</td>
                  <td>{a.subscription ?? "—"}</td>
                  <td>{fmtDate(a.createdAt)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <button className={btn} onClick={() => setState(s => ({ ...s, sandbox: { ...s.sandbox, accounts: s.sandbox.accounts.map(x => x.id === a.id ? { ...x, credits: 0 } : x) } }))}>{t("sb_reset")}</button>
                      <button className={btn} onClick={() => setState(s => ({ ...s, sandbox: { ...s.sandbox, accounts: s.sandbox.accounts.map(x => x.id === a.id ? { ...x, credits: x.credits + 10 } : x) } }))}>{t("sb_add_credits")}</button>
                      <button className={btn} onClick={() => setState(s => ({ ...s, sandbox: { ...s.sandbox, accounts: s.sandbox.accounts.map(x => x.id === a.id ? { ...x, credits: Math.max(0, x.credits - 10) } : x) } }))}>{t("sb_rem_credits")}</button>
                      <button className={btn}>{t("sb_change_sub")}</button>
                      <button className={btn}>{t("sb_create_order")}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PLATFORM CONTROL TAB
// ============================================================================
export function ControlTab({ state, setState, t, lang }: {
  state: InfrastructureState;
  setState: React.Dispatch<React.SetStateAction<InfrastructureState>>;
  t: T;
  lang: Lang;
}) {
  const c = state.control;
  const [confirmOpen, setConfirmOpen] = useState<null | "partial" | "full">(null);
  const [phrase, setPhrase] = useState("");
  const [reason, setReason] = useState("");
  const [ackImpact, setAckImpact] = useState(false);
  const [pw, setPw] = useState("");
  const [maintPreview, setMaintPreview] = useState(false);

  const setPartial = <K extends keyof PartialPauseFlags>(k: K, v: boolean) =>
    setState(s => ({ ...s, control: { ...s.control, partial: { ...s.control.partial, [k]: v } } }));

  function applyMode(mode: "normal" | "partial" | "full_maintenance") {
    setState(s => ({ ...s, control: { ...s.control, mode } }));
    setConfirmOpen(null); setPhrase(""); setReason(""); setAckImpact(false); setPw("");
  }

  return (
    <div className="space-y-5">
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-[Fraunces] text-xl font-semibold">{t("ctrl_title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("ctrl_subtitle")}</p>
          </div>
          <div className="flex gap-2">
            {c.mode === "normal" ? (
              <>
                <button className={btn} onClick={() => setConfirmOpen("partial")}><Pause className="h-3 w-3" />{t("ctrl_mode_partial")}</button>
                <button className={btnPri} onClick={() => setConfirmOpen("full")}><Pause className="h-3 w-3" />{t("ctrl_pause")}</button>
              </>
            ) : (
              <button className={btnPri} onClick={() => applyMode("normal")}><Play className="h-3 w-3" />{t("ctrl_resume")}</button>
            )}
          </div>
        </div>
      </div>

      {/* Mode selector */}
      <div className={card}>
        <div className={label}>{t("ctrl_mode")}</div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {(["normal","partial","full_maintenance"] as const).map(m => (
            <label key={m} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs ${c.mode === m ? "border-primary bg-primary/5" : "border-border/60 bg-background"}`}>
              <input type="radio" checked={c.mode === m} onChange={() => applyMode(m)} />
              {t(`ctrl_mode_${m === "full_maintenance" ? "full" : m}`)}
            </label>
          ))}
        </div>
      </div>

      {/* Partial pause */}
      <div className={card}>
        <h3 className="font-semibold">{t("ctrl_partial_h")}</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <Toggle label={t("pp_reg")} checked={c.partial.newRegistrations} onChange={(v) => setPartial("newRegistrations", v)} />
          <Toggle label={t("pp_login")} checked={c.partial.customerLogin} onChange={(v) => setPartial("customerLogin", v)} />
          <Toggle label={t("pp_credits")} checked={c.partial.creditPurchases} onChange={(v) => setPartial("creditPurchases", v)} />
          <Toggle label={t("pp_subs")} checked={c.partial.subscriptionPurchases} onChange={(v) => setPartial("subscriptionPurchases", v)} />
          <Toggle label={t("pp_orders")} checked={c.partial.newOrders} onChange={(v) => setPartial("newOrders", v)} />
          <Toggle label={t("pp_studio")} checked={c.partial.studioAccess} onChange={(v) => setPartial("studioAccess", v)} />
          <Toggle label={t("pp_gen")} checked={c.partial.newGeneration} onChange={(v) => setPartial("newGeneration", v)} />
          <Toggle label={t("pp_sched")} checked={c.partial.scheduledProcessing} onChange={(v) => setPartial("scheduledProcessing", v)} />
          <Toggle label={t("pp_notif")} checked={c.partial.outgoingNotifications} onChange={(v) => setPartial("outgoingNotifications", v)} />
          <Toggle label={t("pp_deliv")} checked={c.partial.scheduledDelivery} onChange={(v) => setPartial("scheduledDelivery", v)} />
          <Toggle label={t("pp_uploads")} checked={c.partial.customerUploads} onChange={(v) => setPartial("customerUploads", v)} />
        </div>
      </div>

      {/* Active jobs */}
      <div className={card}>
        <h3 className="font-semibold">{t("ctrl_jobs_h")}</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {(["finish","stop_safely","return_queue","manual_review"] as const).map(k => (
            <label key={k} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${c.activeJobs === k ? "border-primary bg-primary/5" : "border-border/60 bg-background"}`}>
              <input type="radio" checked={c.activeJobs === k}
                onChange={() => setState(s => ({ ...s, control: { ...s.control, activeJobs: k } }))} />
              {t(`jb_${k}`)}
            </label>
          ))}
        </div>
        <h4 className="mt-4 text-sm font-semibold">{t("ctrl_never_h")}</h4>
        <ul className="mt-1 space-y-1 text-xs">
          {["ctrl_n1","ctrl_n2","ctrl_n3","ctrl_n4","ctrl_n5"].map(k => (
            <li key={k} className="flex items-start gap-1.5"><ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />{t(k)}</li>
          ))}
        </ul>
      </div>

      {/* Snapshot */}
      <div className={card}>
        <h3 className="font-semibold">{t("ctrl_snapshot_h")}</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-6">
          <Kpi label={t("snap_users")} value={c.demoStats.activeUsers} />
          <Kpi label={t("snap_orders")} value={c.demoStats.activeOrders} />
          <Kpi label={t("snap_running")} value={c.demoStats.runningJobs} />
          <Kpi label={t("snap_queue")} value={c.demoStats.queuedJobs} />
          <Kpi label={t("snap_deliv")} value={c.demoStats.scheduledDeliveries} />
          <Kpi label={t("snap_confirm")} value={c.demoStats.pendingConfirmations} />
        </div>
      </div>

      {/* Maintenance page */}
      <div className={card}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{t("ctrl_maint_h")}</h3>
          <button className={btn} onClick={() => setMaintPreview(true)}>{t("maint_preview")}</button>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <div>
            <div className={label}>{t("maint_return")}</div>
            <input className={input} value={c.returnTime} onChange={(e) => setState(s => ({ ...s, control: { ...s.control, returnTime: e.target.value } }))} />
          </div>
          <div>
            <div className={label}>{t("maint_support")}</div>
            <input className={input} type="email" value={c.supportEmail} onChange={(e) => setState(s => ({ ...s, control: { ...s.control, supportEmail: e.target.value } }))} />
          </div>
        </div>
        <div className="mt-3">
          <div className={label}>{t("maint_msg_lang")}</div>
          <div className="mt-2 grid gap-2">
            {(["en","ru","de","uk","fr","pl"] as Lang[]).map(lg => (
              <div key={lg}>
                <div className="text-[10px] text-muted-foreground uppercase">{lg}</div>
                <textarea rows={2} className={input}
                  value={c.messages[lg]}
                  onChange={(e) => setState(s => ({ ...s, control: { ...s.control, messages: { ...s.control.messages, [lg]: e.target.value } } }))} />
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-amber-700"><AlertTriangle className="mr-1 inline h-3 w-3" />{t("maint_neutral")}</p>
      </div>

      {/* Maintenance access */}
      <div className={card}>
        <h3 className="font-semibold">{t("ctrl_access_h")}</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <Toggle label={t("acc_super")} checked={c.allowSuperAdmins} onChange={(v) => setState(s => ({ ...s, control: { ...s.control, allowSuperAdmins: v } }))} />
          <Toggle label={t("acc_admin")} checked={c.allowAdmins} onChange={(v) => setState(s => ({ ...s, control: { ...s.control, allowAdmins: v } }))} />
        </div>
      </div>

      {/* Scheduling */}
      <div className={card}>
        <h3 className="font-semibold">{t("ctrl_sched_h")}</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <div>
            <div className={label}>{t("sched_start")}</div>
            <input type="datetime-local" className={input}
              value={c.scheduleStart?.slice(0, 16) ?? ""}
              onChange={(e) => setState(s => ({ ...s, control: { ...s.control, scheduleStart: e.target.value ? new Date(e.target.value).toISOString() : null } }))} />
          </div>
          <div>
            <div className={label}>{t("sched_end")}</div>
            <input type="datetime-local" className={input}
              value={c.scheduleEnd?.slice(0, 16) ?? ""}
              onChange={(e) => setState(s => ({ ...s, control: { ...s.control, scheduleEnd: e.target.value ? new Date(e.target.value).toISOString() : null } }))} />
          </div>
        </div>
        <div className="mt-2">
          <Toggle label={t("sched_auto")} checked={c.autoResume} onChange={(v) => setState(s => ({ ...s, control: { ...s.control, autoResume: v } }))} />
        </div>
        {c.scheduleStart && c.scheduleEnd && new Date(c.scheduleEnd).getTime() < new Date(c.scheduleStart).getTime() && (
          <p className="mt-2 text-xs text-rose-600"><AlertTriangle className="mr-1 inline h-3 w-3" />End cannot precede start.</p>
        )}
        <h4 className="mt-4 text-sm font-semibold">{t("sched_ntfy_h")}</h4>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          <Toggle label={t("sched_ch_email")} checked={c.notify.email} onChange={(v) => setState(s => ({ ...s, control: { ...s.control, notify: { ...s.control.notify, email: v } } }))} />
          <Toggle label={t("sched_ch_push")} checked={c.notify.push} onChange={(v) => setState(s => ({ ...s, control: { ...s.control, notify: { ...s.control.notify, push: v } } }))} />
          <Toggle label={t("sched_ch_internal")} checked={c.notify.internal} onChange={(v) => setState(s => ({ ...s, control: { ...s.control, notify: { ...s.control.notify, internal: v } } }))} />
        </div>
      </div>

      {/* Readiness checklist */}
      <div className={card}>
        <h3 className="font-semibold">{t("ctrl_ready_h")}</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {["ready_public","ready_auth","ready_payments","ready_orders","ready_queue","ready_storage","ready_notifications","ready_database"].map(k => (
            <div key={k} className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-xs">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />{t(k)}
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border/60 bg-card p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-[Fraunces] text-lg font-semibold">
                {confirmOpen === "full" ? t("ctrl_mode_full") : t("ctrl_mode_partial")}
              </h3>
              <button className={btn} onClick={() => setConfirmOpen(null)}><XCircle className="h-3 w-3" /></button>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <div className={label}>{t("saf_check_reason")}</div>
                <input className={input} value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <label className="flex items-start gap-2 text-xs">
                <input type="checkbox" checked={ackImpact} onChange={(e) => setAckImpact(e.target.checked)} />
                <span>{t("saf_check_conf")}</span>
              </label>
              {confirmOpen === "full" && (
                <>
                  <div>
                    <div className={label}>{t("saf_check_pw")}</div>
                    <input type="password" className={input} value={pw} onChange={(e) => setPw(e.target.value)} />
                  </div>
                  <div>
                    <div className={label}>{t("saf_check_phrase")}</div>
                    <input className={input} value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder={PAUSE_CONFIRMATION_PHRASE} />
                    <div className="mt-1 text-[10px] text-muted-foreground">{t("saf_check_phrase_hint")}</div>
                  </div>
                </>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className={btn} onClick={() => setConfirmOpen(null)}>{t("cancel")}</button>
              <button
                className={btnPri}
                disabled={
                  !reason.trim() || !ackImpact ||
                  (confirmOpen === "full" && (!pw || phrase !== PAUSE_CONFIRMATION_PHRASE))
                }
                onClick={() => applyMode(confirmOpen === "full" ? "full_maintenance" : "partial")}
              >
                {t("confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance preview */}
      {maintPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setMaintPreview(false)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border/60 bg-background p-10 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-gradient font-[Fraunces] text-2xl font-semibold text-primary-foreground">PJ</div>
            <h1 className="mt-6 font-[Fraunces] text-3xl font-semibold">{t("maint_title_customer")}</h1>
            <p className="mt-4 text-muted-foreground">{c.messages[lang]}</p>
            {c.returnTime && <p className="mt-2 text-sm text-muted-foreground">↻ {c.returnTime}</p>}
            <div className="mt-6 flex justify-center gap-2">
              <a className={btn} href={`mailto:${c.supportEmail}`}>{c.supportEmail}</a>
              <button className={btnPri} onClick={() => setMaintPreview(false)}>{t("maint_refresh")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LAUNCH READINESS TAB
// ============================================================================
export function LaunchTab({ state, setState, t }: {
  state: InfrastructureState;
  setState: React.Dispatch<React.SetStateAction<InfrastructureState>>;
  t: T;
}) {
  const lr = state.launch;
  const score = readinessScore(lr.items);
  const summary = computeConnectedSummary(state.services.services);

  return (
    <div className="space-y-5">
      <div className={card}>
        <h2 className="font-[Fraunces] text-xl font-semibold">{t("lr_title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("lr_subtitle")}</p>
        <p className="mt-1 text-xs text-amber-700">{t("lr_demo")}</p>
      </div>

      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className={label}>{t("lr_overall")}</div>
            <div className="mt-1 font-[Fraunces] text-3xl font-semibold">{score}%</div>
          </div>
          <div className="min-w-[220px] flex-1">
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div className={`h-full ${score > 80 ? "bg-emerald-500" : score > 50 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${score}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className={card}>
        <div className="grid gap-2 md:grid-cols-2">
          {lr.items.map(item => (
            <div key={item.key} className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2 text-xs">
              <div className="flex items-center gap-2"><Rocket className="h-3 w-3 text-primary" /><span>{t(`lri_${item.key}`)}</span></div>
              <select
                className="rounded border border-border/60 bg-background px-1 py-0.5 text-[10px]"
                value={item.status}
                onChange={(e) => setState(s => ({
                  ...s,
                  launch: {
                    ...s.launch,
                    items: s.launch.items.map(x => x.key === item.key ? { ...x, status: e.target.value as ReadinessStatus } : x),
                  },
                }))}
              >
                {(["not_started","prepared","test","connected","verified","warning","blocking"] as ReadinessStatus[]).map(rs => (
                  <option key={rs} value={rs}>{t(`rs_${rs}`)}</option>
                ))}
              </select>
              <span className={`${chip} ${readinessTone(item.status)}`}>{t(`rs_${item.status}`)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Connected summary */}
      <div className={card}>
        <h3 className="font-semibold">{t("cs_h")}</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi label={t("cs_payments")} value={summary.paymentsConnected} />
          <Kpi label={t("cs_auth")} value={summary.authConnected} />
          <Kpi label={t("cs_generation")} value={summary.generationConnected} />
          <Kpi label={t("cs_translation")} value={summary.translationConnected} />
          <Kpi label={t("cs_storage")} value={summary.storageConnected} />
          <Kpi label={t("cs_notifications")} value={summary.notificationsConnected} />
          <Kpi label={t("cs_errors")} value={summary.withErrors} tone={summary.withErrors > 0 ? "warn" : "ok"} />
          <Kpi label={t("cs_test")} value={summary.inTest} />
          <Kpi label={t("cs_live")} value={summary.inLive} tone="ok" />
        </div>
      </div>

      {/* Integration checklists */}
      <div className={card}>
        <h3 className="font-semibold">{t("ic_h")}</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {lr.checklists.map(cl => {
            const done = cl.items.filter(i => i.done).length;
            const isLiveable = done === cl.items.length;
            return (
              <div key={cl.serviceId} className="rounded-xl border border-border/60 bg-background p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{cl.serviceName}</div>
                  <span className="text-xs text-muted-foreground">{done}/{cl.items.length}</span>
                </div>
                <ul className="mt-2 space-y-1">
                  {cl.items.map(it => (
                    <li key={it.key}>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={it.done}
                          onChange={(e) => setState(s => ({
                            ...s,
                            launch: {
                              ...s.launch,
                              checklists: s.launch.checklists.map(x => x.serviceId !== cl.serviceId ? x : {
                                ...x, items: x.items.map(y => y.key === it.key ? { ...y, done: e.target.checked } : y),
                              }),
                            },
                          }))}
                        />
                        <span>{t(`ic_${it.key}`)}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[10px] text-amber-700"><AlertTriangle className="mr-1 inline h-3 w-3" />{t("ic_confirm_live")}</p>
                <button className={btnPri + " mt-2"} disabled={!isLiveable}>{t("mode_live")}</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
