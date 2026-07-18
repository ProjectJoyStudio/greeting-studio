import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Mail,
  Sparkles,
  Music2,
  Video,
  Film,
  BookHeart,
  Clapperboard,
  Crown,
  Wand2,
  Save,
  RotateCcw,
  Clock,
  Coins,
  Check,
  Gift,
  User as UserIcon,
  Heart,
  CalendarHeart,
  Palette,
  Languages,
  MessageSquareHeart,
  Timer,
  Zap,
  Gauge,
  Layers,
  Upload,
  Bell,
  Loader2,
  BellRing,
  Smartphone,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { CreditModal } from "@/components/studio/CreditModal";
import {
  STUDIO_PRICING,
  computeEstimate,
  durationKey,
  humanizeSeconds,
  type Estimate,
  type QueueTier,
  type StudioGiftId,
} from "@/lib/studio/pricing";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Project Joy Studio — Create unforgettable gifts" },
      {
        name: "description",
        content:
          "Project Joy Studio — craft greeting cards, personal songs, videos, fairy tales and cartoons for the people you love.",
      },
      { property: "og:title", content: "Project Joy Studio" },
      {
        property: "og:description",
        content: "Give more than greetings. Give emotions.",
      },
    ],
  }),
  component: StudioPage,
});

type GiftId = StudioGiftId;

interface GiftOption {
  id: GiftId;
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
}

const GIFTS: GiftOption[] = [
  { id: "card", icon: Mail, titleKey: "gift_card", descKey: "gift_card_desc" },
  { id: "animated", icon: Sparkles, titleKey: "gift_animated", descKey: "gift_animated_desc" },
  { id: "song", icon: Music2, titleKey: "gift_song", descKey: "gift_song_desc" },
  { id: "video-greeting", icon: Video, titleKey: "gift_video_greeting", descKey: "gift_video_greeting_desc" },
  { id: "video-clip", icon: Film, titleKey: "gift_video_clip", descKey: "gift_video_clip_desc" },
  { id: "fairy-tale", icon: BookHeart, titleKey: "gift_fairy_tale", descKey: "gift_fairy_tale_desc" },
  { id: "cartoon", icon: Clapperboard, titleKey: "gift_cartoon", descKey: "gift_cartoon_desc" },
  { id: "premium", icon: Crown, titleKey: "gift_premium", descKey: "gift_premium_desc" },
];

const RELATIONSHIPS = [
  "mother", "father", "grandmother", "grandfather", "wife", "husband",
  "son", "daughter", "friend", "teacher", "boss", "child", "other",
] as const;
type RelationshipId = (typeof RELATIONSHIPS)[number];

const OCCASIONS = [
  "birthday", "wedding", "anniversary", "christmas", "new_year", "easter",
  "valentines", "mothers_day", "fathers_day", "graduation", "congrats",
  "thank_you", "apology", "good_morning", "good_night", "other",
] as const;
type OccasionId = (typeof OCCASIONS)[number];

const STYLES = [
  "warm", "elegant", "funny", "romantic",
  "christian", "poetic", "motivational", "formal",
] as const;
type StyleId = (typeof STYLES)[number];

const LANGUAGES = [
  { id: "en" as const, label: "English" },
  { id: "de" as const, label: "Deutsch" },
  { id: "ru" as const, label: "Русский" },
  { id: "uk" as const, label: "Українська" },
  { id: "fr" as const, label: "Français" },
  { id: "pl" as const, label: "Polski" },
];
type GiftLang = (typeof LANGUAGES)[number]["id"];

type NotifyMethod = "email" | "push" | "sms";
type Complexity = "simple" | "medium" | "complex";

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatDurationForPreparation(seconds: number, t: (k: string) => string): string {
  const { value, unitKey } = humanizeSeconds(seconds);
  return `${t("prep_about")} ${value} ${t(unitKey)}`;
}

function formatEstimatePrep(estimate: Estimate, t: (k: string) => string): string {
  if (estimate.humanCraft) {
    const min = estimate.humanCraftDaysMin ?? 3;
    const max = estimate.humanCraftDaysMax ?? 5;
    return `${t("prep_within_days")} ${min}–${max} ${t("unit_days")}`;
  }
  return formatDurationForPreparation(estimate.processingSeconds, t);
}

