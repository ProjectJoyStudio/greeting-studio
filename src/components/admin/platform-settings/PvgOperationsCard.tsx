// Personal Video Greeting operations that need an administrator: stuck,
// ambiguous provider outcome, or a failed job whose refund is still open.
import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n/types";
import {
  listPvgOperations,
  resolvePvgOperation,
  type PvgOperationRow,
} from "@/lib/admin/pvg-operations.functions";

const T: Record<string, Record<Lang, string>> = {
  title: {
    en: "Video greetings needing attention",
    ru: "Видеопоздравления, требующие внимания",
    uk: "Відеопривітання, що потребують уваги",
    pl: "Wideo-życzenia wymagające uwagi",
    de: "Videogrüße, die Aufmerksamkeit brauchen",
    fr: "Vidéos de vœux nécessitant une attention",
  },
  intro: {
    en: "Nothing here is resubmitted or refunded automatically. Confirm a failure only after checking the provider; the refund then happens exactly once.",
    ru: "Здесь ничего не отправляется повторно и не возвращается автоматически. Подтверждайте сбой только после проверки у провайдера — возврат произойдёт ровно один раз.",
    uk: "Тут нічого не надсилається повторно і не повертається автоматично. Підтверджуйте збій лише після перевірки в провайдера — повернення відбудеться рівно один раз.",
    pl: "Nic tu nie jest automatycznie wysyłane ponownie ani zwracane. Potwierdź błąd dopiero po sprawdzeniu u dostawcy — zwrot nastąpi dokładnie raz.",
    de: "Hier wird nichts automatisch erneut gesendet oder erstattet. Bestätigen Sie einen Fehler erst nach Prüfung beim Anbieter – die Erstattung erfolgt genau einmal.",
    fr: "Rien n'est renvoyé ni remboursé automatiquement ici. Confirmez un échec seulement après vérification chez le fournisseur ; le remboursement a lieu une seule fois.",
  },
  empty: {
    en: "No stuck or flagged operations.",
    ru: "Зависших или отмеченных операций нет.",
    uk: "Завислих або позначених операцій немає.",
    pl: "Brak zawieszonych lub oznaczonych operacji.",
    de: "Keine hängenden oder markierten Vorgänge.",
    fr: "Aucune opération bloquée ou signalée.",
  },
  recheck: { en: "Check again", ru: "Проверить снова", uk: "Перевірити знову", pl: "Sprawdź ponownie", de: "Erneut prüfen", fr: "Revérifier" },
  fail: {
    en: "Confirm failed & refund",
    ru: "Подтвердить сбой и вернуть",
    uk: "Підтвердити збій і повернути",
    pl: "Potwierdź błąd i zwróć",
    de: "Fehler bestätigen & erstatten",
    fr: "Confirmer l'échec et rembourser",
  },
  confirm: {
    en: "Confirm this film failed at the provider? Credits are returned once.",
    ru: "Подтвердить, что фильм не создан у провайдера? Кредиты вернутся один раз.",
    uk: "Підтвердити, що фільм не створено в провайдера? Кредити повернуться один раз.",
    pl: "Potwierdzić, że film nie powstał u dostawcy? Kredyty wrócą raz.",
    de: "Bestätigen, dass der Film beim Anbieter fehlgeschlagen ist? Credits werden einmal erstattet.",
    fr: "Confirmer que le film a échoué chez le fournisseur ? Les crédits sont rendus une fois.",
  },
  review: { en: "Needs review", ru: "Нужна проверка", uk: "Потрібна перевірка", pl: "Do sprawdzenia", de: "Prüfung nötig", fr: "À vérifier" },
  noSpeaker: { en: "no speaker", ru: "без говорящего", uk: "без мовця", pl: "bez mówcy", de: "ohne Sprecher", fr: "sans locuteur" },
};

export function PvgOperationsCard() {
  const { lang } = useI18n();
  const t = (k: string) => T[k]?.[lang as Lang] ?? T[k]?.en ?? k;
  const [rows, setRows] = useState<PvgOperationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setProblem(null);
    try {
      setRows(await listPvgOperations());
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => void reload(), [reload]);

  const act = async (id: string, action: "recheck" | "confirm_failed") => {
    if (action === "confirm_failed" && !window.confirm(t("confirm"))) return;
    setBusy(id);
    try {
      const r = await resolvePvgOperation({ data: { videoId: id, action } });
      if (!r.ok) setProblem(r.error ?? "error");
      await reload();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{t("title")}</h3>
          <p className="mt-1 max-w-3xl text-xs text-muted-foreground">{t("intro")}</p>
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/50"
          onClick={() => void reload()}
          disabled={loading}
          aria-label="reload"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      {problem && <p className="mt-2 text-xs text-destructive">{problem}</p>}
      {rows.length === 0 && !loading ? (
        <p className="mt-3 text-xs text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg border border-border/50 bg-background p-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono break-all">{r.id}</span>
                <span className="rounded bg-muted px-1.5 py-0.5">{r.status}</span>
                {r.submissionState && <span className="rounded bg-muted px-1.5 py-0.5">{r.submissionState}</span>}
                {r.route === "scene" && <span className="rounded bg-muted px-1.5 py-0.5">{t("noSpeaker")}</span>}
                {r.needsReview && (
                  <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-destructive">{t("review")}</span>
                )}
              </div>
              <p className="mt-1 break-words text-muted-foreground">
                {r.engine ?? "—"} · {r.predictionId ?? "—"} · {r.creditsCharged} cr ·{" "}
                {new Date(r.createdAt).toLocaleString()} · tries {r.attempts} · callbacks {r.callbackCount}
                {r.reviewReason ? ` · ${r.reviewReason}` : ""}
                {r.lastError ? ` · ${r.lastError}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {!["ready", "failed"].includes(r.status) && (
                  <button
                    className="rounded-md border border-border/60 px-3 py-2 hover:bg-muted/50 disabled:opacity-40"
                    disabled={busy === r.id}
                    onClick={() => void act(r.id, "recheck")}
                  >
                    {t("recheck")}
                  </button>
                )}
                {r.status !== "ready" && r.creditsCharged > 0 && (
                  <button
                    className="rounded-md bg-destructive px-3 py-2 text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40"
                    disabled={busy === r.id}
                    onClick={() => void act(r.id, "confirm_failed")}
                  >
                    {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("fail")}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
