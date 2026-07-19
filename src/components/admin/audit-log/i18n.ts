import { useMemo } from "react";
import type { Lang } from "@/lib/i18n";

type Row = Record<Lang, string>;

const D: Record<string, Row> = {
  title: { en: "Audit Log", ru: "Журнал аудита", de: "Audit-Log", uk: "Журнал аудиту", fr: "Journal d'audit", pl: "Dziennik audytu" },
  subtitle: {
    en: "Track every important system and administrator action.",
    ru: "Отслеживайте каждое важное действие системы и администраторов.",
    de: "Verfolge jede wichtige System- und Administratoraktion.",
    uk: "Відстежуйте кожну важливу дію системи та адміністраторів.",
    fr: "Suivez chaque action importante du système et des administrateurs.",
    pl: "Śledź każde ważne działanie systemu i administratorów.",
  },
  demo_notice: {
    en: "Demonstration data only. No logging backend is connected — integration points are prepared.",
    ru: "Только демонстрационные данные. Бэкенд логирования не подключён — точки интеграции подготовлены.",
    de: "Nur Demo-Daten. Kein Logging-Backend angebunden — Integrationspunkte sind vorbereitet.",
    uk: "Лише демонстраційні дані. Бекенд логування не підключений — точки інтеграції готові.",
    fr: "Données de démonstration. Aucun backend de journalisation connecté — les points d'intégration sont prêts.",
    pl: "Tylko dane demonstracyjne. Brak podłączonego backendu logowania — punkty integracji są gotowe.",
  },

  btn_refresh: { en: "Refresh", ru: "Обновить", de: "Aktualisieren", uk: "Оновити", fr: "Actualiser", pl: "Odśwież" },
  btn_export:  { en: "Export", ru: "Экспорт", de: "Exportieren", uk: "Експорт", fr: "Exporter", pl: "Eksport" },
  btn_archive: { en: "Archive", ru: "Архив", de: "Archiv", uk: "Архів", fr: "Archives", pl: "Archiwum" },
  btn_settings: { en: "Audit Settings", ru: "Настройки аудита", de: "Audit-Einstellungen", uk: "Налаштування аудиту", fr: "Paramètres d'audit", pl: "Ustawienia audytu" },
  btn_close: { en: "Close", ru: "Закрыть", de: "Schließen", uk: "Закрити", fr: "Fermer", pl: "Zamknij" },
  btn_save: { en: "Save", ru: "Сохранить", de: "Speichern", uk: "Зберегти", fr: "Enregistrer", pl: "Zapisz" },
  btn_view: { en: "View", ru: "Просмотр", de: "Ansehen", uk: "Переглянути", fr: "Voir", pl: "Podgląd" },
  btn_restore: { en: "Restore", ru: "Восстановить", de: "Wiederherstellen", uk: "Відновити", fr: "Restaurer", pl: "Przywróć" },
  btn_delete: { en: "Delete permanently (demo)", ru: "Удалить навсегда (демо)", de: "Endgültig löschen (Demo)", uk: "Видалити назавжди (демо)", fr: "Supprimer définitivement (démo)", pl: "Usuń trwale (demo)" },
  btn_archive_action: { en: "Move to archive", ru: "В архив", de: "Ins Archiv", uk: "До архіву", fr: "Archiver", pl: "Do archiwum" },
  btn_reset: { en: "Reset filters", ru: "Сбросить фильтры", de: "Filter zurücksetzen", uk: "Скинути фільтри", fr: "Réinitialiser", pl: "Resetuj filtry" },

  // Summary cards
  card_total: { en: "Total Events", ru: "Всего событий", de: "Ereignisse gesamt", uk: "Усього подій", fr: "Événements totaux", pl: "Wszystkie zdarzenia" },
  card_today: { en: "Today", ru: "Сегодня", de: "Heute", uk: "Сьогодні", fr: "Aujourd'hui", pl: "Dziś" },
  card_last7: { en: "Last 7 Days", ru: "За 7 дней", de: "Letzte 7 Tage", uk: "За 7 днів", fr: "7 derniers jours", pl: "Ostatnie 7 dni" },
  card_failed: { en: "Failed Actions", ru: "Неудачные действия", de: "Fehlgeschlagene Aktionen", uk: "Невдалі дії", fr: "Actions échouées", pl: "Nieudane akcje" },
  card_security: { en: "Security Events", ru: "События безопасности", de: "Sicherheitsereignisse", uk: "Події безпеки", fr: "Événements de sécurité", pl: "Zdarzenia bezpieczeństwa" },
  card_admin: { en: "Administrator Actions", ru: "Действия администраторов", de: "Admin-Aktionen", uk: "Дії адміністраторів", fr: "Actions administrateurs", pl: "Działania administratorów" },
  card_user: { en: "User Actions", ru: "Действия пользователей", de: "Nutzeraktionen", uk: "Дії користувачів", fr: "Actions utilisateurs", pl: "Działania użytkowników" },
  card_system: { en: "System Events", ru: "Системные события", de: "Systemereignisse", uk: "Системні події", fr: "Événements système", pl: "Zdarzenia systemowe" },

  // Filters
  search_placeholder: {
    en: "Search by event ID, user, admin, email, IP, action…",
    ru: "Поиск: ID события, пользователь, админ, email, IP, действие…",
    de: "Suche: Ereignis-ID, Nutzer, Admin, E-Mail, IP, Aktion…",
    uk: "Пошук: ID події, користувач, адмін, email, IP, дія…",
    fr: "Rechercher : ID événement, utilisateur, admin, e-mail, IP, action…",
    pl: "Szukaj: ID zdarzenia, użytkownik, admin, e-mail, IP, akcja…",
  },
  f_from: { en: "From", ru: "С", de: "Von", uk: "Від", fr: "De", pl: "Od" },
  f_to: { en: "To", ru: "По", de: "Bis", uk: "До", fr: "Do", pl: "Do" },
  f_type: { en: "Event Type", ru: "Тип события", de: "Ereignistyp", uk: "Тип події", fr: "Type d'événement", pl: "Typ zdarzenia" },
  f_severity: { en: "Severity", ru: "Важность", de: "Schweregrad", uk: "Рівень", fr: "Gravité", pl: "Ważność" },
  f_role: { en: "User Role", ru: "Роль", de: "Rolle", uk: "Роль", fr: "Rôle", pl: "Rola" },
  f_module: { en: "Module", ru: "Модуль", de: "Modul", uk: "Модуль", fr: "Module", pl: "Moduł" },
  f_status: { en: "Status", ru: "Статус", de: "Status", uk: "Статус", fr: "Statut", pl: "Status" },
  f_country: { en: "Country", ru: "Страна", de: "Land", uk: "Країна", fr: "Pays", pl: "Kraj" },
  f_language: { en: "Language", ru: "Язык", de: "Sprache", uk: "Мова", fr: "Langue", pl: "Język" },
  f_all: { en: "All", ru: "Все", de: "Alle", uk: "Усі", fr: "Tous", pl: "Wszystkie" },

  // Tabs
  tab_all: { en: "All Events", ru: "Все события", de: "Alle Ereignisse", uk: "Усі події", fr: "Tous les événements", pl: "Wszystkie zdarzenia" },
  tab_security: { en: "Security", ru: "Безопасность", de: "Sicherheit", uk: "Безпека", fr: "Sécurité", pl: "Bezpieczeństwo" },
  tab_system: { en: "System", ru: "Система", de: "System", uk: "Система", fr: "Système", pl: "System" },
  tab_archive: { en: "Archive", ru: "Архив", de: "Archiv", uk: "Архів", fr: "Archives", pl: "Archiwum" },

  // Table columns
  col_id: { en: "Event ID", ru: "ID", de: "Ereignis-ID", uk: "ID", fr: "ID", pl: "ID" },
  col_date: { en: "Date", ru: "Дата", de: "Datum", uk: "Дата", fr: "Date", pl: "Data" },
  col_time: { en: "Time", ru: "Время", de: "Zeit", uk: "Час", fr: "Heure", pl: "Czas" },
  col_user: { en: "User", ru: "Пользователь", de: "Nutzer", uk: "Користувач", fr: "Utilisateur", pl: "Użytkownik" },
  col_role: { en: "Role", ru: "Роль", de: "Rolle", uk: "Роль", fr: "Rôle", pl: "Rola" },
  col_module: { en: "Module", ru: "Модуль", de: "Modul", uk: "Модуль", fr: "Module", pl: "Moduł" },
  col_action: { en: "Action", ru: "Действие", de: "Aktion", uk: "Дія", fr: "Action", pl: "Akcja" },
  col_result: { en: "Result", ru: "Результат", de: "Ergebnis", uk: "Результат", fr: "Résultat", pl: "Wynik" },
  col_severity: { en: "Severity", ru: "Важность", de: "Schweregrad", uk: "Рівень", fr: "Gravité", pl: "Ważność" },
  col_ip: { en: "IP", ru: "IP", de: "IP", uk: "IP", fr: "IP", pl: "IP" },
  col_country: { en: "Country", ru: "Страна", de: "Land", uk: "Країна", fr: "Pays", pl: "Kraj" },
  col_device: { en: "Device", ru: "Устройство", de: "Gerät", uk: "Пристрій", fr: "Appareil", pl: "Urządzenie" },
  col_browser: { en: "Browser", ru: "Браузер", de: "Browser", uk: "Браузер", fr: "Navigateur", pl: "Przeglądarka" },
  col_language: { en: "Language", ru: "Язык", de: "Sprache", uk: "Мова", fr: "Langue", pl: "Język" },
  col_actions: { en: "Actions", ru: "Действия", de: "Aktionen", uk: "Дії", fr: "Actions", pl: "Akcje" },

  // Empty
  empty: { en: "No events match your filters.", ru: "Нет событий по заданным фильтрам.", de: "Keine passenden Ereignisse.", uk: "Немає подій за фільтрами.", fr: "Aucun événement correspondant.", pl: "Brak zdarzeń pasujących do filtrów." },

  // Detail modal
  detail_title: { en: "Event details", ru: "Детали события", de: "Ereignisdetails", uk: "Деталі події", fr: "Détails de l'événement", pl: "Szczegóły zdarzenia" },
  detail_description: { en: "Description", ru: "Описание", de: "Beschreibung", uk: "Опис", fr: "Description", pl: "Opis" },
  detail_initiator: { en: "Initiator", ru: "Инициатор", de: "Auslöser", uk: "Ініціатор", fr: "Initiateur", pl: "Inicjator" },
  detail_timestamp: { en: "Timestamp", ru: "Метка времени", de: "Zeitstempel", uk: "Час", fr: "Horodatage", pl: "Znacznik czasu" },
  detail_context: { en: "Context", ru: "Контекст", de: "Kontext", uk: "Контекст", fr: "Contexte", pl: "Kontekst" },
  detail_changes: { en: "Old → New values", ru: "Старые → Новые значения", de: "Alt → Neu", uk: "Старі → Нові значення", fr: "Anciennes → Nouvelles valeurs", pl: "Stare → Nowe wartości" },
  detail_no_changes: { en: "No field changes recorded.", ru: "Изменения полей не зафиксированы.", de: "Keine Feldänderungen.", uk: "Змін полів не зафіксовано.", fr: "Aucun changement enregistré.", pl: "Brak zapisanych zmian pól." },
  detail_related: { en: "Related records", ru: "Связанные записи", de: "Verknüpfte Datensätze", uk: "Пов'язані записи", fr: "Enregistrements liés", pl: "Powiązane rekordy" },
  detail_related_order: { en: "Order", ru: "Заказ", de: "Bestellung", uk: "Замовлення", fr: "Commande", pl: "Zamówienie" },
  detail_related_user: { en: "User", ru: "Пользователь", de: "Nutzer", uk: "Користувач", fr: "Utilisateur", pl: "Użytkownik" },
  detail_related_payment: { en: "Payment", ru: "Платёж", de: "Zahlung", uk: "Платіж", fr: "Paiement", pl: "Płatność" },
  detail_related_notification: { en: "Notification", ru: "Уведомление", de: "Benachrichtigung", uk: "Сповіщення", fr: "Notification", pl: "Powiadomienie" },
  detail_related_promotion: { en: "Promotion", ru: "Промоакция", de: "Aktion", uk: "Акція", fr: "Promotion", pl: "Promocja" },
  detail_session: { en: "Session ID", ru: "ID сессии", de: "Sitzungs-ID", uk: "ID сесії", fr: "ID de session", pl: "ID sesji" },
  detail_notes: { en: "Notes", ru: "Заметки", de: "Notizen", uk: "Нотатки", fr: "Notes", pl: "Notatki" },
  detail_notes_placeholder: { en: "Add internal notes about this event…", ru: "Добавьте внутренние заметки об этом событии…", de: "Interne Notizen zu diesem Ereignis…", uk: "Додайте внутрішні нотатки про подію…", fr: "Ajouter des notes internes…", pl: "Dodaj wewnętrzne notatki…" },

  // Security section
  sec_title: { en: "Security overview", ru: "Обзор безопасности", de: "Sicherheitsübersicht", uk: "Огляд безпеки", fr: "Aperçu de la sécurité", pl: "Przegląd bezpieczeństwa" },
  sec_failed_logins: { en: "Failed logins", ru: "Неудачные входы", de: "Fehlgeschlagene Anmeldungen", uk: "Невдалі входи", fr: "Connexions échouées", pl: "Nieudane logowania" },
  sec_blocked: { en: "Blocked accounts", ru: "Заблокированные аккаунты", de: "Gesperrte Konten", uk: "Заблоковані акаунти", fr: "Comptes bloqués", pl: "Zablokowane konta" },
  sec_permission: { en: "Permission violations", ru: "Нарушения прав", de: "Rechteverstöße", uk: "Порушення прав", fr: "Violations d'accès", pl: "Naruszenia uprawnień" },
  sec_multi_attempts: { en: "Multiple login attempts", ru: "Многократные попытки входа", de: "Mehrfache Anmeldeversuche", uk: "Численні спроби входу", fr: "Tentatives multiples", pl: "Wielokrotne próby logowania" },
  sec_suspicious: { en: "Suspicious activity", ru: "Подозрительная активность", de: "Verdächtige Aktivität", uk: "Підозріла активність", fr: "Activité suspecte", pl: "Podejrzana aktywność" },
  sec_priv_changes: { en: "Administrator privilege changes", ru: "Изменения прав администраторов", de: "Änderungen an Admin-Rechten", uk: "Зміни прав адміністраторів", fr: "Modifications de privilèges admin", pl: "Zmiany uprawnień administratorów" },

  // System section
  sys_title: { en: "System services", ru: "Системные службы", de: "Systemdienste", uk: "Системні служби", fr: "Services système", pl: "Usługi systemowe" },
  sys_restart: { en: "Service Restart", ru: "Перезапуск службы", de: "Dienst-Neustart", uk: "Перезапуск служби", fr: "Redémarrage de service", pl: "Restart usługi" },
  sys_config: { en: "Configuration Change", ru: "Изменение конфигурации", de: "Konfigurationsänderung", uk: "Зміна конфігурації", fr: "Changement de configuration", pl: "Zmiana konfiguracji" },
  sys_database: { en: "Database (placeholder)", ru: "База данных (заглушка)", de: "Datenbank (Platzhalter)", uk: "База даних (заглушка)", fr: "Base de données (placeholder)", pl: "Baza danych (placeholder)" },
  sys_storage: { en: "Storage (placeholder)", ru: "Хранилище (заглушка)", de: "Speicher (Platzhalter)", uk: "Сховище (заглушка)", fr: "Stockage (placeholder)", pl: "Magazyn (placeholder)" },
  sys_notification: { en: "Notification Service", ru: "Служба уведомлений", de: "Benachrichtigungsdienst", uk: "Служба сповіщень", fr: "Service de notifications", pl: "Usługa powiadomień" },
  sys_translation: { en: "Translation Service", ru: "Служба переводов", de: "Übersetzungsdienst", uk: "Служба перекладів", fr: "Service de traduction", pl: "Usługa tłumaczeń" },
  sys_generator: { en: "Generator Service", ru: "Служба генерации", de: "Generator-Dienst", uk: "Служба генерації", fr: "Service de génération", pl: "Usługa generatora" },
  sys_distribution: { en: "Distribution Service", ru: "Служба распространения", de: "Verteilungsdienst", uk: "Служба розповсюдження", fr: "Service de distribution", pl: "Usługa dystrybucji" },

  // Archive
  archive_title: { en: "Archived events", ru: "Архивные события", de: "Archivierte Ereignisse", uk: "Архівні події", fr: "Événements archivés", pl: "Zarchiwizowane zdarzenia" },
  archive_hint: {
    en: "Archived events remain searchable but are hidden from the main view.",
    ru: "Архивные события остаются доступными для поиска, но скрыты в основном списке.",
    de: "Archivierte Ereignisse bleiben durchsuchbar, sind aber im Hauptlist ausgeblendet.",
    uk: "Архівні події залишаються доступними для пошуку, але приховані в основному списку.",
    fr: "Les événements archivés restent recherchables mais masqués de la vue principale.",
    pl: "Zarchiwizowane zdarzenia pozostają dostępne w wyszukiwaniu, ale są ukryte w widoku głównym.",
  },

  // Export modal
  export_title: { en: "Export audit log", ru: "Экспорт журнала", de: "Audit-Log exportieren", uk: "Експорт журналу", fr: "Exporter le journal", pl: "Eksport dziennika" },
  export_format: { en: "Format", ru: "Формат", de: "Format", uk: "Формат", fr: "Format", pl: "Format" },
  export_scope: { en: "Scope", ru: "Область", de: "Umfang", uk: "Область", fr: "Portée", pl: "Zakres" },
  export_scope_current: { en: "Current view", ru: "Текущий вид", de: "Aktuelle Ansicht", uk: "Поточний вигляд", fr: "Vue actuelle", pl: "Bieżący widok" },
  export_scope_selected: { en: "Selected events", ru: "Выбранные события", de: "Ausgewählte Ereignisse", uk: "Обрані події", fr: "Événements sélectionnés", pl: "Wybrane zdarzenia" },
  export_scope_all: { en: "All events", ru: "Все события", de: "Alle Ereignisse", uk: "Усі події", fr: "Tous les événements", pl: "Wszystkie zdarzenia" },
  export_note: {
    en: "Frontend demonstration — a real export will be generated by the backend.",
    ru: "Демонстрация — реальный экспорт будет создаваться бэкендом.",
    de: "Frontend-Demo — der echte Export wird vom Backend erzeugt.",
    uk: "Демонстрація — реальний експорт створюватиметься бекендом.",
    fr: "Démonstration — l'export réel sera généré côté serveur.",
    pl: "Demonstracja — rzeczywisty eksport zostanie wygenerowany przez backend.",
  },
  export_confirm: { en: "Prepare export", ru: "Подготовить экспорт", de: "Export vorbereiten", uk: "Підготувати експорт", fr: "Préparer l'export", pl: "Przygotuj eksport" },
  export_ready: { en: "Export prepared (demo).", ru: "Экспорт подготовлен (демо).", de: "Export vorbereitet (Demo).", uk: "Експорт підготовлений (демо).", fr: "Export prêt (démo).", pl: "Eksport przygotowany (demo)." },

  // Settings modal
  settings_title: { en: "Audit settings", ru: "Настройки аудита", de: "Audit-Einstellungen", uk: "Налаштування аудиту", fr: "Paramètres d'audit", pl: "Ustawienia audytu" },
  set_retention: { en: "Retention period (days)", ru: "Срок хранения (дни)", de: "Aufbewahrung (Tage)", uk: "Термін зберігання (днів)", fr: "Durée de conservation (jours)", pl: "Okres przechowywania (dni)" },
  set_archive_after: { en: "Archive after (days)", ru: "Архивировать через (дни)", de: "Archivieren nach (Tagen)", uk: "Архівувати через (днів)", fr: "Archiver après (jours)", pl: "Archiwizuj po (dniach)" },
  set_log_admin: { en: "Log administrator actions", ru: "Логировать действия администраторов", de: "Admin-Aktionen protokollieren", uk: "Логувати дії адміністраторів", fr: "Journaliser les actions admin", pl: "Rejestruj działania administratorów" },
  set_log_users: { en: "Log user actions", ru: "Логировать действия пользователей", de: "Nutzeraktionen protokollieren", uk: "Логувати дії користувачів", fr: "Journaliser les actions utilisateurs", pl: "Rejestruj działania użytkowników" },
  set_log_api: { en: "Log API events", ru: "Логировать события API", de: "API-Ereignisse protokollieren", uk: "Логувати події API", fr: "Journaliser les événements API", pl: "Rejestruj zdarzenia API" },
  set_log_generator: { en: "Log generator events", ru: "Логировать события генератора", de: "Generator-Ereignisse protokollieren", uk: "Логувати події генератора", fr: "Journaliser les événements du générateur", pl: "Rejestruj zdarzenia generatora" },
  set_log_translation: { en: "Log translation events", ru: "Логировать переводы", de: "Übersetzungs-Ereignisse protokollieren", uk: "Логувати події перекладів", fr: "Journaliser les événements de traduction", pl: "Rejestruj zdarzenia tłumaczeń" },
  set_log_payments: { en: "Log payment events", ru: "Логировать платежи", de: "Zahlungsereignisse protokollieren", uk: "Логувати платежі", fr: "Journaliser les paiements", pl: "Rejestruj zdarzenia płatności" },
  set_log_notifications: { en: "Log notification events", ru: "Логировать уведомления", de: "Benachrichtigungen protokollieren", uk: "Логувати сповіщення", fr: "Journaliser les notifications", pl: "Rejestruj zdarzenia powiadomień" },
  set_log_calendar: { en: "Log calendar events", ru: "Логировать календарь", de: "Kalender-Ereignisse protokollieren", uk: "Логувати події календаря", fr: "Journaliser les événements calendrier", pl: "Rejestruj zdarzenia kalendarza" },
  set_alerts: { en: "Enable security alerts", ru: "Включить оповещения безопасности", de: "Sicherheitsalarme aktivieren", uk: "Увімкнути сповіщення безпеки", fr: "Activer les alertes de sécurité", pl: "Włącz alerty bezpieczeństwa" },
};