function baselineEstimateForCard(id: GiftId): Estimate {
  const spec = STUDIO_PRICING[id];
  const dur = spec.duration ? spec.duration.default : null;
  return computeEstimate(id, dur, "standard");
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PremiumDraft {
  projectType: string;
  description: string;
  desiredResult: string;
  approxDuration: string;
  characters: string;
  voice: string;
  music: string;
  scenes: string;
  special: string;
}

const emptyPremium: PremiumDraft = {
  projectType: "",
  description: "",
  desiredResult: "",
  approxDuration: "",
  characters: "",
  voice: "",
  music: "",
  scenes: "",
  special: "",
};

interface PremiumEstimate {
  credits: number;
  processingDaysMin: number;
  processingDaysMax: number;
  complexity: Complexity;
}

function computePremiumEstimate(d: PremiumDraft, tier: QueueTier): PremiumEstimate {
  const wordCount =
    (d.description + " " + d.desiredResult + " " + d.special).trim().split(/\s+/).filter(Boolean).length;
  const scenes = parseInt(d.scenes, 10) || 0;
  const characters = parseInt(d.characters, 10) || 0;
  const score = wordCount / 30 + scenes * 1.5 + characters * 1.2 + (d.voice ? 1 : 0) + (d.music ? 1 : 0);

  let complexity: Complexity = "simple";
  let baseCredits = 50;
  let daysMin = 3;
  let daysMax = 5;
  if (score >= 6) {
    complexity = "medium";
    baseCredits = 90;
    daysMin = 5;
    daysMax = 8;
  }
  if (score >= 12) {
    complexity = "complex";
    baseCredits = 160;
    daysMin = 7;
    daysMax = 12;
  }
  const mult = tier === "priority" ? 1.5 : 1;
  const timeMult = tier === "priority" ? 0.6 : 1;
  return {
    credits: Math.round(baseCredits * mult),
    processingDaysMin: Math.max(1, Math.round(daysMin * timeMult)),
    processingDaysMax: Math.max(2, Math.round(daysMax * timeMult)),
    complexity,
  };
}

interface OrderRecord {
  ref: string;
  gift: GiftOption;
  duration: number | null;
  episodes: number;
  tier: QueueTier;
  credits: number;
  prepLabel: string;
  notify: NotifyMethod;
}

function StudioPage() {
  const { t } = useI18n();
  const [gift, setGift] = useState<GiftId | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [tier, setTier] = useState<QueueTier>("standard");
  const [isSeries, setIsSeries] = useState(false);
  const [episodes, setEpisodes] = useState(1);
  const [recipientName, setRecipientName] = useState("");
  const [relationship, setRelationship] = useState<RelationshipId | null>(null);
  const [occasion, setOccasion] = useState<OccasionId | null>(null);
  const [style, setStyle] = useState<StyleId | null>(null);
  const [details, setDetails] = useState("");
  const [language, setLanguage] = useState<GiftLang>("en");
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [premium, setPremium] = useState<PremiumDraft>(emptyPremium);
  const [premiumEstimate, setPremiumEstimate] = useState<PremiumEstimate | null>(null);
  const [order, setOrder] = useState<OrderRecord | null>(null);

  const selectedGift = useMemo(() => GIFTS.find((g) => g.id === gift) ?? null, [gift]);
  const spec = gift ? STUDIO_PRICING[gift] : null;
  const supportsSeries = !!spec?.supportsSeries;
  const isPremium = gift === "premium";

  const handleGiftChange = (id: GiftId) => {
    setGift(id);
    const s = STUDIO_PRICING[id];
    setDuration(s.duration ? s.duration.default : null);
    setIsSeries(false);
    setEpisodes(1);
    setPremiumEstimate(null);
  };

  const effectiveEpisodes = supportsSeries && isSeries ? episodes : 1;

  const estimate = useMemo<Estimate | null>(
    () => (gift ? computeEstimate(gift, duration, tier, effectiveEpisodes) : null),
    [gift, duration, tier, effectiveEpisodes],
  );

  const reset = () => {
    setGift(null);
    setDuration(null);
    setTier("standard");
    setIsSeries(false);
    setEpisodes(1);
    setRecipientName("");
    setRelationship(null);
    setOccasion(null);
    setStyle(null);
    setDetails("");
    setLanguage("en");
    setPremium(emptyPremium);
    setPremiumEstimate(null);
  };

  const submitOrder = () => {
    if (!selectedGift) return;
    let credits = 0;
    let prepLabel = "—";
    if (isPremium) {
      if (!premiumEstimate) return;
      credits = premiumEstimate.credits;
      prepLabel = `${t("prep_within_days")} ${premiumEstimate.processingDaysMin}–${premiumEstimate.processingDaysMax} ${t("unit_days")}`;
    } else if (estimate) {
      credits = estimate.credits;
      prepLabel = formatEstimatePrep(estimate, t);
    } else {
      return;
    }
    const ref = "PJ-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    setOrder({
      ref,
      gift: selectedGift,
      duration,
      episodes: effectiveEpisodes,
      tier,
      credits,
      prepLabel,
      notify: "email",
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (order) {
    return (
      <SiteLayout>
        <OrderConfirmation
          order={order}
          onNotifyChange={(n) => setOrder({ ...order, notify: n })}
          onNewOrder={() => {
            reset();
            setOrder(null);
          }}
        />
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60 bg-warm-gradient">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-0 bg-gold-gradient opacity-[0.06] blur-3xl"
        />
        <div className="relative mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs font-medium uppercase tracking-widest text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {t("studio_eyebrow")}
          </span>
          <h1 className="mt-6 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
            {t("studio_hero_title_1")}
            <span className="block bg-gold-gradient bg-clip-text text-transparent">
              {t("studio_hero_title_2")}
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            {t("studio_hero_sub")}
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-10">
            <Step1 value={gift} onChange={handleGiftChange} />

            {isPremium && (
              <PremiumEstimator
                draft={premium}
                onChange={setPremium}
                tier={tier}
                onTier={setTier}
                estimate={premiumEstimate}
                onCalculate={() => setPremiumEstimate(computePremiumEstimate(premium, tier))}
              />
            )}

            {gift && !isPremium && (
              <DurationQueuePanel
                gift={gift}
                duration={duration}
                onDuration={setDuration}
                tier={tier}
                onTier={setTier}
                estimate={estimate!}
                supportsSeries={supportsSeries}
                isSeries={isSeries}
                onSeriesToggle={setIsSeries}
                episodes={episodes}
                onEpisodesChange={setEpisodes}
                maxEpisodes={spec?.maxEpisodes ?? 1}
              />
            )}

            <Step2
              name={recipientName}
              onName={setRecipientName}
              relationship={relationship}
              onRelationship={setRelationship}
            />
            <Step3 value={occasion} onChange={setOccasion} />
            <Step4 value={style} onChange={setStyle} />
            <Step5 value={details} onChange={setDetails} />
            <Step6 value={language} onChange={setLanguage} />
            <Step7
              gift={selectedGift}
              estimate={estimate}
              duration={duration}
              episodes={effectiveEpisodes}
              supportsSeries={supportsSeries}
              isSeries={isSeries}
              isPremium={isPremium}
              premiumEstimate={premiumEstimate}
              onReset={reset}
              onOpenCredits={() => setCreditModalOpen(true)}
              onSubmit={submitOrder}
            />
          </div>

          <aside className="min-w-0 lg:sticky lg:top-24 lg:h-fit">
            <LivePreview
              gift={selectedGift}
              estimate={estimate}
              duration={duration}
              episodes={effectiveEpisodes}
              isSeries={supportsSeries && isSeries}
              recipientName={recipientName}
              relationship={relationship}
              occasion={occasion}
              style={style}
              details={details}
              language={language}
            />
          </aside>
        </div>
      </section>

      <CreditModal open={creditModalOpen} onClose={() => setCreditModalOpen(false)} balance={0} />
    </SiteLayout>
  );
}

// ---------------------------------------------------------------------------
// Reusable step primitives
// ---------------------------------------------------------------------------

function StepShell({
  number,
  icon: Icon,
  titleKey,
  subKey,
  children,
}: {
  number: number;
  icon: LucideIcon;
  titleKey: string;
  subKey?: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-warm sm:p-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold-gradient text-primary-foreground shadow-warm">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-widest text-primary/80">
              {t("studio_step")} {number}
            </div>
            <h2 className="mt-0.5 truncate font-display text-xl font-semibold tracking-tight sm:text-2xl">
              {t(titleKey)}
            </h2>
          </div>
        </div>
      </header>
      {subKey && <p className="mt-3 text-sm text-muted-foreground">{t(subKey)}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition ${
        active
          ? "border-primary/50 bg-primary/10 text-foreground shadow-sm"
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {active && <Check className="h-3.5 w-3.5 text-primary" />}
      {children}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Step 1
// ---------------------------------------------------------------------------

function Step1({
  value,
  onChange,
}: {
  value: GiftId | null;
  onChange: (v: GiftId) => void;
}) {
  const { t } = useI18n();
  return (
    <StepShell number={1} icon={Gift} titleKey="studio_s1_title" subKey="studio_s1_sub">
      <div className="grid gap-4 sm:grid-cols-2">
        {GIFTS.map((g) => {
          const Icon = g.icon;
          const active = value === g.id;
          const est = baselineEstimateForCard(g.id);
          const isPremium = g.id === "premium";
          const prepLabel = isPremium
            ? t("studio_premium_custom_estimate")
            : formatEstimatePrep(est, t);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onChange(g.id)}
              className={`group relative flex flex-col rounded-2xl border p-5 text-left transition ${
                active
                  ? "border-primary/60 bg-primary/[0.04] shadow-warm"
                  : "border-border bg-background hover:border-primary/40 hover:bg-secondary/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${
                    active
                      ? "bg-gold-gradient text-primary-foreground shadow-warm"
                      : "bg-secondary text-primary"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="min-w-0 truncate font-display text-lg font-semibold tracking-tight">
                  {t(g.titleKey)}
                </h3>
                {active && <Check className="ml-auto h-4 w-4 text-primary" />}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{t(g.descKey)}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                {!isPremium && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-secondary/60 px-2.5 py-1 font-medium text-foreground/80">
                    <Coins className="h-3 w-3 text-primary" />
                    {est.credits} {t("studio_credits_word")}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {prepLabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{t("studio_calc_final_note")}</p>
    </StepShell>
  );
}

// ---------------------------------------------------------------------------
// Step 2..6 (unchanged)
// ---------------------------------------------------------------------------

function Step2({
  name,
  onName,
  relationship,
  onRelationship,
}: {
  name: string;
  onName: (v: string) => void;
  relationship: RelationshipId | null;
  onRelationship: (v: RelationshipId) => void;
}) {
  const { t } = useI18n();
  return (
    <StepShell number={2} icon={UserIcon} titleKey="studio_s2_title" subKey="studio_s2_sub">
      <div className="space-y-5">
        <div>
          <FieldLabel>{t("studio_s2_name_label")}</FieldLabel>
          <input
            value={name}
            onChange={(e) => onName(e.target.value)}
            placeholder={t("studio_s2_name_ph")}
            className="mt-2 w-full rounded-full border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/50"
          />
        </div>
        <div>
          <FieldLabel>{t("studio_s2_rel_label")}</FieldLabel>
          <div className="mt-3 flex flex-wrap gap-2">
            {RELATIONSHIPS.map((r) => (
              <Chip key={r} active={relationship === r} onClick={() => onRelationship(r)}>
                {t(`rel_${r}`)}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </StepShell>
  );
}

function Step3({
  value,
  onChange,
}: {
  value: OccasionId | null;
  onChange: (v: OccasionId) => void;
}) {
  const { t } = useI18n();
  return (
    <StepShell number={3} icon={CalendarHeart} titleKey="studio_s3_title" subKey="studio_s3_sub">
      <div className="flex flex-wrap gap-2">
        {OCCASIONS.map((o) => (
          <Chip key={o} active={value === o} onClick={() => onChange(o)}>
            {t(`occ_${o}`)}
          </Chip>
        ))}
      </div>
    </StepShell>
  );
}

function Step4({
  value,
  onChange,
}: {
  value: StyleId | null;
  onChange: (v: StyleId) => void;
}) {
  const { t } = useI18n();
  return (
    <StepShell number={4} icon={Palette} titleKey="studio_s4_title" subKey="studio_s4_sub">
      <div className="flex flex-wrap gap-2">
        {STYLES.map((s) => (
          <Chip key={s} active={value === s} onClick={() => onChange(s)}>
            {t(`style_${s}`)}
          </Chip>
        ))}
      </div>
    </StepShell>
  );
}

function Step5({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useI18n();
  return (
    <StepShell number={5} icon={MessageSquareHeart} titleKey="studio_s5_title" subKey="studio_s5_sub">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        placeholder={t("studio_s5_ph")}
        className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-4 text-sm leading-relaxed outline-none transition focus:border-primary/50"
      />
      <p className="mt-3 text-xs text-muted-foreground">
        {value.trim().length} {t("studio_s5_chars_suffix")}
      </p>
    </StepShell>
  );
}

function Step6({
  value,
  onChange,
}: {
  value: GiftLang;
  onChange: (v: GiftLang) => void;
}) {
  return (
    <StepShell number={6} icon={Languages} titleKey="studio_s6_title" subKey="studio_s6_sub">
      <div className="flex flex-wrap gap-2">
        {LANGUAGES.map((l) => (
          <Chip key={l.id} active={value === l.id} onClick={() => onChange(l.id)}>
            {l.label}
          </Chip>
        ))}
      </div>
    </StepShell>
  );
}

// ---------------------------------------------------------------------------
// Step 7 — Gift Summary
// ---------------------------------------------------------------------------

function Step7({
  gift,
  estimate,
  duration,
  episodes,
  supportsSeries,
  isSeries,
  isPremium,
  premiumEstimate,
  onReset,
  onOpenCredits,
  onSubmit,
}: {
  gift: GiftOption | null;
  estimate: Estimate | null;
  duration: number | null;
  episodes: number;
  supportsSeries: boolean;
  isSeries: boolean;
  isPremium: boolean;
  premiumEstimate: PremiumEstimate | null;
  onReset: () => void;
  onOpenCredits: () => void;
  onSubmit: () => void;
}) {
  const { t } = useI18n();
  const balance = 0;
  const creditsWord = t("studio_credits_word");

  let required = 0;
  let prepValue = "—";
  let creditsValue = "—";
  if (isPremium) {
    if (premiumEstimate) {
      required = premiumEstimate.credits;
      prepValue = `${t("prep_within_days")} ${premiumEstimate.processingDaysMin}–${premiumEstimate.processingDaysMax} ${t("unit_days")}`;
      creditsValue = `${premiumEstimate.credits} ${creditsWord}`;
    } else {
      prepValue = t("studio_premium_custom_estimate");
      creditsValue = t("studio_premium_custom_estimate");
    }
  } else if (gift && estimate) {
    required = estimate.credits;
    prepValue = formatEstimatePrep(estimate, t);
    creditsValue = `${estimate.credits} ${creditsWord}`;
  }

  const enough = balance >= required;
  const durationValue = !isPremium && gift && duration !== null ? t(durationKey(duration)) : null;
  const canSubmit = !!gift && (isPremium ? !!premiumEstimate : !!estimate);

  return (
    <StepShell number={7} icon={Sparkles} titleKey="studio_s7_title" subKey="studio_s7_sub">
      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryRow
          label={t("studio_sum_gift")}
          value={gift ? t(gift.titleKey) : t("studio_sum_not_chosen")}
        />
        {durationValue && <SummaryRow label={t("studio_sum_duration")} value={durationValue} />}
        {supportsSeries && isSeries && (
          <SummaryRow
            label={t("studio_series_episodes")}
            value={`${episodes} ${episodes === 1 ? t("studio_episode_word") : t("studio_episodes_word")}`}
          />
        )}
        <SummaryRow label={t("studio_sum_prep")} value={prepValue} />
        <SummaryRow label={t("studio_sum_credits_req")} value={creditsValue} />
        <SummaryRow label={t("studio_sum_balance")} value={`${balance} ${creditsWord}`} />
      </div>

      <p className="mt-4 text-xs text-muted-foreground">{t("studio_calc_disclaimer")}</p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onOpenCredits}
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("studio_need_credits")}
        </button>
        {gift && required > 0 && !enough && (
          <span className="text-xs text-muted-foreground">{t("studio_sum_topup")}</span>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground/80 transition hover:text-foreground"
        >
          <Save className="h-4 w-4" />
          {t("studio_save_draft")}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground/80 transition hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
          {t("studio_reset")}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-gold-gradient px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-warm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Wand2 className="h-4 w-4" />
          {t("studio_create_gift")}
        </button>
      </div>
    </StepShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 truncate font-display text-base font-medium">{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live Preview
// ---------------------------------------------------------------------------

function LivePreview({
  gift,
  estimate,
  duration,
  episodes,
  isSeries,
  recipientName,
  relationship,
  occasion,
  style,
  details,
  language,
}: {
  gift: GiftOption | null;
  estimate: Estimate | null;
  duration: number | null;
  episodes: number;
  isSeries: boolean;
  recipientName: string;
  relationship: RelationshipId | null;
  occasion: OccasionId | null;
  style: StyleId | null;
  details: string;
  language: GiftLang;
}) {
  const { t } = useI18n();
  const Icon = gift?.icon ?? Heart;
  const hasSelection = gift || recipientName || relationship || occasion || style || details;
  const langLabel = LANGUAGES.find((l) => l.id === language)?.label ?? "";

  return (
    <div className="rounded-3xl border border-border/70 bg-warm-gradient p-6 shadow-warm sm:p-8">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground backdrop-blur">
          <Sparkles className="h-3 w-3 text-primary" />
          {t("studio_preview_label")}
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">{langLabel}</span>
      </div>

      <div className="mt-6 rounded-3xl border border-border/70 bg-card p-6 shadow-warm">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold-gradient text-primary-foreground shadow-warm">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-primary/80">
              {gift ? t(gift.titleKey) : t("studio_preview_default_gift")}
            </div>
            <div className="mt-0.5 truncate font-display text-lg font-semibold tracking-tight">
              {occasion
                ? `${t("studio_preview_for")} ${t(`occ_${occasion}`)}`
                : t("studio_preview_choose_occasion")}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4 font-display">
          <div className="text-2xl italic leading-tight text-foreground">
            {recipientName ? (
              <>
                {t("studio_preview_dear")}{" "}
                <span className="bg-gold-gradient bg-clip-text text-transparent">
                  {recipientName}
                </span>
                ,
              </>
            ) : (
              <span className="text-muted-foreground/70">{t("studio_preview_dear_default")}</span>
            )}
          </div>
          <p className="text-sm italic leading-relaxed text-muted-foreground">
            {details.trim()
              ? `"${details.trim().slice(0, 260)}${details.trim().length > 260 ? "…" : ""}"`
              : t("studio_preview_default_body")}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {relationship && (
            <Tag>
              <Heart className="h-3 w-3 text-primary" />
              {t(`rel_${relationship}`)}
            </Tag>
          )}
          {style && <Tag>{t(`style_${style}`)}</Tag>}
          {gift && estimate && (
            <Tag>
              <Coins className="h-3 w-3 text-primary" />
              {estimate.credits} {t("studio_credits_word")}
            </Tag>
          )}
          {gift && duration !== null && (
            <Tag>
              <Timer className="h-3 w-3 text-primary" />
              {t(durationKey(duration))}
            </Tag>
          )}
          {isSeries && (
            <Tag>
              <Layers className="h-3 w-3 text-primary" />
              {episodes} {episodes === 1 ? t("studio_episode_word") : t("studio_episodes_word")}
            </Tag>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
          <span className="font-display text-sm italic text-muted-foreground">
            {t("studio_preview_with_love")}
          </span>
          <span className="text-xs font-medium text-muted-foreground">{t("brand")}</span>
        </div>
      </div>

      {!hasSelection && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t("studio_preview_hint")}
        </p>
      )}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-secondary/60 px-2.5 py-1 text-[11px] font-medium text-foreground/80">
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Duration slider + queue panel
// ---------------------------------------------------------------------------

function DurationSlider({
  allowed,
  value,
  onChange,
}: {
  allowed: number[];
  value: number;
  onChange: (v: number) => void;
}) {
  const { t } = useI18n();
  const idx = Math.max(0, allowed.indexOf(value));
  const trackRef = useRef<HTMLDivElement>(null);

  const setByIndex = (i: number) => {
    const clamped = Math.max(0, Math.min(allowed.length - 1, i));
    onChange(allowed[clamped]);
  };

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("studio_duration_title")}
        </span>
        <span className="font-display text-lg font-semibold text-foreground">
          {t(durationKey(value))}
        </span>
      </div>

      <div ref={trackRef} className="relative mt-4 py-4">
        <input
          type="range"
          min={0}
          max={allowed.length - 1}
          step={1}
          value={idx}
          onChange={(e) => setByIndex(Number(e.target.value))}
          aria-label={t("studio_duration_title")}
          className="w-full cursor-pointer accent-[hsl(var(--primary))]"
        />
        <div className="mt-3 flex justify-between px-1">
          {allowed.map((sec, i) => (
            <button
              key={sec}
              type="button"
              onClick={() => setByIndex(i)}
              className={`flex flex-col items-center gap-1 text-[10px] font-medium transition ${
                i === idx ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span
                className={`block h-1.5 w-1.5 rounded-full ${
                  i === idx ? "bg-primary" : "bg-border"
                }`}
              />
              {t(durationKey(sec))}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DurationQueuePanel({
  gift,
  duration,
  onDuration,
  tier,
  onTier,
  estimate,
  supportsSeries,
  isSeries,
  onSeriesToggle,
  episodes,
  onEpisodesChange,
  maxEpisodes,
}: {
  gift: GiftId;
  duration: number | null;
  onDuration: (v: number) => void;
  tier: QueueTier;
  onTier: (v: QueueTier) => void;
  estimate: Estimate;
  supportsSeries: boolean;
  isSeries: boolean;
  onSeriesToggle: (v: boolean) => void;
  episodes: number;
  onEpisodesChange: (v: number) => void;
  maxEpisodes: number;
}) {
  const { t } = useI18n();
  const spec = STUDIO_PRICING[gift];
  const allowed = spec.duration?.allowed ?? [];
  const showDuration = allowed.length > 0 && duration !== null;
  const prepLabel = formatEstimatePrep(estimate, t);

  return (
    <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-warm sm:p-8">
      {showDuration && (
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold-gradient text-primary-foreground shadow-warm">
              <Timer className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-widest text-primary/80">
                {t("studio_duration_title")}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{t("studio_duration_sub")}</p>
            </div>
          </div>
          <div className="mt-5">
            <DurationSlider allowed={allowed} value={duration!} onChange={onDuration} />
          </div>
        </div>
      )}

      {supportsSeries && (
        <div className="mt-8">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold-gradient text-primary-foreground shadow-warm">
              <Layers className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold uppercase tracking-widest text-primary/80">
                {t("studio_series_title")}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{t("studio_series_sub")}</p>
            </div>
            <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isSeries}
                onChange={(e) => onSeriesToggle(e.target.checked)}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
              <span className="text-foreground/80">{t("studio_series_toggle")}</span>
            </label>
          </div>
          {isSeries && (
            <div className="mt-5 flex flex-wrap gap-2">
              {Array.from({ length: Math.max(1, maxEpisodes - 1) }, (_, i) => i + 2).map((n) => (
                <Chip key={n} active={episodes === n} onClick={() => onEpisodesChange(n)}>
                  {n} {t("studio_episodes_word")}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold-gradient text-primary-foreground shadow-warm">
            <Gauge className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-widest text-primary/80">
              {t("studio_queue_title")}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{t("studio_queue_sub")}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <QueueCard
            active={tier === "standard"}
            onClick={() => onTier("standard")}
            icon={Clock}
            titleKey="studio_queue_standard"
            descKey="studio_queue_standard_desc"
          />
          <QueueCard
            active={tier === "priority"}
            onClick={() => onTier("priority")}
            icon={Zap}
            titleKey="studio_queue_priority"
            descKey="studio_queue_priority_desc"
          />
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-border/70 bg-background p-5">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("studio_calc_title")}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <EstimateRow
            label={t("studio_calc_credits")}
            value={`${estimate.credits} ${t("studio_credits_word")}`}
          />
          <EstimateRow label={t("studio_calc_prep")} value={prepLabel} />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{t("studio_calc_disclaimer")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("studio_calc_final_note")}</p>
      </div>
    </section>
  );
}

function QueueCard({
  active,
  onClick,
  icon: Icon,
  titleKey,
  descKey,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col rounded-2xl border p-4 text-left transition ${
        active
          ? "border-primary/60 bg-primary/[0.04] shadow-warm"
          : "border-border bg-background hover:border-primary/40 hover:bg-secondary/40"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`grid h-8 w-8 place-items-center rounded-lg ${
            active ? "bg-gold-gradient text-primary-foreground shadow-warm" : "bg-secondary text-primary"
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="font-display text-base font-semibold tracking-tight">{t(titleKey)}</span>
        {active && <Check className="ml-auto h-4 w-4 text-primary" />}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t(descKey)}</p>
    </button>
  );
}

function EstimateRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-display text-sm font-medium">{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Premium estimator
// ---------------------------------------------------------------------------

function PremiumEstimator({
  draft,
  onChange,
  tier,
  onTier,
  estimate,
  onCalculate,
}: {
  draft: PremiumDraft;
  onChange: (v: PremiumDraft) => void;
  tier: QueueTier;
  onTier: (v: QueueTier) => void;
  estimate: PremiumEstimate | null;
  onCalculate: () => void;
}) {
  const { t } = useI18n();
  const set = <K extends keyof PremiumDraft>(k: K, v: string) => onChange({ ...draft, [k]: v });

  return (
    <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-warm sm:p-8">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold-gradient text-primary-foreground shadow-warm">
          <Crown className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary/80">
            {t("studio_premium_intro_title")}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("studio_premium_intro_sub")}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <PremiumField
          label={t("studio_premium_field_type")}
          value={draft.projectType}
          onChange={(v) => set("projectType", v)}
          placeholder={t("studio_premium_field_type_ph")}
        />
        <PremiumField
          label={t("studio_premium_field_duration")}
          value={draft.approxDuration}
          onChange={(v) => set("approxDuration", v)}
          placeholder={t("studio_premium_field_duration_ph")}
        />
        <PremiumField
          label={t("studio_premium_field_chars")}
          value={draft.characters}
          onChange={(v) => set("characters", v)}
          placeholder="1, 2, 3…"
        />
        <PremiumField
          label={t("studio_premium_field_scenes")}
          value={draft.scenes}
          onChange={(v) => set("scenes", v)}
          placeholder="1, 2, 3…"
        />
        <PremiumField
          label={t("studio_premium_field_voice")}
          value={draft.voice}
          onChange={(v) => set("voice", v)}
        />
        <PremiumField
          label={t("studio_premium_field_music")}
          value={draft.music}
          onChange={(v) => set("music", v)}
        />
      </div>

      <div className="mt-5 grid gap-5">
        <PremiumTextarea
          label={t("studio_premium_field_desc")}
          value={draft.description}
          onChange={(v) => set("description", v)}
          placeholder={t("studio_premium_field_desc_ph")}
        />
        <PremiumTextarea
          label={t("studio_premium_field_result")}
          value={draft.desiredResult}
          onChange={(v) => set("desiredResult", v)}
          placeholder={t("studio_premium_field_result_ph")}
        />
        <PremiumTextarea
          label={t("studio_premium_field_special")}
          value={draft.special}
          onChange={(v) => set("special", v)}
          placeholder={t("studio_premium_field_special_ph")}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-border/80 bg-background p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-primary">
            <Upload className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("studio_premium_upload_label")}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("studio_premium_upload_hint")}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="text-xs font-semibold uppercase tracking-widest text-primary/80">
          {t("studio_queue_title")}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <QueueCard
            active={tier === "standard"}
            onClick={() => onTier("standard")}
            icon={Clock}
            titleKey="studio_queue_standard"
            descKey="studio_queue_standard_desc"
          />
          <QueueCard
            active={tier === "priority"}
            onClick={() => onTier("priority")}
            icon={Zap}
            titleKey="studio_queue_priority"
            descKey="studio_queue_priority_desc"
          />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onCalculate}
          className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-warm transition hover:opacity-95"
        >
          <Wand2 className="h-4 w-4" />
          {t("studio_premium_calculate")}
        </button>
      </div>

      {estimate && (
        <div className="mt-6 rounded-2xl border border-border/70 bg-background p-5">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t("studio_premium_est_title")}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <EstimateRow
              label={t("studio_calc_credits")}
              value={`${estimate.credits} ${t("studio_credits_word")}`}
            />
            <EstimateRow
              label={t("studio_calc_prep")}
              value={`${t("prep_within_days")} ${estimate.processingDaysMin}–${estimate.processingDaysMax} ${t("unit_days")}`}
            />
            <EstimateRow
              label={t("studio_premium_est_complexity")}
              value={t(`complexity_${estimate.complexity}`)}
            />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{t("studio_calc_disclaimer")}</p>
        </div>
      )}
    </section>
  );
}

function PremiumField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-full border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/50"
      />
    </div>
  );
}

function PremiumTextarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="mt-2 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/50"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Order confirmation screen
// ---------------------------------------------------------------------------

const STATUS_STEPS: { key: string; icon: LucideIcon }[] = [
  { key: "status_received", icon: Check },
  { key: "status_waiting", icon: Clock },
  { key: "status_preparing", icon: Loader2 },
  { key: "status_creating", icon: Sparkles },
  { key: "status_final_check", icon: Gauge },
  { key: "status_completed", icon: Gift },
];

function OrderConfirmation({
  order,
  onNotifyChange,
  onNewOrder,
}: {
  order: OrderRecord;
  onNotifyChange: (n: NotifyMethod) => void;
  onNewOrder: () => void;
}) {
  const { t } = useI18n();
  const currentStep = 0; // freshly received

  return (
    <section className="mx-auto max-w-5xl px-5 py-16 lg:px-8 lg:py-20">
      <div className="rounded-3xl border border-border/70 bg-card p-8 shadow-warm sm:p-10">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-gradient text-primary-foreground shadow-warm">
            <Check className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {t("confirm_title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("confirm_sub")}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <SummaryRow label={t("confirm_ref")} value={order.ref} />
          <SummaryRow label={t("studio_sum_gift")} value={t(order.gift.titleKey)} />
          {order.duration !== null && (
            <SummaryRow label={t("studio_sum_duration")} value={t(durationKey(order.duration))} />
          )}
          {order.episodes > 1 && (
            <SummaryRow
              label={t("studio_series_episodes")}
              value={`${order.episodes} ${t("studio_episodes_word")}`}
            />
          )}
          <SummaryRow
            label={t("studio_sum_credits_req")}
            value={`${order.credits} ${t("studio_credits_word")}`}
          />
          <SummaryRow label={t("studio_sum_prep")} value={order.prepLabel} />
          <SummaryRow
            label={t("studio_queue_title")}
            value={t(order.tier === "priority" ? "studio_queue_priority" : "studio_queue_standard")}
          />
        </div>

        {/* Status progress */}
        <div className="mt-10">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary/80">
            {t("confirm_status_label")}
          </div>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {STATUS_STEPS.map((s, i) => {
              const isDone = i < currentStep;
              const isCurrent = i === currentStep;
              const Icon = s.icon;
              return (
                <li
                  key={s.key}
                  className={`flex items-center gap-3 rounded-2xl border p-3 ${
                    isCurrent
                      ? "border-primary/60 bg-primary/[0.05]"
                      : isDone
                        ? "border-border bg-secondary/40"
                        : "border-border/70 bg-background"
                  }`}
                >
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-lg ${
                      isCurrent || isDone
                        ? "bg-gold-gradient text-primary-foreground shadow-warm"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isCurrent && s.key === "status_preparing" ? "animate-spin" : ""}`} />
                  </span>
                  <span
                    className={`text-sm ${
                      isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {t(s.key)}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Notification preferences */}
        <div className="mt-10 rounded-2xl border border-border/70 bg-background p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary/80">
            <Bell className="h-3.5 w-3.5" />
            {t("confirm_notify_method")}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("confirm_notify_prompt")}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <NotifyOption
              active={order.notify === "email"}
              onClick={() => onNotifyChange("email")}
              icon={Mail}
              labelKey="notif_email"
            />
            <NotifyOption
              active={order.notify === "push"}
              onClick={() => onNotifyChange("push")}
              icon={BellRing}
              labelKey="notif_push"
            />
            <NotifyOption
              active={order.notify === "sms"}
              onClick={() => onNotifyChange("sms")}
              icon={Smartphone}
              labelKey="notif_sms"
              soonKey="notif_sms_future"
            />
          </div>

          <div className="mt-5 rounded-xl border border-dashed border-border/80 bg-card p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" />
              {t("notif_preview_label")}
            </div>
            <p className="mt-2 text-sm italic text-foreground/80">
              {order.notify === "email" && `"${t("notif_email_ready")}"`}
              {order.notify === "push" && `"${t("notif_push_ready")}"`}
              {order.notify === "sms" && `"${t("notif_sms_ready")}"`}
            </p>
          </div>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">{t("confirm_leave_note")}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/dashboard/orders"
            className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-warm transition hover:opacity-95"
          >
            {t("confirm_view_orders")}
          </Link>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground/80 transition hover:text-foreground"
          >
            {t("confirm_browse_catalog")}
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground/80 transition hover:text-foreground"
          >
            {t("confirm_return_home")}
          </Link>
          <button
            type="button"
            onClick={onNewOrder}
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground/80 transition hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            {t("studio_reset")}
          </button>
        </div>
      </div>
    </section>
  );
}

function NotifyOption({
  active,
  onClick,
  icon: Icon,
  labelKey,
  soonKey,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  labelKey: string;
  soonKey?: string;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-2xl border p-3 text-left transition ${
        active
          ? "border-primary/60 bg-primary/[0.04] shadow-warm"
          : "border-border bg-background hover:border-primary/40 hover:bg-secondary/40"
      }`}
    >
      <span
        className={`grid h-8 w-8 place-items-center rounded-lg ${
          active ? "bg-gold-gradient text-primary-foreground shadow-warm" : "bg-secondary text-primary"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium">{t(labelKey)}</span>
      {soonKey && (
        <span className="rounded-full border border-border/70 bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t(soonKey)}
        </span>
      )}
      {active && <Check className="h-4 w-4 text-primary" />}
    </button>
  );
}

// Silence unused useEffect import if tree-shaking complains
export const _keep = { useEffect };
