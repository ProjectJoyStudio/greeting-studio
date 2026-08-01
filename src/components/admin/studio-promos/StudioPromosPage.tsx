import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Trash2, Upload } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import {
  deletePromoVideo,
  fetchAllPromoWindows,
  updatePromoWindow,
  uploadPromoVideo,
  type StudioPromoWindow,
} from "@/lib/studio-promos/promo-windows";

export function StudioPromosPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<StudioPromoWindow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchAllPromoWindows());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("spw_error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      await load();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("spw_error"));
    } finally {
      setBusy(false);
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    const cur = items[index];
    const other = items[index + dir];
    if (!cur || !other) return;
    void run(async () => {
      await updatePromoWindow(cur.id, { sort_order: other.sortOrder });
      await updatePromoWindow(other.id, { sort_order: cur.sortOrder });
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[Fraunces] text-3xl font-semibold text-foreground">
          {t("spw_admin_title")}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("spw_admin_sub")}</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("spw_loading")}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("spw_empty")}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item, i) => (
            <PromoEditor
              key={item.id}
              item={item}
              index={i}
              total={items.length}
              busy={busy}
              onMove={move}
              onRun={run}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PromoEditor({
  item,
  index,
  total,
  busy,
  onMove,
  onRun,
}: {
  item: StudioPromoWindow;
  index: number;
  total: number;
  busy: boolean;
  onMove: (index: number, dir: -1 | 1) => void;
  onRun: (fn: () => Promise<void>) => Promise<void>;
}) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(item.title);

  useEffect(() => setTitle(item.title), [item.title]);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
      <div className="flex items-start gap-4">
        <div className="h-28 w-40 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-secondary/50">
          {item.resolvedVideo ? (
            <video
              src={item.resolvedVideo}
              muted
              loop
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-center text-[11px] uppercase tracking-widest text-muted-foreground">
              {t("spw_coming_soon")}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("spw_window")} {index + 1}
            </span>
            <div className="flex items-center gap-1">
              <IconBtn
                label={t("spw_move_up")}
                disabled={busy || index === 0}
                onClick={() => onMove(index, -1)}
              >
                <ArrowUp className="h-4 w-4" />
              </IconBtn>
              <IconBtn
                label={t("spw_move_down")}
                disabled={busy || index === total - 1}
                onClick={() => onMove(index, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </IconBtn>
              <IconBtn
                label={t("spw_delete_video")}
                disabled={busy || !item.storagePath}
                onClick={() => onRun(() => deletePromoVideo(item))}
              >
                <Trash2 className="h-4 w-4" />
              </IconBtn>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/webm"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void onRun(() => uploadPromoVideo(item.id, file));
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 disabled:opacity-60"
          >
            <Upload className="h-3.5 w-3.5" />
            {item.resolvedVideo ? t("spw_replace_video") : t("spw_upload_video")}
          </button>
          <p className="text-xs text-muted-foreground">{t("spw_video_hint")}</p>

          <label className="block text-xs font-medium text-muted-foreground">
            {t("spw_title_label")}
            <input
              value={title}
              disabled={busy}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                const next = title.trim();
                if (next && next !== item.title) {
                  void onRun(() => updatePromoWindow(item.id, { title: next }));
                }
              }}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>

          <button
            type="button"
            disabled={busy}
            onClick={() => onRun(() => updatePromoWindow(item.id, { is_enabled: !item.isEnabled }))}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
              item.isEnabled
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-border bg-background text-muted-foreground"
            }`}
          >
            {item.isEnabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {item.isEnabled ? t("spw_visible") : t("spw_hidden")}
          </button>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background text-muted-foreground transition hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}