// ---- Enum labels ----
const SEV: Record<string, Row> = {
  info:     { en: "Information", ru: "Информация", de: "Information", uk: "Інформація", fr: "Information", pl: "Informacja" },
  success:  { en: "Success", ru: "Успешно", de: "Erfolg", uk: "Успіх", fr: "Succès", pl: "Sukces" },
  warning:  { en: "Warning", ru: "Предупреждение", de: "Warnung", uk: "Попередження", fr: "Avertissement", pl: "Ostrzeżenie" },
  error:    { en: "Error", ru: "Ошибка", de: "Fehler", uk: "Помилка", fr: "Erreur", pl: "Błąd" },
  critical: { en: "Critical", ru: "Критично", de: "Kritisch", uk: "Критично", fr: "Critique", pl: "Krytyczne" },
};

const RES: Record<string, Row> = {
  success: { en: "Success", ru: "Успешно", de: "Erfolg", uk: "Успіх", fr: "Succès", pl: "Sukces" },
  failed:  { en: "Failed", ru: "Не удалось", de: "Fehlgeschlagen", uk: "Невдало", fr: "Échec", pl: "Nieudane" },
  pending: { en: "Pending", ru: "В процессе", de: "Ausstehend", uk: "Очікує", fr: "En attente", pl: "Oczekujące" },
  blocked: { en: "Blocked", ru: "Заблокировано", de: "Blockiert", uk: "Заблоковано", fr: "Bloqué", pl: "Zablokowane" },
};

