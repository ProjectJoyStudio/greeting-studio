import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { purchaseMemoryBookStorage } from "@/lib/memory-book/storage-offers.functions";
import {
  extendedExpiry,
  offerAvailable,
  offersForBook,
  type StorageOffer,
} from "@/lib/memory-book/storage-offers";

function fill(text: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce((out, [k, v]) => out.replaceAll(`{${k}}`, String(v)), text);
}

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * The extension offer of ONE book. Unfinished books only see "time to finish";
 * completed books only see "online storage for 1 year". One purchase key per
 * attempt: a double tap, a retry after a lost answer or a second request all
 * reuse it, so the server charges at most once.
 */
export function StorageExtensionPanel({
  book,
  offers,
  onPurchased,
}: {
  book: { id: string; status: string; expiresAt: string; retentionExpiresAt: string | null };
  offers: StorageOffer[];
  onPurchased: () => Promise<unknown>;
}) {
  const { t, lang } = useI18n();
  const purchase = useServerFn(purchaseMemoryBookStorage);
  const [pending, setPending] = useState<StorageOffer | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const keys = useRef<Record<string, string>>({});
  const inFlight = useRef(false);

  const completed = book.status === "completed";
  const current = completed ? book.retentionExpiresAt : book.expiresAt;
  const mine = offersForBook(offers, book.status);
  const date = (d: Date | string) => {
    const v = typeof d === "string" ? new Date(d) : d;
    return Number.isFinite(v.getTime()) ? v.toLocaleDateString(lang, { year: "numeric", month: "long", day: "numeric" }) : "—";
  };
  const label = (o: StorageOffer) =>
    o.service === "completed"
      ? fill(t("mbx_keep_price"), { c: o.credits ?? 0 })
      : fill(t(o.durationDays === 7 ? "mbx_work_week" : "mbx_work_month"), { c: o.credits ?? 0 });

  async function confirm() {
    const offer = pending;
    if (!offer || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMessage(null);
    const slot = `${book.id}:${offer.code}`;
    const key = (keys.current[slot] ||= newKey());
    try {
      const res = await purchase({
        data: { bookId: book.id, offerCode: offer.code, expectedPrice: offer.credits ?? -1, purchaseKey: key },
      });
      if (res.ok && res.expiresAt) {
        delete keys.current[slot];
        setMessage({ ok: true, text: fill(t(completed ? "mbx_ok_keep" : "mbx_ok_work"), { d: date(res.expiresAt) }) });
        await onPurchased();
      } else {
        // Nothing was charged: a definitive answer starts a fresh attempt next time.
        if (res.error !== "failed") delete keys.current[slot];
        const map: Record<string, string> = {
          insufficient_credits: t("mbx_err_credits"),
          price_changed: fill(t("mbx_err_price"), { c: res.price ?? "—" }),
          offer_unavailable: t("mbx_err_offer"),
          wrong_status: t("mbx_err_status"),
          not_found: t("mbx_err_status"),
          assets_unavailable: t("mbx_err_assets"),
        };
        setMessage({ ok: false, text: map[res.error ?? ""] ?? t("mbx_err_failed") });
        if (res.error === "price_changed") await onPurchased();
      }
    } catch {
      // Lost answer: keep the same key so a retry can never charge twice.
      setMessage({ ok: false, text: t("mbx_err_failed") });
    } finally {
      inFlight.current = false;
      setBusy(false);
      setPending(null);
    }
  }

  const yearOffer = completed ? mine[0] : undefined;
  const available = mine.filter(offerAvailable);

  return (
    <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-4">
      <p className="text-sm font-semibold">{t(completed ? "mbx_keep_title" : "mbx_work_title")}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t(completed ? "mbx_keep_hint" : "mbx_work_hint")}</p>
      {completed && yearOffer && offerAvailable(yearOffer) && (
        <p className="mt-2 text-xs text-muted-foreground">
          {label(yearOffer)} · {fill(t("mbx_new_date"), { d: date(extendedExpiry(current, yearOffer)) })}
        </p>
      )}
      {available.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">{t(completed ? "mbx_keep_unavailable" : "mbx_err_offer")}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {available.map((o) => (
            <Button
              key={o.code}
              size="sm"
              variant={completed ? "default" : "outline"}
              className="h-auto min-h-9 whitespace-normal text-left"
              disabled={busy}
              onClick={() => {
                setMessage(null);
                setPending(o);
              }}
            >
              {busy && pending?.code === o.code ? t("mbd_working") : completed ? t("mbx_keep_button") : label(o)}
            </Button>
          ))}
        </div>
      )}
      {message && (
        <p role="status" className={`mt-2 text-sm ${message.ok ? "text-primary" : "text-destructive"}`}>
          {message.text}
        </p>
      )}

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && !busy && setPending(null)}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("mbx_confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending &&
                (completed
                  ? fill(t("mbx_confirm_keep"), { c: pending.credits ?? 0, d: date(extendedExpiry(current, pending)) })
                  : fill(t("mbx_confirm_work"), {
                      period: t(pending.durationDays === 7 ? "mbx_period_week" : "mbx_period_month"),
                      c: pending.credits ?? 0,
                      d: date(extendedExpiry(current, pending)),
                    }))}
              {completed && <span className="mt-2 block">{t("mbx_confirm_backup_note")}</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={busy} className="min-h-11 sm:min-h-9">{t("mbx_cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className="min-h-11 sm:min-h-9"
              onClick={(e) => {
                e.preventDefault();
                void confirm();
              }}
            >
              {busy ? t("mbd_working") : fill(t("mbx_confirm"), { c: pending?.credits ?? 0 })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
