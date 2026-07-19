import { useMemo } from "react";
import type { Lang } from "@/lib/i18n";

type Row = Record<Lang, string>;

const D: Record<string, Row> = {
  title: { en: "Platform Settings", ru: "Настройки платформы", de: "Plattformeinstellungen", uk: "Налаштування платформи", fr: "Paramètres de la plateforme", pl: "Ustawienia platformy" },
  subtitle: {
    en: "Manage global platform configuration, server status and security.",
    ru: "Управляйте глобальной конфигурацией платформы, состоянием сервера и безопасностью.",
    de: "Verwalte globale Plattform-Konfiguration, Serverstatus und Sicherheit.",
    uk: "Керуйте глобальною конфігурацією платформи, станом сервера та безпекою.",
    fr: "Gérez la configuration globale, l'état du serveur et la sécurité.",
    pl: "Zarządzaj globalną konfiguracją platformy, stanem serwera i bezpieczeństwem.",
  },
  demo_notice: {
    en: "Demonstration data only. No backend connected — integration points are prepared.",
    ru: "Только демонстрационные данные. Бэкенд не подключён — точки интеграции подготовлены.",
    de: "Nur Demo-Daten. Kein Backend angebunden — Integrationspunkte sind vorbereitet.",
    uk: "Лише демонстраційні дані. Бекенд не підключено — точки інтеграції готові.",
    fr: "Données de démonstration. Aucun backend connecté — points d'intégration prêts.",
    pl: "Tylko dane demonstracyjne. Brak połączenia z backendem — punkty integracji gotowe.",
  },

  // Top actions
  btn_save: { en: "Save Settings", ru: "Сохранить настройки", de: "Einstellungen speichern", uk: "Зберегти налаштування", fr: "Enregistrer", pl: "Zapisz ustawienia" },
  btn_refresh: { en: "Refresh", ru: "Обновить", de: "Aktualisieren", uk: "Оновити", fr: "Actualiser", pl: "Odśwież" },
  btn_check: { en: "Check System", ru: "Проверить систему", de: "System prüfen", uk: "Перевірити систему", fr: "Vérifier le système", pl: "Sprawdź system" },
  btn_backup: { en: "Create Backup", ru: "Создать резервную копию", de: "Backup erstellen", uk: "Створити резервну копію", fr: "Créer une sauvegarde", pl: "Utwórz kopię zapasową" },
  btn_restore_default: { en: "Restore Default", ru: "Восстановить по умолчанию", de: "Standard wiederherstellen", uk: "Відновити стандартні", fr: "Restaurer par défaut", pl: "Przywróć domyślne" },
  btn_close: { en: "Close", ru: "Закрыть", de: "Schließen", uk: "Закрити", fr: "Fermer", pl: "Zamknij" },
  btn_enable: { en: "Enable", ru: "Включить", de: "Aktivieren", uk: "Увімкнути", fr: "Activer", pl: "Włącz" },
  btn_disable: { en: "Disable", ru: "Отключить", de: "Deaktivieren", uk: "Вимкнути", fr: "Désactiver", pl: "Wyłącz" },
  btn_preview: { en: "Preview", ru: "Предпросмотр", de: "Vorschau", uk: "Перегляд", fr: "Aperçu", pl: "Podgląd" },
  btn_verify_domain: { en: "Verify Domain", ru: "Проверить домен", de: "Domain prüfen", uk: "Перевірити домен", fr: "Vérifier le domaine", pl: "Zweryfikuj domenę" },
  btn_check_ssl: { en: "Check SSL", ru: "Проверить SSL", de: "SSL prüfen", uk: "Перевірити SSL", fr: "Vérifier SSL", pl: "Sprawdź SSL" },
  btn_test_https: { en: "Test HTTPS", ru: "Проверить HTTPS", de: "HTTPS testen", uk: "Тестувати HTTPS", fr: "Tester HTTPS", pl: "Testuj HTTPS" },
  btn_download: { en: "Download", ru: "Скачать", de: "Herunterladen", uk: "Завантажити", fr: "Télécharger", pl: "Pobierz" },
  btn_restore: { en: "Restore", ru: "Восстановить", de: "Wiederherstellen", uk: "Відновити", fr: "Restaurer", pl: "Przywróć" },
  btn_delete: { en: "Delete", ru: "Удалить", de: "Löschen", uk: "Видалити", fr: "Supprimer", pl: "Usuń" },
  btn_logout_all: { en: "Logout All Sessions", ru: "Выйти на всех устройствах", de: "Alle Sitzungen abmelden", uk: "Вийти з усіх сеансів", fr: "Déconnecter toutes les sessions", pl: "Wyloguj wszystkie sesje" },
  btn_apply: { en: "Apply", ru: "Применить", de: "Anwenden", uk: "Застосувати", fr: "Appliquer", pl: "Zastosuj" },

  saved_toast: { en: "Settings saved (demo).", ru: "Настройки сохранены (демо).", de: "Einstellungen gespeichert (Demo).", uk: "Налаштування збережено (демо).", fr: "Paramètres enregistrés (démo).", pl: "Ustawienia zapisane (demo)." },
  refreshed_toast: { en: "Data refreshed (demo).", ru: "Данные обновлены (демо).", de: "Daten aktualisiert (Demo).", uk: "Дані оновлені (демо).", fr: "Données actualisées (démo).", pl: "Dane odświeżone (demo)." },
  check_toast: { en: "System check complete (demo).", ru: "Проверка системы завершена (демо).", de: "Systemprüfung abgeschlossen (Demo).", uk: "Перевірку системи завершено (демо).", fr: "Vérification du système terminée (démo).", pl: "Sprawdzanie systemu zakończone (demo)." },
  backup_created_toast: { en: "Backup created (demo).", ru: "Резервная копия создана (демо).", de: "Backup erstellt (Demo).", uk: "Резервну копію створено (демо).", fr: "Sauvegarde créée (démo).", pl: "Kopia zapasowa utworzona (demo)." },
  restored_default_toast: { en: "Defaults restored.", ru: "Значения по умолчанию восстановлены.", de: "Standardwerte wiederhergestellt.", uk: "Стандартні значення відновлено.", fr: "Valeurs par défaut restaurées.", pl: "Przywrócono ustawienia domyślne." },

  // Tabs
  tab_general: { en: "General", ru: "Общие", de: "Allgemein", uk: "Загальні", fr: "Général", pl: "Ogólne" },
  tab_domain: { en: "Domain", ru: "Домен", de: "Domain", uk: "Домен", fr: "Domaine", pl: "Domena" },
  tab_server: { en: "Server", ru: "Сервер", de: "Server", uk: "Сервер", fr: "Serveur", pl: "Serwer" },
  tab_maintenance: { en: "Maintenance Mode", ru: "Режим обслуживания", de: "Wartungsmodus", uk: "Режим обслуговування", fr: "Mode maintenance", pl: "Tryb konserwacji" },
  tab_backup: { en: "Backup", ru: "Резервные копии", de: "Backup", uk: "Резервні копії", fr: "Sauvegarde", pl: "Kopie zapasowe" },
  tab_security: { en: "Security", ru: "Безопасность", de: "Sicherheit", uk: "Безпека", fr: "Sécurité", pl: "Bezpieczeństwo" },
  tab_monitoring: { en: "Monitoring", ru: "Мониторинг", de: "Überwachung", uk: "Моніторинг", fr: "Supervision", pl: "Monitoring" },
  tab_info: { en: "Platform Information", ru: "Информация о платформе", de: "Plattform-Informationen", uk: "Інформація про платформу", fr: "Informations plateforme", pl: "Informacje o platformie" },

  // Search
  search_placeholder: {
    en: "Search settings by name or category…",
    ru: "Поиск настроек по названию или категории…",
    de: "Einstellungen nach Name oder Kategorie suchen…",
    uk: "Пошук налаштувань за назвою або категорією…",
    fr: "Rechercher un paramètre par nom ou catégorie…",
    pl: "Szukaj ustawień według nazwy lub kategorii…",
  },
  search_no_results: { en: "No settings match your search.", ru: "Ничего не найдено.", de: "Keine passenden Einstellungen.", uk: "Нічого не знайдено.", fr: "Aucun paramètre correspondant.", pl: "Brak pasujących ustawień." },
  search_jump: { en: "Open", ru: "Открыть", de: "Öffnen", uk: "Відкрити", fr: "Ouvrir", pl: "Otwórz" },

  // Validation
  err_required: { en: "Required field", ru: "Обязательное поле", de: "Pflichtfeld", uk: "Обовʼязкове поле", fr: "Champ requis", pl: "Pole wymagane" },
  err_email: { en: "Invalid email format", ru: "Неверный формат email", de: "Ungültiges E-Mail-Format", uk: "Невірний формат email", fr: "Format d'e-mail invalide", pl: "Nieprawidłowy format e-mail" },
  err_min: { en: "Value is too low", ru: "Значение слишком мало", de: "Wert zu niedrig", uk: "Значення закладе", fr: "Valeur trop basse", pl: "Wartość zbyt niska" },

  // General section
  g_platform_name: { en: "Platform Name", ru: "Название платформы", de: "Plattformname", uk: "Назва платформи", fr: "Nom de la plateforme", pl: "Nazwa platformy" },
  g_platform_description: { en: "Platform Description", ru: "Описание платформы", de: "Plattformbeschreibung", uk: "Опис платформи", fr: "Description de la plateforme", pl: "Opis platformy" },
  g_logo: { en: "Platform Logo", ru: "Логотип платформы", de: "Plattform-Logo", uk: "Логотип платформи", fr: "Logo de la plateforme", pl: "Logo platformy" },
  g_logo_hint: { en: "Placeholder — real upload will be added later.", ru: "Плейсхолдер — загрузка появится позже.", de: "Platzhalter — echter Upload folgt.", uk: "Заглушка — завантаження зʼявиться пізніше.", fr: "Espace réservé — l'upload arrivera plus tard.", pl: "Placeholder — prawdziwy upload dodamy później." },
  g_support_email: { en: "Support Email", ru: "Email поддержки", de: "Support-E-Mail", uk: "Email підтримки", fr: "E-mail du support", pl: "E-mail wsparcia" },
  g_notification_email: { en: "Notification Email", ru: "Email уведомлений", de: "Benachrichtigungs-E-Mail", uk: "Email сповіщень", fr: "E-mail de notifications", pl: "E-mail powiadomień" },
  g_support_phone: { en: "Support Phone", ru: "Телефон поддержки", de: "Support-Telefon", uk: "Телефон підтримки", fr: "Téléphone du support", pl: "Telefon wsparcia" },
  g_default_language: { en: "Default Language", ru: "Язык по умолчанию", de: "Standardsprache", uk: "Мова за замовчуванням", fr: "Langue par défaut", pl: "Domyślny język" },
  g_default_currency: { en: "Default Currency", ru: "Валюта по умолчанию", de: "Standardwährung", uk: "Валюта за замовчуванням", fr: "Devise par défaut", pl: "Domyślna waluta" },
  g_default_country: { en: "Default Country", ru: "Страна по умолчанию", de: "Standardland", uk: "Країна за замовчуванням", fr: "Pays par défaut", pl: "Domyślny kraj" },
  g_default_timezone: { en: "Default Time Zone", ru: "Часовой пояс по умолчанию", de: "Standardzeitzone", uk: "Часовий пояс за замовчуванням", fr: "Fuseau horaire par défaut", pl: "Domyślna strefa czasowa" },
  g_date_format: { en: "Date Format", ru: "Формат даты", de: "Datumsformat", uk: "Формат дати", fr: "Format de date", pl: "Format daty" },
  g_time_format: { en: "Time Format", ru: "Формат времени", de: "Zeitformat", uk: "Формат часу", fr: "Format d'heure", pl: "Format czasu" },
  g_week_start: { en: "First Day of Week", ru: "Первый день недели", de: "Wochenbeginn", uk: "Перший день тижня", fr: "Premier jour de la semaine", pl: "Pierwszy dzień tygodnia" },
  week_monday: { en: "Monday", ru: "Понедельник", de: "Montag", uk: "Понеділок", fr: "Lundi", pl: "Poniedziałek" },
  week_sunday: { en: "Sunday", ru: "Воскресенье", de: "Sonntag", uk: "Неділя", fr: "Dimanche", pl: "Niedziela" },
  week_saturday: { en: "Saturday", ru: "Суббота", de: "Samstag", uk: "Субота", fr: "Samedi", pl: "Sobota" },

  // Domain
  d_primary: { en: "Primary Domain", ru: "Основной домен", de: "Hauptdomain", uk: "Основний домен", fr: "Domaine principal", pl: "Domena główna" },
  d_testing: { en: "Testing Domain", ru: "Тестовый домен", de: "Testdomain", uk: "Тестовий домен", fr: "Domaine de test", pl: "Domena testowa" },
  d_ssl_status: { en: "SSL Status", ru: "Статус SSL", de: "SSL-Status", uk: "Статус SSL", fr: "État SSL", pl: "Stan SSL" },
  d_ssl_expires: { en: "SSL Expiration Date", ru: "Дата истечения SSL", de: "SSL-Ablaufdatum", uk: "Термін дії SSL", fr: "Expiration SSL", pl: "Wygaśnięcie SSL" },
  d_https_enabled: { en: "HTTPS Enabled", ru: "HTTPS включён", de: "HTTPS aktiv", uk: "HTTPS увімкнено", fr: "HTTPS activé", pl: "HTTPS włączony" },
  d_http_redirect: { en: "HTTP → HTTPS Redirect", ru: "Редирект HTTP → HTTPS", de: "HTTP → HTTPS-Weiterleitung", uk: "Редирект HTTP → HTTPS", fr: "Redirection HTTP → HTTPS", pl: "Przekierowanie HTTP → HTTPS" },
  d_verification: { en: "Domain Verification", ru: "Проверка домена", de: "Domain-Verifizierung", uk: "Перевірка домену", fr: "Vérification du domaine", pl: "Weryfikacja domeny" },
  d_dns_records: { en: "DNS Records (placeholder)", ru: "DNS-записи (плейсхолдер)", de: "DNS-Einträge (Platzhalter)", uk: "DNS-записи (заглушка)", fr: "Enregistrements DNS (placeholder)", pl: "Rekordy DNS (placeholder)" },
  d_dns_type: { en: "Type", ru: "Тип", de: "Typ", uk: "Тип", fr: "Type", pl: "Typ" },
  d_dns_host: { en: "Host", ru: "Хост", de: "Host", uk: "Хост", fr: "Hôte", pl: "Host" },
  d_dns_value: { en: "Value", ru: "Значение", de: "Wert", uk: "Значення", fr: "Valeur", pl: "Wartość" },
  verified: { en: "Verified", ru: "Проверено", de: "Verifiziert", uk: "Перевірено", fr: "Vérifié", pl: "Zweryfikowano" },
  pending: { en: "Pending", ru: "Ожидание", de: "Ausstehend", uk: "Очікування", fr: "En attente", pl: "Oczekuje" },
  failed: { en: "Failed", ru: "Ошибка", de: "Fehlgeschlagen", uk: "Помилка", fr: "Échoué", pl: "Nieudane" },

  // Server
  s_status: { en: "Server Status", ru: "Статус сервера", de: "Serverstatus", uk: "Статус сервера", fr: "État du serveur", pl: "Stan serwera" },
  s_cpu: { en: "CPU Usage", ru: "Загрузка CPU", de: "CPU-Auslastung", uk: "Використання CPU", fr: "Utilisation CPU", pl: "Użycie CPU" },
  s_ram: { en: "RAM Usage", ru: "Использование RAM", de: "RAM-Auslastung", uk: "Використання RAM", fr: "Utilisation RAM", pl: "Użycie RAM" },
  s_storage: { en: "Storage Usage", ru: "Использование хранилища", de: "Speicherauslastung", uk: "Використання сховища", fr: "Utilisation du stockage", pl: "Użycie pamięci" },
  s_uptime: { en: "Uptime", ru: "Аптайм", de: "Betriebszeit", uk: "Аптайм", fr: "Temps de fonctionnement", pl: "Czas pracy" },
  s_days: { en: "days", ru: "дн.", de: "Tage", uk: "дн.", fr: "jours", pl: "dni" },
  s_os: { en: "Operating System", ru: "Операционная система", de: "Betriebssystem", uk: "Операційна система", fr: "Système d'exploitation", pl: "System operacyjny" },
  s_node: { en: "Node Version", ru: "Версия Node", de: "Node-Version", uk: "Версія Node", fr: "Version Node", pl: "Wersja Node" },
  s_db: { en: "Database Version", ru: "Версия базы данных", de: "Datenbankversion", uk: "Версія бази даних", fr: "Version base de données", pl: "Wersja bazy danych" },

  // Maintenance
  m_enabled: { en: "Maintenance Mode Enabled", ru: "Режим обслуживания включён", de: "Wartungsmodus aktiv", uk: "Режим обслуговування увімкнено", fr: "Mode maintenance activé", pl: "Tryb konserwacji włączony" },
  m_admins_only: { en: "Allow Administrators Only", ru: "Разрешить только администраторам", de: "Nur Administratoren erlauben", uk: "Дозволити лише адміністраторам", fr: "Autoriser uniquement les administrateurs", pl: "Zezwól tylko administratorom" },
  m_message: { en: "Maintenance Message", ru: "Сообщение обслуживания", de: "Wartungsnachricht", uk: "Повідомлення обслуговування", fr: "Message de maintenance", pl: "Wiadomość konserwacyjna" },
  m_scheduled_end: { en: "Scheduled End Time (placeholder)", ru: "Плановое окончание (плейсхолдер)", de: "Geplantes Ende (Platzhalter)", uk: "Плановий кінець (заглушка)", fr: "Fin planifiée (placeholder)", pl: "Planowane zakończenie (placeholder)" },
  m_preview_title: { en: "Maintenance page preview", ru: "Предпросмотр страницы обслуживания", de: "Vorschau der Wartungsseite", uk: "Перегляд сторінки обслуговування", fr: "Aperçu de la page de maintenance", pl: "Podgląd strony konserwacji" },
  m_preview_note: {
    en: "This is a preview inside the Admin Panel only — the public website is not affected in this build.",
    ru: "Это предпросмотр только внутри админ-панели — на публичный сайт не влияет в этой сборке.",
    de: "Vorschau nur im Admin-Panel — die öffentliche Website ist in diesem Build nicht betroffen.",
    uk: "Це перегляд лише в адмін-панелі — публічний сайт у цій збірці не змінюється.",
    fr: "Aperçu limité au panneau — le site public n'est pas affecté dans ce build.",
    pl: "Podgląd tylko w panelu — publiczna strona nie jest modyfikowana w tym buildzie.",
  },

  // Backup
  b_history: { en: "Latest Backups", ru: "Последние резервные копии", de: "Letzte Backups", uk: "Останні резервні копії", fr: "Dernières sauvegardes", pl: "Ostatnie kopie zapasowe" },
  b_date: { en: "Date", ru: "Дата", de: "Datum", uk: "Дата", fr: "Date", pl: "Data" },
  b_size: { en: "Size", ru: "Размер", de: "Größe", uk: "Розмір", fr: "Taille", pl: "Rozmiar" },
  b_type: { en: "Type", ru: "Тип", de: "Typ", uk: "Тип", fr: "Type", pl: "Typ" },
  b_source: { en: "Source", ru: "Источник", de: "Quelle", uk: "Джерело", fr: "Source", pl: "Źródło" },
  b_auto: { en: "Automatic", ru: "Автоматически", de: "Automatisch", uk: "Автоматично", fr: "Automatique", pl: "Automatyczna" },
  b_manual: { en: "Manual", ru: "Вручную", de: "Manuell", uk: "Вручну", fr: "Manuelle", pl: "Ręczna" },
  b_schedule: { en: "Automatic Schedules", ru: "Автоматические расписания", de: "Automatische Zeitpläne", uk: "Автоматичні розклади", fr: "Planifications automatiques", pl: "Automatyczne harmonogramy" },
  b_daily: { en: "Daily", ru: "Ежедневно", de: "Täglich", uk: "Щоденно", fr: "Quotidien", pl: "Codziennie" },
  b_weekly: { en: "Weekly", ru: "Еженедельно", de: "Wöchentlich", uk: "Щотижня", fr: "Hebdomadaire", pl: "Co tydzień" },
  b_monthly: { en: "Monthly", ru: "Ежемесячно", de: "Monatlich", uk: "Щомісяця", fr: "Mensuel", pl: "Co miesiąc" },
  b_retention: { en: "Retention (days)", ru: "Хранение (дней)", de: "Aufbewahrung (Tage)", uk: "Зберігання (днів)", fr: "Rétention (jours)", pl: "Retencja (dni)" },
  b_type_full: { en: "Full", ru: "Полная", de: "Vollständig", uk: "Повна", fr: "Complète", pl: "Pełna" },
  b_type_database: { en: "Database", ru: "База данных", de: "Datenbank", uk: "База даних", fr: "Base de données", pl: "Baza danych" },
  b_type_media: { en: "Media", ru: "Медиа", de: "Medien", uk: "Медіа", fr: "Médias", pl: "Media" },
  b_type_config: { en: "Configuration", ru: "Конфигурация", de: "Konfiguration", uk: "Конфігурація", fr: "Configuration", pl: "Konfiguracja" },

  // Security
  sec_2fa: { en: "Two-Factor Authentication", ru: "Двухфакторная аутентификация", de: "Zwei-Faktor-Authentifizierung", uk: "Двофакторна автентифікація", fr: "Authentification à deux facteurs", pl: "Uwierzytelnianie dwuskładnikowe" },
  sec_min_len: { en: "Password Minimum Length", ru: "Минимальная длина пароля", de: "Passwort-Mindestlänge", uk: "Мінімальна довжина пароля", fr: "Longueur minimale du mot de passe", pl: "Minimalna długość hasła" },
  sec_complexity: { en: "Password Complexity", ru: "Сложность пароля", de: "Passwortkomplexität", uk: "Складність пароля", fr: "Complexité du mot de passe", pl: "Złożoność hasła" },
  sec_complexity_basic: { en: "Basic", ru: "Базовая", de: "Basis", uk: "Базова", fr: "Basique", pl: "Podstawowa" },
  sec_complexity_standard: { en: "Standard", ru: "Стандартная", de: "Standard", uk: "Стандартна", fr: "Standard", pl: "Standardowa" },
  sec_complexity_strong: { en: "Strong", ru: "Строгая", de: "Stark", uk: "Сувора", fr: "Forte", pl: "Silna" },
  sec_max_attempts: { en: "Maximum Login Attempts", ru: "Макс. попыток входа", de: "Max. Anmeldeversuche", uk: "Макс. спроб входу", fr: "Nombre max. de tentatives", pl: "Maks. próby logowania" },
  sec_auto_lock: { en: "Automatic Account Lock (minutes)", ru: "Автоблокировка (минуты)", de: "Automatische Sperre (Minuten)", uk: "Автоблокування (хвилини)", fr: "Verrouillage automatique (min)", pl: "Automatyczna blokada (min)" },
  sec_session_timeout: { en: "Session Timeout (minutes)", ru: "Тайм-аут сессии (минуты)", de: "Sitzungstimeout (Minuten)", uk: "Тайм-аут сеансу (хв)", fr: "Expiration de session (min)", pl: "Limit czasu sesji (min)" },
  sec_status: { en: "Security Status", ru: "Статус безопасности", de: "Sicherheitsstatus", uk: "Статус безпеки", fr: "État de sécurité", pl: "Stan bezpieczeństwa" },
  sec_last_scan: { en: "Last Security Scan (placeholder)", ru: "Последняя проверка безопасности (плейсхолдер)", de: "Letzter Sicherheitsscan (Platzhalter)", uk: "Останній скан безпеки (заглушка)", fr: "Dernier scan de sécurité (placeholder)", pl: "Ostatni skan bezpieczeństwa (placeholder)" },
  sec_logout_confirm: { en: "All active sessions cleared (demo).", ru: "Все активные сессии сброшены (демо).", de: "Alle aktiven Sitzungen beendet (Demo).", uk: "Усі активні сеанси завершено (демо).", fr: "Toutes les sessions ont été fermées (démo).", pl: "Wszystkie aktywne sesje zakończone (demo)." },

  // Monitoring
  mon_service: { en: "Service", ru: "Сервис", de: "Dienst", uk: "Сервіс", fr: "Service", pl: "Usługa" },
  mon_status: { en: "Status", ru: "Статус", de: "Status", uk: "Статус", fr: "État", pl: "Stan" },
  mon_last_check: { en: "Last Check", ru: "Последняя проверка", de: "Letzte Prüfung", uk: "Остання перевірка", fr: "Dernière vérification", pl: "Ostatnia kontrola" },
  mon_response: { en: "Response Time (placeholder)", ru: "Время отклика (плейсхолдер)", de: "Antwortzeit (Platzhalter)", uk: "Час відгуку (заглушка)", fr: "Temps de réponse (placeholder)", pl: "Czas odpowiedzi (placeholder)" },
  mon_server: { en: "Server", ru: "Сервер", de: "Server", uk: "Сервер", fr: "Serveur", pl: "Serwer" },
  mon_database: { en: "Database", ru: "База данных", de: "Datenbank", uk: "База даних", fr: "Base de données", pl: "Baza danych" },
  mon_ssl: { en: "SSL", ru: "SSL", de: "SSL", uk: "SSL", fr: "SSL", pl: "SSL" },
  mon_domain: { en: "Domain", ru: "Домен", de: "Domain", uk: "Домен", fr: "Domaine", pl: "Domena" },
  mon_email: { en: "Email", ru: "Email", de: "E-Mail", uk: "Email", fr: "E-mail", pl: "E-mail" },
  mon_backup: { en: "Backup", ru: "Резервные копии", de: "Backup", uk: "Резервні копії", fr: "Sauvegarde", pl: "Kopie zapasowe" },
  status_online: { en: "Online", ru: "Онлайн", de: "Online", uk: "Онлайн", fr: "En ligne", pl: "Online" },
  status_warning: { en: "Warning", ru: "Предупреждение", de: "Warnung", uk: "Попередження", fr: "Avertissement", pl: "Ostrzeżenie" },
  status_error: { en: "Error", ru: "Ошибка", de: "Fehler", uk: "Помилка", fr: "Erreur", pl: "Błąd" },

  // Info
  info_demo_label: { en: "Demonstration data", ru: "Демонстрационные данные", de: "Demodaten", uk: "Демонстраційні дані", fr: "Données de démonstration", pl: "Dane demonstracyjne" },
  info_platform_version: { en: "Platform Version", ru: "Версия платформы", de: "Plattformversion", uk: "Версія платформи", fr: "Version de la plateforme", pl: "Wersja platformy" },
  info_admin_version: { en: "Admin Panel Version", ru: "Версия админ-панели", de: "Admin-Panel-Version", uk: "Версія адмін-панелі", fr: "Version du panneau", pl: "Wersja panelu administratora" },
  info_last_update: { en: "Last Update", ru: "Последнее обновление", de: "Letztes Update", uk: "Останнє оновлення", fr: "Dernière mise à jour", pl: "Ostatnia aktualizacja" },
  info_avg_response: { en: "Average Response Time", ru: "Среднее время отклика", de: "Durchschnittliche Antwortzeit", uk: "Середній час відгуку", fr: "Temps de réponse moyen", pl: "Średni czas odpowiedzi" },
  info_registered_users: { en: "Registered Users", ru: "Зарегистрированные пользователи", de: "Registrierte Nutzer", uk: "Зареєстровані користувачі", fr: "Utilisateurs inscrits", pl: "Zarejestrowani użytkownicy" },
  info_total_orders: { en: "Total Orders", ru: "Всего заказов", de: "Bestellungen gesamt", uk: "Усього замовлень", fr: "Total des commandes", pl: "Wszystkie zamówienia" },
  info_catalog_items: { en: "Total Catalog Items", ru: "Всего элементов каталога", de: "Katalogeinträge gesamt", uk: "Усього позицій каталогу", fr: "Éléments du catalogue", pl: "Wszystkie pozycje katalogu" },
  info_total_generated: { en: "Total Delivered Greetings", ru: "Всего доставленных поздравлений", de: "Zugestellte Grüße gesamt", uk: "Усього доставлених привітань", fr: "Vœux livrés au total", pl: "Wszystkie dostarczone życzenia" },

  // Search catalog labels
  cat_general: { en: "General", ru: "Общие", de: "Allgemein", uk: "Загальні", fr: "Général", pl: "Ogólne" },
  cat_domain: { en: "Domain", ru: "Домен", de: "Domain", uk: "Домен", fr: "Domaine", pl: "Domena" },
  cat_server: { en: "Server", ru: "Сервер", de: "Server", uk: "Сервер", fr: "Serveur", pl: "Serwer" },
  cat_maintenance: { en: "Maintenance", ru: "Обслуживание", de: "Wartung", uk: "Обслуговування", fr: "Maintenance", pl: "Konserwacja" },
  cat_backup: { en: "Backup", ru: "Резервные копии", de: "Backup", uk: "Резервні копії", fr: "Sauvegarde", pl: "Kopie zapasowe" },
  cat_security: { en: "Security", ru: "Безопасность", de: "Sicherheit", uk: "Безпека", fr: "Sécurité", pl: "Bezpieczeństwo" },
  cat_monitoring: { en: "Monitoring", ru: "Мониторинг", de: "Überwachung", uk: "Моніторинг", fr: "Supervision", pl: "Monitoring" },
  cat_info: { en: "Platform Info", ru: "Информация", de: "Plattform-Info", uk: "Інформація", fr: "Informations", pl: "Informacje" },
};

export function useLocalPlatform(lang: Lang) {
  return useMemo(() => ({
    t: (k: string) => D[k]?.[lang] ?? D[k]?.en ?? k,
  }), [lang]);
}