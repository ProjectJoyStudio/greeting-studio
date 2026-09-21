import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { useI18n } from "@/lib/i18n";
import {
  getMemoryBookTariffsAdmin,
  setMemoryBookTariffs,
} from "@/lib/pricing/tariffs.functions";
import {
  MEMORY_BOOK_TARIFF_KEYS,
  type MemoryBookTariffKey,
} from "@/lib/pricing/tariffs";

/** The Memory Book credit prices an administrator may change. */
export function MemoryBookTariffsPanel() {
  const { t } = useI18n();
  const read = useServerFn(getMemoryBookTariffsAdmin);
  const write = useServerFn(setMemoryBookTariffs);

  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, number> | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    read()
      .then((res) => {
        if (!active) return;
        setSaved(res.prices);
        setValues(
          Object.fromEntries(Object.entries(res.prices).map(([k, v]) => [k, String(v)])),
        );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [read]);

  async function save() {
    setBusy(true);
    setNote(null);
    setError(null);
    const prices: Record<string, number> = {};
    for (const key of MEMORY_BOOK_TARIFF_KEYS) {
      const raw = Number(values[key]);
      if (!Number.isInteger(raw) || raw < 0 || raw > 100000) {
        setError(t("mba_price_invalid"));
        setBusy(false);
        return;
      }
      prices[key] = raw;
    }
    try {
      const res = await write({ data: { prices } });
      if (!res.ok || !res.prices) throw new Error("failed");
      setSaved(res.prices);
      setNote(t("mb_admin_saved"));
    } catch {
      setError(t("mba_action_failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-6">
      <h2 className="font-display text-lg font-semibold">{t("mba_tariffs_title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("mba_tariffs_hint")}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {MEMORY_BOOK_TARIFF_KEYS.map((key: MemoryBookTariffKey) => (
          <div key={key} className="space-y-1">
            <label className="block text-sm font-medium" htmlFor={`tariff-${key}`}>
              {t(`mba_tariff_${key}`)}
            </label>
            <div className="flex items-center gap-2">
              <input
                id={`tariff-${key}`}
                type="number"
                min={0}
                max={100000}
                step={1}
                value={values[key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                className="w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <span className="text-xs text-muted-foreground">
                {t("mba_current")}: {saved?.[key] ?? "—"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          {t("mb_admin_save")}
        </button>
        {note && <span className="text-sm text-emerald-600">{note}</span>}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </section>
  );
}
