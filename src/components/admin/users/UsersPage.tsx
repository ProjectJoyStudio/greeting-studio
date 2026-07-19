import { useMemo, useState } from "react";
import {
  Plus, RefreshCw, Search, Eye, Pencil, Ban, ShieldCheck, Trash2, X, AlertTriangle,
  Mail, MessageSquare, Bell, KeyRound, Gift, Crown, Star, Trophy, ExternalLink, Copy, XCircle,
  Monitor, Globe2, Wallet, Clock, ClipboardList,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { LANGS, type Lang } from "@/lib/i18n/types";
import {
  DEMO_USERS, ACCOUNT_STATUSES, SUBSCRIPTION_TYPES, STATUS_TONE, SUBSCRIPTION_TONE,
  COUNTRY_CODES, makeTestUser, validateUser, enrichUser, totalSpentFor, avgOrderValueFor,
  ORDER_STATUS_TONE, NOTIF_STATUS_TONE, SUB_HISTORY_TONE, VIP_TONE,
  type UserRecord, type AccountStatus, type SubscriptionType, type EnrichedUser,
  type InternalNote, type VipTier,
} from "@/lib/admin/users";
import { useLocalUsers, type LocalUsers } from "./i18n";

const inputCls =
  "w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary/60";
const btnBase =
  "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:pointer-events-none";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90";
const btnDanger =
  "inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-500/20 dark:text-rose-200";

type SortKey = "newest" | "oldest" | "credits" | "orders";

export function UsersPage() {
  const { lang } = useI18n();
  const L = useLocalUsers(lang);

  const [users, setUsers] = useState<UserRecord[]>(() => [...DEMO_USERS]);
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AccountStatus>("all");
  const [countryFilter, setCountryFilter] = useState<"all" | string>("all");
  const [languageFilter, setLanguageFilter] = useState<"all" | Lang>("all");
  const [subFilter, setSubFilter] = useState<"all" | SubscriptionType>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  const [viewing, setViewing] = useState<UserRecord | null>(null);
  const [editing, setEditing] = useState<UserRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserRecord | null>(null);
  const [notesByUser, setNotesByUser] = useState<Record<string, InternalNote[]>>({});

  const filtered = useMemo(() => {
    void tick;
    const q = query.trim().toLowerCase();
    let list = users.filter((u) => {
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (countryFilter !== "all" && u.country !== countryFilter) return false;
      if (languageFilter !== "all" && u.language !== languageFilter) return false;
      if (subFilter !== "all" && u.subscription !== subFilter) return false;
      if (q) {
        const hay = `${u.id} ${u.fullName} ${u.email}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case "newest": return b.registrationDate.localeCompare(a.registrationDate);
        case "oldest": return a.registrationDate.localeCompare(b.registrationDate);
        case "credits": return b.creditsBalance - a.creditsBalance;
        case "orders": return b.totalOrders - a.totalOrders;
      }
    });
    return list;
  }, [users, query, statusFilter, countryFilter, languageFilter, subFilter, sortKey, tick]);

  const setStatus = (id: string, status: AccountStatus) =>
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));

  const doDelete = (u: UserRecord) => {
    setUsers((prev) => prev.filter((x) => x.id !== u.id));
    setConfirmDelete(null);
  };

  const doSave = (draft: UserRecord) => {
    setUsers((prev) => prev.map((u) => (u.id === draft.id ? draft : u)));
    setEditing(null);
  };

  const activeCountries = useMemo(() => {
    const s = new Set<string>(COUNTRY_CODES);
    users.forEach((u) => s.add(u.country));
    return Array.from(s).sort();
  }, [users]);

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-[Fraunces] text-2xl font-semibold text-foreground sm:text-3xl">{L("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{L("subtitle")}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button type="button" onClick={() => setTick((n) => n + 1)} className={btnBase}>
            <RefreshCw className="h-4 w-4" /> {L("refresh")}
          </button>
          <button type="button" onClick={() => setUsers((prev) => [makeTestUser(), ...prev])} className={btnPrimary}>
            <Plus className="h-4 w-4" /> {L("create_test")}
          </button>
        </div>
      </header>

      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{L("demo_notice")}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={L("search_placeholder")}
            className="w-full rounded-md border border-border/60 bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary/60"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} aria-label={L("filter_status")} className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm">
          <option value="all">{L("filter_status")}: {L("filter_all")}</option>
          {ACCOUNT_STATUSES.map((s) => <option key={s} value={s}>{L(`st_${s}`)}</option>)}
        </select>
        <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} aria-label={L("filter_country")} className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm">
          <option value="all">{L("filter_country")}: {L("filter_all")}</option>
          {activeCountries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value as typeof languageFilter)} aria-label={L("filter_language")} className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm">
          <option value="all">{L("filter_language")}: {L("filter_all")}</option>
          {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
        <select value={subFilter} onChange={(e) => setSubFilter(e.target.value as typeof subFilter)} aria-label={L("filter_subscription")} className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm">
          <option value="all">{L("filter_subscription")}: {L("filter_all")}</option>
          {SUBSCRIPTION_TYPES.map((s) => <option key={s} value={s}>{L(`sub_${s}`)}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">{L("sort_by")}</span>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm text-foreground">
            <option value="newest">{L("sort_newest")}</option>
            <option value="oldest">{L("sort_oldest")}</option>
            <option value="credits">{L("sort_credits")}</option>
            <option value="orders">{L("sort_orders")}</option>
          </select>
        </label>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border/60 bg-card/70 md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{L("col_id")}</th>
              <th className="px-3 py-2">{L("col_name")}</th>
              <th className="px-3 py-2">{L("col_email")}</th>
              <th className="px-3 py-2">{L("col_country")}</th>
              <th className="px-3 py-2">{L("col_language")}</th>
              <th className="px-3 py-2">{L("col_registered")}</th>
              <th className="px-3 py-2">{L("col_status")}</th>
              <th className="px-3 py-2 text-right">{L("col_credits")}</th>
              <th className="px-3 py-2">{L("col_subscription")}</th>
              <th className="px-3 py-2 text-right">{L("col_orders")}</th>
              <th className="px-3 py-2 text-right">{L("col_actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-border/50 hover:bg-muted/20">
                <td className="px-3 py-2 font-mono text-xs">{u.id}</td>
                <td className="px-3 py-2 font-medium text-foreground">{u.fullName}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{u.email}</td>
                <td className="px-3 py-2 text-xs">{u.country}</td>
                <td className="px-3 py-2 text-xs uppercase text-muted-foreground">{u.language}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(u.registrationDate, lang)}</td>
                <td className="px-3 py-2"><StatusPill status={u.status} L={L} /></td>
                <td className="px-3 py-2 text-right font-medium">{u.creditsBalance}</td>
                <td className="px-3 py-2"><SubPill sub={u.subscription} L={L} /></td>
                <td className="px-3 py-2 text-right text-xs">{u.totalOrders}</td>
                <td className="px-3 py-2">
                  <RowActions
                    L={L}
                    user={u}
                    onView={() => setViewing(u)}
                    onEdit={() => setEditing({ ...u })}
                    onBlock={() => setStatus(u.id, "blocked")}
                    onUnblock={() => setStatus(u.id, "active")}
                    onDelete={() => setConfirmDelete(u)}
                  />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={11} className="px-3 py-8 text-center text-sm text-muted-foreground">{L("empty")}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="grid gap-3 md:hidden">
        {filtered.map((u) => (
          <div key={u.id} className="rounded-xl border border-border/60 bg-card/70 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">{u.fullName}</div>
                <div className="truncate text-[11px] text-muted-foreground">{u.email}</div>
                <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{u.id}</div>
              </div>
              <StatusPill status={u.status} L={L} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Info label={L("col_country")} value={u.country} />
              <Info label={L("col_language")} value={u.language.toUpperCase()} />
              <Info label={L("col_credits")} value={String(u.creditsBalance)} />
              <Info label={L("col_orders")} value={String(u.totalOrders)} />
              <Info label={L("col_registered")} value={formatDate(u.registrationDate, lang)} />
              <div className="flex items-center gap-2"><span className="text-muted-foreground">{L("col_subscription")}:</span><SubPill sub={u.subscription} L={L} /></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <RowActions
                L={L}
                user={u}
                onView={() => setViewing(u)}
                onEdit={() => setEditing({ ...u })}
                onBlock={() => setStatus(u.id, "blocked")}
                onUnblock={() => setStatus(u.id, "active")}
                onDelete={() => setConfirmDelete(u)}
              />
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-border/60 bg-card/70 p-6 text-center text-sm text-muted-foreground">{L("empty")}</div>
        )}
      </div>

      {viewing && (
        <ViewModal
          user={viewing}
          L={L}
          lang={lang}
          notes={notesByUser[viewing.id] ?? []}
          onNotesChange={(next) => setNotesByUser((m) => ({ ...m, [viewing.id]: next }))}
          onStatusChange={(s) => {
            setStatus(viewing.id, s);
            setViewing((v) => (v ? { ...v, status: s } : v));
          }}
          onGrantCredits={(amount) => {
            setUsers((prev) =>
              prev.map((u) =>
                u.id === viewing.id
                  ? { ...u, creditsBalance: u.creditsBalance + amount, creditsPurchased: u.creditsPurchased + amount }
                  : u,
              ),
            );
            setViewing((v) => (v ? { ...v, creditsBalance: v.creditsBalance + amount, creditsPurchased: v.creditsPurchased + amount } : v));
          }}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing({ ...viewing }); setViewing(null); }}
        />
      )}
      {editing && (
        <EditModal
          initial={editing}
          users={users}
          L={L}
          onClose={() => setEditing(null)}
          onSave={doSave}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={L("confirm_delete_title")}
          body={`${L("confirm_delete_body")} — ${confirmDelete.fullName} (${confirmDelete.email})`}
          confirmLabel={L("act_delete")}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => doDelete(confirmDelete)}
          danger
          L={L}
        />
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="truncate text-foreground">{value}</div>
    </div>
  );
}

function StatusPill({ status, L }: { status: AccountStatus; L: LocalUsers }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[status]}`}>
      {L(`st_${status}`)}
    </span>
  );
}

function SubPill({ sub, L }: { sub: SubscriptionType; L: LocalUsers }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${SUBSCRIPTION_TONE[sub]}`}>
      {L(`sub_${sub}`)}
    </span>
  );
}

function RowActions({
  L, user, onView, onEdit, onBlock, onUnblock, onDelete,
}: {
  L: LocalUsers;
  user: UserRecord;
  onView: () => void;
  onEdit: () => void;
  onBlock: () => void;
  onUnblock: () => void;
  onDelete: () => void;
}) {
  const isBlocked = user.status === "blocked";
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <button type="button" onClick={onView} className={btnBase} title={L("act_view")}><Eye className="h-3.5 w-3.5" /><span className="hidden sm:inline">{L("act_view")}</span></button>
      <button type="button" onClick={onEdit} className={btnBase} title={L("act_edit")}><Pencil className="h-3.5 w-3.5" /><span className="hidden sm:inline">{L("act_edit")}</span></button>
      {isBlocked ? (
        <button type="button" onClick={onUnblock} className={btnBase} title={L("act_unblock")}><ShieldCheck className="h-3.5 w-3.5" /><span className="hidden sm:inline">{L("act_unblock")}</span></button>
      ) : (
        <button type="button" onClick={onBlock} className={btnBase} title={L("act_block")}><Ban className="h-3.5 w-3.5" /><span className="hidden sm:inline">{L("act_block")}</span></button>
      )}
      <button type="button" onClick={onDelete} className={btnDanger} title={L("act_delete")}><Trash2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">{L("act_delete")}</span></button>
    </div>
  );
}

function formatDate(iso: string, lang: Lang): string {
  try {
    return new Date(iso).toLocaleDateString(lang, { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return iso.slice(0, 10);
  }
}

function formatDateTime(iso: string | null, lang: Lang, L: LocalUsers): string {
  if (!iso) return L("none");
  try {
    return new Date(iso).toLocaleString(lang, { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return iso;
  }
}

function ViewModal({
  user, L, lang, onClose, onEdit,
}: {
  user: UserRecord;
  L: LocalUsers;
  lang: Lang;
  onClose: () => void;
  onEdit: () => void;
}) {
  const remaining = Math.max(0, user.creditsPurchased - user.creditsUsed);
  return (
    <Modal onClose={onClose} title={L("view_title")}>
      <div className="grid gap-5 md:grid-cols-2">
        <Section title={L("section_personal")}>
          <Field label={L("f_full_name")} value={user.fullName} />
          <Field label={L("f_email")} value={user.email} />
          <Field label={L("f_country")} value={user.country} />
          <Field label={L("f_language")} value={user.language.toUpperCase()} />
          <Field label={L("f_registration")} value={formatDate(user.registrationDate, lang)} />
        </Section>
        <Section title={L("section_account")}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{L("f_status")}</span>
            <StatusPill status={user.status} L={L} />
          </div>
          <Field label={L("f_balance")} value={String(user.creditsBalance)} />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{L("f_sub_type")}</span>
            <SubPill sub={user.subscription} L={L} />
          </div>
          <Field label={L("f_sub_start")} value={formatDateTime(user.subscriptionStart, lang, L)} />
          <Field label={L("f_sub_end")} value={formatDateTime(user.subscriptionEnd, lang, L)} />
        </Section>
        <Section title={L("section_stats")}>
          <Field label={L("f_total_orders")} value={String(user.totalOrders)} />
          <Field label={L("f_credits_purchased")} value={String(user.creditsPurchased)} />
          <Field label={L("f_credits_used")} value={String(user.creditsUsed)} />
        </Section>
        <Section title={L("section_credits")}>
          <Field label={L("f_balance")} value={String(user.creditsBalance)} />
          <Field label={L("f_credits_purchased")} value={String(user.creditsPurchased)} />
          <Field label={L("f_credits_used")} value={String(user.creditsUsed)} />
          <Field label={L("f_credits_remaining")} value={String(remaining)} />
        </Section>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={btnBase}>{L("close")}</button>
        <button type="button" onClick={onEdit} className={btnPrimary}><Pencil className="h-3.5 w-3.5" />{L("act_edit")}</button>
      </div>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/70 p-4">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-foreground">{value}</span>
    </div>
  );
}

function EditModal({
  initial, users, L, onClose, onSave,
}: {
  initial: UserRecord;
  users: UserRecord[];
  L: LocalUsers;
  onClose: () => void;
  onSave: (u: UserRecord) => void;
}) {
  const [draft, setDraft] = useState<UserRecord>(initial);

  const errors = useMemo(() => validateUser(users, draft, initial.id), [users, draft, initial.id]);
  const canSave = Object.keys(errors).length === 0;

  const set = <K extends keyof UserRecord>(k: K, v: UserRecord[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const toDateInput = (iso: string | null): string => (iso ? iso.slice(0, 10) : "");
  const fromDateInput = (v: string): string | null => (v ? new Date(v).toISOString() : null);

  return (
    <Modal onClose={onClose} title={L("edit_title")}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">{L("f_full_name")}</label>
            <input className={inputCls} value={draft.fullName} onChange={(e) => set("fullName", e.target.value)} />
            {errors.fullName && <p className="mt-1 text-xs text-rose-600">{L(errors.fullName)}</p>}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{L("f_email")}</label>
            <input className={inputCls} value={draft.email} onChange={(e) => set("email", e.target.value)} />
            {errors.email && <p className="mt-1 text-xs text-rose-600">{L(errors.email)}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">{L("f_country")}</label>
              <select className={inputCls} value={draft.country} onChange={(e) => set("country", e.target.value)}>
                {COUNTRY_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
                {!COUNTRY_CODES.includes(draft.country as (typeof COUNTRY_CODES)[number]) && (
                  <option value={draft.country}>{draft.country}</option>
                )}
              </select>
              {errors.country && <p className="mt-1 text-xs text-rose-600">{L(errors.country)}</p>}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{L("f_language")}</label>
              <select className={inputCls} value={draft.language} onChange={(e) => set("language", e.target.value as Lang)}>
                {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
              {errors.language && <p className="mt-1 text-xs text-rose-600">{L(errors.language)}</p>}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{L("f_status")}</label>
            <select className={inputCls} value={draft.status} onChange={(e) => set("status", e.target.value as AccountStatus)}>
              {ACCOUNT_STATUSES.map((s) => <option key={s} value={s}>{L(`st_${s}`)}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">{L("f_balance")}</label>
            <input type="number" min={0} className={inputCls} value={draft.creditsBalance}
              onChange={(e) => set("creditsBalance", Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">{L("f_credits_purchased")}</label>
              <input type="number" min={0} className={inputCls} value={draft.creditsPurchased}
                onChange={(e) => set("creditsPurchased", Math.max(0, Number(e.target.value) || 0))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{L("f_credits_used")}</label>
              <input type="number" min={0} className={inputCls} value={draft.creditsUsed}
                onChange={(e) => set("creditsUsed", Math.max(0, Number(e.target.value) || 0))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{L("f_sub_type")}</label>
            <select className={inputCls} value={draft.subscription} onChange={(e) => set("subscription", e.target.value as SubscriptionType)}>
              {SUBSCRIPTION_TYPES.map((s) => <option key={s} value={s}>{L(`sub_${s}`)}</option>)}
            </select>
          </div>
          {draft.subscription !== "none" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">{L("f_sub_start")}</label>
                <input type="date" className={inputCls} value={toDateInput(draft.subscriptionStart)}
                  onChange={(e) => set("subscriptionStart", fromDateInput(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{L("f_sub_end")}</label>
                <input type="date" className={inputCls} value={toDateInput(draft.subscriptionEnd)}
                  onChange={(e) => set("subscriptionEnd", fromDateInput(e.target.value))} />
              </div>
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground">{L("f_total_orders")}</label>
            <input type="number" min={0} className={inputCls} value={draft.totalOrders}
              onChange={(e) => set("totalOrders", Math.max(0, Number(e.target.value) || 0))} />
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={btnBase}>{L("cancel")}</button>
        <button type="button" disabled={!canSave} onClick={() => onSave(draft)} className={btnPrimary}>{L("save")}</button>
      </div>
    </Modal>
  );
}

function ConfirmDialog({
  title, body, confirmLabel, onCancel, onConfirm, danger, L,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  danger?: boolean;
  L: LocalUsers;
}) {
  return (
    <Modal onClose={onCancel} title={title} narrow>
      <p className="text-sm text-muted-foreground">{body}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={btnBase}>{L("cancel")}</button>
        <button type="button" onClick={onConfirm} className={danger ? btnDanger : btnPrimary}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

function Modal({
  title, onClose, children, narrow,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  narrow?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
      <div className={`mt-8 w-full ${narrow ? "max-w-md" : "max-w-3xl"} rounded-2xl border border-border/60 bg-card p-5 shadow-xl`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-[Fraunces] text-lg font-semibold text-foreground">{title}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}