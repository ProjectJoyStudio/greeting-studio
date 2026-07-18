import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Save, RotateCcw } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import {
  FORMAT_KEYS,
  approxDurationKey,
  estimateFormat,
  useEconomy,
  type FormatKey,
} from "@/lib/admin/economy";

export const Route = createFileRoute("/admin/economy")({
  component: EconomyPage,
});

type TabKey =
  | "general"
  | "formats"
  | "duration"
  | "priority"
  | "premium"
  | "cost"
  | "safety"
  | "preview";

const TABS: { key: TabKey; label: string }[] = [
  { key: "general", label: "admin_tab_general" },
  { key: "formats", label: "admin_tab_formats" },
  { key: "duration", label: "admin_tab_duration" },
  { key: "priority", label: "admin_tab_priority" },
  { key: "premium", label: "admin_tab_premium" },
  { key: "cost", label: "admin_tab_cost" },
  { key: "safety", label: "admin_tab_safety" },
  { key: "preview", label: "admin_tab_preview" },
];

function EconomyPage() {
  const { t } = useI18n();
  const { dirty, save, discard } = useEconomy();
  const [tab, setTab] = useState<TabKey>("general");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<null | (() => void)>(null);

  const runDangerous = (fn: () => void) => {
    setPending(() => fn);
    setConfirmOpen(true);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[Fraunces] text-3xl font-semibold text-foreground">
            {t("admin_econ_title")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t("admin_econ_subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
              dirty
                ? "bg-amber-500/15 text-amber-700"
                : "bg-emerald-500/10 text-emerald-700"
            }`}
          >
            {dirty ? t("admin_unsaved") : t("admin_saved")}
          </span>
          <button
            type="button"
            disabled={!dirty}
            onClick={discard}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm text-foreground transition hover:bg-muted/50 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> {t("admin_discard")}
          </button>
          <button
            type="button"
            disabled={!dirty}
            onClick={save}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> {t("admin_save")}
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5 border-b border-border/60">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => setTab(tb.key)}
            className={`rounded-t-lg px-3 py-2 text-sm transition ${
              tab === tb.key
                ? "bg-card text-foreground border border-border/60 border-b-transparent -mb-px"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(tb.label)}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm">
        {tab === "general" && <GeneralTab />}
        {tab === "formats" && <FormatsTab onDangerous={runDangerous} />}
        {tab === "duration" && <DurationTab />}
        {tab === "priority" && <PriorityTab />}
        {tab === "premium" && <PremiumTab />}
        {tab === "cost" && <CostTab />}
        {tab === "safety" && <SafetyTab onDangerous={runDangerous} />}
        {tab === "preview" && <PreviewTab />}
      </div>

      {confirmOpen && (
        <ConfirmDialog
          onCancel={() => {
            setConfirmOpen(false);
            setPending(null);
          }}
          onConfirm={() => {
            pending?.();
            setConfirmOpen(false);
            setPending(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------- Reusable pieces ----------------

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {help && <span className="block text-xs text-muted-foreground">{help}</span>}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  step = 1,
  min,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  suffix?: string;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        min={min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm outline-none focus:border-primary/60"
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}

function TextInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm outline-none focus:border-primary/60"
    />
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${
        checked
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border/60 bg-background text-muted-foreground"
      }`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          checked ? "bg-primary" : "bg-muted-foreground/60"
        }`}
      />
      {label ?? (checked ? "on" : "off")}
    </button>
  );
}

function ConfirmDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <h2 className="font-[Fraunces] text-lg font-semibold text-foreground">
              {t("admin_confirm_dangerous_title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("admin_confirm_dangerous_body")}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm hover:bg-muted/50"
          >
            {t("admin_cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t("admin_confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- General ----------------

function GeneralTab() {
  const { t } = useI18n();
  const { state, update } = useEconomy();
  const g = state.general;
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Field label={t("admin_field_credit_name")} help={t("admin_help_credit_name")}>
        <TextInput value={g.creditName} onChange={(v) => update((d) => { d.general.creditName = v; })} />
      </Field>
      <Field label={t("admin_field_currency")}>
        <TextInput value={g.currency} onChange={(v) => update((d) => { d.general.currency = v; })} />
      </Field>
      <Field label={t("admin_field_credit_value")} help={t("admin_help_credit_value")}>
        <NumberInput value={g.creditValue} step={0.01} onChange={(v) => update((d) => { d.general.creditValue = v; })} suffix={g.currency} />
      </Field>
      <Field label={t("admin_field_min_purchase")}>
        <NumberInput value={g.minPurchase} onChange={(v) => update((d) => { d.general.minPurchase = v; })} />
      </Field>
      <Field label={t("admin_field_max_purchase")}>
        <NumberInput value={g.maxPurchase} onChange={(v) => update((d) => { d.general.maxPurchase = v; })} />
      </Field>
      <Field label={t("admin_field_min_order")}>
        <NumberInput value={g.minOrderValue} onChange={(v) => update((d) => { d.general.minOrderValue = v; })} />
      </Field>
      <Field label={t("admin_field_credit_expiration")}>
        <NumberInput value={g.creditExpirationDays} onChange={(v) => update((d) => { d.general.creditExpirationDays = v; })} suffix="d" />
      </Field>
      <Field label={t("admin_field_credit_expiration_enabled")}>
        <Toggle checked={g.creditExpirationEnabled} onChange={(v) => update((d) => { d.general.creditExpirationEnabled = v; })} />
      </Field>
      <Field label={t("admin_field_rounding")}>
        <select
          value={g.roundingRule}
          onChange={(e) => update((d) => { d.general.roundingRule = e.target.value as typeof g.roundingRule; })}
          className="w-full rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm outline-none focus:border-primary/60"
        >
          <option value="none">none</option>
          <option value="up">up</option>
          <option value="nearest">nearest</option>
        </select>
      </Field>
      <Field label={t("admin_field_min_margin")} help={t("admin_help_min_margin")}>
        <NumberInput value={g.minMarginPercent} onChange={(v) => update((d) => { d.general.minMarginPercent = v; })} suffix="%" />
      </Field>
    </div>
  );
}

// ---------------- Formats ----------------

function FormatsTab({ onDangerous }: { onDangerous: (fn: () => void) => void }) {
  const { t } = useI18n();
  const { state, update } = useEconomy();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="p-2">{t("admin_col_format")}</th>
            <th className="p-2">{t("admin_col_enabled")}</th>
            <th className="p-2">{t("admin_col_base_credits")}</th>
            <th className="p-2">{t("admin_col_per30s")}</th>
            <th className="p-2">{t("admin_col_min_dur")}</th>
            <th className="p-2">{t("admin_col_max_dur")}</th>
            <th className="p-2">{t("admin_col_min_order")}</th>
            <th className="p-2">{t("admin_col_proc_per30s")}</th>
            <th className="p-2">{t("admin_col_prod_cost")}</th>
            <th className="p-2">{t("admin_col_markup")}</th>
            <th className="p-2">{t("admin_col_min_profit")}</th>
          </tr>
        </thead>
        <tbody>
          {FORMAT_KEYS.map((k) => {
            const f = state.formats[k];
            const disableDur = !f.isTimeBased;
            return (
              <tr key={k} className="border-t border-border/60 align-top">
                <td className="p-2 font-medium text-foreground">
                  {t(`admin_fmt_${k}`)}
                  {f.isPremium && (
                    <div className="mt-1 text-[10px] uppercase tracking-wide text-primary/80">
                      {t("admin_individually_calculated")}
                    </div>
                  )}
                </td>
                <td className="p-2">
                  <Toggle
                    checked={f.enabled}
                    onChange={(v) => {
                      const fn = () => update((d) => { d.formats[k].enabled = v; });
                      if (!v) onDangerous(fn);
                      else fn();
                    }}
                  />
                </td>
                <td className="p-2 w-24">
                  <NumberInput
                    value={f.baseCredits}
                    onChange={(v) => update((d) => { d.formats[k].baseCredits = v; })}
                  />
                </td>
                <td className="p-2 w-24">
                  <NumberInput
                    value={f.creditsPer30s}
                    onChange={(v) => update((d) => { d.formats[k].creditsPer30s = v; })}
                  />
                </td>
                <td className="p-2 w-24">
                  {disableDur ? <span className="text-muted-foreground">—</span> : (
                    <NumberInput
                      value={f.minDurationSec}
                      onChange={(v) => update((d) => { d.formats[k].minDurationSec = v; })}
                    />
                  )}
                </td>
                <td className="p-2 w-24">
                  {disableDur ? <span className="text-muted-foreground">—</span> : (
                    <NumberInput
                      value={f.maxDurationSec}
                      onChange={(v) => update((d) => { d.formats[k].maxDurationSec = v; })}
                    />
                  )}
                </td>
                <td className="p-2 w-24">
                  <NumberInput
                    value={f.minOrderCredits}
                    onChange={(v) => update((d) => { d.formats[k].minOrderCredits = v; })}
                  />
                </td>
                <td className="p-2 w-24">
                  {disableDur ? <span className="text-muted-foreground">—</span> : (
                    <NumberInput
                      value={f.processingSecondsPer30s}
                      onChange={(v) => update((d) => { d.formats[k].processingSecondsPer30s = v; })}
                    />
                  )}
                </td>
                <td className="p-2 w-24">
                  <NumberInput
                    value={f.productionCost}
                    step={0.05}
                    onChange={(v) => update((d) => { d.formats[k].productionCost = v; })}
                  />
                </td>
                <td className="p-2 w-24">
                  <NumberInput
                    value={f.markupPercent}
                    onChange={(v) => update((d) => { d.formats[k].markupPercent = v; })}
                    suffix="%"
                  />
                </td>
                <td className="p-2 w-24">
                  <NumberInput
                    value={f.minProfitPercent}
                    onChange={(v) => update((d) => { d.formats[k].minProfitPercent = v; })}
                    suffix="%"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------- Duration ----------------

function DurationTab() {
  const { t } = useI18n();
  const { state, update } = useEconomy();
  const timeFormats = FORMAT_KEYS.filter((k) => state.formats[k].isTimeBased);
  return (
    <div className="space-y-4">
      {timeFormats.map((k) => {
        const f = state.formats[k];
        const invalid =
          f.minDurationSec > f.maxDurationSec || f.maxDurationSec <= 0 || f.minDurationSec < 0;
        return (
          <div
            key={k}
            className="grid grid-cols-1 gap-3 rounded-lg border border-border/60 bg-background/50 p-4 sm:grid-cols-3"
          >
            <div className="font-medium text-foreground">{t(`admin_fmt_${k}`)}</div>
            <Field label={t("admin_col_min_dur")}>
              <NumberInput
                value={f.minDurationSec}
                min={0}
                onChange={(v) => update((d) => { d.formats[k].minDurationSec = Math.max(0, v); })}
              />
            </Field>
            <Field label={t("admin_col_max_dur")}>
              <NumberInput
                value={f.maxDurationSec}
                min={0}
                onChange={(v) => update((d) => { d.formats[k].maxDurationSec = Math.max(0, v); })}
              />
            </Field>
            {invalid && (
              <div className="sm:col-span-3 text-xs text-red-600">
                min ≤ max &nbsp;·&nbsp; max &gt; 0 &nbsp;·&nbsp; no negative values
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------- Priority ----------------

function PriorityTab() {
  const { t } = useI18n();
  const { state, update } = useEconomy();
  const p = state.processing;
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800">
        {t("admin_proc_no_clock_rule")}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border/60 bg-background/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-[Fraunces] text-lg font-semibold text-foreground">
              {t("admin_proc_standard")}
            </h3>
            <Toggle checked={p.standardEnabled} onChange={(v) => update((d) => { d.processing.standardEnabled = v; })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("admin_proc_credit_mult")}>
              <NumberInput value={p.standardCreditMult} step={0.05} onChange={(v) => update((d) => { d.processing.standardCreditMult = v; })} />
            </Field>
            <Field label={t("admin_proc_time_mult")}>
              <NumberInput value={p.standardTimeMult} step={0.05} onChange={(v) => update((d) => { d.processing.standardTimeMult = v; })} />
            </Field>
            <Field label={t("admin_proc_min_buffer")}>
              <NumberInput value={p.standardMinBufferMin} onChange={(v) => update((d) => { d.processing.standardMinBufferMin = v; })} />
            </Field>
            <Field label={t("admin_proc_max_buffer")}>
              <NumberInput value={p.standardMaxBufferMin} onChange={(v) => update((d) => { d.processing.standardMaxBufferMin = v; })} />
            </Field>
          </div>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-[Fraunces] text-lg font-semibold text-foreground">
              {t("admin_proc_priority")}
            </h3>
            <Toggle checked={p.priorityEnabled} onChange={(v) => update((d) => { d.processing.priorityEnabled = v; })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("admin_proc_credit_mult")}>
              <NumberInput value={p.priorityCreditMult} step={0.05} onChange={(v) => update((d) => { d.processing.priorityCreditMult = v; })} />
            </Field>
            <Field label={t("admin_proc_time_mult")}>
              <NumberInput value={p.priorityTimeMult} step={0.05} onChange={(v) => update((d) => { d.processing.priorityTimeMult = v; })} />
            </Field>
            <Field label={t("admin_proc_extra_credits")}>
              <NumberInput value={p.priorityExtraCredits} onChange={(v) => update((d) => { d.processing.priorityExtraCredits = v; })} />
            </Field>
            <Field label={t("admin_proc_daily_limit")}>
              <NumberInput value={p.priorityDailyLimit} onChange={(v) => update((d) => { d.processing.priorityDailyLimit = v; })} />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- Premium ----------------

function PremiumTab() {
  const { t } = useI18n();
  const { state, update } = useEconomy();
  const p = state.premium;
  const [inputs, setInputs] = useState({
    duration: 120,
    characters: 2,
    scenes: 3,
    voice: 1,
    music: 1,
    special: 0,
    files: 0,
    complexity: "medium" as "simple" | "medium" | "complex",
    priority: false,
  });
  const complexityMult =
    inputs.complexity === "simple" ? p.simpleMult
      : inputs.complexity === "complex" ? p.complexMult
      : p.mediumMult;
  const estimate = Math.round(
    (p.baseAssessment
      + p.durationCoef * inputs.duration
      + p.charactersCoef * inputs.characters
      + p.scenesCoef * inputs.scenes
      + p.voiceCoef * inputs.voice
      + p.musicCoef * inputs.music
      + p.specialCoef * inputs.special
      + p.filesCoef * inputs.files
    ) * complexityMult * (inputs.priority ? p.priorityMult : 1),
  );
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("admin_prem_base")}>
          <NumberInput value={p.baseAssessment} onChange={(v) => update((d) => { d.premium.baseAssessment = v; })} />
        </Field>
        <Field label={t("admin_prem_type")}>
          <NumberInput value={p.typeCoef} step={0.05} onChange={(v) => update((d) => { d.premium.typeCoef = v; })} />
        </Field>
        <Field label={t("admin_prem_duration")}>
          <NumberInput value={p.durationCoef} step={0.01} onChange={(v) => update((d) => { d.premium.durationCoef = v; })} />
        </Field>
        <Field label={t("admin_prem_chars")}>
          <NumberInput value={p.charactersCoef} step={0.5} onChange={(v) => update((d) => { d.premium.charactersCoef = v; })} />
        </Field>
        <Field label={t("admin_prem_scenes")}>
          <NumberInput value={p.scenesCoef} step={0.5} onChange={(v) => update((d) => { d.premium.scenesCoef = v; })} />
        </Field>
        <Field label={t("admin_prem_voice")}>
          <NumberInput value={p.voiceCoef} step={0.5} onChange={(v) => update((d) => { d.premium.voiceCoef = v; })} />
        </Field>
        <Field label={t("admin_prem_music")}>
          <NumberInput value={p.musicCoef} step={0.5} onChange={(v) => update((d) => { d.premium.musicCoef = v; })} />
        </Field>
        <Field label={t("admin_prem_special")}>
          <NumberInput value={p.specialCoef} step={0.5} onChange={(v) => update((d) => { d.premium.specialCoef = v; })} />
        </Field>
        <Field label={t("admin_prem_files")}>
          <NumberInput value={p.filesCoef} step={0.5} onChange={(v) => update((d) => { d.premium.filesCoef = v; })} />
        </Field>
        <Field label={t("admin_prem_simple")}>
          <NumberInput value={p.simpleMult} step={0.05} onChange={(v) => update((d) => { d.premium.simpleMult = v; })} />
        </Field>
        <Field label={t("admin_prem_medium")}>
          <NumberInput value={p.mediumMult} step={0.05} onChange={(v) => update((d) => { d.premium.mediumMult = v; })} />
        </Field>
        <Field label={t("admin_prem_complex")}>
          <NumberInput value={p.complexMult} step={0.05} onChange={(v) => update((d) => { d.premium.complexMult = v; })} />
        </Field>
        <Field label={t("admin_prem_priority")}>
          <NumberInput value={p.priorityMult} step={0.05} onChange={(v) => update((d) => { d.premium.priorityMult = v; })} />
        </Field>
        <Field label={t("admin_prem_min_order")}>
          <NumberInput value={p.minOrderCredits} onChange={(v) => update((d) => { d.premium.minOrderCredits = v; })} />
        </Field>
        <Field label={t("admin_prem_manual")}>
          <Toggle checked={p.manualReview} onChange={(v) => update((d) => { d.premium.manualReview = v; })} />
        </Field>
      </div>
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
        <h3 className="font-[Fraunces] text-lg font-semibold text-foreground">
          {t("admin_prem_preview")}
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <Field label="duration (s)">
            <NumberInput value={inputs.duration} onChange={(v) => setInputs((s) => ({ ...s, duration: v }))} />
          </Field>
          <Field label="characters">
            <NumberInput value={inputs.characters} onChange={(v) => setInputs((s) => ({ ...s, characters: v }))} />
          </Field>
          <Field label="scenes">
            <NumberInput value={inputs.scenes} onChange={(v) => setInputs((s) => ({ ...s, scenes: v }))} />
          </Field>
          <Field label="voice">
            <NumberInput value={inputs.voice} onChange={(v) => setInputs((s) => ({ ...s, voice: v }))} />
          </Field>
          <Field label="music">
            <NumberInput value={inputs.music} onChange={(v) => setInputs((s) => ({ ...s, music: v }))} />
          </Field>
          <Field label="special">
            <NumberInput value={inputs.special} onChange={(v) => setInputs((s) => ({ ...s, special: v }))} />
          </Field>
          <Field label="files">
            <NumberInput value={inputs.files} onChange={(v) => setInputs((s) => ({ ...s, files: v }))} />
          </Field>
          <Field label="complexity">
            <select
              value={inputs.complexity}
              onChange={(e) => setInputs((s) => ({ ...s, complexity: e.target.value as typeof s.complexity }))}
              className="w-full rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm"
            >
              <option value="simple">simple</option>
              <option value="medium">medium</option>
              <option value="complex">complex</option>
            </select>
          </Field>
          <Field label="priority">
            <Toggle checked={inputs.priority} onChange={(v) => setInputs((s) => ({ ...s, priority: v }))} />
          </Field>
        </div>
        <div className="mt-4 border-t border-border/60 pt-3 text-right">
          <div className="text-xs text-muted-foreground">{t("admin_prem_estimated_total")}</div>
          <div className="font-[Fraunces] text-3xl font-semibold text-primary">
            {Math.max(estimate, p.minOrderCredits)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- Cost & Profit ----------------

function CostTab() {
  const { t } = useI18n();
  const { state, update } = useEconomy();
  const c = state.cost;
  const g = state.general;
  const totalCost =
    c.productionCost + c.paymentCost + c.notificationCost + c.storageCost +
    c.supportReserve + c.regenReserve + c.refundReserve;
  const revenue = c.customerCredits * g.creditValue;
  const netRevenue = revenue * (1 - c.taxPercent / 100);
  const profit = netRevenue - totalCost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const belowMin = margin < g.minMarginPercent;
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("admin_cost_production")}>
          <NumberInput value={c.productionCost} step={0.05} onChange={(v) => update((d) => { d.cost.productionCost = v; })} suffix={g.currency} />
        </Field>
        <Field label={t("admin_cost_payment")}>
          <NumberInput value={c.paymentCost} step={0.05} onChange={(v) => update((d) => { d.cost.paymentCost = v; })} suffix={g.currency} />
        </Field>
        <Field label={t("admin_cost_notification")}>
          <NumberInput value={c.notificationCost} step={0.01} onChange={(v) => update((d) => { d.cost.notificationCost = v; })} suffix={g.currency} />
        </Field>
        <Field label={t("admin_cost_storage")}>
          <NumberInput value={c.storageCost} step={0.01} onChange={(v) => update((d) => { d.cost.storageCost = v; })} suffix={g.currency} />
        </Field>
        <Field label={t("admin_cost_support")}>
          <NumberInput value={c.supportReserve} step={0.05} onChange={(v) => update((d) => { d.cost.supportReserve = v; })} suffix={g.currency} />
        </Field>
        <Field label={t("admin_cost_regen")}>
          <NumberInput value={c.regenReserve} step={0.05} onChange={(v) => update((d) => { d.cost.regenReserve = v; })} suffix={g.currency} />
        </Field>
        <Field label={t("admin_cost_refund")}>
          <NumberInput value={c.refundReserve} step={0.05} onChange={(v) => update((d) => { d.cost.refundReserve = v; })} suffix={g.currency} />
        </Field>
        <Field label={t("admin_cost_markup")}>
          <NumberInput value={c.markupPercent} onChange={(v) => update((d) => { d.cost.markupPercent = v; })} suffix="%" />
        </Field>
        <Field label={t("admin_cost_tax")}>
          <NumberInput value={c.taxPercent} onChange={(v) => update((d) => { d.cost.taxPercent = v; })} suffix="%" />
        </Field>
        <Field label={t("admin_cost_customer_credits")}>
          <NumberInput value={c.customerCredits} onChange={(v) => update((d) => { d.cost.customerCredits = v; })} />
        </Field>
      </div>
      <div className="space-y-3 rounded-lg border border-border/60 bg-background/50 p-4">
        <div className="text-xs text-muted-foreground">{t("admin_cost_internal_note")}</div>
        <SummaryRow label={t("admin_cost_total")} value={`${totalCost.toFixed(2)} ${g.currency}`} />
        <SummaryRow label={t("admin_cost_revenue")} value={`${revenue.toFixed(2)} ${g.currency}`} />
        <SummaryRow label={t("admin_cost_profit")} value={`${profit.toFixed(2)} ${g.currency}`} />
        <SummaryRow
          label={t("admin_cost_margin")}
          value={`${margin.toFixed(1)}%`}
          highlight={belowMin ? "warn" : "ok"}
        />
        {belowMin && (
          <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            {t("admin_cost_margin_warning")}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "ok" | "warn";
}) {
  return (
    <div className="flex items-center justify-between border-t border-border/40 pt-2 text-sm first:border-t-0 first:pt-0">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-medium ${
          highlight === "warn"
            ? "text-amber-700"
            : highlight === "ok"
              ? "text-emerald-700"
              : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// ---------------- Safety ----------------

function SafetyTab({ onDangerous }: { onDangerous: (fn: () => void) => void }) {
  const { t } = useI18n();
  const { state, update } = useEconomy();
  const s = state.safety;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={t("admin_safety_max_credits")}>
          <NumberInput value={s.maxCreditsPerOrder} onChange={(v) => update((d) => { d.safety.maxCreditsPerOrder = v; })} />
        </Field>
        <Field label={t("admin_safety_max_duration")}>
          <NumberInput value={s.maxDurationSec} onChange={(v) => update((d) => { d.safety.maxDurationSec = v; })} suffix="s" />
        </Field>
        <Field label={t("admin_safety_max_episodes")}>
          <NumberInput value={s.maxEpisodes} onChange={(v) => update((d) => { d.safety.maxEpisodes = v; })} />
        </Field>
        <Field label={t("admin_safety_max_active")}>
          <NumberInput value={s.maxActiveOrdersPerUser} onChange={(v) => update((d) => { d.safety.maxActiveOrdersPerUser = v; })} />
        </Field>
        <Field label={t("admin_safety_max_priority")}>
          <NumberInput value={s.maxPriorityOrders} onChange={(v) => update((d) => { d.safety.maxPriorityOrders = v; })} />
        </Field>
        <Field label={t("admin_safety_min_margin")}>
          <NumberInput
            value={s.minProfitMargin}
            onChange={(v) => {
              const fn = () => update((d) => { d.safety.minProfitMargin = v; });
              if (v < state.safety.minProfitMargin) onDangerous(fn);
              else fn();
            }}
            suffix="%"
          />
        </Field>
        <Field label={t("admin_safety_block_below_cost")}>
          <Toggle checked={s.blockBelowCost} onChange={(v) => update((d) => { d.safety.blockBelowCost = v; })} />
        </Field>
        <Field label={t("admin_safety_manual_above")}>
          <NumberInput value={s.manualReviewAbove} onChange={(v) => update((d) => { d.safety.manualReviewAbove = v; })} />
        </Field>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium text-foreground">{t("admin_safety_emergency")}</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FORMAT_KEYS.map((k) => (
            <div
              key={k}
              className="flex items-center justify-between rounded-md border border-border/60 bg-background/50 px-3 py-2 text-sm"
            >
              <span className="text-foreground">{t(`admin_fmt_${k}`)}</span>
              <Toggle
                checked={s.emergencyDisabled[k]}
                onChange={(v) => {
                  const fn = () => update((d) => { d.safety.emergencyDisabled[k] = v; });
                  if (v) onDangerous(fn);
                  else fn();
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- Preview ----------------

interface Scenario {
  key: string;
  format: FormatKey;
  duration: number;
  episodes: number;
}

const SCENARIOS: Scenario[] = [
  { key: "30-second song", format: "song", duration: 30, episodes: 1 },
  { key: "3-minute song", format: "song", duration: 180, episodes: 1 },
  { key: "1-minute video greeting", format: "video-greeting", duration: 60, episodes: 1 },
  { key: "5-minute video clip", format: "video-clip", duration: 300, episodes: 1 },
  { key: "8-minute video clip", format: "video-clip", duration: 480, episodes: 1 },
  { key: "8-minute cartoon episode", format: "cartoon-episode", duration: 480, episodes: 1 },
  { key: "3 cartoon episodes", format: "cartoon-episode", duration: 480, episodes: 3 },
];

function PreviewTab() {
  const { t } = useI18n();
  const { state } = useEconomy();
  const g = state.general;

  const rows = useMemo(() => {
    return SCENARIOS.map((sc) => {
      const cfg = state.formats[sc.format];
      const std = estimateFormat(cfg, sc.duration, "standard", sc.episodes, state.processing);
      const pri = estimateFormat(cfg, sc.duration, "priority", sc.episodes, state.processing);
      const cost = cfg.productionCost * (sc.duration / 30 || 1) * sc.episodes;
      const revenue = std.credits * g.creditValue;
      const profit = revenue - cost;
      return { sc, std, pri, cost, revenue, profit };
    });
  }, [state, g.creditValue]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800">
        {t("admin_preview_note")}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="p-2">scenario</th>
              <th className="p-2">{t("admin_preview_customer_credits")}</th>
              <th className="p-2">{t("admin_preview_internal_cost")}</th>
              <th className="p-2">{t("admin_preview_profit")}</th>
              <th className="p-2">{t("admin_preview_time")}</th>
              <th className="p-2">{t("admin_preview_std_vs_pri")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ sc, std, pri, cost, revenue, profit }) => (
              <tr key={sc.key} className="border-t border-border/60">
                <td className="p-2 text-foreground">{sc.key}</td>
                <td className="p-2">
                  <span className="font-medium text-foreground">{std.credits}</span>
                  <span className="text-xs text-muted-foreground"> · {revenue.toFixed(2)} {g.currency}</span>
                </td>
                <td className="p-2 text-muted-foreground">{cost.toFixed(2)} {g.currency}</td>
                <td className={`p-2 font-medium ${profit < 0 ? "text-red-600" : "text-emerald-700"}`}>
                  {profit.toFixed(2)} {g.currency}
                </td>
                <td className="p-2 text-muted-foreground">
                  {t(approxDurationKey(std.processingSeconds))}
                </td>
                <td className="p-2 text-xs text-muted-foreground">
                  {std.credits} → {pri.credits} · {t(approxDurationKey(std.processingSeconds))} → {t(approxDurationKey(pri.processingSeconds))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
