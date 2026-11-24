import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";
import { parseOfferPrice, type StorageOffer } from "@/lib/memory-book/storage-offers";
import {
  getStorageOffersAdmin,
  setStorageOfferAdmin,
  type StorageOfferAuditEntry,
} from "@/lib/memory-book/storage-offers.functions";

/** Super-admin control of every Memory Book storage price. */
export function MemoryBookStoragePricesPanel() {
  const { t, lang } = useI18n();
  const read = useServerFn(getStorageOffersAdmin);
  const write = useServerFn(setStorageOfferAdmin);
  const [offers, setOffers] = useState<StorageOffer[] | null>(null);
  const [audit, setAudit] = useState<StorageOfferAuditEntry[]>([]);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await read();
      setOffers(res.offers);
      setAudit(res.audit);
    } catch {
      setForbidden(true);
    }
  }, [read]);
  useEffect(() => {
    void load();
  }, [load]);

  const when = (v: string | null) => (v ? new Date(v).toLocaleString(lang) : "—");

  if (forbidden)
    return (
      <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6">
        <h2 className="font-display text-lg font-semibold">{t("mbx_admin_title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("mbx_admin_forbidden")}</p>
      </section>
    );

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6">
      <h2 className="font-display text-lg font-semibold">{t("mbx_admin_title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("mbx_admin_hint")}</p>
      <div className="mt-4 space-y-3">
        {(offers ?? []).map((o) => (
          <OfferRow key={o.code} offer={o} when={when} save={async (credits, enabled) => {
            const res = await write({ data: { code: o.code, credits, enabled } });
            if (res.ok) await load();
            return res.ok ? null : res.error === "needs_price" ? t("mbx_admin_needs_price") : res.error === "invalid" ? t("mbx_admin_invalid") : t("mbx_admin_failed");
          }} />
        ))}
      </div>
      <h3 className="mt-6 text-sm font-semibold">{t("mbx_admin_audit")}</h3>
      {audit.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">{t("mbx_admin_audit_empty")}</p>
      ) : (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {audit.map((a, i) => (
            <li key={i} className="break-words">
              {when(a.changedAt)} · {t(`mbx_admin_${a.code}`)} · {a.oldCredits ?? "—"} → {a.newCredits ?? "—"} ·{" "}
              {t(a.oldEnabled ? "mbx_admin_on" : "mbx_admin_off")} → {t(a.newEnabled ? "mbx_admin_on" : "mbx_admin_off")} · {a.changedBy}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function OfferRow({ offer, when, save }: {
  offer: StorageOffer;
  when: (v: string | null) => string;
  save: (credits: number | null, enabled: boolean) => Promise<string | null>;
}) {
  const { t } = useI18n();
  const [price, setPrice] = useState(offer.credits === null ? "" : String(offer.credits));
  const [enabled, setEnabled] = useState(offer.enabled);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const id = `offer-${offer.code}`;

  async function submit() {
    const parsed = parseOfferPrice(price);
    if (parsed === "invalid") return setNote({ ok: false, text: t("mbx_admin_invalid") });
    if (enabled && parsed === null) return setNote({ ok: false, text: t("mbx_admin_needs_price") });
    setBusy(true);
    setNote(null);
    try {
      const err = await save(parsed, enabled);
      setNote(err ? { ok: false, text: err } : { ok: true, text: t("mbx_admin_saved") });
    } catch {
      setNote({ ok: false, text: t("mbx_admin_failed") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border/60 p-3 sm:p-4">
      <p className="text-sm font-medium">{t(`mbx_admin_${offer.code}`)}</p>
      {offer.credits === null && <p className="text-xs text-muted-foreground">{t("mbx_admin_no_price")}</p>}
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="space-y-1 text-xs text-muted-foreground" htmlFor={id}>
          <span className="block">{t("mbx_admin_price")}</span>
          <input
            id={id}
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground sm:w-32 sm:text-sm"
          />
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm sm:min-h-9">
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label={t("mbx_admin_enabled")} />
          {t("mbx_admin_enabled")}
        </label>
        <Button size="sm" className="min-h-11 sm:min-h-9" disabled={busy} onClick={() => void submit()}>
          {t("mbx_admin_save")}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("mbx_admin_updated")}: {when(offer.updatedAt)}</p>
      {note && <p className={`mt-1 text-sm ${note.ok ? "text-primary" : "text-destructive"}`}>{note.text}</p>}
    </div>
  );
}
