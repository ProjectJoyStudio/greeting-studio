import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Plus, Trash2 } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import {
  HERO_FALLBACK_GRADIENTS,
  HERO_LINK_OPTIONS,
  createHeroCard,
  deleteHeroCard,
  fetchAllHeroCards,
  updateHeroCard,
  uploadHeroImage,
  type HeroCard,
} from "@/lib/hero-showcase/hero-cards";

export function HeroShowcasePage() {
  const { t } = useI18n();
  const [cards, setCards] = useState<HeroCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCards(await fetchAllHeroCards());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("hs_error"));
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
      setError(e instanceof Error ? e.message : t("hs_error"));
    } finally {
      setBusy(false);
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    const other = cards[index + dir];
    const cur = cards[index];
    if (!other || !cur) return;
    void run(async () => {
      await updateHeroCard(cur.id, { sort_order: other.sortOrder });
      await updateHeroCard(other.id, { sort_order: cur.sortOrder });
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[Fraunces] text-3xl font-semibold text-foreground">{t("hs_title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("hs_sub")}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{t("hs_limit_note")}</p>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(() => createHeroCard((cards[cards.length - 1]?.sortOrder ?? 0) + 1))
          }
          className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-4 py-2 text-sm font-medium text-primary-foreground shadow-warm transition hover:opacity-95 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {t("hs_add")}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("hs_loading")}</p>
      ) : cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("hs_empty")}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {cards.map((card, i) => (
            <HeroCardEditor
              key={card.id}
              card={card}
              index={i}
              total={cards.length}
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

function HeroCardEditor({
  card,
  index,
  total,
  busy,
  onMove,
  onRun,
}: {
  card: HeroCard;
  index: number;
  total: number;
  busy: boolean;
  onMove: (index: number, dir: -1 | 1) => void;
  onRun: (fn: () => Promise<void>) => Promise<void>;
}) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState(card.altText ?? "");

  useEffect(() => setAlt(card.altText ?? ""), [card.altText]);

  const gradient = card.gradient ?? HERO_FALLBACK_GRADIENTS[index % HERO_FALLBACK_GRADIENTS.length];

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
      <div className="flex items-start gap-4">
        <div
          className="h-32 w-24 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-cover bg-center"
          style={card.resolvedImage ? undefined : { backgroundImage: gradient }}
        >
          {card.resolvedImage && (
            <img
              src={card.resolvedImage}
              alt={alt || t("hs_image")}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("hs_card")} {index + 1}
            </span>
            <div className="flex items-center gap-1">
              <IconBtn
                label={t("hs_move_up")}
                disabled={busy || index === 0}
                onClick={() => onMove(index, -1)}
              >
                <ArrowUp className="h-4 w-4" />
              </IconBtn>
              <IconBtn
                label={t("hs_move_down")}
                disabled={busy || index === total - 1}
                onClick={() => onMove(index, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </IconBtn>
              <IconBtn
                label={t("hs_delete")}
                disabled={busy}
                onClick={() => onRun(() => deleteHeroCard(card.id))}
              >
                <Trash2 className="h-4 w-4" />
              </IconBtn>
            </div>
          </div>

          {!card.resolvedImage && (
            <p className="text-xs text-muted-foreground">{t("hs_no_image")}</p>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void onRun(() => uploadHeroImage(card.id, file));
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 disabled:opacity-60"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            {card.resolvedImage ? t("hs_replace") : t("hs_upload")}
          </button>

          <label className="block text-xs font-medium text-muted-foreground">
            {t("hs_destination")}
            <select
              value={card.linkTo}
              disabled={busy}
              onChange={(e) => onRun(() => updateHeroCard(card.id, { link_to: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {HERO_LINK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {t(o.labelKey)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-muted-foreground">
            {t("hs_alt")}
            <input
              value={alt}
              disabled={busy}
              onChange={(e) => setAlt(e.target.value)}
              onBlur={() => {
                if (alt !== (card.altText ?? "")) {
                  void onRun(() => updateHeroCard(card.id, { alt_text: alt || null }));
                }
              }}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>

          <button
            type="button"
            disabled={busy}
            onClick={() => onRun(() => updateHeroCard(card.id, { is_enabled: !card.isEnabled }))}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
              card.isEnabled
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-border bg-background text-muted-foreground"
            }`}
          >
            {card.isEnabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {card.isEnabled ? t("hs_enabled") : t("hs_disabled")}
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