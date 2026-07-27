import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { getPublicCatalogCards, type PublicCatalogCard } from "@/lib/public-catalog.functions";
import { PublicCardText } from "@/components/card/PublicCardText";
import { CardLightbox, type LightboxCard } from "@/components/card/CardLightbox";
import { Search, X, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/catalog")({
  validateSearch: (search: Record<string, unknown>) => ({
    occasion:
      typeof search.occasion === "string" && search.occasion.length > 0
        ? search.occasion
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Greeting Catalog — Project Joy" },
      { name: "description", content: "Browse hundreds of premium digital greeting designs across every occasion." },
      { property: "og:title", content: "Greeting Catalog — Project Joy" },
      { property: "og:description", content: "Browse premium digital greeting designs by occasion, style, and language." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CatalogPage,
});

const gradients = [
  "linear-gradient(160deg, oklch(0.9 0.09 55), oklch(0.6 0.15 30))",
  "linear-gradient(160deg, oklch(0.86 0.11 20), oklch(0.5 0.15 10))",
  "linear-gradient(160deg, oklch(0.9 0.08 90), oklch(0.6 0.13 65))",
  "linear-gradient(160deg, oklch(0.85 0.08 340), oklch(0.5 0.12 340))",
  "linear-gradient(160deg, oklch(0.88 0.09 150), oklch(0.5 0.11 165))",
  "linear-gradient(160deg, oklch(0.85 0.07 240), oklch(0.4 0.09 260))",
  "linear-gradient(160deg, oklch(0.9 0.07 45), oklch(0.42 0.11 30))",
  "linear-gradient(160deg, oklch(0.88 0.1 75), oklch(0.55 0.14 55))",
  "linear-gradient(160deg, oklch(0.85 0.05 200), oklch(0.5 0.08 220))",
];

type CardRow = {
  id: string;
  internal_name: string;
  status: string;
  is_hidden: boolean | null;
  is_archived: boolean | null;
  deleted_at: string | null;
  background: PublicCatalogCard["background"];
  primary_occasion: PublicCatalogCard["primary_occasion"];
  additional: PublicCatalogCard["additional"];
  facets?: string[];
  translations: { language_code: string; title: string | null; greeting_text: string | null }[];
  text_designs?: PublicCatalogCard["text_designs"];
};

type OccasionRow = { id: string; slug: string };

// Occasion keys always resolve to the stable database slug, never to a
// translated label. UI prefixes (ev_/occ_/cat_) and hyphens are stripped so the
// same URL resolves identically in every interface language.
const OCCASION_ALIASES: Record<string, string> = {
  love_you: "i_love_you",
  miss_you: "i_miss_you",
  sorry: "forgive_me",
  apology: "forgive_me",
  safe_trip: "safe_travels",
  great_weekend: "happy_weekend",
  morning: "good_morning",
  night: "good_night",
};

const normalizeOccasionSlug = (value: string) => {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/^(ev|occ|cat)_/, "");
  return OCCASION_ALIASES[base] ?? base;
};

/** Cards are rendered in their stored aspect ratio — never cropped or stretched. */
const aspectOf = (card: CardRow) => {
  const w = card.background?.width ?? 0;
  const h = card.background?.height ?? 0;
  if (w > 0 && h > 0) return `${w}:${h}`;
  const o = card.background?.orientation;
  if (o === "square") return "1:1";
  if (o === "horizontal") return "5:4";
  return "4:5";
};

const PAGE_SIZE = 48;

const logCatalogDebug = (label: string, payload: unknown) => {
  if (typeof window === "undefined") return;
  console.info(`[Catalog debug] ${label}`, payload);
};

const logCatalogError = (label: string, payload: unknown) => {
  if (typeof window === "undefined") return;
  console.error(`[Catalog debug] ${label}`, payload);
};

function CatalogPage() {
  const { t, lang } = useI18n();
  const { occasion: rawOccasion } = Route.useSearch();
  const occasion = rawOccasion ? normalizeOccasionSlug(rawOccasion) : undefined;
  const navigate = useNavigate({ from: "/catalog" });
  const [active, setActive] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [preview, setPreview] = useState<LightboxCard | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const occasionsQuery = useQuery({
    queryKey: ["public-occasions"],
    queryFn: async (): Promise<OccasionRow[]> => {
      const { data, error } = await supabase
        .from("catalog_occasions")
        .select("id, slug")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const cardsQuery = useQuery({
    queryKey: ["public-catalog-cards"],
    queryFn: async (): Promise<CardRow[]> => {
      logCatalogDebug("catalog_card_variants server query filters", {
        status: "published",
        is_hidden: "false or null",
        is_archived: "false or null",
        deleted_at: null,
        note: "Rows logged here are returned by the database before client-side occasion/search filtering.",
      });
      const cards = await getPublicCatalogCards();

      logCatalogDebug(
        "assembled catalog rows before client filtering",
        cards.map((card) => ({
          id: card.id,
          internal_name: card.internal_name,
          status: card.status,
          is_hidden: card.is_hidden,
          is_archived: card.is_archived,
          deleted_at: card.deleted_at,
          primary_slug: card.primary_occasion?.slug ?? null,
          additional_slugs: card.additional.map((row) => row.occasion?.slug).filter(Boolean),
          translation_languages: card.translations.map((row) => row.language_code),
          background: card.background,
        })),
      );

      return cards;
    },
  });

  const occasionSlugs = useMemo(
    () => (occasionsQuery.data ?? []).map((o) => o.slug),
    [occasionsQuery.data],
  );

  const cards = cardsQuery.data ?? [];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const seen = new Set<string>();
    return cards.filter((c) => {
      // Deduplicate by catalog card id: multi-category cards appear once in "All".
      if (seen.has(c.id)) return false;
      const slugs = [
        c.primary_occasion?.slug,
        ...c.additional.map((a) => a.occasion?.slug),
      ]
        .filter(Boolean)
        .map((slug) => normalizeOccasionSlug(slug as string));
      // Facets carry category / theme / season / recipient ids and slugs from the DB.
      const keys = [...slugs, ...(c.facets ?? []).map((f) => normalizeOccasionSlug(f))];
      if (occasion && !keys.includes(occasion)) return false;
      if (active !== "all" && !keys.includes(normalizeOccasionSlug(active))) return false;
      if (q) {
        const tr = c.translations.find((x) => x.language_code === lang) ?? c.translations[0];
        const hay = [c.internal_name, tr?.title, tr?.greeting_text]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      seen.add(c.id);
      return true;
    });
  }, [cards, occasion, active, query, lang]);

  const isAllView = !occasion && active === "all";
  const shown = visible.slice(0, limit);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [occasion, active, query]);

  // Continuous (infinite) loading rather than discrete pages.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setLimit((n) => n + PAGE_SIZE);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [shown.length]);

  const openPreview = useCallback(
    (card: CardRow, gradient: string, text: string) =>
      setPreview({
        id: card.id,
        imageUrl: card.background?.image_url ?? null,
        gradient,
        aspectRatio: aspectOf(card),
        text,
        designs: card.text_designs,
      }),
    [],
  );

  useEffect(() => {
    if (cardsQuery.isLoading) return;
    const q = query.trim().toLowerCase();
    logCatalogDebug(
      "client filter evaluation",
      cards.map((card) => {
        const slugs = [card.primary_occasion?.slug, ...card.additional.map((row) => row.occasion?.slug)]
          .filter(Boolean)
          .map((slug) => normalizeOccasionSlug(slug as string));
        const tr = card.translations.find((row) => row.language_code === lang) ?? card.translations[0];
        const haystack = [card.internal_name, tr?.title, tr?.greeting_text]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const checks = {
          status: card.status === "published",
          hidden: card.is_hidden !== true,
          archived: card.is_archived !== true,
          deleted: card.deleted_at === null,
          occasion: !occasion || slugs.includes(occasion),
          activeChip: active === "all" || slugs.includes(normalizeOccasionSlug(active)),
          language: !q || Boolean(tr),
          search: !q || haystack.includes(q),
        };
        return {
          id: card.id,
          internal_name: card.internal_name,
          slugs,
          selected_occasion: occasion ?? null,
          active_chip: active,
          translation_languages: card.translations.map((row) => row.language_code),
          checks,
          visible: Object.values(checks).every(Boolean),
        };
      }),
    );
  }, [active, cards, cardsQuery.isLoading, lang, occasion, query]);

  const clearOccasion = () =>
    navigate({ search: (prev: { occasion?: string }) => ({ ...prev, occasion: undefined }) });

  const loading = cardsQuery.isLoading || occasionsQuery.isLoading;
  const occasionLabel = (slug: string) => {
    const key = `cat_${slug}`;
    const translated = t(key);
    if (translated !== key) return translated;
    const alt = t(slug);
    if (alt !== slug) return alt;
    return slugLabel(slug, lang);
  };

  return (
    <SiteLayout>
      <PageHeader eyebrow={t("nav_catalog")} title={t("page_catalog_title")} subtitle={t("page_catalog_sub")}>
        <div className="flex flex-col gap-4">
          {occasion && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("nav_occasions")}:
              </span>
              <button
                type="button"
                onClick={clearOccasion}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-warm transition hover:opacity-90"
              >
                {occasionLabel(occasion)}
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("catalog_search_ph")}
              className="w-full rounded-full border border-border bg-card/70 py-2 pl-9 pr-4 text-sm text-foreground shadow-sm outline-none backdrop-blur transition placeholder:text-muted-foreground focus:border-primary/50"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActive("all")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${active === "all" ? "bg-primary text-primary-foreground" : "border border-border bg-card/70 text-foreground/80 hover:border-primary/40"}`}
            >
              {t("catalog_all")}
            </button>
            {occasionSlugs.map((slug) => (
              <button
                key={slug}
                onClick={() => setActive(slug)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${active === slug ? "bg-primary text-primary-foreground" : "border border-border bg-card/70 text-foreground/80 hover:border-primary/40"}`}
              >
                {occasionLabel(slug)}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        {loading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">…</p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-5 py-16 text-center">
            <p className="text-sm text-muted-foreground">{t("catalog_no_results")}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {occasion && (
                <button
                  type="button"
                  onClick={clearOccasion}
                  className="rounded-full border border-border bg-card/70 px-4 py-2 text-sm text-foreground/80 transition hover:border-primary/40"
                >
                  {t("catalog_all")}
                </button>
              )}
              <Link
                to="/studio"
                className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-5 py-2 text-sm font-medium text-primary-foreground shadow-warm transition hover:opacity-95"
              >
                <Sparkles className="h-4 w-4" />
                {t("cta_create_gift")}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div
              className={
                isAllView
                  ? "grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7"
                  : "grid grid-cols-2 gap-4 md:grid-cols-3"
              }
            >
              {shown.map((c, i) => {
                const tr = c.translations.find((x) => x.language_code === lang) ?? c.translations[0];
                const wish = tr?.greeting_text || t("catalog_card_wish");
                const gradient = gradients[i % gradients.length];
                const ratio = aspectOf(c);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => openPreview(c, gradient, wish)}
                    className="group relative block w-full overflow-hidden rounded-xl border border-border/60 bg-muted transition hover:-translate-y-0.5 hover:shadow-warm"
                    style={{ aspectRatio: ratio.replace(":", " / ") }}
                  >
                    {c.background?.thumb_url || c.background?.image_url ? (
                      <img
                        src={c.background.thumb_url ?? c.background.image_url ?? ""}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0" style={{ backgroundImage: gradient }} />
                    )}
                    <PublicCardText text={wish} designs={c.text_designs} lang={lang} aspectRatio={ratio} />
                  </button>
                );
              })}
            </div>
            <div ref={sentinelRef} className="h-12" />
          </>
        )}
      </section>

      {preview && (
        <CardLightbox
          card={preview}
          lang={lang}
          onClose={() => setPreview(null)}
          labels={{
            send: t("cta_send") !== "cta_send" ? t("cta_send") : "Send",
            download: t("cta_download") !== "cta_download" ? t("cta_download") : "Download",
            favorite: t("cta_favorite") !== "cta_favorite" ? t("cta_favorite") : "Favorite",
            close: t("close") !== "close" ? t("close") : "Close",
          }}
        />
      )}
    </SiteLayout>
  );
}