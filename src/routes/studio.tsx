import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  type LucideIcon,
} from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Project Joy Studio — Create unforgettable gifts" },
      {
        name: "description",
        content:
          "Project Joy Studio — the heart of the platform. Craft greeting cards, personal songs, videos, fairy tales and cartoons for the people you love.",
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

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type GiftId =
  | "card"
  | "animated"
  | "song"
  | "video-greeting"
  | "video-clip"
  | "fairy-tale"
  | "cartoon"
  | "premium";

interface GiftOption {
  id: GiftId;
  icon: LucideIcon;
  title: string;
  description: string;
  credits: number;
  prepTime: string;
}

const GIFTS: GiftOption[] = [
  {
    id: "card",
    icon: Mail,
    title: "Greeting Card",
    description: "A beautifully designed card with warm, personal wording.",
    credits: 1,
    prepTime: "Ready in minutes",
  },
  {
    id: "animated",
    icon: Sparkles,
    title: "Animated Greeting",
    description: "A living greeting with motion, music and heartfelt words.",
    credits: 3,
    prepTime: "Ready in under an hour",
  },
  {
    id: "song",
    icon: Music2,
    title: "Personal Song",
    description: "An original song written and performed just for them.",
    credits: 8,
    prepTime: "Ready within a few hours",
  },
  {
    id: "video-greeting",
    icon: Video,
    title: "Personal Video Greeting",
    description: "A cinematic video message crafted around their story.",
    credits: 10,
    prepTime: "Ready within a day",
  },
  {
    id: "video-clip",
    icon: Film,
    title: "Personal Video Clip",
    description: "A full music video created uniquely for the recipient.",
    credits: 18,
    prepTime: "Ready within 1–2 days",
  },
  {
    id: "fairy-tale",
    icon: BookHeart,
    title: "Personal Fairy Tale",
    description: "An enchanting fairy tale where they are the hero.",
    credits: 6,
    prepTime: "Ready within a few hours",
  },
  {
    id: "cartoon",
    icon: Clapperboard,
    title: "Personal Cartoon",
    description: "A charming animated short starring your loved one.",
    credits: 20,
    prepTime: "Ready within 1–2 days",
  },
  {
    id: "premium",
    icon: Crown,
    title: "Premium Personal Order",
    description: "A bespoke keepsake crafted by our creative concierge.",
    credits: 50,
    prepTime: "Delivered within 3–5 days",
  },
];

const RELATIONSHIPS = [
  "Mother",
  "Father",
  "Grandmother",
  "Grandfather",
  "Wife",
  "Husband",
  "Son",
  "Daughter",
  "Friend",
  "Teacher",
  "Boss",
  "Child",
  "Other",
] as const;

const OCCASIONS = [
  "Birthday",
  "Wedding",
  "Anniversary",
  "Christmas",
  "New Year",
  "Easter",
  "Valentine's Day",
  "Mother's Day",
  "Father's Day",
  "Graduation",
  "Congratulations",
  "Thank You",
  "Apology",
  "Good Morning",
  "Good Night",
  "Other",
] as const;

const STYLES = [
  "Warm",
  "Elegant",
  "Funny",
  "Romantic",
  "Christian",
  "Poetic",
  "Motivational",
  "Formal",
] as const;

const LANGUAGES = [
  "English",
  "Deutsch",
  "Русский",
  "Українська",
  "Français",
  "Polski",
] as const;

type Relationship = (typeof RELATIONSHIPS)[number];
type Occasion = (typeof OCCASIONS)[number];
type Style = (typeof STYLES)[number];
type Language = (typeof LANGUAGES)[number];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function StudioPage() {
  const [gift, setGift] = useState<GiftId | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [style, setStyle] = useState<Style | null>(null);
  const [details, setDetails] = useState("");
  const [language, setLanguage] = useState<Language>("English");

  const selectedGift = useMemo(
    () => GIFTS.find((g) => g.id === gift) ?? null,
    [gift],
  );

  const reset = () => {
    setGift(null);
    setRecipientName("");
    setRelationship(null);
    setOccasion(null);
    setStyle(null);
    setDetails("");
    setLanguage("English");
  };

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
            Project Joy Studio
          </span>
          <h1 className="mt-6 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
            Give more than greetings.
            <span className="block bg-gold-gradient bg-clip-text text-transparent">
              Give emotions.
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            Craft an unforgettable gift for the people who matter most.
            Choose a format, share their story, and we&apos;ll shape every
            detail into something truly personal.
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-10">
            <Step1
              value={gift}
              onChange={setGift}
            />
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
              onReset={reset}
            />
          </div>

          <aside className="min-w-0 lg:sticky lg:top-24 lg:h-fit">
            <LivePreview
              gift={selectedGift}
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
    </SiteLayout>
  );
}

