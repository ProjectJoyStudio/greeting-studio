// Shared confirmation for administrator "Delete permanently". Removal runs
// through the verified cleanup; the result shown is what was actually proven.
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n/types";
import { MANUAL_CONFIRM_WORD } from "@/lib/cleanup/manual-input";

type Dict = Record<string, Record<Lang, string>>;
export const MP: Dict = {
  title: { en: "Delete permanently?", ru: "Удалить навсегда?", uk: "Видалити назавжди?", pl: "Usunąć trwale?", de: "Endgültig löschen?", fr: "Supprimer définitivement ?" },
  body: {
    en: "Every file of this item is removed and each removal is checked independently. Files used elsewhere are kept. This cannot be undone.",
    ru: "Все файлы элемента будут удалены, и удаление каждого проверяется отдельно. Файлы, используемые в другом месте, сохраняются. Отменить нельзя.",
    uk: "Усі файли елемента буде видалено, і видалення кожного перевіряється окремо. Файли, що використовуються деінде, зберігаються. Скасувати не можна.",
    pl: "Wszystkie pliki elementu zostaną usunięte, a usunięcie każdego zostanie osobno sprawdzone. Pliki używane gdzie indziej zostaną zachowane. Nie można cofnąć.",
    de: "Alle Dateien dieses Elements werden entfernt und jede Entfernung wird einzeln geprüft. Anderswo genutzte Dateien bleiben erhalten. Nicht umkehrbar.",
    fr: "Tous les fichiers de cet élément sont supprimés et chaque suppression est vérifiée séparément. Les fichiers utilisés ailleurs sont conservés. Irréversible.",
  },
  ack: { en: "I understand this is irreversible", ru: "Я понимаю, что это необратимо", uk: "Я розумію, що це незворотно", pl: "Rozumiem, że to nieodwracalne", de: "Mir ist bewusst, dass dies endgültig ist", fr: "Je comprends que c'est irréversible" },
  early: {
    en: "The retention period has not ended yet. Remove it before the retention date anyway",
    ru: "Срок хранения ещё не закончился. Всё равно удалить до окончания срока",
    uk: "Термін зберігання ще не закінчився. Усе одно видалити до завершення терміну",
    pl: "Okres przechowywania jeszcze trwa. Mimo to usuń przed jego końcem",
    de: "Die Aufbewahrungsfrist läuft noch. Trotzdem vor Ablauf entfernen",
    fr: "La période de conservation n'est pas terminée. Supprimer quand même avant la date",
  },
  earlyLocked: {
    en: "The retention period has not ended yet, so this item cannot be removed now.",
    ru: "Срок хранения ещё не закончился, поэтому сейчас этот элемент удалить нельзя.",
    uk: "Термін зберігання ще не закінчився, тому зараз цей елемент видалити не можна.",
    pl: "Okres przechowywania jeszcze trwa, więc tego elementu nie można teraz usunąć.",
    de: "Die Aufbewahrungsfrist läuft noch, daher kann dieses Element jetzt nicht entfernt werden.",
    fr: "La période de conservation n'est pas terminée ; cet élément ne peut pas être supprimé maintenant.",
  },
  cancel: { en: "Cancel", ru: "Отмена", uk: "Скасувати", pl: "Anuluj", de: "Abbrechen", fr: "Annuler" },
  confirm: { en: "Delete permanently", ru: "Удалить навсегда", uk: "Видалити назавжди", pl: "Usuń trwale", de: "Endgültig löschen", fr: "Supprimer définitivement" },
  COMPLETED: { en: "Deleted. Every file was confirmed gone.", ru: "Удалено. Отсутствие каждого файла подтверждено.", uk: "Видалено. Відсутність кожного файлу підтверджено.", pl: "Usunięto. Brak każdego pliku potwierdzony.", de: "Gelöscht. Jede Datei ist nachweislich entfernt.", fr: "Supprimé. L'absence de chaque fichier est confirmée." },
  RETRY_REQUIRED: { en: "Some files could not be removed yet. They will be retried automatically.", ru: "Часть файлов пока не удалена. Будет автоматический повтор.", uk: "Частину файлів ще не видалено. Буде автоматичний повтор.", pl: "Części plików jeszcze nie usunięto. Nastąpi automatyczna ponowna próba.", de: "Einige Dateien konnten noch nicht entfernt werden. Es wird automatisch erneut versucht.", fr: "Certains fichiers n'ont pas encore pu être supprimés. Nouvel essai automatique." },
  FAILED: { en: "Deletion failed for some files. The item was kept; see the cleanup history.", ru: "Удаление части файлов не удалось. Элемент сохранён; см. историю очистки.", uk: "Видалення частини файлів не вдалося. Елемент збережено; див. історію очищення.", pl: "Nie udało się usunąć części plików. Element zachowano; zobacz historię czyszczenia.", de: "Löschen einiger Dateien fehlgeschlagen. Element bleibt erhalten; siehe Bereinigungsverlauf.", fr: "Échec pour certains fichiers. L'élément est conservé ; voir l'historique." },
  NOT_VERIFIED: { en: "Deletion could not be confirmed or a file needs review. The item was kept.", ru: "Удаление не подтверждено или файл требует проверки. Элемент сохранён.", uk: "Видалення не підтверджено або файл потребує перевірки. Елемент збережено.", pl: "Nie potwierdzono usunięcia lub plik wymaga sprawdzenia. Element zachowano.", de: "Löschung nicht bestätigt oder Datei muss geprüft werden. Element bleibt erhalten.", fr: "Suppression non confirmée ou fichier à examiner. L'élément est conservé." },
  CANCELLED: { en: "Stopped: the item was restored meanwhile.", ru: "Остановлено: элемент тем временем восстановлен.", uk: "Зупинено: елемент тим часом відновлено.", pl: "Zatrzymano: element został w międzyczasie przywrócony.", de: "Gestoppt: Element wurde inzwischen wiederhergestellt.", fr: "Arrêté : l'élément a été restauré entre-temps." },
  BUSY: { en: "This item is already being deleted. Try again in a few minutes.", ru: "Этот элемент уже удаляется. Повторите через несколько минут.", uk: "Цей елемент уже видаляється. Повторіть за кілька хвилин.", pl: "Ten element jest już usuwany. Spróbuj za kilka minut.", de: "Dieses Element wird bereits gelöscht. Versuchen Sie es in einigen Minuten.", fr: "Cet élément est déjà en cours de suppression. Réessayez dans quelques minutes." },
  REFUSED_NOT_IN_TRASH: { en: "Only items in the recycle bin can be deleted permanently.", ru: "Навсегда удалить можно только элементы из корзины.", uk: "Назавжди видалити можна лише елементи з кошика.", pl: "Trwale usunąć można tylko elementy z kosza.", de: "Nur Elemente im Papierkorb können endgültig gelöscht werden.", fr: "Seuls les éléments de la corbeille peuvent être supprimés définitivement." },
  REFUSED_RETENTION: { en: "The retention period has not ended yet.", ru: "Срок хранения ещё не закончился.", uk: "Термін зберігання ще не закінчився.", pl: "Okres przechowywania jeszcze trwa.", de: "Die Aufbewahrungsfrist läuft noch.", fr: "La période de conservation n'est pas terminée." },
  REFUSED_ACTIVE: { en: "The customer still uses this (shared link, scheduled sending or unfinished video). Nothing was deleted.", ru: "Клиент ещё пользуется этим (общая ссылка, запланированная отправка или незавершённое видео). Ничего не удалено.", uk: "Клієнт ще користується цим (спільне посилання, запланована відправка або незавершене відео). Нічого не видалено.", pl: "Klient nadal z tego korzysta (link, zaplanowana wysyłka lub niedokończone wideo). Nic nie usunięto.", de: "Der Kunde nutzt dies noch (geteilter Link, geplanter Versand oder unfertiges Video). Nichts gelöscht.", fr: "Le client l'utilise encore (lien partagé, envoi programmé ou vidéo inachevée). Rien n'a été supprimé." },
  SKIPPED: { en: "Already deleted earlier.", ru: "Уже удалено ранее.", uk: "Вже видалено раніше.", pl: "Już usunięte wcześniej.", de: "Bereits früher gelöscht.", fr: "Déjà supprimé." },
  confirmation_required: { en: "Please confirm the deletion first.", ru: "Сначала подтвердите удаление.", uk: "Спочатку підтвердьте видалення.", pl: "Najpierw potwierdź usunięcie.", de: "Bitte bestätigen Sie zuerst das Löschen.", fr: "Veuillez d'abord confirmer la suppression." },
};

