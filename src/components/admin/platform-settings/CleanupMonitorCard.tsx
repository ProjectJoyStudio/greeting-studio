// Read-only monitor of the verified automatic cleanup. Opening it never
// starts or retries a deletion.
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n/types";
import {
  listCleanupObjects,
  listCleanupOperations,
  type CleanupObjectRow,
  type CleanupOperationRow,
  type CleanupSummary,
} from "@/lib/admin/cleanup-monitor.functions";

type Dict = Record<string, Record<Lang, string>>;
const T: Dict = {
  title: { en: "Automatic file cleanup", ru: "Автоматическая очистка файлов", uk: "Автоматичне очищення файлів", pl: "Automatyczne czyszczenie plików", de: "Automatische Dateibereinigung", fr: "Nettoyage automatique des fichiers" },
  intro: {
    en: "Files of expired deleted items are removed only after each one is independently confirmed gone. This page only shows history; it never deletes or retries anything.",
    ru: "Файлы удалённых элементов с истёкшим сроком удаляются, только когда отдельная проверка подтверждает, что каждого файла больше нет. Страница только показывает историю и ничего не удаляет и не повторяет.",
    uk: "Файли видалених елементів із завершеним терміном видаляються лише після окремої перевірки, що кожного файлу більше немає. Сторінка лише показує історію й нічого не видаляє і не повторює.",
    pl: "Pliki usuniętych elementów po terminie są usuwane dopiero, gdy osobne sprawdzenie potwierdzi brak każdego z nich. Ta strona tylko pokazuje historię — niczego nie usuwa ani nie ponawia.",
    de: "Dateien abgelaufener gelöschter Elemente werden erst entfernt, wenn eine unabhängige Prüfung bestätigt, dass jede Datei weg ist. Diese Seite zeigt nur den Verlauf und löscht oder wiederholt nichts.",
    fr: "Les fichiers des éléments supprimés expirés ne sont retirés qu'après une vérification indépendante de leur absence. Cette page affiche seulement l'historique ; elle ne supprime ni ne relance rien.",
  },
  verified: { en: "Verified deleted", ru: "Удалено, проверено", uk: "Видалено, перевірено", pl: "Usunięte, sprawdzone", de: "Gelöscht, geprüft", fr: "Supprimés, vérifiés" },
  absent: { en: "Already absent", ru: "Уже отсутствовали", uk: "Вже були відсутні", pl: "Już nieobecne", de: "Bereits fehlend", fr: "Déjà absents" },
  pending: { en: "Pending", ru: "В ожидании", uk: "Очікують", pl: "Oczekujące", de: "Ausstehend", fr: "En attente" },
  failed: { en: "Failed", ru: "Ошибка", uk: "Помилка", pl: "Błąd", de: "Fehlgeschlagen", fr: "Échec" },
  notVerified: { en: "Not verified", ru: "Не подтверждено", uk: "Не підтверджено", pl: "Niepotwierdzone", de: "Nicht bestätigt", fr: "Non vérifié" },
  lastRun: { en: "Last run", ru: "Последний запуск", uk: "Останній запуск", pl: "Ostatnie uruchomienie", de: "Letzter Lauf", fr: "Dernière exécution" },
  nextRetry: { en: "Next retry", ru: "Следующая попытка", uk: "Наступна спроба", pl: "Następna próba", de: "Nächster Versuch", fr: "Prochain essai" },
  filter: { en: "Show", ru: "Показать", uk: "Показати", pl: "Pokaż", de: "Anzeigen", fr: "Afficher" },
  f_all: { en: "All", ru: "Все", uk: "Усі", pl: "Wszystkie", de: "Alle", fr: "Toutes" },
  f_open: { en: "In progress / retrying", ru: "В работе / повтор", uk: "У роботі / повтор", pl: "W toku / ponawiane", de: "In Arbeit / Wiederholung", fr: "En cours / relance" },
  empty: { en: "No cleanup operations yet.", ru: "Операций очистки пока нет.", uk: "Операцій очищення ще немає.", pl: "Brak operacji czyszczenia.", de: "Noch keine Bereinigungen.", fr: "Aucune opération de nettoyage." },
  files: { en: "files", ru: "файлов", uk: "файлів", pl: "plików", de: "Dateien", fr: "fichiers" },
  tries: { en: "attempts", ru: "попыток", uk: "спроб", pl: "prób", de: "Versuche", fr: "tentatives" },
  details: { en: "File history", ru: "История файлов", uk: "Історія файлів", pl: "Historia plików", de: "Dateiverlauf", fr: "Historique des fichiers" },
  test: { en: "test", ru: "тест", uk: "тест", pl: "test", de: "Test", fr: "test" },
  error: { en: "Error", ru: "Ошибка", uk: "Помилка", pl: "Błąd", de: "Fehler", fr: "Erreur" },
  loadError: { en: "Could not load cleanup history.", ru: "Не удалось загрузить историю очистки.", uk: "Не вдалося завантажити історію очищення.", pl: "Nie udało się wczytać historii czyszczenia.", de: "Bereinigungsverlauf konnte nicht geladen werden.", fr: "Impossible de charger l'historique." },
  reload: { en: "Refresh", ru: "Обновить", uk: "Оновити", pl: "Odśwież", de: "Aktualisieren", fr: "Actualiser" },
  // Item types
  card: { en: "Postcard", ru: "Открытка", uk: "Листівка", pl: "Kartka", de: "Postkarte", fr: "Carte" },
  live_card: { en: "Live card image", ru: "Изображение живой открытки", uk: "Зображення живої листівки", pl: "Obraz żywej kartki", de: "Bild der Live-Karte", fr: "Image de carte animée" },
  live_animation: { en: "Live greeting", ru: "Живое поздравление", uk: "Живе привітання", pl: "Żywe życzenia", de: "Live-Gruß", fr: "Vœu animé" },
  pvg_project: { en: "Video greeting", ru: "Видеопоздравление", uk: "Відеопривітання", pl: "Wideo-życzenia", de: "Videogruß", fr: "Vidéo de vœux" },
  // Statuses
  s_PENDING: { en: "Pending", ru: "В ожидании", uk: "Очікує", pl: "Oczekuje", de: "Ausstehend", fr: "En attente" },
  s_IN_PROGRESS: { en: "In progress", ru: "Выполняется", uk: "Виконується", pl: "W toku", de: "In Arbeit", fr: "En cours" },
  s_RETRY_REQUIRED: { en: "Retry scheduled", ru: "Запланирован повтор", uk: "Заплановано повтор", pl: "Zaplanowano ponowienie", de: "Wiederholung geplant", fr: "Nouvel essai prévu" },
  s_COMPLETED: { en: "Completed", ru: "Завершено", uk: "Завершено", pl: "Zakończone", de: "Abgeschlossen", fr: "Terminé" },
  s_FAILED: { en: "Failed", ru: "Ошибка", uk: "Помилка", pl: "Błąd", de: "Fehlgeschlagen", fr: "Échec" },
  s_NOT_VERIFIED: { en: "Not verified", ru: "Не подтверждено", uk: "Не підтверджено", pl: "Niepotwierdzone", de: "Nicht bestätigt", fr: "Non vérifié" },
  s_CANCELLED: { en: "Cancelled (no longer eligible)", ru: "Отменено (больше не подлежит)", uk: "Скасовано (більше не підлягає)", pl: "Anulowano (już nie kwalifikuje się)", de: "Abgebrochen (nicht mehr fällig)", fr: "Annulé (plus éligible)" },
  s_VERIFIED_DELETED: { en: "Deleted, verified", ru: "Удалён, проверено", uk: "Видалено, перевірено", pl: "Usunięty, sprawdzony", de: "Gelöscht, geprüft", fr: "Supprimé, vérifié" },
  s_ALREADY_ABSENT_VERIFIED: { en: "Already absent, verified", ru: "Уже отсутствовал, проверено", uk: "Вже був відсутній, перевірено", pl: "Już nieobecny, sprawdzony", de: "Bereits fehlend, geprüft", fr: "Déjà absent, vérifié" },
  s_PROTECTED_RETAINED: { en: "Kept (still needed elsewhere)", ru: "Сохранён (нужен в другом месте)", uk: "Збережено (потрібен деінде)", pl: "Zachowany (potrzebny gdzie indziej)", de: "Behalten (anderswo benötigt)", fr: "Conservé (utilisé ailleurs)" },
  // Verification results
  v_absent_after_delete: { en: "Confirmed gone after deletion", ru: "После удаления файла нет", uk: "Після видалення файлу немає", pl: "Po usunięciu pliku brak", de: "Nach dem Löschen nicht mehr vorhanden", fr: "Absent après suppression" },
  v_absent_before_delete: { en: "Was already gone", ru: "Файла уже не было", uk: "Файлу вже не було", pl: "Pliku już nie było", de: "War bereits weg", fr: "Était déjà absent" },
  v_still_present_after_delete: { en: "Still present after deletion", ru: "Файл остался после удаления", uk: "Файл залишився після видалення", pl: "Plik wciąż istnieje po usunięciu", de: "Nach dem Löschen noch vorhanden", fr: "Toujours présent après suppression" },
  v_presence_unknown_before: { en: "Could not check before deletion", ru: "Не удалось проверить до удаления", uk: "Не вдалося перевірити до видалення", pl: "Nie udało się sprawdzić przed usunięciem", de: "Vor dem Löschen nicht prüfbar", fr: "Vérification impossible avant suppression" },
  v_presence_unknown_after: { en: "Could not confirm after deletion", ru: "Не удалось подтвердить после удаления", uk: "Не вдалося підтвердити після видалення", pl: "Nie udało się potwierdzić po usunięciu", de: "Nach dem Löschen nicht bestätigbar", fr: "Confirmation impossible après suppression" },
  v_out_of_scope: { en: "Outside this item's folder — not touched", ru: "Вне папки элемента — не тронут", uk: "Поза текою елемента — не змінено", pl: "Poza folderem elementu — nietknięty", de: "Außerhalb des Ordners — unberührt", fr: "Hors du dossier — non modifié" },
  v_reference_check_failed: { en: "Usage check failed", ru: "Проверка использования не удалась", uk: "Перевірка використання не вдалася", pl: "Sprawdzenie użycia nie powiodło się", de: "Nutzungsprüfung fehlgeschlagen", fr: "Échec du contrôle d'utilisation" },
  v_not_checked: { en: "Storage refused the deletion", ru: "Хранилище отклонило удаление", uk: "Сховище відхилило видалення", pl: "Magazyn odrzucił usunięcie", de: "Speicher hat das Löschen abgelehnt", fr: "Le stockage a refusé la suppression" },
  v_referenced: { en: "Used by another item", ru: "Используется другим элементом", uk: "Використовується іншим елементом", pl: "Używany przez inny element", de: "Von anderem Element verwendet", fr: "Utilisé par un autre élément" },
};