const ROLE: Record<string, Row> = {
  guest:     { en: "Guest", ru: "Гость", de: "Gast", uk: "Гість", fr: "Invité", pl: "Gość" },
  user:      { en: "User", ru: "Пользователь", de: "Nutzer", uk: "Користувач", fr: "Utilisateur", pl: "Użytkownik" },
  customer:  { en: "Customer", ru: "Клиент", de: "Kunde", uk: "Клієнт", fr: "Client", pl: "Klient" },
  vip:       { en: "VIP", ru: "VIP", de: "VIP", uk: "VIP", fr: "VIP", pl: "VIP" },
  moderator: { en: "Moderator", ru: "Модератор", de: "Moderator", uk: "Модератор", fr: "Modérateur", pl: "Moderator" },
  admin:     { en: "Administrator", ru: "Администратор", de: "Administrator", uk: "Адміністратор", fr: "Administrateur", pl: "Administrator" },
  system:    { en: "System", ru: "Система", de: "System", uk: "Система", fr: "Système", pl: "System" },
  api:       { en: "API", ru: "API", de: "API", uk: "API", fr: "API", pl: "API" },
};

const MOD: Record<string, Row> = {
  auth:          { en: "Authentication", ru: "Авторизация", de: "Anmeldung", uk: "Авторизація", fr: "Authentification", pl: "Uwierzytelnianie" },
  users:         { en: "Users", ru: "Пользователи", de: "Nutzer", uk: "Користувачі", fr: "Utilisateurs", pl: "Użytkownicy" },
  orders:        { en: "Orders", ru: "Заказы", de: "Bestellungen", uk: "Замовлення", fr: "Commandes", pl: "Zamówienia" },
  studio:        { en: "Studio", ru: "Студия", de: "Studio", uk: "Студія", fr: "Studio", pl: "Studio" },
  catalog:       { en: "Catalog", ru: "Каталог", de: "Katalog", uk: "Каталог", fr: "Catalogue", pl: "Katalog" },
  payments:      { en: "Payments", ru: "Платежи", de: "Zahlungen", uk: "Платежі", fr: "Paiements", pl: "Płatności" },
  credits:       { en: "Credits", ru: "Кредиты", de: "Credits", uk: "Кредити", fr: "Crédits", pl: "Kredyty" },
  subscriptions: { en: "Subscriptions", ru: "Подписки", de: "Abonnements", uk: "Підписки", fr: "Abonnements", pl: "Subskrypcje" },
  promotions:    { en: "Promotions", ru: "Промоакции", de: "Aktionen", uk: "Акції", fr: "Promotions", pl: "Promocje" },
  notifications: { en: "Notifications", ru: "Уведомления", de: "Benachrichtigungen", uk: "Сповіщення", fr: "Notifications", pl: "Powiadomienia" },
  calendar:      { en: "Calendar", ru: "Календарь", de: "Kalender", uk: "Календар", fr: "Calendrier", pl: "Kalendarz" },
  languages:     { en: "Languages", ru: "Языки", de: "Sprachen", uk: "Мови", fr: "Langues", pl: "Języki" },
  reports:       { en: "Reports", ru: "Отчёты", de: "Berichte", uk: "Звіти", fr: "Rapports", pl: "Raporty" },
  platform:      { en: "Platform", ru: "Платформа", de: "Plattform", uk: "Платформа", fr: "Plateforme", pl: "Platforma" },
  system:        { en: "System", ru: "Система", de: "System", uk: "Система", fr: "Système", pl: "System" },
  api:           { en: "API", ru: "API", de: "API", uk: "API", fr: "API", pl: "API" },
};

