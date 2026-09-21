import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { useI18n } from "@/lib/i18n";
import {
  adminDeleteBookProviderCopies,
  adminListMemoryBooks,
  adminMemoryBookDetail,
  adminRestoreBookFromReserve,
  adminRetryBookBackups,
  adminSetBookRetention,
  type AdminBookDetail,
  type AdminBookRow,
} from "@/lib/memory-book/admin-books.functions";

const FILTERS = ["all", "draft", "completed", "expired", "backup_problem"] as const;
type Filter = (typeof FILTERS)[number];

function bytes(value: number): string {
  if (value <= 0) return "0";
  const units = ["B", "KB", "MB", "GB"];
  let n = value;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function date(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toLocaleString() : "—";
}

/** The list of customer Memory Books and everything an admin may do with one. */
export function MemoryBookBooksPanel() {
  const { t } = useI18n();
  const list = useServerFn(adminListMemoryBooks);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [books, setBooks] = useState<AdminBookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    list({ data: { search, filter } })
      .then((res) => setBooks(res.books))
      .catch(() => setBooks([]))
      .finally(() => setLoading(false));
  }, [list, search, filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1 space-y-1">
            <label className="block text-sm font-medium" htmlFor="mba-search">
              {t("mba_search_label")}
            </label>
            <input
              id="mba-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("mba_search_placeholder")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium" htmlFor="mba-filter">
              {t("mba_filter_label")}
            </label>
            <select
              id="mba-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {FILTERS.map((f) => (
                <option key={f} value={f}>
                  {t(`mba_filter_${f}`)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
          >
            {t("mba_refresh")}
          </button>
        </div>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-border/60 bg-card">
        {loading ? (
          <p className="p-5 text-sm text-muted-foreground">{t("mb_admin_loading")}</p>
        ) : books.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">{t("mba_empty")}</p>
        ) : (
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-border/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("mba_col_user")}</th>
                <th className="px-4 py-3">{t("mba_col_book")}</th>
                <th className="px-4 py-3">{t("mba_col_status")}</th>
                <th className="px-4 py-3">{t("mba_col_package")}</th>
                <th className="px-4 py-3">{t("mba_col_dates")}</th>
                <th className="px-4 py-3">{t("mba_col_backup")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr key={b.id} className="border-b border-border/40 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium">{b.email ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{b.userId}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{b.id}</td>
                  <td className="px-4 py-3">
                    {b.status === "completed" ? t("mba_status_completed") : t("mba_status_draft")}
                  </td>
                  <td className="px-4 py-3">
                    {b.packageCode} · {b.leaves}/{b.internalPages}/{b.videoCapacity}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div>
                      {t("mba_created")}: {date(b.createdAt)}
                    </div>
                    <div>
                      {t("mba_expires")}: {date(b.expiresAt)}
                    </div>
                    <div>
                      {t("mba_kept_until")}: {date(b.retentionExpiresAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {b.backupProblem ? (
                      <span className="text-destructive">{t("mba_backup_problem")}</span>
                    ) : (
                      <span className="text-emerald-600">{t("mba_backup_ok")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => setSelected(selected === b.id ? null : b.id)}
                        className="rounded-md border border-border px-3 py-1 text-xs font-medium"
                      >
                        {selected === b.id ? t("mba_close") : t("mba_details")}
                      </button>
                      <Link
                        to="/memory-book-preview"
                        search={{ book: b.id }}
                        target="_blank"
                        className="rounded-md border border-border px-3 py-1 text-center text-xs text-muted-foreground"
                      >
                        {t("mba_open_readonly")}
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {selected && <BookDetail bookId={selected} onChanged={load} />}
    </div>
  );
}

/** Storage picture of one book, plus the per-area admin actions. */
function BookDetail({ bookId, onChanged }: { bookId: string; onChanged: () => void }) {
  const { t } = useI18n();
  const read = useServerFn(adminMemoryBookDetail);
  const setRetention = useServerFn(adminSetBookRetention);
  const deleteCopies = useServerFn(adminDeleteBookProviderCopies);
  const restore = useServerFn(adminRestoreBookFromReserve);
  const retry = useServerFn(adminRetryBookBackups);

  const [detail, setDetail] = useState<AdminBookDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [dates, setDates] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    read({ data: { bookId } })
      .then((res) => {
        setDetail(res.detail);
        const next: Record<string, string> = {};
        for (const p of res.detail?.providers ?? []) {
          next[p.provider] = p.deleteAfter ? p.deleteAfter.slice(0, 10) : "";
        }
        setDates(next);
      })
      .catch(() => setDetail(null));
  }, [read, bookId]);

  useEffect(() => {
    load();
  }, [load]);

  const problems = useMemo(
    () => (detail?.objects ?? []).filter((o) => o.status !== "present" && o.status !== "deleted"),
    [detail],
  );

  if (!detail) {
    return (
      <section className="rounded-2xl border border-border/60 bg-card p-5 text-sm text-muted-foreground">
        {t("mb_admin_loading")}
      </section>
    );
  }

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setNote(null);
    try {
      await action();
      setNote(message);
      load();
      onChanged();
    } catch {
      setNote(t("mba_action_failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-border/60 bg-card p-5">
      <header>
        <h3 className="font-display text-lg font-semibold">{t("mba_detail_title")}</h3>
        <p className="text-xs text-muted-foreground">
          {detail.book.email ?? "—"} · {detail.book.id}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{t("mba_detail_readonly_hint")}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {detail.providers.map((p) => (
          <div key={p.provider} className="rounded-xl border border-border/60 p-4">
            <h4 className="font-medium">
              {p.provider === "r2" ? t("mba_area_working") : t("mba_area_reserve")}
            </h4>
            <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div>
                {t("mba_objects")}: {p.presentObjects}/{p.objects}
              </div>
              <div>
                {t("mba_size")}: {bytes(p.totalBytes)}
              </div>
              <div>
                {t("mba_last_verified")}: {date(p.lastVerifiedAt)}
              </div>
              <div>
                {t("mba_problems")}: {p.problemObjects}
              </div>
            </dl>

            <div className="mt-3 space-y-2">
              <label className="block text-xs font-medium" htmlFor={`ret-${p.provider}`}>
                {t("mba_retention_label")}
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id={`ret-${p.provider}`}
                  type="date"
                  value={dates[p.provider] ?? ""}
                  onChange={(e) => setDates((d) => ({ ...d, [p.provider]: e.target.value }))}
                  className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () =>
                        setRetention({
                          data: {
                            bookId,
                            provider: p.provider,
                            deleteAfter: dates[p.provider]
                              ? new Date(`${dates[p.provider]}T00:00:00Z`).toISOString()
                              : null,
                          },
                        }),
                      t("mba_saved"),
                    )
                  }
                  className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                >
                  {t("mb_admin_save")}
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const answer = window.prompt(t("mba_delete_confirm_prompt"), "");
                if (answer !== bookId) return;
                void run(
                  () =>
                    deleteCopies({
                      data: { bookId, provider: p.provider, confirm: answer },
                    }),
                  t("mba_deleted"),
                );
              }}
              className="mt-3 w-full rounded-md border border-destructive/60 px-3 py-1.5 text-xs font-medium text-destructive"
            >
              {p.provider === "r2" ? t("mba_delete_working") : t("mba_delete_reserve")}
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(() => restore({ data: { bookId } }), t("mba_restored"))}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
        >
          {t("mba_restore")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(() => retry({ data: { bookId } }), t("mba_retried"))}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
        >
          {t("mba_retry_backup")}
        </button>
        {note && <span className="self-center text-sm text-emerald-600">{note}</span>}
      </div>

      {problems.length > 0 && (
        <div>
          <h4 className="text-sm font-medium">{t("mba_problem_files")}</h4>
          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto text-xs text-muted-foreground">
            {problems.map((o) => (
              <li key={`${o.provider}-${o.objectKey}`} className="break-all">
                {o.provider} · {o.status} · {o.objectKey}
                {o.lastError ? ` · ${o.lastError}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
