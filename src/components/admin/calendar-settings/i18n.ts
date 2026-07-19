import type { Lang } from "@/lib/i18n/types";

type T = Record<Lang, string>;
const t = (en: string, de: string, ru: string, uk: string, fr: string, pl: string): T =>
  ({ en, de, ru, uk, fr, pl });

export const CS_I18N: Record<string, T> = {
  // Page shell
  cs_title:     t("Calendar Settings","Kalendereinstellungen","Настройки календаря","Налаштування календаря","Paramètres du calendrier","Ustawienia kalendarza"),
  cs_subtitle:  t("Manage personal dates, reminders, scheduled delivery and calendar access.",
                  "Persönliche Daten, Erinnerungen, geplante Zustellung und Kalenderzugriff verwalten.",
                  "Управляйте личными датами, напоминаниями, запланированной доставкой и доступом к календарю.",
                  "Керуйте особистими датами, нагадуваннями, запланованою доставкою та доступом до календаря.",
                  "Gérez les dates personnelles, les rappels, la livraison planifiée et l'accès au calendrier.",
                  "Zarządzaj datami osobistymi, przypomnieniami, zaplanowaną wysyłką i dostępem do kalendarza."),
  cs_demo_note: t("Demonstration data","Demodaten","Демонстрационные данные","Демонстраційні дані","Données de démonstration","Dane demonstracyjne"),

  // Top actions
  cs_create_test:   t("Create Test Event","Testereignis erstellen","Создать тестовое событие","Створити тестову подію","Créer un événement test","Utwórz zdarzenie testowe"),
  cs_refresh:       t("Refresh","Aktualisieren","Обновить","Оновити","Actualiser","Odśwież"),
  cs_preview_cal:   t("Preview Customer Calendar","Kundenkalender-Vorschau","Просмотр календаря клиента","Перегляд календаря клієнта","Aperçu du calendrier client","Podgląd kalendarza klienta"),
  cs_rules:         t("Calendar Rules","Kalenderregeln","Правила календаря","Правила календаря","Règles du calendrier","Reguły kalendarza"),
  cs_export:        t("Export","Exportieren","Экспорт","Експорт","Exporter","Eksport"),

  // Tabs
  cs_tab_overview:     t("Overview","Übersicht","Обзор","Огляд","Aperçu","Przegląd"),
  cs_tab_types:        t("Event Types","Ereignistypen","Типы событий","Типи подій","Types d'événements","Typy zdarzeń"),
  cs_tab_reminders:    t("Reminder Rules","Erinnerungsregeln","Правила напоминаний","Правила нагадувань","Règles de rappel","Reguły przypomnień"),
  cs_tab_delivery:     t("Scheduled Delivery","Geplante Zustellung","Запланированная доставка","Запланована доставка","Livraison planifiée","Zaplanowana wysyłka"),
  cs_tab_subscription: t("Subscription Access","Abonnement-Zugriff","Доступ по подписке","Доступ за підпискою","Accès abonnement","Dostęp subskrypcyjny"),
  cs_tab_timezones:    t("Time Zones","Zeitzonen","Часовые пояса","Часові пояси","Fuseaux horaires","Strefy czasowe"),
  cs_tab_holidays:     t("Holiday Sources","Feiertagsquellen","Источники праздников","Джерела свят","Sources de fêtes","Źródła świąt"),
  cs_tab_safety:       t("Safety Settings","Sicherheit","Безопасность","Безпека","Sécurité","Bezpieczeństwo"),
  cs_tab_history:      t("History","Verlauf","История","Історія","Historique","Historia"),

  // Overview cards
  cs_card_active:        t("Active Personal Events","Aktive persönliche Ereignisse","Активные личные события","Активні особисті події","Événements personnels actifs","Aktywne zdarzenia osobiste"),
  cs_card_birthdays:     t("Birthdays","Geburtstage","Дни рождения","Дні народження","Anniversaires","Urodziny"),
  cs_card_anniversaries: t("Anniversaries","Jubiläen","Годовщины","Річниці","Anniversaires de mariage","Rocznice"),
  cs_card_scheduled:     t("Scheduled Gifts","Geplante Geschenke","Запланированные подарки","Заплановані подарунки","Cadeaux planifiés","Zaplanowane prezenty"),
  cs_card_reminders_wk:  t("Reminders This Week","Erinnerungen diese Woche","Напоминания на неделе","Нагадування цього тижня","Rappels cette semaine","Przypomnienia w tym tygodniu"),
  cs_card_failed:        t("Failed Delivery Attempts","Fehlgeschlagene Zustellungen","Неуспешные доставки","Невдалі доставки","Livraisons échouées","Nieudane dostawy"),
  cs_card_monthly_users: t("Monthly Calendar Users","Monatliche Kalender-Nutzer","Пользователи месячного календаря","Користувачі місячного календаря","Utilisateurs calendrier mensuel","Użytkownicy miesięcznego kalendarza"),
  cs_card_yearly_users:  t("Yearly Calendar Users","Jährliche Kalender-Nutzer","Пользователи годового календаря","Користувачі річного календаря","Utilisateurs calendrier annuel","Użytkownicy rocznego kalendarza"),

  cs_view_month:  t("Month","Monat","Месяц","Місяць","Mois","Miesiąc"),
  cs_view_week:   t("Week","Woche","Неделя","Тиждень","Semaine","Tydzień"),
  cs_view_list:   t("List","Liste","Список","Список","Liste","Lista"),
  cs_empty:       t("No events","Keine Ereignisse","Нет событий","Немає подій","Aucun événement","Brak zdarzeń"),

  // Event types
  et_birthday:        t("Birthday","Geburtstag","День рождения","День народження","Anniversaire","Urodziny"),
  et_wedding_anniv:   t("Wedding Anniversary","Hochzeitstag","Годовщина свадьбы","Річниця весілля","Anniversaire de mariage","Rocznica ślubu"),
  et_relation_anniv:  t("Relationship Anniversary","Beziehungsjubiläum","Годовщина отношений","Річниця стосунків","Anniversaire de couple","Rocznica związku"),
  et_family:          t("Family Event","Familienereignis","Семейное событие","Сімейна подія","Événement familial","Wydarzenie rodzinne"),
  et_graduation:      t("Graduation","Abschluss","Выпускной","Випускний","Remise de diplôme","Ukończenie szkoły"),
  et_religious:       t("Religious Event","Religiöses Ereignis","Религиозное событие","Релігійна подія","Événement religieux","Wydarzenie religijne"),
  et_personal_holiday:t("Personal Holiday","Persönlicher Feiertag","Личный праздник","Особисте свято","Fête personnelle","Święto osobiste"),
  et_travel:          t("Travel Date","Reisedatum","Дата поездки","Дата подорожі","Date de voyage","Data podróży"),
  et_corporate:       t("Corporate Event","Firmenveranstaltung","Корпоративное событие","Корпоративна подія","Événement d'entreprise","Wydarzenie firmowe"),
  et_custom:          t("Custom Event","Benutzerdefiniert","Своё событие","Власна подія","Événement personnalisé","Zdarzenie niestandardowe"),

  // Event type editor
  cs_col_id:        t("ID","ID","ID","ID","ID","ID"),
  cs_col_name:      t("Name","Name","Название","Назва","Nom","Nazwa"),
  cs_col_icon:      t("Icon","Symbol","Иконка","Іконка","Icône","Ikona"),
  cs_col_color:     t("Color","Farbe","Цвет","Колір","Couleur","Kolor"),
  cs_col_active:    t("Active","Aktiv","Активно","Активно","Actif","Aktywny"),
  cs_col_recurring: t("Recurring","Wiederkehrend","Повторяющееся","Повторюване","Récurrent","Powtarzalne"),
  cs_col_reminder_default: t("Default Reminder (days)","Standard-Erinnerung (Tage)","Напоминание (дней)","Нагадування (днів)","Rappel par défaut (jours)","Domyślne przypomnienie (dni)"),
  cs_col_allow_gift: t("Allow Scheduled Gift","Geplantes Geschenk erlaubt","Разрешить подарок","Дозволити подарунок","Cadeau planifié autorisé","Zezwól na prezent"),
  cs_col_audience:  t("Audience","Zielgruppe","Аудитория","Аудиторія","Public","Odbiorcy"),
  cs_col_order:     t("Order","Reihenfolge","Порядок","Порядок","Ordre","Kolejność"),
  cs_col_actions:   t("Actions","Aktionen","Действия","Дії","Actions","Akcje"),
  cs_aud_all:       t("All Users","Alle","Все","Усі","Tous","Wszyscy"),
  cs_aud_subs:      t("Subscribers","Abonnenten","Подписчики","Підписники","Abonnés","Subskrybenci"),

  // Personal events table
  cs_col_customer:  t("Customer","Kunde","Клиент","Клієнт","Client","Klient"),
  cs_col_type:      t("Type","Typ","Тип","Тип","Type","Typ"),
  cs_col_recipient: t("Recipient","Empfänger","Получатель","Отримувач","Destinataire","Odbiorca"),
  cs_col_date:      t("Event Date","Datum","Дата","Дата","Date","Data"),
  cs_col_recurrence:t("Recurrence","Wiederholung","Повторение","Повторення","Récurrence","Powtarzanie"),
  cs_col_tz:        t("Time Zone","Zeitzone","Часовой пояс","Часовий пояс","Fuseau","Strefa"),
  cs_col_reminder:  t("Reminder","Erinnerung","Напоминание","Нагадування","Rappel","Przypomnienie"),
  cs_col_gift:      t("Scheduled Gift","Geplantes Geschenk","Запланированный подарок","Запланований подарунок","Cadeau planifié","Zaplanowany prezent"),
  cs_col_status:    t("Status","Status","Статус","Статус","Statut","Status"),

  // Statuses
  st_draft:         t("Draft","Entwurf","Черновик","Чернетка","Brouillon","Szkic"),
  st_scheduled:     t("Scheduled","Geplant","Запланировано","Заплановано","Planifié","Zaplanowane"),
  st_preparing:     t("Preparing","In Vorbereitung","Подготовка","Підготовка","En préparation","W przygotowaniu"),
  st_ready:         t("Ready for Delivery","Bereit","Готово к отправке","Готово до відправки","Prêt","Gotowe"),
  st_queued:        t("Delivery Queued","In Warteschlange","В очереди","В черзі","En file","W kolejce"),
  st_sent:          t("Sent","Gesendet","Отправлено","Надіслано","Envoyé","Wysłane"),
  st_delivered:     t("Delivered","Zugestellt","Доставлено","Доставлено","Livré","Dostarczone"),
  st_failed:        t("Failed","Fehlgeschlagen","Ошибка","Помилка","Échoué","Nieudane"),
  st_cancelled:     t("Cancelled","Storniert","Отменено","Скасовано","Annulé","Anulowane"),
  st_manual_review: t("Manual Review","Manuelle Prüfung","Ручная проверка","Ручна перевірка","Vérification manuelle","Ręczna weryfikacja"),

  // Recurrence
  rc_once:    t("One-Time","Einmalig","Один раз","Одноразово","Une fois","Jednorazowo"),
  rc_yearly:  t("Every Year","Jährlich","Ежегодно","Щорічно","Chaque année","Corocznie"),
  rc_monthly: t("Every Month","Monatlich","Ежемесячно","Щомісяця","Chaque mois","Miesięcznie"),
  rc_weekly:  t("Every Week","Wöchentlich","Еженедельно","Щотижня","Chaque semaine","Co tydzień"),
  rc_custom:  t("Custom","Benutzerdefiniert","Своё","Власне","Personnalisé","Niestandardowe"),

  cs_feb29_rule: t("February 29 rule","29. Februar Regel","Правило 29 февраля","Правило 29 лютого","Règle 29 février","Reguła 29 lutego"),
  feb29_feb28:   t("Celebrate on February 28","Am 28. Februar feiern","Отмечать 28 февраля","Відзначати 28 лютого","Fêter le 28 février","Świętuj 28 lutego"),
  feb29_mar1:    t("Celebrate on March 1","Am 1. März feiern","Отмечать 1 марта","Відзначати 1 березня","Fêter le 1 mars","Świętuj 1 marca"),
  feb29_leap:    t("Only in leap years","Nur in Schaltjahren","Только в високосные годы","Тільки у високосні роки","Uniquement en année bissextile","Tylko w latach przestępnych"),

  // Reminders
  cs_rem_defchan:   t("Default reminder channel","Standard-Kanal","Канал по умолчанию","Канал за замовчуванням","Canal par défaut","Domyślny kanał"),
  cs_rem_max:       t("Maximum reminders per event","Max. Erinnerungen pro Ereignis","Макс. напоминаний на событие","Макс. нагадувань на подію","Rappels max. par événement","Maks. przypomnień na zdarzenie"),
  cs_rem_quiet:     t("Quiet hours","Ruhezeiten","Тихие часы","Тихі години","Heures calmes","Godziny ciszy"),
  cs_rem_retry:     t("Retry failed reminders","Fehlerhafte Erinnerungen wiederholen","Повтор при ошибке","Повтор при помилці","Réessayer en cas d'échec","Ponów przy błędzie"),
  cs_rem_userdis:   t("Allow customer to disable","Kunde darf deaktivieren","Клиент может отключить","Клієнт може вимкнути","Le client peut désactiver","Klient może wyłączyć"),
  ch_email:    t("Email","E-Mail","Email","Email","Email","Email"),
  ch_push:     t("Push","Push","Push","Push","Push","Push"),
  ch_sms:      t("SMS (future service)","SMS (zukünftig)","SMS (в будущем)","SMS (у майбутньому)","SMS (à venir)","SMS (w przyszłości)"),
  ch_internal: t("Internal","Intern","Внутреннее","Внутрішнє","Interne","Wewnętrzne"),
  ch_link:     t("Secure Share Link","Sicherer Link","Безопасная ссылка","Безпечне посилання","Lien sécurisé","Bezpieczny link"),

  // Delivery window
  cs_win_morning:   t("Morning","Vormittag","Утро","Ранок","Matin","Rano"),
  cs_win_afternoon: t("Afternoon","Nachmittag","День","День","Après-midi","Popołudnie"),
  cs_win_evening:   t("Evening","Abend","Вечер","Вечір","Soir","Wieczór"),
  cs_win_custom:    t("Custom","Benutzerdefiniert","Своё","Власне","Personnalisé","Niestandardowe"),
  cs_approx_note:   t("Final production time is approximate and calculated before confirmation.",
                     "Die endgültige Produktionszeit ist ungefähr und wird vor der Bestätigung berechnet.",
                     "Итоговое время производства приблизительно и рассчитывается до подтверждения.",
                     "Остаточний час виробництва приблизний і розраховується до підтвердження.",
                     "Le temps de production final est approximatif et calculé avant confirmation.",
                     "Ostateczny czas produkcji jest przybliżony i obliczany przed potwierdzeniem."),

  // Subscription
  sub_none:    t("No Subscription","Kein Abo","Без подписки","Без підписки","Sans abonnement","Bez subskrypcji"),
  sub_monthly: t("Monthly","Monatlich","Месячная","Місячна","Mensuel","Miesięczna"),
  sub_yearly:  t("Yearly","Jährlich","Годовая","Річна","Annuel","Roczna"),
  cs_sub_sched:     t("Scheduling enabled","Planung aktiviert","Планирование включено","Планування ввімкнено","Planification activée","Planowanie włączone"),
  cs_sub_range:     t("Max days ahead","Max. Tage im Voraus","Максимум дней вперёд","Максимум днів наперед","Jours max. à l'avance","Maks. dni naprzód"),
  cs_sub_cost:      t("Credit cost (non-subscriber)","Kredit-Kosten (Nicht-Abonnent)","Стоимость в кредитах (без подписки)","Вартість у кредитах (без підписки)","Coût en crédits (sans abo)","Koszt kredytów (bez subskr.)"),
  cs_sub_maxgifts:  t("Max scheduled gifts","Max. geplante Geschenke","Макс. запланированных подарков","Макс. запланованих подарунків","Max. cadeaux planifiés","Maks. zaplanowanych prezentów"),
  cs_sub_maxrem:    t("Max active reminders","Max. aktive Erinnerungen","Макс. активных напоминаний","Макс. активних нагадувань","Max. rappels actifs","Maks. aktywnych przypomnień"),
  cs_sub_channels:  t("Allowed channels","Erlaubte Kanäle","Разрешённые каналы","Дозволені канали","Canaux autorisés","Dozwolone kanały"),
  cs_sub_grace:     t("Grace period (days)","Kulanzzeit (Tage)","Льготный период (дней)","Пільговий період (днів)","Délai de grâce (jours)","Okres karencji (dni)"),
  cs_sub_expire:    t("On subscription expiration","Beim Ablauf","При окончании подписки","При завершенні підписки","À l'expiration","Po wygaśnięciu"),
  exp_keep:            t("Keep existing scheduled gifts","Vorhandene behalten","Сохранить запланированные","Зберегти заплановані","Conserver les cadeaux planifiés","Zachowaj zaplanowane prezenty"),
  exp_require_credits: t("Require credits before delivery","Kredite vor Zustellung","Требовать кредиты перед доставкой","Вимагати кредити перед доставкою","Exiger des crédits","Wymagaj kredytów"),
  exp_ask_renew:       t("Ask customer to renew","Verlängerung anfragen","Попросить продлить","Попросити продовжити","Demander de renouveler","Poproś o odnowienie"),
  exp_manual:          t("Send to manual review","Manuelle Prüfung","Ручная проверка","Ручна перевірка","Vérification manuelle","Ręczna weryfikacja"),
  cs_expire_warn: t("Never silently delete a customer's scheduled gift.",
                   "Geplante Geschenke der Kunden niemals stillschweigend löschen.",
                   "Никогда молча не удаляйте запланированный подарок клиента.",
                   "Ніколи не видаляйте запланований подарунок клієнта тихо.",
                   "Ne supprimez jamais un cadeau planifié sans avertissement.",
                   "Nigdy nie usuwaj po cichu zaplanowanego prezentu klienta."),

  // Time zones
  cs_tz_customer:   t("Customer time zone","Kunden-Zeitzone","Часовой пояс клиента","Часовий пояс клієнта","Fuseau client","Strefa klienta"),
  cs_tz_recipient:  t("Recipient time zone","Empfänger-Zeitzone","Часовой пояс получателя","Часовий пояс отримувача","Fuseau destinataire","Strefa odbiorcy"),
  cs_tz_platform:   t("Platform time zone","Plattform-Zeitzone","Часовой пояс платформы","Часовий пояс платформи","Fuseau plateforme","Strefa platformy"),
  cs_tz_admin:      t("Administrator time zone","Admin-Zeitzone","Часовой пояс администратора","Часовий пояс адміністратора","Fuseau administrateur","Strefa administratora"),
  cs_tz_warn_diff:  t("Customer and recipient are in different time zones.","Kunde und Empfänger in verschiedenen Zeitzonen.","Клиент и получатель в разных часовых поясах.","Клієнт і отримувач у різних часових поясах.","Client et destinataire dans des fuseaux différents.","Klient i odbiorca w różnych strefach."),
  cs_tz_warn_dst:   t("Delivery may be affected by daylight-saving time.","Sommerzeit kann Zustellung beeinflussen.","Летнее время может повлиять на доставку.","Літній час може вплинути на доставку.","L'heure d'été peut affecter la livraison.","Czas letni może wpłynąć na dostawę."),
  cs_tz_warn_midnight: t("Scheduled delivery crosses midnight.","Zustellung überquert Mitternacht.","Доставка пересекает полночь.","Доставка перетинає північ.","La livraison traverse minuit.","Dostawa przekracza północ."),

  // Holidays
  cs_src_official:  t("Official Country Holiday Provider","Offizieller Feiertagsanbieter","Официальный провайдер праздников","Офіційний провайдер свят","Fournisseur officiel","Oficjalny dostawca"),
  cs_src_religious: t("Religious Calendar Provider","Religiöser Kalender","Религиозный календарь","Релігійний календар","Calendrier religieux","Kalendarz religijny"),
  cs_src_regional:  t("Regional Holiday Provider","Regionaler Anbieter","Региональный провайдер","Регіональний провайдер","Fournisseur régional","Dostawca regionalny"),
  cs_src_pj:        t("Custom Project Joy Calendar","Eigener Project Joy Kalender","Календарь Project Joy","Календар Project Joy","Calendrier Project Joy","Kalendarz Project Joy"),
  cs_src_admin:     t("Administrator-Created Special Dates","Vom Admin erstellte Termine","Даты администратора","Дати адміністратора","Dates créées par l'administrateur","Daty administratora"),
  hs_not_connected: t("Not Connected","Nicht verbunden","Не подключено","Не підключено","Non connecté","Nie połączone"),
  hs_test:          t("Test Mode","Testmodus","Тестовый режим","Тестовий режим","Mode test","Tryb testowy"),
  hs_active:        t("Active","Aktiv","Активно","Активно","Actif","Aktywne"),
  hs_disabled:      t("Disabled","Deaktiviert","Отключено","Вимкнено","Désactivé","Wyłączone"),
  hs_error:         t("Error","Fehler","Ошибка","Помилка","Erreur","Błąd"),
  cs_hol_note:      t("Holidays are not hardcoded. Public holiday sources will be connected later per customer preference.",
                     "Feiertage sind nicht fest verdrahtet. Öffentliche Quellen werden später nach Kundenpräferenz verbunden.",
                     "Праздники не зашиты жёстко. Публичные источники будут подключены позже по выбору клиента.",
                     "Свята не зашиті жорстко. Публічні джерела будуть підключені пізніше за вибором клієнта.",
                     "Les jours fériés ne sont pas codés en dur. Sources publiques connectées ultérieurement.",
                     "Święta nie są zakodowane na stałe. Źródła publiczne zostaną podłączone później."),
  cs_movable_note:  t("Movable holidays such as Easter must come from a reliable source per year.",
                     "Bewegliche Feiertage wie Ostern müssen aus einer zuverlässigen Quelle pro Jahr stammen.",
                     "Подвижные праздники (напр. Пасха) должны браться из надёжного источника по годам.",
                     "Рухомі свята (напр. Великдень) мають братися з надійного джерела за роками.",
                     "Les fêtes mobiles comme Pâques doivent provenir d'une source fiable par année.",
                     "Święta ruchome (np. Wielkanoc) muszą pochodzić z wiarygodnego źródła każdego roku."),
  cs_col_src:       t("Source","Quelle","Источник","Джерело","Source","Źródło"),
  cs_col_countries: t("Countries","Länder","Страны","Країни","Pays","Kraje"),
  cs_col_regions:   t("Regions","Regionen","Регионы","Регіони","Régions","Regiony"),
  cs_col_types:     t("Types","Typen","Типы","Типи","Types","Typy"),
  cs_col_method:    t("Update Method","Aktualisierung","Метод обновления","Метод оновлення","Méthode","Metoda"),
  cs_col_lastsync:  t("Last Sync","Letzte Sync.","Последняя синхр.","Остання синх.","Dernière sync.","Ostatnia sync."),
  cs_col_priority:  t("Priority","Priorität","Приоритет","Пріоритет","Priorité","Priorytet"),

  // Safety
  cs_saf_maxev:      t("Max personal events per user","Max. persönliche Ereignisse pro Nutzer","Макс. личных событий на пользователя","Макс. особистих подій на користувача","Événements perso max. par utilisateur","Maks. zdarzeń osobistych na użytkownika"),
  cs_saf_maxrem:     t("Max reminders per event","Max. Erinnerungen pro Ereignis","Макс. напоминаний на событие","Макс. нагадувань на подію","Rappels max. par événement","Maks. przypomnień na zdarzenie"),
  cs_saf_maxgifts:   t("Max scheduled gifts per user","Max. geplante Geschenke pro Nutzer","Макс. запланированных подарков","Макс. запланованих подарунків","Cadeaux planifiés max.","Maks. zaplanowanych prezentów"),
  cs_saf_perday:     t("Max scheduled gifts per day","Max. pro Tag","Макс. в день","Макс. на день","Max. par jour","Maks. dziennie"),
  cs_saf_leadtime:   t("Min lead time (minutes)","Min. Vorlaufzeit (Min.)","Мин. время до доставки (мин.)","Мін. час до доставки (хв.)","Délai min. (min.)","Min. wyprzedzenie (min.)"),
  cs_saf_future:     t("Max scheduling range (days)","Max. Zeitraum (Tage)","Макс. диапазон (дней)","Макс. діапазон (днів)","Portée max. (jours)","Maks. zakres (dni)"),
  cs_saf_retry:      t("Max retry attempts","Max. Wiederholungen","Макс. повторов","Макс. повторів","Tentatives max.","Maks. ponowień"),
  cs_saf_pause:      t("Emergency pause for scheduled deliveries","Notfall-Pause","Экстренная пауза","Аварійна пауза","Pause d'urgence","Pauza awaryjna"),
  cs_saf_review_hv:  t("Manual review for high-value gifts","Manuelle Prüfung bei hohem Wert","Ручная проверка дорогих подарков","Ручна перевірка дорогих подарунків","Vérif. manuelle pour cadeaux à haute valeur","Ręczna weryfikacja drogich prezentów"),
  cs_saf_review_grp: t("Manual review for very large recipient groups","Manuelle Prüfung bei großen Gruppen","Ручная проверка больших групп","Ручна перевірка великих груп","Vérif. manuelle pour grands groupes","Ręczna weryfikacja dużych grup"),
  cs_saf_confirm:    t("Dangerous changes require confirmation.","Gefährliche Änderungen erfordern Bestätigung.","Опасные изменения требуют подтверждения.","Небезпечні зміни потребують підтвердження.","Les changements dangereux exigent une confirmation.","Niebezpieczne zmiany wymagają potwierdzenia."),

  // History
  cs_col_when:  t("Date","Datum","Дата","Дата","Date","Data"),
  cs_col_admin: t("Administrator","Administrator","Администратор","Адміністратор","Administrateur","Administrator"),
  cs_col_action:t("Action","Aktion","Действие","Дія","Action","Akcja"),
  cs_col_entity:t("Entity","Objekt","Объект","Об'єкт","Entité","Obiekt"),
  cs_col_prev:  t("Previous","Vorher","Раньше","Раніше","Précédent","Poprzednio"),
  cs_col_next:  t("New","Neu","Новое","Нове","Nouveau","Nowa"),
  cs_hist_event_created:      t("Event created","Ereignis erstellt","Событие создано","Подію створено","Événement créé","Zdarzenie utworzone"),
  cs_hist_event_edited:       t("Event edited","Ereignis bearbeitet","Событие изменено","Подію змінено","Événement modifié","Zdarzenie zmienione"),
  cs_hist_reminder_added:     t("Reminder added","Erinnerung hinzugefügt","Напоминание добавлено","Нагадування додано","Rappel ajouté","Dodano przypomnienie"),
  cs_hist_reminder_paused:    t("Reminder paused","Erinnerung pausiert","Напоминание приостановлено","Нагадування призупинено","Rappel en pause","Przypomnienie wstrzymane"),
  cs_hist_delivery_failed:    t("Delivery failed","Zustellung fehlgeschlagen","Доставка не удалась","Доставка не вдалася","Livraison échouée","Dostawa nieudana"),
  cs_hist_rule_changed:       t("Calendar rule changed","Kalenderregel geändert","Правило календаря изменено","Правило календаря змінено","Règle calendrier modifiée","Reguła kalendarza zmieniona"),
  cs_hist_subscription_changed: t("Subscription access changed","Abo-Zugriff geändert","Доступ по подписке изменён","Доступ за підпискою змінено","Accès abo modifié","Dostęp subskr. zmieniony"),

  // Search / filters
  cs_search_ph: t("Search by ID, customer, recipient, event name…","Suche…","Поиск…","Пошук…","Rechercher…","Szukaj…"),
  cs_filter_all:t("All","Alle","Все","Усі","Tous","Wszystkie"),
  cs_reset:     t("Reset All Filters","Filter zurücksetzen","Сбросить фильтры","Скинути фільтри","Réinitialiser","Resetuj filtry"),
  cs_sort:      t("Sort","Sortieren","Сортировка","Сортування","Trier","Sortuj"),
  cs_sort_upcoming: t("Upcoming First","Nächste zuerst","Ближайшие","Найближчі","Prochains d'abord","Nadchodzące"),
  cs_sort_created:  t("Latest Created","Neueste","Последние","Останні","Récents","Ostatnio utworzone"),

  // Actions
  cs_view:     t("View","Ansehen","Просмотр","Перегляд","Voir","Zobacz"),
  cs_edit:     t("Edit","Bearbeiten","Изменить","Редагувати","Modifier","Edytuj"),
  cs_dupe:     t("Duplicate","Duplizieren","Дублировать","Дублювати","Dupliquer","Duplikuj"),
  cs_pause:    t("Pause Reminder","Erinnerung pausieren","Пауза напоминания","Пауза нагадування","Suspendre rappel","Wstrzymaj przypomnienie"),
  cs_cancel:   t("Cancel Delivery","Zustellung stornieren","Отменить доставку","Скасувати доставку","Annuler livraison","Anuluj dostawę"),
  cs_archive:  t("Archive","Archivieren","В архив","В архів","Archiver","Archiwizuj"),
  cs_save:     t("Save","Speichern","Сохранить","Зберегти","Enregistrer","Zapisz"),
  cs_close:    t("Close","Schließen","Закрыть","Закрити","Fermer","Zamknij"),
  cs_unsaved:  t("Unsaved changes","Ungespeicherte Änderungen","Несохранённые изменения","Незбережені зміни","Modifications non enregistrées","Niezapisane zmiany"),

  // Failed delivery
  cs_fail_retry:    t("Retry Delivery","Erneut versuchen","Повторить доставку","Повторити доставку","Réessayer la livraison","Ponów dostawę"),
  cs_fail_change:   t("Change Delivery Channel","Kanal ändern","Сменить канал","Змінити канал","Changer de canal","Zmień kanał"),
  cs_fail_update:   t("Update Recipient Address","Empfänger aktualisieren","Обновить адрес получателя","Оновити адресу отримувача","Mettre à jour l'adresse","Zaktualizuj adres"),
  cs_fail_link:     t("Send Secure Link","Sicheren Link senden","Отправить безопасную ссылку","Надіслати безпечне посилання","Envoyer lien sécurisé","Wyślij bezpieczny link"),
  cs_fail_contact:  t("Contact Customer","Kunden kontaktieren","Связаться с клиентом","Зв'язатися з клієнтом","Contacter le client","Skontaktuj się z klientem"),
  cs_fail_review:   t("Move to Manual Review","Zur Prüfung","В ручную проверку","На ручну перевірку","Vers vérification manuelle","Do ręcznej weryfikacji"),
  cs_col_attempts:  t("Delivery Attempts","Zustellversuche","Попытки доставки","Спроби доставки","Tentatives","Próby"),
  cs_col_attempt:   t("Attempt","Versuch","Попытка","Спроба","Tentative","Próba"),
  cs_col_channel:   t("Channel","Kanal","Канал","Канал","Canal","Kanał"),
  cs_col_error:     t("Error","Fehler","Ошибка","Помилка","Erreur","Błąd"),

  // Preview
  cs_prev_title:    t("Customer Calendar Preview","Kundenkalender-Vorschau","Просмотр календаря клиента","Перегляд календаря клієнта","Aperçu calendrier client","Podgląd kalendarza klienta"),
  cs_prev_customer: t("Demonstration customer","Demo-Kunde","Демонстрационный клиент","Демонстраційний клієнт","Client démo","Klient demo"),
  cs_prev_note:     t("Internal preview only. No real customer data is exposed.",
                     "Nur interne Vorschau. Keine echten Daten.",
                     "Только внутренний просмотр. Реальные данные не отображаются.",
                     "Лише внутрішній перегляд. Реальні дані не відображаються.",
                     "Aperçu interne uniquement. Aucune donnée réelle exposée.",
                     "Tylko podgląd wewnętrzny. Żadne prawdziwe dane nie są ujawniane."),

  cs_privacy_note:  t("Personal dates are private by default. Recipient information is visible only to authorized staff.",
                     "Persönliche Daten sind standardmäßig privat. Empfängerdaten sind nur autorisiertem Personal sichtbar.",
                     "Личные даты приватны по умолчанию. Данные получателя видны только уполномоченному персоналу.",
                     "Особисті дати приватні за замовчуванням. Дані отримувача бачить лише уповноважений персонал.",
                     "Les dates personnelles sont privées par défaut.",
                     "Daty osobiste są domyślnie prywatne."),
};

export function useLocalCS(lang: Lang) {
  return (key: keyof typeof CS_I18N): string => {
    const row = CS_I18N[key];
    return row ? row[lang] ?? row.en : String(key);
  };
}

export type CSKey = keyof typeof CS_I18N;