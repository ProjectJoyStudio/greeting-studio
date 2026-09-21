import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { useI18n } from "@/lib/i18n";
import {
  adminMemoryBookHistory,
  type AdminActionRow,
} from "@/lib/memory-book/admin-books.functions";

/** What administrators changed in the Memory Book storage area. */
export function MemoryBookHistoryPanel() {
  const { t } = useI18n();
  const read = useServerFn(adminMemoryBookHistory);
  const [entries, setEntries] = useState<AdminActionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    read({ data: { limit: 100 } })
      .then((res) => {
        if (active) setEntries(res.entries);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [read]);

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-6">
      <h2 className="font-display text-lg font-semibold">{t("mba_history_title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("mba_history_hint")}</p>
      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("mb_admin_loading")}</p>
      ) : entries.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("mba_history_empty")}</p>
      ) : (
        <ul className="mt-4 space-y-2 text-sm">
          {entries.map((e) => (
            <li key={e.id} className="rounded-lg border border-border/50 p-3">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-medium">{e.action}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(e.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {e.actorEmail ?? "—"}
                {e.entityId ? ` · ${e.entityId}` : ""}
              </div>
              {e.next && (
                <pre className="mt-1 overflow-x-auto text-[11px] text-muted-foreground">
                  {e.next}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
