import type { Lang } from "../types";

// ---------------------------------------------------------------------------
// Admin Panel translation dictionary. Flat keys shared across the six
// supported UI languages. Only user-visible strings live here — internal
// configuration keys (format IDs, role IDs) stay untranslated.
// ---------------------------------------------------------------------------

type Row = Record<Lang, string>;
const K: Record<string, Row> = {
  admin_title: {
    en: "Project Joy Admin", ru: "Админ-панель Project Joy",
    de: "Project Joy Admin", uk: "Адмін-панель Project Joy",
    fr: "Admin Project Joy", pl: "Panel administratora Project Joy",
  },
  admin_search_placeholder: {
    en: "Search…", ru: "Поиск…", de: "Suchen…", uk: "Пошук…", fr: "Rechercher…", pl: "Szukaj…",
  },
  admin_notifications: {
    en: "Notifications", ru: "Уведомления", de: "Benachrichtigungen",
    uk: "Сповіщення", fr: "Notifications", pl: "Powiadomienia",
  },
  admin_profile: {
    en: "Administrator", ru: "Администратор", de: "Administrator",
    uk: "Адміністратор", fr: "Administrateur", pl: "Administrator",
  },
  admin_logout: { en: "Sign out", ru: "Выйти", de: "Abmelden", uk: "Вийти", fr: "Se déconnecter", pl: "Wyloguj" },
  admin_role_super_admin: { en: "Super Admin", ru: "Супер-администратор", de: "Super-Admin", uk: "Супер-адміністратор", fr: "Super Admin", pl: "Super Admin" },
  admin_role_admin: { en: "Admin", ru: "Администратор", de: "Admin", uk: "Адміністратор", fr: "Admin", pl: "Admin" },
  admin_role_manager: { en: "Manager", ru: "Менеджер", de: "Manager", uk: "Менеджер", fr: "Manager", pl: "Menedżer" },
  admin_role_content_manager: { en: "Content Manager", ru: "Контент-менеджер", de: "Content-Manager", uk: "Контент-менеджер", fr: "Manager Contenu", pl: "Menedżer treści" },
  admin_role_support_manager: { en: "Support Manager", ru: "Менеджер поддержки", de: "Support-Manager", uk: "Менеджер підтримки", fr: "Manager Support", pl: "Menedżer wsparcia" },
  admin_role_finance_manager: { en: "Finance Manager", ru: "Финансовый менеджер", de: "Finanz-Manager", uk: "Фінансовий менеджер", fr: "Manager Finance", pl: "Menedżer finansów" },
  admin_enable_gate_title: { en: "Admin area", ru: "Административная зона", de: "Adminbereich", uk: "Адмінзона", fr: "Zone d'administration", pl: "Strefa administratora" },
  admin_enable_gate_body: {
    en: "Access to the Admin Panel is restricted. This is an internal frontend placeholder — select a demo role to preview.",
    ru: "Доступ к админ-панели ограничен. Это временный интерфейс для демонстрации — выберите роль.",
    de: "Der Zugriff auf das Admin-Panel ist eingeschränkt. Interne Demo — wähle eine Rolle zur Vorschau.",
    uk: "Доступ до адмін-панелі обмежено. Це внутрішня демонстрація — оберіть роль.",
    fr: "L'accès au panneau d'administration est restreint. Aperçu interne — sélectionnez un rôle.",
    pl: "Dostęp do panelu administratora jest ograniczony. Wewnętrzne demo — wybierz rolę.",
  },
  admin_enter: { en: "Enter Admin Panel", ru: "Войти в админ-панель", de: "Admin-Panel öffnen", uk: "Відкрити адмін-панель", fr: "Ouvrir le panneau", pl: "Otwórz panel" },
  admin_return_home: { en: "Return to Project Joy", ru: "Вернуться на Project Joy", de: "Zurück zu Project Joy", uk: "Повернутися до Project Joy", fr: "Retour à Project Joy", pl: "Powrót do Project Joy" },

  // Sidebar nav
  admin_nav_overview: { en: "Overview", ru: "Обзор", de: "Übersicht", uk: "Огляд", fr: "Aperçu", pl: "Przegląd" },
  admin_nav_economy: { en: "Economy", ru: "Экономика", de: "Ökonomie", uk: "Економіка", fr: "Économie", pl: "Ekonomia" },
  admin_nav_orders: { en: "Orders", ru: "Заказы", de: "Bestellungen", uk: "Замовлення", fr: "Commandes", pl: "Zamówienia" },
  admin_nav_users: { en: "Users", ru: "Пользователи", de: "Benutzer", uk: "Користувачі", fr: "Utilisateurs", pl: "Użytkownicy" },
  admin_nav_catalog: { en: "Catalog", ru: "Каталог", de: "Katalog", uk: "Каталог", fr: "Catalogue", pl: "Katalog" },
  admin_nav_credit_packages: { en: "Credit Packages", ru: "Пакеты кредитов", de: "Kreditpakete", uk: "Пакети кредитів", fr: "Packs de crédits", pl: "Pakiety kredytów" },
  admin_nav_promotions: { en: "Promotions", ru: "Акции", de: "Aktionen", uk: "Акції", fr: "Promotions", pl: "Promocje" },
  admin_nav_notifications: { en: "Notifications", ru: "Уведомления", de: "Benachrichtigungen", uk: "Сповіщення", fr: "Notifications", pl: "Powiadomienia" },
  admin_nav_languages: { en: "Languages", ru: "Языки", de: "Sprachen", uk: "Мови", fr: "Langues", pl: "Języki" },
  admin_nav_calendar_settings: { en: "Calendar Settings", ru: "Настройки календаря", de: "Kalendereinstellungen", uk: "Налаштування календаря", fr: "Paramètres calendrier", pl: "Ustawienia kalendarza" },
  admin_nav_reports: { en: "Reports", ru: "Отчёты", de: "Berichte", uk: "Звіти", fr: "Rapports", pl: "Raporty" },
  admin_nav_audit_log: { en: "Audit Log", ru: "Журнал аудита", de: "Audit-Log", uk: "Журнал аудиту", fr: "Journal d'audit", pl: "Dziennik audytu" },
  admin_nav_platform: { en: "Platform Settings", ru: "Настройки платформы", de: "Plattformeinstellungen", uk: "Налаштування платформи", fr: "Paramètres plateforme", pl: "Ustawienia platformy" },

  // Overview
  admin_overview_title: { en: "Overview", ru: "Обзор", de: "Übersicht", uk: "Огляд", fr: "Aperçu", pl: "Przegląd" },
  admin_overview_note: {
    en: "Demonstration values. Real statistics will appear after backend integration.",
    ru: "Демонстрационные значения. Реальная статистика появится после интеграции с бэкендом.",
    de: "Demowerte. Echte Statistiken erscheinen nach Backend-Anbindung.",
    uk: "Демонстраційні значення. Реальна статистика зʼявиться після інтеграції з бекендом.",
    fr: "Valeurs de démonstration. Les statistiques réelles apparaîtront après intégration backend.",
    pl: "Wartości demonstracyjne. Rzeczywiste statystyki pojawią się po integracji z backendem.",
  },
  admin_metric_active_orders: { en: "Active Orders", ru: "Активные заказы", de: "Aktive Bestellungen", uk: "Активні замовлення", fr: "Commandes actives", pl: "Aktywne zamówienia" },
  admin_metric_completed_orders: { en: "Completed Orders", ru: "Завершённые заказы", de: "Abgeschlossene Bestellungen", uk: "Виконані замовлення", fr: "Commandes terminées", pl: "Ukończone zamówienia" },
  admin_metric_users: { en: "Registered Users", ru: "Зарегистрированные пользователи", de: "Registrierte Benutzer", uk: "Зареєстровані користувачі", fr: "Utilisateurs inscrits", pl: "Zarejestrowani użytkownicy" },
  admin_metric_credits_sold: { en: "Credits Sold", ru: "Продано кредитов", de: "Verkaufte Credits", uk: "Продано кредитів", fr: "Crédits vendus", pl: "Sprzedane kredyty" },
  admin_metric_revenue: { en: "Estimated Revenue", ru: "Оценка выручки", de: "Geschätzter Umsatz", uk: "Оцінка виручки", fr: "Revenu estimé", pl: "Szacowany przychód" },
  admin_metric_costs: { en: "Platform Costs", ru: "Затраты платформы", de: "Plattformkosten", uk: "Витрати платформи", fr: "Coûts de la plateforme", pl: "Koszty platformy" },
  admin_placeholder_module_title: { en: "Module coming soon", ru: "Модуль скоро появится", de: "Modul demnächst", uk: "Модуль незабаром", fr: "Module bientôt disponible", pl: "Moduł wkrótce" },
  admin_placeholder_module_body: {
    en: "This administration module is scheduled for a future release. Only the Economy Center is fully available in this build.",
    ru: "Этот модуль администрирования появится в следующих релизах. В этой версии полностью доступен только Центр экономики.",
    de: "Dieses Modul kommt in einem späteren Release. In dieser Version ist nur das Economy Center vollständig verfügbar.",
    uk: "Цей модуль буде додано в наступних версіях. У цій збірці повністю доступний лише Центр економіки.",
    fr: "Ce module sera disponible dans une prochaine version. Seul le Centre Économie est complet ici.",
    pl: "Ten moduł pojawi się w kolejnym wydaniu. W tej wersji dostępne jest tylko Centrum Ekonomii.",
  },

  // Economy tabs
  admin_econ_title: { en: "Economy Center", ru: "Центр экономики", de: "Economy Center", uk: "Центр економіки", fr: "Centre Économie", pl: "Centrum Ekonomii" },
  admin_econ_subtitle: {
    en: "Configure Project Joy commercial calculations. Changes are local to this session and do not affect the public Studio in this build.",
    ru: "Настройка коммерческих расчётов Project Joy. Изменения хранятся в текущей сессии и пока не влияют на публичную Студию.",
    de: "Konfiguriere Project-Joy-Berechnungen. Änderungen sind sitzungslokal und wirken sich in diesem Build noch nicht auf das öffentliche Studio aus.",
    uk: "Налаштування комерційних розрахунків Project Joy. Зміни зберігаються в поточній сесії й поки не впливають на публічну Студію.",
    fr: "Configurez les calculs commerciaux de Project Joy. Les changements restent locaux et n'affectent pas encore le Studio public.",
    pl: "Skonfiguruj obliczenia handlowe Project Joy. Zmiany są lokalne i nie wpływają jeszcze na publiczne Studio.",
  },
  admin_tab_general: { en: "General Credit Settings", ru: "Общие настройки кредитов", de: "Allgemeine Credit-Einstellungen", uk: "Загальні налаштування кредитів", fr: "Réglages généraux des crédits", pl: "Ogólne ustawienia kredytów" },
  admin_tab_formats: { en: "Format Pricing", ru: "Цены форматов", de: "Format-Preise", uk: "Ціни форматів", fr: "Tarifs des formats", pl: "Cennik formatów" },
  admin_tab_duration: { en: "Duration Rules", ru: "Правила длительности", de: "Dauer-Regeln", uk: "Правила тривалості", fr: "Règles de durée", pl: "Reguły czasu trwania" },
  admin_tab_priority: { en: "Processing Priority", ru: "Приоритет обработки", de: "Bearbeitungspriorität", uk: "Пріоритет обробки", fr: "Priorité de traitement", pl: "Priorytet przetwarzania" },
  admin_tab_premium: { en: "Premium Estimation", ru: "Оценка Premium", de: "Premium-Schätzung", uk: "Оцінка Premium", fr: "Estimation Premium", pl: "Wycena Premium" },
  admin_tab_cost: { en: "Cost & Profit", ru: "Себестоимость и прибыль", de: "Kosten & Gewinn", uk: "Собівартість і прибуток", fr: "Coût et profit", pl: "Koszt i zysk" },
  admin_tab_safety: { en: "Safety Limits", ru: "Ограничения безопасности", de: "Sicherheitslimits", uk: "Ліміти безпеки", fr: "Limites de sécurité", pl: "Limity bezpieczeństwa" },
  admin_tab_preview: { en: "Demonstration Preview", ru: "Демо-предпросмотр", de: "Demo-Vorschau", uk: "Демо-перегляд", fr: "Aperçu de démonstration", pl: "Podgląd demonstracyjny" },

  // Buttons + status
  admin_save: { en: "Save Changes", ru: "Сохранить изменения", de: "Änderungen speichern", uk: "Зберегти зміни", fr: "Enregistrer", pl: "Zapisz zmiany" },
  admin_discard: { en: "Discard Changes", ru: "Отменить изменения", de: "Änderungen verwerfen", uk: "Скасувати зміни", fr: "Annuler les modifications", pl: "Odrzuć zmiany" },
  admin_unsaved: { en: "Unsaved changes", ru: "Несохранённые изменения", de: "Ungespeicherte Änderungen", uk: "Незбережені зміни", fr: "Modifications non enregistrées", pl: "Niezapisane zmiany" },
  admin_saved: { en: "All changes saved", ru: "Все изменения сохранены", de: "Alle Änderungen gespeichert", uk: "Усі зміни збережено", fr: "Toutes les modifications enregistrées", pl: "Wszystkie zmiany zapisane" },
  admin_confirm: { en: "Confirm", ru: "Подтвердить", de: "Bestätigen", uk: "Підтвердити", fr: "Confirmer", pl: "Potwierdź" },
  admin_cancel: { en: "Cancel", ru: "Отмена", de: "Abbrechen", uk: "Скасувати", fr: "Annuler", pl: "Anuluj" },
  admin_confirm_dangerous_title: { en: "Confirm sensitive change", ru: "Подтверждение важного изменения", de: "Sensible Änderung bestätigen", uk: "Підтвердження важливої зміни", fr: "Confirmer un changement sensible", pl: "Potwierdź istotną zmianę" },
  admin_confirm_dangerous_body: {
    en: "This setting affects commercial calculations. Continue?",
    ru: "Этот параметр влияет на коммерческие расчёты. Продолжить?",
    de: "Diese Einstellung beeinflusst kommerzielle Berechnungen. Fortfahren?",
    uk: "Це налаштування впливає на комерційні розрахунки. Продовжити?",
    fr: "Ce paramètre affecte les calculs commerciaux. Continuer ?",
    pl: "To ustawienie wpływa na obliczenia handlowe. Kontynuować?",
  },

  // Field labels
  admin_field_credit_name: { en: "Internal credit name", ru: "Внутреннее название кредита", de: "Interner Credit-Name", uk: "Внутрішня назва кредиту", fr: "Nom interne du crédit", pl: "Wewnętrzna nazwa kredytu" },
  admin_field_currency: { en: "Currency", ru: "Валюта расчётов", de: "Währung", uk: "Валюта", fr: "Devise", pl: "Waluta" },
  admin_field_credit_value: { en: "Value of one credit", ru: "Стоимость одного кредита", de: "Wert eines Credits", uk: "Вартість одного кредиту", fr: "Valeur d'un crédit", pl: "Wartość jednego kredytu" },
  admin_field_min_purchase: { en: "Minimum credit purchase", ru: "Минимальная покупка кредитов", de: "Mindestkauf", uk: "Мінімальна покупка", fr: "Achat minimum", pl: "Minimalny zakup" },
  admin_field_max_purchase: { en: "Maximum credit purchase", ru: "Максимальная покупка кредитов", de: "Höchstkauf", uk: "Максимальна покупка", fr: "Achat maximum", pl: "Maksymalny zakup" },
  admin_field_min_order: { en: "Minimum order value", ru: "Минимальная сумма заказа", de: "Mindestbestellwert", uk: "Мінімальна сума замовлення", fr: "Valeur min. commande", pl: "Minimalna wartość zamówienia" },
  admin_field_credit_expiration: { en: "Credit expiration (days)", ru: "Срок действия кредитов (дни)", de: "Ablauf (Tage)", uk: "Термін дії кредитів (днів)", fr: "Expiration (jours)", pl: "Wygaśnięcie (dni)" },
  admin_field_credit_expiration_enabled: { en: "Enable credit expiration", ru: "Включить срок действия", de: "Ablauf aktivieren", uk: "Увімкнути термін дії", fr: "Activer l'expiration", pl: "Włącz wygaśnięcie" },
  admin_field_rounding: { en: "Decimal rounding rule", ru: "Правило округления", de: "Rundungsregel", uk: "Правило округлення", fr: "Règle d'arrondi", pl: "Reguła zaokrąglania" },
  admin_field_min_margin: { en: "Minimum profit margin (%)", ru: "Минимальная маржа (%)", de: "Mindestmarge (%)", uk: "Мінімальна маржа (%)", fr: "Marge minimum (%)", pl: "Minimalna marża (%)" },

  admin_help_credit_name: { en: "Displayed inside the customer wallet.", ru: "Отображается в кошельке пользователя.", de: "Wird im Nutzer-Wallet angezeigt.", uk: "Показується у гаманці користувача.", fr: "Affiché dans le portefeuille client.", pl: "Wyświetlane w portfelu klienta." },
  admin_help_credit_value: { en: "Reference value used by internal cost calculations.", ru: "Опорное значение для внутренних расчётов.", de: "Referenzwert für interne Kalkulationen.", uk: "Опорне значення для внутрішніх розрахунків.", fr: "Valeur de référence pour les calculs internes.", pl: "Wartość odniesienia dla obliczeń wewnętrznych." },
  admin_help_min_margin: { en: "Orders below this margin trigger a warning.", ru: "Заказы ниже этого порога помечаются предупреждением.", de: "Bestellungen darunter lösen eine Warnung aus.", uk: "Замовлення нижче цього порога позначаються попередженням.", fr: "Les commandes sous ce seuil déclenchent un avertissement.", pl: "Zamówienia poniżej wywołują ostrzeżenie." },

  // Format table columns
  admin_col_format: { en: "Format", ru: "Формат", de: "Format", uk: "Формат", fr: "Format", pl: "Format" },
  admin_col_enabled: { en: "Enabled", ru: "Включено", de: "Aktiv", uk: "Активно", fr: "Actif", pl: "Aktywne" },
  admin_col_base_credits: { en: "Base credits", ru: "Базовые кредиты", de: "Basis-Credits", uk: "Базові кредити", fr: "Crédits de base", pl: "Kredyty bazowe" },
  admin_col_per30s: { en: "Credits / 30s", ru: "Кредиты / 30с", de: "Credits / 30s", uk: "Кредити / 30с", fr: "Crédits / 30s", pl: "Kredyty / 30s" },
  admin_col_min_dur: { en: "Min duration (s)", ru: "Мин. длительность (с)", de: "Min. Dauer (s)", uk: "Мін. тривалість (с)", fr: "Durée min. (s)", pl: "Min. czas (s)" },
  admin_col_max_dur: { en: "Max duration (s)", ru: "Макс. длительность (с)", de: "Max. Dauer (s)", uk: "Макс. тривалість (с)", fr: "Durée max. (s)", pl: "Maks. czas (s)" },
  admin_col_min_order: { en: "Min order credits", ru: "Мин. кредитов на заказ", de: "Min. Bestell-Credits", uk: "Мін. кредитів на замовлення", fr: "Crédits min. commande", pl: "Min. kredyty zamówienia" },
  admin_col_proc_per30s: { en: "Proc. sec / 30s", ru: "Обработка сек / 30с", de: "Bearb. Sek / 30s", uk: "Обробка сек / 30с", fr: "Trait. s / 30s", pl: "Przetw. s / 30s" },
  admin_col_prod_cost: { en: "Prod. cost", ru: "Себестоимость", de: "Prod.-Kosten", uk: "Собівартість", fr: "Coût prod.", pl: "Koszt produkcji" },
  admin_col_markup: { en: "Markup %", ru: "Наценка %", de: "Aufschlag %", uk: "Націнка %", fr: "Marge %", pl: "Narzut %" },
  admin_col_min_profit: { en: "Min. profit %", ru: "Мин. прибыль %", de: "Min. Gewinn %", uk: "Мін. прибуток %", fr: "Profit min. %", pl: "Min. zysk %" },
  admin_individually_calculated: {
    en: "Individually calculated", ru: "Рассчитывается индивидуально",
    de: "Individuell berechnet", uk: "Розраховується індивідуально",
    fr: "Calculé individuellement", pl: "Wyceniane indywidualnie",
  },

  // Format names
  admin_fmt_card: { en: "Greeting Card", ru: "Открытка", de: "Grußkarte", uk: "Листівка", fr: "Carte", pl: "Kartka" },
  admin_fmt_animated: { en: "Animated Greeting", ru: "Анимированное поздравление", de: "Animierter Gruß", uk: "Анімоване привітання", fr: "Vœu animé", pl: "Życzenia animowane" },
  admin_fmt_song: { en: "Personal Song", ru: "Персональная песня", de: "Persönliches Lied", uk: "Персональна пісня", fr: "Chanson personnelle", pl: "Osobista piosenka" },
  "admin_fmt_video-greeting": { en: "Video Greeting", ru: "Видео-поздравление", de: "Videogruß", uk: "Відео-привітання", fr: "Vœu vidéo", pl: "Życzenia wideo" },
  "admin_fmt_video-clip": { en: "Personal Video Clip", ru: "Персональный видеоклип", de: "Persönlicher Videoclip", uk: "Персональний відеокліп", fr: "Clip vidéo personnel", pl: "Osobisty klip wideo" },
  admin_fmt_voice: { en: "Voice Greeting", ru: "Голосовое поздравление", de: "Sprachgruß", uk: "Голосове привітання", fr: "Vœu vocal", pl: "Życzenia głosowe" },
  "admin_fmt_fairy-tale": { en: "Fairy-Tale Cartoon", ru: "Сказочный мультфильм", de: "Märchen-Cartoon", uk: "Казковий мультфільм", fr: "Dessin animé conte", pl: "Bajkowa kreskówka" },
  "admin_fmt_cartoon-episode": { en: "Cartoon Series Episode", ru: "Эпизод мультсериала", de: "Cartoon-Episode", uk: "Епізод мультсеріалу", fr: "Épisode dessin animé", pl: "Odcinek kreskówki" },
  admin_fmt_premium: { en: "Premium Personal Project", ru: "Premium персональный проект", de: "Premium-Projekt", uk: "Premium персональний проєкт", fr: "Projet Premium", pl: "Projekt Premium" },

  // Processing
  admin_proc_standard: { en: "Standard Processing", ru: "Стандартная обработка", de: "Standard-Bearbeitung", uk: "Стандартна обробка", fr: "Traitement standard", pl: "Przetwarzanie standardowe" },
  admin_proc_priority: { en: "Priority Processing", ru: "Приоритетная обработка", de: "Priorisierte Bearbeitung", uk: "Пріоритетна обробка", fr: "Traitement prioritaire", pl: "Przetwarzanie priorytetowe" },
  admin_proc_credit_mult: { en: "Credit multiplier", ru: "Множитель кредитов", de: "Credit-Faktor", uk: "Множник кредитів", fr: "Multiplicateur crédits", pl: "Mnożnik kredytów" },
  admin_proc_time_mult: { en: "Preparation-time multiplier", ru: "Множитель времени", de: "Zeit-Faktor", uk: "Множник часу", fr: "Multiplicateur temps", pl: "Mnożnik czasu" },
  admin_proc_min_buffer: { en: "Min safety buffer (min)", ru: "Мин. буфер (мин)", de: "Min. Puffer (Min.)", uk: "Мін. буфер (хв)", fr: "Tampon min (min)", pl: "Min. bufor (min)" },
  admin_proc_max_buffer: { en: "Max safety buffer (min)", ru: "Макс. буфер (мин)", de: "Max. Puffer (Min.)", uk: "Макс. буфер (хв)", fr: "Tampon max (min)", pl: "Maks. bufor (min)" },
  admin_proc_extra_credits: { en: "Minimum extra credits", ru: "Мин. доп. кредитов", de: "Min. Zusatz-Credits", uk: "Мін. додатк. кредитів", fr: "Crédits sup. min", pl: "Min. dodatk. kredyty" },
  admin_proc_daily_limit: { en: "Daily availability limit", ru: "Дневной лимит", de: "Tageslimit", uk: "Денний ліміт", fr: "Limite quotidienne", pl: "Dzienny limit" },
  admin_proc_no_clock_rule: {
    en: "The customer platform never displays an exact clock completion time. Only approximate durations are shown (e.g. About 10 minutes, About 1 hour, Approximately 1–2 working days).",
    ru: "Клиентская платформа никогда не показывает точное время завершения. Отображаются только приблизительные интервалы (например, около 10 минут, около 1 часа, примерно 1–2 рабочих дня).",
    de: "Die Kundenplattform zeigt niemals eine exakte Uhrzeit für die Fertigstellung. Nur ungefähre Dauern erscheinen (z. B. ca. 10 Min, ca. 1 Stunde, ca. 1–2 Werktage).",
    uk: "Клієнтська платформа ніколи не показує точний час завершення. Відображаються лише приблизні інтервали (наприклад, близько 10 хв, близько 1 години, приблизно 1–2 робочі дні).",
    fr: "La plateforme cliente n'affiche jamais d'heure exacte. Seules des durées approximatives (environ 10 min, environ 1 h, environ 1–2 jours ouvrés) sont montrées.",
    pl: "Platforma klienta nigdy nie pokazuje dokładnej godziny zakończenia. Wyświetlane są tylko przybliżone czasy (np. ok. 10 min, ok. 1 godz., ok. 1–2 dni roboczych).",
  },

  // Premium
  admin_prem_base: { en: "Base project assessment", ru: "Базовая оценка проекта", de: "Basis-Bewertung", uk: "Базова оцінка проєкту", fr: "Évaluation de base", pl: "Bazowa ocena projektu" },
  admin_prem_type: { en: "Project type coefficient", ru: "Коэф. типа проекта", de: "Projekttyp-Koeff.", uk: "Коеф. типу проєкту", fr: "Coef. type", pl: "Współ. typu" },
  admin_prem_duration: { en: "Duration coefficient", ru: "Коэф. длительности", de: "Dauer-Koeff.", uk: "Коеф. тривалості", fr: "Coef. durée", pl: "Współ. czasu" },
  admin_prem_chars: { en: "Characters coefficient", ru: "Коэф. персонажей", de: "Figuren-Koeff.", uk: "Коеф. персонажів", fr: "Coef. personnages", pl: "Współ. postaci" },
  admin_prem_scenes: { en: "Scenes coefficient", ru: "Коэф. сцен", de: "Szenen-Koeff.", uk: "Коеф. сцен", fr: "Coef. scènes", pl: "Współ. scen" },
  admin_prem_voice: { en: "Voice-over coefficient", ru: "Коэф. озвучки", de: "Voice-over-Koeff.", uk: "Коеф. озвучення", fr: "Coef. voix off", pl: "Współ. lektora" },
  admin_prem_music: { en: "Music coefficient", ru: "Коэф. музыки", de: "Musik-Koeff.", uk: "Коеф. музики", fr: "Coef. musique", pl: "Współ. muzyki" },
  admin_prem_special: { en: "Special requirements coefficient", ru: "Коэф. особых требований", de: "Sonder-Koeff.", uk: "Коеф. особливих вимог", fr: "Coef. exigences", pl: "Współ. wymagań" },
  admin_prem_files: { en: "File-processing coefficient", ru: "Коэф. обработки файлов", de: "Datei-Koeff.", uk: "Коеф. обробки файлів", fr: "Coef. fichiers", pl: "Współ. plików" },
  admin_prem_simple: { en: "Simple complexity multiplier", ru: "Множитель — простой", de: "Faktor — einfach", uk: "Множник — простий", fr: "Multi. simple", pl: "Mnożnik prosty" },
  admin_prem_medium: { en: "Medium complexity multiplier", ru: "Множитель — средний", de: "Faktor — mittel", uk: "Множник — середній", fr: "Multi. moyen", pl: "Mnożnik średni" },
  admin_prem_complex: { en: "Complex multiplier", ru: "Множитель — сложный", de: "Faktor — komplex", uk: "Множник — складний", fr: "Multi. complexe", pl: "Mnożnik złożony" },
  admin_prem_priority: { en: "Priority multiplier", ru: "Множитель приоритета", de: "Prioritätsfaktor", uk: "Множник пріоритету", fr: "Multi. priorité", pl: "Mnożnik priorytetu" },
  admin_prem_min_order: { en: "Minimum Premium order credits", ru: "Мин. кредитов Premium заказа", de: "Min. Premium-Credits", uk: "Мін. кредитів Premium", fr: "Crédits Premium min", pl: "Min. kredyty Premium" },
  admin_prem_manual: { en: "Manual review required", ru: "Требуется ручная проверка", de: "Manuelle Prüfung erforderlich", uk: "Потрібна ручна перевірка", fr: "Vérification manuelle requise", pl: "Wymagana weryfikacja ręczna" },
  admin_prem_preview: { en: "Demonstration estimate", ru: "Демо-оценка", de: "Demo-Schätzung", uk: "Демо-оцінка", fr: "Estimation démo", pl: "Wycena demo" },
  admin_prem_estimated_total: { en: "= estimated credits", ru: "= оценка кредитов", de: "= geschätzte Credits", uk: "= оцінка кредитів", fr: "= crédits estimés", pl: "= szacowane kredyty" },

  // Cost calc
  admin_cost_production: { en: "Estimated production cost", ru: "Себестоимость производства", de: "Produktionskosten", uk: "Собівартість виробництва", fr: "Coût de production", pl: "Koszt produkcji" },
  admin_cost_payment: { en: "Payment-processing cost", ru: "Стоимость эквайринга", de: "Zahlungskosten", uk: "Вартість еквайрингу", fr: "Coût paiement", pl: "Koszt płatności" },
  admin_cost_notification: { en: "Notification cost", ru: "Стоимость уведомлений", de: "Benachrichtigungskosten", uk: "Вартість сповіщень", fr: "Coût notifications", pl: "Koszt powiadomień" },
  admin_cost_storage: { en: "Storage cost", ru: "Стоимость хранения", de: "Speicherkosten", uk: "Вартість зберігання", fr: "Coût stockage", pl: "Koszt przechowywania" },
  admin_cost_support: { en: "Support reserve", ru: "Резерв поддержки", de: "Support-Reserve", uk: "Резерв підтримки", fr: "Réserve support", pl: "Rezerwa wsparcia" },
  admin_cost_regen: { en: "Regeneration reserve", ru: "Резерв перегенерации", de: "Regenerationsreserve", uk: "Резерв перегенерації", fr: "Réserve régénération", pl: "Rezerwa regeneracji" },
  admin_cost_refund: { en: "Refund reserve", ru: "Резерв возвратов", de: "Rückerstattungsreserve", uk: "Резерв повернень", fr: "Réserve remboursement", pl: "Rezerwa zwrotów" },
  admin_cost_markup: { en: "Platform markup %", ru: "Наценка платформы %", de: "Plattform-Aufschlag %", uk: "Націнка платформи %", fr: "Marge plateforme %", pl: "Narzut platformy %" },
  admin_cost_tax: { en: "Taxes % (placeholder)", ru: "Налоги % (заглушка)", de: "Steuern % (Platzhalter)", uk: "Податки % (заглушка)", fr: "Taxes % (indicatif)", pl: "Podatki % (zastępczo)" },
  admin_cost_customer_credits: { en: "Customer credit price", ru: "Цена в кредитах", de: "Kunden-Credits", uk: "Ціна в кредитах", fr: "Prix client (crédits)", pl: "Cena klienta (kredyty)" },
  admin_cost_total: { en: "Total estimated cost", ru: "Итоговая себестоимость", de: "Gesamtkosten", uk: "Загальна собівартість", fr: "Coût total estimé", pl: "Łączny koszt" },
  admin_cost_revenue: { en: "Estimated revenue", ru: "Оценка выручки", de: "Geschätzter Umsatz", uk: "Оцінка виручки", fr: "Revenu estimé", pl: "Szacowany przychód" },
  admin_cost_profit: { en: "Estimated gross profit", ru: "Оценка валовой прибыли", de: "Bruttogewinn", uk: "Оцінка валового прибутку", fr: "Profit brut estimé", pl: "Szacowany zysk brutto" },
  admin_cost_margin: { en: "Estimated profit margin", ru: "Оценка маржи", de: "Marge", uk: "Оцінка маржі", fr: "Marge estimée", pl: "Szacowana marża" },
  admin_cost_margin_warning: {
    en: "Warning: margin is below the configured minimum.",
    ru: "Внимание: маржа ниже установленного минимума.",
    de: "Warnung: Marge unter dem Mindestwert.",
    uk: "Увага: маржа нижче встановленого мінімуму.",
    fr: "Attention : marge sous le minimum.",
    pl: "Uwaga: marża poniżej minimum.",
  },
  admin_cost_internal_note: {
    en: "Internal calculator — not shown to customers.",
    ru: "Внутренний калькулятор — не отображается клиентам.",
    de: "Interner Rechner — nicht für Kunden sichtbar.",
    uk: "Внутрішній калькулятор — не відображається клієнтам.",
    fr: "Calculateur interne — non visible pour les clients.",
    pl: "Kalkulator wewnętrzny — niewidoczny dla klientów.",
  },

  // Safety
  admin_safety_max_credits: { en: "Max credits per automatic order", ru: "Макс. кредитов на авто-заказ", de: "Max. Credits pro Auto-Bestellung", uk: "Макс. кредитів на авто-замовлення", fr: "Crédits max / commande auto", pl: "Maks. kredyty / zamówienie auto" },
  admin_safety_max_duration: { en: "Max duration per order (s)", ru: "Макс. длительность заказа (с)", de: "Max. Dauer pro Bestellung (s)", uk: "Макс. тривалість замовлення (с)", fr: "Durée max / commande (s)", pl: "Maks. czas zamówienia (s)" },
  admin_safety_max_episodes: { en: "Max episodes per series", ru: "Макс. эпизодов в серии", de: "Max. Episoden pro Serie", uk: "Макс. епізодів у серії", fr: "Max. épisodes / série", pl: "Maks. odcinków / seria" },
  admin_safety_max_active: { en: "Max active orders per user", ru: "Макс. активных заказов у пользователя", de: "Max. aktive Bestellungen / Nutzer", uk: "Макс. активних замовлень / користувач", fr: "Commandes actives max / utilisateur", pl: "Maks. aktywne zamówienia / użytkownik" },
  admin_safety_max_priority: { en: "Max priority orders", ru: "Макс. приоритетных заказов", de: "Max. Priorität-Bestellungen", uk: "Макс. пріоритетних замовлень", fr: "Commandes prioritaires max", pl: "Maks. zamówienia priorytetowe" },
  admin_safety_min_margin: { en: "Minimum allowed profit margin (%)", ru: "Мин. допустимая маржа (%)", de: "Mindestmarge (%)", uk: "Мін. допустима маржа (%)", fr: "Marge min. autorisée (%)", pl: "Min. dozwolona marża (%)" },
  admin_safety_block_below_cost: { en: "Block orders below cost", ru: "Блокировать заказы ниже себестоимости", de: "Bestellungen unter Kosten blockieren", uk: "Блокувати замовлення нижче собівартості", fr: "Bloquer commandes sous coût", pl: "Blokuj zamówienia poniżej kosztu" },
  admin_safety_manual_above: { en: "Require manual review above (credits)", ru: "Ручная проверка при (кредитов)", de: "Manuelle Prüfung ab (Credits)", uk: "Ручна перевірка вище (кредитів)", fr: "Vérification manuelle au-delà (crédits)", pl: "Ręczna weryfikacja powyżej (kredyty)" },
  admin_safety_emergency: { en: "Emergency disable per format", ru: "Аварийное отключение формата", de: "Notabschaltung pro Format", uk: "Аварійне відключення формату", fr: "Désactivation d'urgence par format", pl: "Awaryjne wyłączenie formatu" },

  // Preview scenarios
  admin_preview_note: {
    en: "Read-only demonstration of how current settings would price sample orders. The public Studio is unaffected in this build.",
    ru: "Демонстрация того, как текущие настройки повлияли бы на примеры заказов. Публичная Студия в этой версии не затрагивается.",
    de: "Nur-Lese-Demo der aktuellen Einstellungen auf Beispielbestellungen. Studio bleibt unverändert.",
    uk: "Демонстрація впливу поточних налаштувань на приклади замовлень. Публічна Студія не змінюється.",
    fr: "Démo en lecture seule des paramètres actuels appliqués à des commandes types. Studio public inchangé.",
    pl: "Podgląd wpływu bieżących ustawień na przykładowe zamówienia. Publiczne Studio bez zmian.",
  },
  admin_preview_customer_credits: { en: "Customer credits", ru: "Кредиты клиента", de: "Kunden-Credits", uk: "Кредити клієнта", fr: "Crédits client", pl: "Kredyty klienta" },
  admin_preview_internal_cost: { en: "Internal cost", ru: "Себестоимость", de: "Interne Kosten", uk: "Собівартість", fr: "Coût interne", pl: "Koszt wewnętrzny" },
  admin_preview_profit: { en: "Estimated profit", ru: "Оценка прибыли", de: "Gewinn", uk: "Оцінка прибутку", fr: "Profit estimé", pl: "Szacowany zysk" },
  admin_preview_time: { en: "Approx. preparation", ru: "Прибл. подготовка", de: "Ca. Vorbereitung", uk: "Прибл. підготовка", fr: "Prépa. env.", pl: "Ok. przygotowanie" },
  admin_preview_std_vs_pri: { en: "Standard vs Priority", ru: "Стандарт и Приоритет", de: "Standard vs. Priorität", uk: "Стандарт та Пріоритет", fr: "Standard vs Prioritaire", pl: "Standard vs Priorytet" },

  // Approximate durations (reused across admin)
  approx_5m: { en: "About 5 minutes", ru: "Около 5 минут", de: "Ca. 5 Minuten", uk: "Близько 5 хвилин", fr: "Environ 5 minutes", pl: "Około 5 minut" },
  approx_10m: { en: "About 10 minutes", ru: "Около 10 минут", de: "Ca. 10 Minuten", uk: "Близько 10 хвилин", fr: "Environ 10 minutes", pl: "Około 10 minut" },
  approx_20m: { en: "About 20 minutes", ru: "Около 20 минут", de: "Ca. 20 Minuten", uk: "Близько 20 хвилин", fr: "Environ 20 minutes", pl: "Około 20 minut" },
  approx_45m: { en: "About 45 minutes", ru: "Около 45 минут", de: "Ca. 45 Minuten", uk: "Близько 45 хвилин", fr: "Environ 45 minutes", pl: "Około 45 minut" },
  approx_1h: { en: "About 1 hour", ru: "Около 1 часа", de: "Ca. 1 Stunde", uk: "Близько 1 години", fr: "Environ 1 heure", pl: "Około 1 godziny" },
  approx_2h: { en: "About 2 hours", ru: "Около 2 часов", de: "Ca. 2 Stunden", uk: "Близько 2 годин", fr: "Environ 2 heures", pl: "Około 2 godzin" },
  approx_1d: { en: "About 1 day", ru: "Около 1 дня", de: "Ca. 1 Tag", uk: "Близько 1 дня", fr: "Environ 1 jour", pl: "Około 1 dnia" },
  approx_1_2d: { en: "Approximately 1–2 working days", ru: "Примерно 1–2 рабочих дня", de: "Ca. 1–2 Werktage", uk: "Приблизно 1–2 робочі дні", fr: "Environ 1–2 jours ouvrés", pl: "Około 1–2 dni roboczych" },
};

function buildLang(l: Lang): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, row] of Object.entries(K)) out[k] = row[l];
  return out;
}

export const ADMIN_I18N: Record<Lang, Record<string, string>> = {
  en: buildLang("en"),
  ru: buildLang("ru"),
  de: buildLang("de"),
  uk: buildLang("uk"),
  fr: buildLang("fr"),
  pl: buildLang("pl"),
};