const STATUS_TONE: Record<string, string> = {
  COMPLETED: "bg-primary/10 text-primary",
  VERIFIED_DELETED: "bg-primary/10 text-primary",
  ALREADY_ABSENT_VERIFIED: "bg-primary/10 text-primary",
  FAILED: "bg-destructive/10 text-destructive",
  NOT_VERIFIED: "bg-destructive/10 text-destructive",
};

const FILTERS = ["all", "open", "FAILED", "NOT_VERIFIED", "COMPLETED", "CANCELLED"] as const;
type Filter = (typeof FILTERS)[number];

function dt(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function CleanupMonitorCard() {
  const { lang } = useI18n();
  const t = (k: string) => T[k]?.[lang as Lang] ?? T[k]?.en ?? k;
  const verif = (v: string | null) => (!v ? "—" : v.startsWith("referenced_by_") ? t("v_referenced") : T[`v_${v}`] ? t(`v_${v}`) : v);
  const [filter, setFilter] = useState<Filter>("all");
  const [rows, setRows] = useState<CleanupOperationRow[]>([]);
  const [summary, setSummary] = useState<CleanupSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [objects, setObjects] = useState<Record<string, CleanupObjectRow[]>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    setProblem(false);
    try {
      const r = await listCleanupOperations({ data: { status: filter } });
      setRows(r.rows);
      setSummary(r.summary);
    } catch {
      setProblem(true);
    } finally {
      setLoading(false);
    }
  }, [filter]);
  useEffect(() => void reload(), [reload]);

  const toggle = async (id: string) => {
    if (open === id) return setOpen(null);
    setOpen(id);
    if (!objects[id]) {
      try {
        const list = await listCleanupObjects({ data: { operationId: id } });
        setObjects((m) => ({ ...m, [id]: list }));
      } catch {
        setProblem(true);
      }
    }
  };

  const chip = (s: string) => (
    <span className={`rounded px-1.5 py-0.5 ${STATUS_TONE[s] ?? "bg-muted text-foreground"}`}>{t(`s_${s}`)}</span>
  );

  return (
    <div className="min-w-0 rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm sm:p-5" data-testid="cleanup-monitor">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{t("title")}</h3>
          <p className="mt-1 max-w-3xl text-xs text-muted-foreground">{t("intro")}</p>
        </div>
        <button
          className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/50"
          onClick={() => void reload()}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {t("reload")}
        </button>
      </div>

      {summary && (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:grid-cols-7">
          {(
            [
              ["verified", summary.verified],
              ["absent", summary.absent],
              ["pending", summary.pending],
              ["failed", summary.failed],
              ["notVerified", summary.notVerified],
              ["lastRun", dt(summary.lastRunAt)],
              ["nextRetry", dt(summary.nextRetryAt)],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="min-w-0 rounded-lg border border-border/50 bg-background p-2">
              <dt className="truncate text-muted-foreground">{t(k)}</dt>
              <dd className="mt-0.5 break-words font-semibold text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      <label className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {t("filter")}
        <select
          className="min-h-10 max-w-full rounded-md border border-border/60 bg-background px-2 py-1 text-xs text-foreground"
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
        >
          {FILTERS.map((f) => (
            <option key={f} value={f}>
              {f === "all" ? t("f_all") : f === "open" ? t("f_open") : t(`s_${f}`)}
            </option>
          ))}
        </select>
      </label>

      {problem && <p className="mt-2 text-xs text-destructive">{t("loadError")}</p>}
      {rows.length === 0 && !loading ? (
        <p className="mt-3 text-xs text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="min-w-0 rounded-lg border border-border/50 bg-background text-xs">
              <button
                className="flex w-full min-w-0 items-start gap-2 p-3 text-left"
                onClick={() => void toggle(r.id)}
                aria-expanded={open === r.id}
              >
                {open === r.id ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0" /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" />}
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{t(r.entityType)}</span>
                    {chip(r.status)}
                    {r.isTest && <span className="rounded bg-muted px-1.5 py-0.5">{t("test")}</span>}
                  </span>
                  <span className="mt-1 block break-all font-mono text-muted-foreground">{r.entityId}</span>
                  <span className="mt-1 block break-words text-muted-foreground">
                    {r.total} {t("files")} · {t("verified")} {r.verified} · {t("absent")} {r.absent} · {r.attempts} {t("tries")} ·{" "}
                    {t("lastRun")}: {dt(r.lastRunAt)}
                    {r.nextAttemptAt ? ` · ${t("nextRetry")}: ${dt(r.nextAttemptAt)}` : ""}
                  </span>
                  {r.lastError && (
                    <span className="mt-1 block break-words text-destructive">
                      {t("error")}: {r.lastError}
                    </span>
                  )}
                </span>
              </button>
              {open === r.id && (
                <div className="border-t border-border/50 p-3">
                  <p className="mb-2 font-medium text-foreground">{t("details")}</p>
                  <ul className="space-y-2">
                    {(objects[r.id] ?? []).map((o) => (
                      <li key={o.id} className="min-w-0 rounded border border-border/40 p-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {chip(o.status)}
                          <span className="break-all font-mono">{o.bucket}/…/{o.keyTail}</span>
                        </div>
                        <p className="mt-1 break-words text-muted-foreground">
                          {verif(o.verification)} · {o.attempt} {t("tries")} · {dt(o.lastAttemptAt)}
                          {o.nextAttemptAt ? ` · ${t("nextRetry")}: ${dt(o.nextAttemptAt)}` : ""}
                        </p>
                        {o.error && <p className="mt-1 break-words text-destructive">{t("error")}: {o.error}</p>}
                        {o.history.length > 1 && (
                          <ol className="mt-1 list-decimal pl-5 text-muted-foreground">
                            {o.history.map((h) => (
                              <li key={`${h.attempt}-${h.at}`} className="break-words">
                                {dt(h.at)} · {t(`s_${h.status}`)} · {verif(h.verification)}
                              </li>
                            ))}
                          </ol>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
