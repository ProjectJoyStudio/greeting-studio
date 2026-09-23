import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { useI18n } from "@/lib/i18n";
import {
  adminListReadyDesigns,
  setReadyDesignHidden,
  type AdminReadyDesignItem,
} from "@/lib/memory-book/ready-designs.functions";

/** Management of the already uploaded ready-made designs of one stage. */
export function ReadyDesignsPanel({
  stage,
  onBack,
}: {
  stage: "cover" | "leaf";
  onBack: () => void;
}) {
  const { t } = useI18n();
  const list = useServerFn(adminListReadyDesigns);
  const setHidden = useServerFn(setReadyDesignHidden);
  const [items, setItems] = useState<AdminReadyDesignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    list({ data: { stage } })
      .then((res) => setItems(res.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [list, stage]);

  useEffect(refresh, [refresh]);

  async function toggle(item: AdminReadyDesignItem) {
    const next = !item.hidden;
    if (next && !window.confirm(t("mba_rd_hide_confirm"))) return;
    setBusy(item.path);
    setNote(null);
    const res = await setHidden({
      data: { stage, path: item.path, hidden: next },
    }).catch(() => ({ ok: false }));
    setBusy(null);
    if (res.ok) {
      setItems((prev) =>
        prev.map((i) => (i.path === item.path ? { ...i, hidden: next } : i)),
      );
      setNote(t("mba_saved"));
    } else {
      setNote(t("mba_action_failed"));
    }
  }

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {stage === "cover" ? t("mba_rd_covers_title") : t("mba_rd_leaves_title")}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={refresh}
            className="rounded-lg border border-border px-3 py-1.5 text-sm"
          >
            {t("mba_refresh")}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-border px-3 py-1.5 text-sm"
          >
            {t("mba_close")}
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t("mba_rd_hint")}</p>

      {note && <p className="mt-3 text-sm text-emerald-600">{note}</p>}

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("mb_admin_loading")}</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("mba_rd_empty")}</p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li
              key={item.path}
              className="overflow-hidden rounded-xl border border-border/60 bg-background"
            >
              <img
                src={item.url}
                alt={item.path}
                className={`h-40 w-full object-cover ${item.hidden ? "opacity-40" : ""}`}
                loading="lazy"
              />
              <div className="space-y-2 p-3">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                    item.hidden
                      ? "bg-muted text-muted-foreground"
                      : "bg-emerald-500/10 text-emerald-600"
                  }`}
                >
                  {item.hidden ? t("mba_rd_state_hidden") : t("mba_rd_state_active")}
                </span>
                <p className="break-all text-[11px] text-muted-foreground">{item.path}</p>
                <button
                  type="button"
                  disabled={busy === item.path}
                  onClick={() => void toggle(item)}
                  className="w-full rounded-lg border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                  {item.hidden ? t("mba_rd_return") : t("mba_rd_remove")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