export interface ManualPurgeOutcome {
  outcome: string;
  counts: { total: number; verified: number; absent: number; protected: number; unresolved: number } | null;
}

export function useManualPurgeMessages() {
  const { lang } = useI18n();
  const say = (k: string) => MP[k]?.[lang as Lang] ?? MP[k]?.en ?? k;
  return {
    say,
    /** Shows the proven result; returns true when the item is fully deleted. */
    report(r: ManualPurgeOutcome): boolean {
      const ok = r.outcome === "COMPLETED" || r.outcome === "SKIPPED";
      const c = r.counts;
      const detail = c ? ` (${c.verified} / ${c.absent} / ${c.protected} / ${c.unresolved})` : "";
      if (ok) toast.success(say(r.outcome) + (r.outcome === "COMPLETED" ? detail : ""));
      else if (r.outcome === "RETRY_REQUIRED" || r.outcome === "BUSY") toast.warning(say(r.outcome) + detail);
      else toast.error(say(r.outcome) + detail);
      return ok;
    },
    error(e: unknown) {
      const m = e instanceof Error ? e.message : "Error";
      toast.error(MP[m] ? say(m) : m);
    },
  };
}

export function ManualPurgeDialog(props: {
  purgeAfter: string | null;
  /** Whether this page allows an explicitly confirmed early removal. */
  allowEarly: boolean;
  pending: boolean;
  onCancel(): void;
  onConfirm(input: { confirm: string; allowBeforeRetention: boolean }): void;
}) {
  const { say } = useManualPurgeMessages();
  const [ack, setAck] = useState(false);
  const [early, setEarly] = useState(false);
  const inRetention = !!props.purgeAfter && Date.parse(props.purgeAfter) > Date.now();
  const blocked = inRetention && !props.allowEarly;
  const ready = ack && !blocked && (!inRetention || early) && !props.pending;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="mp-title" className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-background/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-5 shadow-xl sm:p-6">
        <h3 id="mp-title" className="font-[Fraunces] text-lg font-semibold text-foreground">{say("title")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{say("body")}</p>
        {blocked ? (
          <p className="mt-4 rounded-lg bg-secondary p-3 text-sm text-foreground">{say("earlyLocked")}</p>
        ) : (
          <div className="mt-4 space-y-3 text-sm text-foreground">
            <label className="flex items-start gap-3">
              <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              <span>{say("ack")}</span>
            </label>
            {inRetention && (
              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={early} onChange={(e) => setEarly(e.target.checked)} />
                <span>{say("early")}</span>
              </label>
            )}
          </div>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={props.onCancel} className="rounded-full border border-border/60 px-5 py-2.5 text-sm hover:bg-secondary">
            {say("cancel")}
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => props.onConfirm({ confirm: MANUAL_CONFIRM_WORD, allowBeforeRetention: inRetention && early })}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-destructive px-5 py-2.5 text-sm font-medium text-destructive-foreground disabled:opacity-50"
          >
            {props.pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {say("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