// ---------------------------------------------------------------------------
// Reusable step primitives
// ---------------------------------------------------------------------------

function StepShell({
  number,
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  number: number;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-warm sm:p-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold-gradient text-primary-foreground shadow-warm">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-widest text-primary/80">
              Step {number}
            </div>
            <h2 className="mt-0.5 truncate font-display text-xl font-semibold tracking-tight sm:text-2xl">
              {title}
            </h2>
          </div>
        </div>
      </header>
      {subtitle && (
        <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p>
      )}
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
// Step 1 — Choose Your Gift
// ---------------------------------------------------------------------------

function Step1({
  value,
  onChange,
}: {
  value: GiftId | null;
  onChange: (v: GiftId) => void;
}) {
  return (
    <StepShell
      number={1}
      icon={Gift}
      title="Choose Your Gift"
      subtitle="Pick a format. Every option is crafted with the same premium care."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {GIFTS.map((g) => {
          const Icon = g.icon;
          const active = value === g.id;
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
                  {g.title}
                </h3>
                {active && (
                  <Check className="ml-auto h-4 w-4 text-primary" />
                )}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {g.description}
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-secondary/60 px-2.5 py-1 font-medium text-foreground/80">
                  <Coins className="h-3 w-3 text-primary" />
                  {g.credits} credits
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {g.prepTime}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </StepShell>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Recipient
// ---------------------------------------------------------------------------

function Step2({
  name,
  onName,
  relationship,
  onRelationship,
}: {
  name: string;
  onName: (v: string) => void;
  relationship: Relationship | null;
  onRelationship: (v: Relationship) => void;
}) {
  return (
    <StepShell
      number={2}
      icon={UserIcon}
      title="Recipient"
      subtitle="Who is this gift for? A little detail makes a big difference."
    >
      <div className="space-y-5">
        <div>
          <FieldLabel>Recipient name</FieldLabel>
          <input
            value={name}
            onChange={(e) => onName(e.target.value)}
            placeholder="e.g. Anna"
            className="mt-2 w-full rounded-full border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/50"
          />
        </div>
        <div>
          <FieldLabel>Relationship</FieldLabel>
          <div className="mt-3 flex flex-wrap gap-2">
            {RELATIONSHIPS.map((r) => (
              <Chip
                key={r}
                active={relationship === r}
                onClick={() => onRelationship(r)}
              >
                {r}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </StepShell>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Occasion
// ---------------------------------------------------------------------------

function Step3({
  value,
  onChange,
}: {
  value: Occasion | null;
  onChange: (v: Occasion) => void;
}) {
  return (
    <StepShell
      number={3}
      icon={CalendarHeart}
      title="Occasion"
      subtitle="Tell us what you're celebrating."
    >
      <div className="flex flex-wrap gap-2">
        {OCCASIONS.map((o) => (
          <Chip key={o} active={value === o} onClick={() => onChange(o)}>
            {o}
          </Chip>
        ))}
      </div>
    </StepShell>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Style
// ---------------------------------------------------------------------------

function Step4({
  value,
  onChange,
}: {
  value: Style | null;
  onChange: (v: Style) => void;
}) {
  return (
    <StepShell
      number={4}
      icon={Palette}
      title="Choose a Style"
      subtitle="Set the tone of your gift."
    >
      <div className="flex flex-wrap gap-2">
        {STYLES.map((s) => (
          <Chip key={s} active={value === s} onClick={() => onChange(s)}>
            {s}
          </Chip>
        ))}
      </div>
    </StepShell>
  );
}

// ---------------------------------------------------------------------------
// Step 5 — Personal Information
// ---------------------------------------------------------------------------

function Step5({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <StepShell
      number={5}
      icon={MessageSquareHeart}
      title="Personal Information"
      subtitle="The more you share, the more personal the gift becomes."
    >
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        placeholder={
          "Tell us about this person.\n\nDescribe personality, hobbies, memories, wishes and everything important.\n\nProject Joy will prepare a unique and personalized gift."
        }
        className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-4 text-sm leading-relaxed outline-none transition focus:border-primary/50"
      />
      <p className="mt-3 text-xs text-muted-foreground">
        {value.trim().length} characters — every detail helps us craft something
        unforgettable.
      </p>
    </StepShell>
  );
}

// ---------------------------------------------------------------------------
// Step 6 — Language
// ---------------------------------------------------------------------------

function Step6({
  value,
  onChange,
}: {
  value: Language;
  onChange: (v: Language) => void;
}) {
  return (
    <StepShell
      number={6}
      icon={Languages}
      title="Language"
      subtitle="Which language should your gift be in?"
    >
      <div className="flex flex-wrap gap-2">
        {LANGUAGES.map((l) => (
          <Chip key={l} active={value === l} onClick={() => onChange(l)}>
            {l}
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
  onReset,
}: {
  gift: GiftOption | null;
  onReset: () => void;
}) {
  const balance = 0; // placeholder — connected once wallets are backed by Cloud
  const required = gift?.credits ?? 0;
  const enough = balance >= required;
  return (
    <StepShell
      number={7}
      icon={Sparkles}
      title="Gift Summary"
      subtitle="Review the essentials before we begin."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryRow
          label="Selected gift"
          value={gift ? gift.title : "Not chosen yet"}
        />
        <SummaryRow
          label="Preparation time"
          value={gift ? gift.prepTime : "—"}
        />
        <SummaryRow
          label="Credits required"
          value={gift ? `${gift.credits} credits` : "—"}
        />
        <SummaryRow
          label="Your balance"
          value={`${balance} credits`}
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <Link
          to="/pricing"
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          Need more credits?
        </Link>
        {gift && !enough && (
          <span className="text-xs text-muted-foreground">
            Top up to unlock this gift.
          </span>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground/80 transition hover:text-foreground"
        >
          <Save className="h-4 w-4" />
          Save draft
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground/80 transition hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-gold-gradient px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-warm transition hover:opacity-95"
        >
          <Wand2 className="h-4 w-4" />
          Create my gift
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
      <div className="mt-1 truncate font-display text-base font-medium">
        {value}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live Preview
// ---------------------------------------------------------------------------

function LivePreview({
  gift,
  recipientName,
  relationship,
  occasion,
  style,
  details,
  language,
}: {
  gift: GiftOption | null;
  recipientName: string;
  relationship: Relationship | null;
  occasion: Occasion | null;
  style: Style | null;
  details: string;
  language: Language;
}) {
  const Icon = gift?.icon ?? Heart;
  const hasSelection =
    gift || recipientName || relationship || occasion || style || details;

  return (
    <div className="rounded-3xl border border-border/70 bg-warm-gradient p-6 shadow-warm sm:p-8">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground backdrop-blur">
          <Sparkles className="h-3 w-3 text-primary" />
          Live preview
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">
          {language}
        </span>
      </div>

      <div className="mt-6 rounded-3xl border border-border/70 bg-card p-6 shadow-warm">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold-gradient text-primary-foreground shadow-warm">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-primary/80">
              {gift ? gift.title : "Your gift"}
            </div>
            <div className="mt-0.5 truncate font-display text-lg font-semibold tracking-tight">
              {occasion ? `For ${occasion}` : "Choose an occasion"}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4 font-display">
          <div className="text-2xl italic leading-tight text-foreground">
            {recipientName ? (
              <>
                Dear{" "}
                <span className="bg-gold-gradient bg-clip-text text-transparent">
                  {recipientName}
                </span>
                ,
              </>
            ) : (
              <span className="text-muted-foreground/70">
                Dear loved one,
              </span>
            )}
          </div>
          <p className="text-sm italic leading-relaxed text-muted-foreground">
            {details.trim()
              ? `"${details.trim().slice(0, 260)}${details.trim().length > 260 ? "…" : ""}"`
              : "Every word, every note, every frame will be shaped around the story you share. This is where their personal message will appear."}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {relationship && (
            <Tag>
              <Heart className="h-3 w-3 text-primary" />
              {relationship}
            </Tag>
          )}
          {style && <Tag>{style}</Tag>}
          {gift && (
            <Tag>
              <Coins className="h-3 w-3 text-primary" />
              {gift.credits} credits
            </Tag>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
          <span className="font-display text-sm italic text-muted-foreground">
            with love,
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            Project Joy
          </span>
        </div>
      </div>

      {!hasSelection && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Start with step 1 — the preview updates as you go.
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