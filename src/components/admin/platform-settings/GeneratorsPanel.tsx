// ---------------------------------------------------------------------------
// Project Joy — Generator Control Centre.
//
// Shows the engines that really serve the product, grouped by the Project Joy
// feature that uses them, and lets the administrator choose the primary and
// backup engine, switch an engine off, allow automatic failover, spread jobs
// across engines, cap parallel jobs and check the connection.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Plug, Power, RefreshCw, Save, XCircle } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n/types";
import { GENERATOR_FEATURES, allGenerators, findGenerator } from "@/lib/admin/generators/registry";
import {
  defaultGeneratorSettings,
  type GeneratorControlSettings,
} from "@/lib/admin/generators/settings";
import {
  checkGenerator,
  loadGeneratorSettings,
  saveGeneratorSettings,
} from "@/lib/admin/generators/generators.functions";

const cardCls = "rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur";
const btnBase =
  "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/50 disabled:opacity-40";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-40";
const selectCls =
  "w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-xs outline-none focus:border-primary/60";
const labelCls = "text-[11px] font-medium uppercase tracking-wide text-muted-foreground";

type Dict = Record<string, Record<Lang, string>>;

const T: Dict = {
  gc_title: {
    en: "Generator control centre",
    ru: "Центр управления генераторами",
    de: "Generator-Kontrollzentrum",
    uk: "Центр керування генераторами",
    fr: "Centre de contrôle des générateurs",
    pl: "Centrum sterowania generatorami",
  },
  gc_intro: {
    en: "Real providers and models currently used by Project Joy. Changes apply to new jobs only — running jobs are never interrupted.",
    ru: "Реальные провайдеры и модели, которые сейчас использует Project Joy. Изменения действуют только для новых задач — текущие не прерываются.",
    de: "Reale Anbieter und Modelle, die Project Joy derzeit nutzt. Änderungen gelten nur für neue Aufträge — laufende werden nie unterbrochen.",
    uk: "Реальні провайдери та моделі, які зараз використовує Project Joy. Зміни діють лише для нових завдань — поточні не перериваються.",
    fr: "Fournisseurs et modèles réellement utilisés par Project Joy. Les changements ne s'appliquent qu'aux nouvelles tâches.",
    pl: "Rzeczywiści dostawcy i modele używane przez Project Joy. Zmiany dotyczą tylko nowych zadań.",
  },
  gc_save: {
    en: "Save",
    ru: "Сохранить",
    de: "Speichern",
    uk: "Зберегти",
    fr: "Enregistrer",
    pl: "Zapisz",
  },
  gc_saved: {
    en: "Saved",
    ru: "Сохранено",
    de: "Gespeichert",
    uk: "Збережено",
    fr: "Enregistré",
    pl: "Zapisano",
  },
  gc_reload: {
    en: "Reload",
    ru: "Обновить",
    de: "Neu laden",
    uk: "Оновити",
    fr: "Recharger",
    pl: "Odśwież",
  },
  gc_primary: {
    en: "Primary generator",
    ru: "Основной генератор",
    de: "Primärer Generator",
    uk: "Основний генератор",
    fr: "Générateur principal",
    pl: "Generator główny",
  },
  gc_backup: {
    en: "Backup generator",
    ru: "Резервный генератор",
    de: "Ersatzgenerator",
    uk: "Резервний генератор",
    fr: "Générateur de secours",
    pl: "Generator zapasowy",
  },
  gc_not_selected: {
    en: "Not selected",
    ru: "Не выбран",
    de: "Nicht ausgewählt",
    uk: "Не вибрано",
    fr: "Non sélectionné",
    pl: "Nie wybrano",
  },
  gc_not_conn: {
    en: "Not connected",
    ru: "Не подключено",
    de: "Nicht verbunden",
    uk: "Не підключено",
    fr: "Non connecté",
    pl: "Niepodłączone",
  },
  gc_autofail: {
    en: "Automatically use backup generator",
    ru: "Автоматически использовать резервный генератор",
    de: "Ersatzgenerator automatisch verwenden",
    uk: "Автоматично використовувати резервний генератор",
    fr: "Utiliser automatiquement le générateur de secours",
    pl: "Automatycznie użyj generatora zapasowego",
  },
  gc_autofail_h: {
    en: "Only on a genuine technical failure or unavailable provider — never because a result is creatively unsatisfying.",
    ru: "Только при реальном техническом сбое или недоступности провайдера — никогда из-за неудачного по качеству результата.",
    de: "Nur bei echtem technischem Fehler oder nicht erreichbarem Anbieter — nie wegen eines kreativ unbefriedigenden Ergebnisses.",
    uk: "Лише за реального технічного збою або недоступності провайдера — ніколи через незадовільний результат.",
    fr: "Uniquement en cas de panne technique réelle ou de fournisseur indisponible.",
    pl: "Tylko przy rzeczywistej awarii technicznej lub niedostępności dostawcy.",
  },
  gc_load: {
    en: "Load distribution",
    ru: "Распределение нагрузки",
    de: "Lastverteilung",
    uk: "Розподіл навантаження",
    fr: "Répartition de charge",
    pl: "Rozkład obciążenia",
  },
  gc_load_h: {
    en: "Different customer jobs are spread across the enabled generators. One job is always processed by one generator only.",
    ru: "Разные заказы клиентов распределяются между включёнными генераторами. Одна задача всегда обрабатывается только одним генератором.",
    de: "Verschiedene Kundenaufträge werden auf die aktiven Generatoren verteilt. Ein Auftrag läuft immer nur auf einem Generator.",
    uk: "Різні замовлення клієнтів розподіляються між увімкненими генераторами. Одне завдання завжди обробляє лише один генератор.",
    fr: "Les tâches de clients différents sont réparties entre les générateurs actifs. Une tâche n'est traitée que par un seul générateur.",
    pl: "Zadania różnych klientów są rozdzielane między aktywne generatory. Jedno zadanie obsługuje tylko jeden generator.",
  },
  gc_used_in: {
    en: "Also used in",
    ru: "Также используется в",
    de: "Auch verwendet in",
    uk: "Також використовується в",
    fr: "Également utilisé dans",
    pl: "Używany także w",
  },
  gc_engines: {
    en: "Connected generators",
    ru: "Подключённые генераторы",
    de: "Verbundene Generatoren",
    uk: "Підключені генератори",
    fr: "Générateurs connectés",
    pl: "Podłączone generatory",
  },
  gc_enabled: {
    en: "Enabled",
    ru: "Включён",
    de: "Aktiv",
    uk: "Увімкнено",
    fr: "Activé",
    pl: "Włączony",
  },
  gc_disabled: {
    en: "Disabled",
    ru: "Выключен",
    de: "Deaktiviert",
    uk: "Вимкнено",
    fr: "Désactivé",
    pl: "Wyłączony",
  },
  gc_enable: {
    en: "Enable",
    ru: "Включить",
    de: "Aktivieren",
    uk: "Увімкнути",
    fr: "Activer",
    pl: "Włącz",
  },
  gc_disable: {
    en: "Disable",
    ru: "Выключить",
    de: "Deaktivieren",
    uk: "Вимкнути",
    fr: "Désactiver",
    pl: "Wyłącz",
  },
  gc_parallel: {
    en: "Parallel jobs",
    ru: "Параллельные задачи",
    de: "Parallele Aufträge",
    uk: "Паралельні завдання",
    fr: "Tâches parallèles",
    pl: "Zadania równoległe",
  },
  gc_auto: { en: "Auto", ru: "Авто", de: "Auto", uk: "Авто", fr: "Auto", pl: "Auto" },
  gc_manual: {
    en: "Manual limit",
    ru: "Ручной лимит",
    de: "Manuelles Limit",
    uk: "Ручний ліміт",
    fr: "Limite manuelle",
    pl: "Limit ręczny",
  },
  gc_check: {
    en: "Check connection",
    ru: "Проверить соединение",
    de: "Verbindung prüfen",
    uk: "Перевірити зʼєднання",
    fr: "Vérifier la connexion",
    pl: "Sprawdź połączenie",
  },
  gc_working: {
    en: "Working",
    ru: "Работает",
    de: "Funktioniert",
    uk: "Працює",
    fr: "Fonctionne",
    pl: "Działa",
  },
  gc_error: { en: "Error", ru: "Ошибка", de: "Fehler", uk: "Помилка", fr: "Erreur", pl: "Błąd" },
  gc_unknown: {
    en: "Not checked",
    ru: "Не проверено",
    de: "Nicht geprüft",
    uk: "Не перевірено",
    fr: "Non vérifié",
    pl: "Niesprawdzone",
  },
  gc_provider: {
    en: "Provider",
    ru: "Провайдер",
    de: "Anbieter",
    uk: "Провайдер",
    fr: "Fournisseur",
    pl: "Dostawca",
  },
  gc_model: { en: "Model", ru: "Модель", de: "Modell", uk: "Модель", fr: "Modèle", pl: "Model" },
  gc_disabled_note: {
    en: "Switching a generator off keeps its configuration and applies to new jobs only.",
    ru: "Выключение генератора сохраняет его настройки и действует только для новых задач.",
    de: "Das Deaktivieren behält die Konfiguration und gilt nur für neue Aufträge.",
    uk: "Вимкнення генератора зберігає його налаштування та діє лише для нових завдань.",
    fr: "Désactiver un générateur conserve sa configuration et ne concerne que les nouvelles tâches.",
    pl: "Wyłączenie generatora zachowuje konfigurację i dotyczy tylko nowych zadań.",
  },
  gc_unsaved: {
    en: "Unsaved changes — press Save to apply them to new jobs.",
    ru: "Есть несохранённые изменения — нажмите «Сохранить», чтобы они применились к новым задачам.",
    de: "Nicht gespeicherte Änderungen — bitte speichern, damit sie für neue Aufträge gelten.",
    uk: "Є незбережені зміни — натисніть «Зберегти», щоб вони діяли для нових завдань.",
    fr: "Modifications non enregistrées — cliquez sur Enregistrer pour les appliquer.",
    pl: "Niezapisane zmiany — kliknij Zapisz, aby je zastosować.",
  },
  // features
  gc_feature_cards: {
    en: "Greeting Cards",
    ru: "Открытки",
    de: "Grußkarten",
    uk: "Листівки",
    fr: "Cartes de vœux",
    pl: "Kartki",
  },
  gc_feature_live: {
    en: "Live Cards",
    ru: "Живые открытки",
    de: "Live-Karten",
    uk: "Живі листівки",
    fr: "Cartes animées",
    pl: "Żywe kartki",
  },
  gc_feature_pvg: {
    en: "Personal Video Greeting",
    ru: "Персональное видеопоздравление",
    de: "Persönlicher Video-Gruß",
    uk: "Персональне відеопривітання",
    fr: "Vidéo personnalisée",
    pl: "Osobiste wideo",
  },
  gc_feature_translation: {
    en: "Catalog & translations",
    ru: "Каталог и переводы",
    de: "Katalog & Übersetzungen",
    uk: "Каталог і переклади",
    fr: "Catalogue et traductions",
    pl: "Katalog i tłumaczenia",
  },
  gc_feature_future: {
    en: "Future sections",
    ru: "Будущие разделы",
    de: "Künftige Bereiche",
    uk: "Майбутні розділи",
    fr: "Sections futures",
    pl: "Przyszłe sekcje",
  },
  // functions
  gc_fn_card_image: {
    en: "Image generation",
    ru: "Генерация изображения",
    de: "Bilderzeugung",
    uk: "Генерація зображення",
    fr: "Génération d'image",
    pl: "Generowanie obrazu",
  },
  gc_fn_prompt_translation: {
    en: "Prompt preparation",
    ru: "Подготовка запроса",
    de: "Prompt-Aufbereitung",
    uk: "Підготовка запиту",
    fr: "Préparation du prompt",
    pl: "Przygotowanie promptu",
  },
  gc_fn_start_image: {
    en: "Start image",
    ru: "Стартовое изображение",
    de: "Startbild",
    uk: "Стартове зображення",
    fr: "Image de départ",
    pl: "Obraz startowy",
  },
  gc_fn_animation: {
    en: "Animation",
    ru: "Анимация",
    de: "Animation",
    uk: "Анімація",
    fr: "Animation",
    pl: "Animacja",
  },
  gc_fn_start_scene: {
    en: "Start scene",
    ru: "Стартовая сцена",
    de: "Startszene",
    uk: "Стартова сцена",
    fr: "Scène de départ",
    pl: "Scena startowa",
  },
  gc_fn_voice: {
    en: "Voice / TTS",
    ru: "Голос / озвучка",
    de: "Stimme / TTS",
    uk: "Голос / TTS",
    fr: "Voix / TTS",
    pl: "Głos / TTS",
  },
  gc_fn_greeting_text: {
    en: "Greeting text",
    ru: "Текст поздравления",
    de: "Grußtext",
    uk: "Текст привітання",
    fr: "Texte du message",
    pl: "Tekst życzeń",
  },
  gc_fn_transcription: {
    en: "Voice sample check",
    ru: "Проверка образца голоса",
    de: "Sprachprobe-Prüfung",
    uk: "Перевірка зразка голосу",
    fr: "Vérification d'échantillon vocal",
    pl: "Sprawdzenie próbki głosu",
  },
  gc_fn_video: { en: "Video", ru: "Видео", de: "Video", uk: "Відео", fr: "Vidéo", pl: "Wideo" },
  gc_fn_final_video: {
    en: "Final speaking video",
    ru: "Итоговое говорящее видео",
    de: "Fertiges sprechendes Video",
    uk: "Підсумкове відео з мовленням",
    fr: "Vidéo finale parlante",
    pl: "Końcowe mówiące wideo",
  },
  gc_fn_catalog_text: {
    en: "Catalog text translation",
    ru: "Перевод текстов каталога",
    de: "Katalogtext-Übersetzung",
    uk: "Переклад текстів каталогу",
    fr: "Traduction des textes du catalogue",
    pl: "Tłumaczenie tekstów katalogu",
  },
  gc_fn_clip: {
    en: "Personal Video Clip",
    ru: "Персональный видеоклип",
    de: "Persönlicher Videoclip",
    uk: "Персональний відеокліп",
    fr: "Clip vidéo personnel",
    pl: "Osobisty klip wideo",
  },
  gc_fn_cartoon: {
    en: "Cartoon",
    ru: "Мультфильм",
    de: "Zeichentrick",
    uk: "Мультфільм",
    fr: "Dessin animé",
    pl: "Kreskówka",
  },
  gc_fn_premium: {
    en: "Premium Order",
    ru: "Премиум-заказ",
    de: "Premium-Auftrag",
    uk: "Преміум-замовлення",
    fr: "Commande premium",
    pl: "Zamówienie premium",
  },
};