const TYPE: Record<string, Row> = {
  login:                { en: "Login", ru: "Вход", de: "Anmeldung", uk: "Вхід", fr: "Connexion", pl: "Logowanie" },
  logout:               { en: "Logout", ru: "Выход", de: "Abmeldung", uk: "Вихід", fr: "Déconnexion", pl: "Wylogowanie" },
  registration:         { en: "Registration", ru: "Регистрация", de: "Registrierung", uk: "Реєстрація", fr: "Inscription", pl: "Rejestracja" },
  password_reset:       { en: "Password reset", ru: "Сброс пароля", de: "Passwort-Reset", uk: "Скидання пароля", fr: "Réinitialisation du mot de passe", pl: "Reset hasła" },
  email_change:         { en: "Email change", ru: "Смена email", de: "E-Mail-Änderung", uk: "Зміна email", fr: "Changement d'e-mail", pl: "Zmiana e-mail" },
  subscription_purchase:{ en: "Subscription purchase", ru: "Покупка подписки", de: "Abo-Kauf", uk: "Покупка підписки", fr: "Achat d'abonnement", pl: "Zakup subskrypcji" },
  credit_purchase:      { en: "Credit purchase", ru: "Покупка кредитов", de: "Credit-Kauf", uk: "Покупка кредитів", fr: "Achat de crédits", pl: "Zakup kredytów" },
  order_created:        { en: "Order created", ru: "Заказ создан", de: "Bestellung erstellt", uk: "Замовлення створене", fr: "Commande créée", pl: "Zamówienie utworzone" },
  order_cancelled:      { en: "Order cancelled", ru: "Заказ отменён", de: "Bestellung storniert", uk: "Замовлення скасоване", fr: "Commande annulée", pl: "Zamówienie anulowane" },
  order_completed:      { en: "Order completed", ru: "Заказ завершён", de: "Bestellung abgeschlossen", uk: "Замовлення завершене", fr: "Commande terminée", pl: "Zamówienie ukończone" },
  notification_sent:    { en: "Notification sent", ru: "Уведомление отправлено", de: "Benachrichtigung gesendet", uk: "Сповіщення надіслано", fr: "Notification envoyée", pl: "Powiadomienie wysłane" },
  translation_created:  { en: "Translation created", ru: "Перевод создан", de: "Übersetzung erstellt", uk: "Переклад створено", fr: "Traduction créée", pl: "Tłumaczenie utworzone" },
  content_published:    { en: "Content published", ru: "Контент опубликован", de: "Inhalt veröffentlicht", uk: "Контент опубліковано", fr: "Contenu publié", pl: "Treść opublikowana" },
  content_edited:       { en: "Content edited", ru: "Контент отредактирован", de: "Inhalt bearbeitet", uk: "Контент відредаговано", fr: "Contenu modifié", pl: "Treść edytowana" },
  content_deleted:      { en: "Content deleted", ru: "Контент удалён", de: "Inhalt gelöscht", uk: "Контент видалено", fr: "Contenu supprimé", pl: "Treść usunięta" },
  promotion_created:    { en: "Promotion created", ru: "Промоакция создана", de: "Aktion erstellt", uk: "Акція створена", fr: "Promotion créée", pl: "Promocja utworzona" },
  promo_code_used:      { en: "Promo code used", ru: "Промокод использован", de: "Promo-Code verwendet", uk: "Промокод використано", fr: "Code promo utilisé", pl: "Kod promocyjny użyty" },
  calendar_event:       { en: "Calendar event", ru: "Событие календаря", de: "Kalender-Ereignis", uk: "Подія календаря", fr: "Événement calendrier", pl: "Zdarzenie kalendarza" },
  payment:              { en: "Payment", ru: "Платёж", de: "Zahlung", uk: "Платіж", fr: "Paiement", pl: "Płatność" },
  refund:               { en: "Refund", ru: "Возврат", de: "Rückerstattung", uk: "Повернення", fr: "Remboursement", pl: "Zwrot" },
  admin_action:         { en: "Administrator action", ru: "Действие администратора", de: "Admin-Aktion", uk: "Дія адміністратора", fr: "Action administrateur", pl: "Działanie administratora" },
  security_event:       { en: "Security event", ru: "Событие безопасности", de: "Sicherheitsereignis", uk: "Подія безпеки", fr: "Événement de sécurité", pl: "Zdarzenie bezpieczeństwa" },
  system_event:         { en: "System event", ru: "Системное событие", de: "Systemereignis", uk: "Системна подія", fr: "Événement système", pl: "Zdarzenie systemowe" },
  api_event:            { en: "API event", ru: "Событие API", de: "API-Ereignis", uk: "Подія API", fr: "Événement API", pl: "Zdarzenie API" },
};

export function useLocalAudit(lang: Lang) {
  return useMemo(() => ({
    t: (k: string) => D[k]?.[lang] ?? D[k]?.en ?? k,
    tSev: (k: string) => SEV[k]?.[lang] ?? SEV[k]?.en ?? k,
    tRes: (k: string) => RES[k]?.[lang] ?? RES[k]?.en ?? k,
    tRole: (k: string) => ROLE[k]?.[lang] ?? ROLE[k]?.en ?? k,
    tMod: (k: string) => MOD[k]?.[lang] ?? MOD[k]?.en ?? k,
    tType: (k: string) => TYPE[k]?.[lang] ?? TYPE[k]?.en ?? k,
  }), [lang]);
}
