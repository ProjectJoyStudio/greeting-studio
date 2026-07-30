import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { listAdminActivity, type AdminActivityRow } from "@/lib/admin/deleted-cards.functions";

export function ActivityLogPage() {
  const { t, lang } = useI18n();
  const fetchLog = useServerFn(listAdminActivity);
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("");
  const [detail, setDetail] = useState<AdminActivityRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-activity-log"],
    queryFn: () => fetchLog({ data: undefined }),
  });

  const rows = data ?? [];
  const actions = useMemo(() => Array.from(new Set(rows.map((r) => r.action))).sort(), [rows]);
  const filtered = rows.filter((r) => {
    if (action && r.action !== action) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return [r.action, r.actor_email, r.affected_email, r.entity_id, r.entity_type]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  return (
    <div>
      <h1 className="font-[Fraunces] text-2xl font-semibold text-foreground">{t("al_title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("al_sub")}</p>

      <div className="mt-5 flex flex-wrap gap-3">
        <label className="inline-flex flex-1 min-w-[220px] items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("al_search")}
            className="w-full bg-transparent text-sm text-foreground outline-none"
          />
        </label>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="rounded-full border border-border/60 bg-background px-4 py-2 text-sm text-foreground"
        >
          <option value="">{t("al_all_actions")}</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("dc_loading")}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border/60 bg-card/70 p-8 text-center text-sm text-muted-foreground">
          {t("al_empty")}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border/60 bg-card/70">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="border-b border-border/60 text-muted-foreground">
              <tr>
                <th className="p-3">{t("al_when")}</th>
                <th className="p-3">{t("al_actor")}</th>
                <th className="p-3">{t("al_action")}</th>
                <th className="p-3">{t("al_affected")}</th>
                <th className="p-3">{t("al_entity")}</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-border/40 last:border-0">
                  <td className="p-3 text-muted-foreground">{new Date(row.created_at).toLocaleString(lang)}</td>
                  <td className="p-3 text-foreground">{row.actor_email ?? "—"}</td>
                  <td className="p-3 font-medium text-foreground">{row.action}</td>
                  <td className="p-3 text-muted-foreground">{row.affected_email ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">
                    {row.entity_type}
                    {row.entity_id ? ` · ${row.entity_id.slice(0, 8)}` : ""}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => setDetail(row)}
                      className="rounded-full border border-border/60 px-3 py-1.5 hover:bg-secondary"
                    >
                      {t("al_details")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-5 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-border/60 bg-card p-6 shadow-xl">
            <h3 className="font-[Fraunces] text-lg font-semibold text-foreground">{detail.action}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(detail.created_at).toLocaleString(lang)} · {detail.actor_email ?? "—"}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-medium text-foreground">{t("al_before")}</div>
                <pre className="max-h-60 overflow-auto rounded-lg border border-border/60 bg-background p-3 text-[11px] text-muted-foreground">
                  {detail.previous_data ?? "—"}
                </pre>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-foreground">{t("al_after")}</div>
                <pre className="max-h-60 overflow-auto rounded-lg border border-border/60 bg-background p-3 text-[11px] text-muted-foreground">
                  {detail.new_data ?? "—"}
                </pre>
              </div>
            </div>
            <div className="mt-5 text-right">
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-full border border-border/60 px-5 py-2.5 text-sm hover:bg-secondary"
              >
                {t("dc_close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}