type CheckState = { state: string; detail: string } | undefined;

export function GeneratorsPanel() {
  const { lang } = useI18n();
  const t = (key: string) => T[key]?.[lang as Lang] ?? T[key]?.en ?? key;

  const [settings, setSettings] = useState<GeneratorControlSettings>(() =>
    defaultGeneratorSettings(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  const [checks, setChecks] = useState<Record<string, CheckState>>({});
  const [checking, setChecking] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const engines = useMemo(() => allGenerators(), []);

  async function reload() {
    setLoading(true);
    try {
      setSettings(await loadGeneratorSettings());
      setDirty(false);
      setProblem(null);
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "The saved configuration could not be read.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  function patchFunction(
    id: string,
    patch: Partial<GeneratorControlSettings["functions"][string]>,
  ) {
    setSettings((prev) => {
      const current = prev.functions[id];
      if (!current) return prev;
      return { ...prev, functions: { ...prev.functions, [id]: { ...current, ...patch } } };
    });
    setSavedAt(false);
    setDirty(true);
  }

  function patchGenerator(
    key: string,
    patch: Partial<GeneratorControlSettings["generators"][string]>,
  ) {
    setSettings((prev) => {
      const current = prev.generators[key];
      if (!current) return prev;
      return { ...prev, generators: { ...prev.generators, [key]: { ...current, ...patch } } };
    });
    setSavedAt(false);
    setDirty(true);
  }

  async function save(override?: GeneratorControlSettings) {
    setSaving(true);
    try {
      setSettings(await saveGeneratorSettings({ data: { settings: override ?? settings } }));
      setSavedAt(true);
      setDirty(false);
      setProblem(null);
    } catch (err) {
      setSavedAt(false);
      setProblem(err instanceof Error ? err.message : "The configuration could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  /**
   * Switching an engine on or off is stored at once: the on/off state must
   * never differ between the panel and the running product.
   */
  function toggleEngine(key: string, enabled: boolean) {
    const current = settings.generators[key];
    if (!current) return;
    const next: GeneratorControlSettings = {
      ...settings,
      generators: { ...settings.generators, [key]: { ...current, enabled } },
    };
    setSettings(next);
    void save(next);
  }

  async function check(key: string) {
    setChecking(key);
    try {
      const result = await checkGenerator({ data: { key } });
      setChecks((prev) => ({ ...prev, [key]: result }));
    } catch {
      setChecks((prev) => ({ ...prev, [key]: { state: "error", detail: "Check failed." } }));
    } finally {
      setChecking(null);
    }
  }

  function engineLabel(key: string | null): string {
    if (!key) return t("gc_not_selected");
    const gen = findGenerator(key);
    return gen ? `${gen.provider} · ${gen.model}${gen.quality ? ` · ${gen.quality}` : ""}` : key;
  }

  function statusPill(key: string) {
    const enabled = settings.generators[key]?.enabled !== false;
    const result = checks[key];
    const state = !enabled ? "disabled" : (result?.state ?? "unknown");
    const tone =
      state === "working"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : state === "error"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : state === "disabled"
            ? "border-border/60 bg-muted/50 text-muted-foreground"
            : "border-border/60 bg-background text-muted-foreground";
    const label =
      state === "working"
        ? t("gc_working")
        : state === "error"
          ? t("gc_error")
          : state === "disabled"
            ? t("gc_disabled")
            : t("gc_unknown");
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone}`}
      >
        {state === "working" ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : state === "error" ? (
          <XCircle className="h-3 w-3" />
        ) : null}
        {label}
      </span>
    );
  }

  return (
    <div className="space-y-4">
      <div className={cardCls}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t("gc_title")}</h3>
            <p className="mt-1 max-w-3xl text-xs text-muted-foreground">{t("gc_intro")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className={btnBase} onClick={() => void reload()} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              {t("gc_reload")}
            </button>
            <button className={btnPrimary} onClick={() => void save()} disabled={saving || loading}>
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {savedAt ? t("gc_saved") : t("gc_save")}
            </button>
          </div>
        </div>
        {problem && (
          <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {problem}
          </p>
        )}
        {dirty && !problem && (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {t("gc_unsaved")}
          </p>
        )}
      </div>

      {GENERATOR_FEATURES.map((feature) => (
        <div key={feature.id} className={cardCls}>
          <h4 className="mb-3 text-sm font-semibold text-foreground">{t(feature.titleKey)}</h4>
          <div className="space-y-3">
            {feature.functions.map((fn) => {
              const config = settings.functions[fn.id];
              const connected = fn.candidates.length > 0;
              const others = fn.candidates.flatMap((c) =>
                allGenerators()
                  .filter((g) => g.key === c.key)
                  .flatMap((g) => g.usedBy.filter((u) => u !== fn.id)),
              );
              return (
                <div
                  key={fn.id}
                  className="rounded-xl border border-border/50 bg-background/60 p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">{t(fn.titleKey)}</span>
                    {!connected && (
                      <span className="rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {t("gc_not_conn")}
                      </span>
                    )}
                  </div>

                  {connected && config && (
                    <>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <div className={labelCls}>{t("gc_primary")}</div>
                          <select
                            className={selectCls}
                            value={config.primary ?? ""}
                            onChange={(e) =>
                              patchFunction(fn.id, { primary: e.target.value || null })
                            }
                          >
                            <option value="">{t("gc_not_selected")}</option>
                            {fn.candidates.map((c) => (
                              <option key={c.key} value={c.key}>
                                {c.provider} · {c.model}
                                {c.quality ? ` · ${c.quality}` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div className={labelCls}>{t("gc_backup")}</div>
                          <select
                            className={selectCls}
                            value={config.backup ?? ""}
                            onChange={(e) =>
                              patchFunction(fn.id, { backup: e.target.value || null })
                            }
                          >
                            <option value="">{t("gc_not_selected")}</option>
                            {fn.candidates
                              .filter((c) => c.key !== config.primary)
                              .map((c) => (
                                <option key={c.key} value={c.key}>
                                  {c.provider} · {c.model}
                                  {c.quality ? ` · ${c.quality}` : ""}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        <Toggle
                          label={t("gc_autofail")}
                          hint={t("gc_autofail_h")}
                          value={config.autoFailover}
                          disabled={!config.backup}
                          onChange={(v) => patchFunction(fn.id, { autoFailover: v })}
                        />
                        <Toggle
                          label={t("gc_load")}
                          hint={t("gc_load_h")}
                          value={config.loadDistribution}
                          onChange={(v) => patchFunction(fn.id, { loadDistribution: v })}
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {fn.candidates.map((c) => (
                          <span
                            key={c.key}
                            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-2 py-1 text-[10px] text-muted-foreground"
                          >
                            <Plug className="h-3 w-3" />
                            {engineLabel(c.key)}
                            {statusPill(c.key)}
                          </span>
                        ))}
                      </div>

                      {others.length > 0 && (
                        <p className="mt-2 text-[10px] text-muted-foreground">
                          {t("gc_used_in")}: {[...new Set(others)].join(", ")}
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className={cardCls}>
        <h4 className="text-sm font-semibold text-foreground">{t("gc_engines")}</h4>
        <p className="mt-1 text-xs text-muted-foreground">{t("gc_disabled_note")}</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="px-2 py-2 text-left">{t("gc_provider")}</th>
                <th className="px-2 py-2 text-left">{t("gc_model")}</th>
                <th className="px-2 py-2 text-left">{t("gc_used_in")}</th>
                <th className="px-2 py-2 text-left">{t("gc_parallel")}</th>
                <th className="px-2 py-2 text-left">{t("gc_enabled")}</th>
                <th className="px-2 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {engines.map((gen) => {
                const entry = settings.generators[gen.key];
                const enabled = entry?.enabled !== false;
                const parallel = entry?.parallel ?? "auto";
                return (
                  <tr key={gen.key} className="border-b border-border/40 align-top">
                    <td className="px-2 py-2 font-medium text-foreground">{gen.provider}</td>
                    <td className="px-2 py-2 font-mono text-[11px]">
                      {gen.model}
                      {gen.quality ? ` · ${gen.quality}` : ""}
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">{gen.usedBy.join(", ")}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        <select
                          className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs"
                          value={parallel === "auto" ? "auto" : "manual"}
                          onChange={(e) =>
                            patchGenerator(gen.key, {
                              parallel: e.target.value === "auto" ? "auto" : 5,
                            })
                          }
                        >
                          <option value="auto">{t("gc_auto")}</option>
                          <option value="manual">{t("gc_manual")}</option>
                        </select>
                        {parallel !== "auto" && (
                          <input
                            type="number"
                            min={1}
                            max={500}
                            value={parallel}
                            onChange={(e) =>
                              patchGenerator(gen.key, {
                                parallel: Math.max(1, Math.min(500, Number(e.target.value) || 1)),
                              })
                            }
                            className="w-20 rounded-md border border-border/60 bg-background px-2 py-1 text-xs"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2">{statusPill(gen.key)}</td>
                    <td className="px-2 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          className={btnBase}
                          onClick={() => patchGenerator(gen.key, { enabled: !enabled })}
                        >
                          <Power className="h-3.5 w-3.5" />
                          {enabled ? t("gc_disable") : t("gc_enable")}
                        </button>
                        <button
                          className={btnBase}
                          onClick={() => void check(gen.key)}
                          disabled={checking === gen.key}
                        >
                          {checking === gen.key ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Plug className="h-3.5 w-3.5" />
                          )}
                          {t("gc_check")}
                        </button>
                      </div>
                      {checks[gen.key]?.detail && (
                        <p className="mt-1 text-right text-[10px] text-muted-foreground">
                          {checks[gen.key]?.detail}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Toggle(props: {
  label: string;
  hint?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2 rounded-lg border border-border/50 bg-background px-3 py-2 ${
        props.disabled ? "opacity-50" : ""
      }`}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-3.5 w-3.5"
        checked={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      <span>
        <span className="block text-xs font-medium text-foreground">{props.label}</span>
        {props.hint && (
          <span className="block text-[10px] text-muted-foreground">{props.hint}</span>
        )}
      </span>
    </label>
  );
}
