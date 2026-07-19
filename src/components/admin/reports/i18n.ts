import type { Lang } from "@/lib/i18n/types";

type T = Record<Lang, string>;
const t = (en: string, de: string, ru: string, uk: string, fr: string, pl: string): T =>
  ({ en, de, ru, uk, fr, pl });

export const RP_I18N: Record<string, T> = {
  // Shell
  rp_title:    t("Reports and Analytics","Berichte und Analytik","Отчёты и аналитика","Звіти та аналітика","Rapports et analyses","Raporty i analityka"),
  rp_subtitle: t("Monitor platform performance, revenue, orders and customer activity.",
                 "Überwachen Sie Plattformleistung, Umsatz, Bestellungen und Kundenaktivität.",
                 "Отслеживайте эффективность платформы, выручку, заказы и активность клиентов.",
                 "Стежте за ефективністю платформи, доходами, замовленнями та активністю клієнтів.",
                 "Suivez les performances de la plateforme, les revenus, les commandes et l'activité client.",
                 "Monitoruj wydajność platformy, przychody, zamówienia i aktywność klientów."),
  rp_demo_note: t("Demonstration data","Demodaten","Демонстрационные данные","Демонстраційні дані","Données de démonstration","Dane demonstracyjne"),

  // Top actions
  rp_refresh:   t("Refresh","Aktualisieren","Обновить","Оновити","Actualiser","Odśwież"),
  rp_export:    t("Export Report","Bericht exportieren","Экспорт отчёта","Експорт звіту","Exporter le rapport","Eksportuj raport"),
  rp_schedule:  t("Schedule Report","Bericht planen","Запланировать отчёт","Запланувати звіт","Planifier le rapport","Zaplanuj raport"),
  rp_compare:   t("Compare Periods","Perioden vergleichen","Сравнить периоды","Порівняти періоди","Comparer les périodes","Porównaj okresy"),
  rp_saved:     t("Saved Reports","Gespeicherte Berichte","Сохранённые отчёты","Збережені звіти","Rapports enregistrés","Zapisane raporty"),

  // Tabs
  rp_tab_overview:      t("Overview","Übersicht","Обзор","Огляд","Aperçu","Przegląd"),
  rp_tab_revenue:       t("Revenue","Umsatz","Выручка","Дохід","Revenus","Przychody"),
  rp_tab_orders:        t("Orders","Bestellungen","Заказы","Замовлення","Commandes","Zamówienia"),
  rp_tab_users:         t("Users","Benutzer","Пользователи","Користувачі","Utilisateurs","Użytkownicy"),
  rp_tab_subs:          t("Subscriptions","Abonnements","Подписки","Підписки","Abonnements","Subskrypcje"),
  rp_tab_credits:       t("Credits","Kredite","Кредиты","Кредити","Crédits","Kredyty"),
  rp_tab_catalog:       t("Catalog","Katalog","Каталог","Каталог","Catalogue","Katalog"),
  rp_tab_promos:        t("Promotions","Aktionen","Промоакции","Промоакції","Promotions","Promocje"),
  rp_tab_notifs:        t("Notifications","Benachrichtigungen","Уведомления","Сповіщення","Notifications","Powiadomienia"),
  rp_tab_calendar:      t("Calendar","Kalender","Календарь","Календар","Calendrier","Kalendarz"),
  rp_tab_production:    t("Production and Costs","Produktion und Kosten","Производство и расходы","Виробництво і витрати","Production et coûts","Produkcja i koszty"),
  rp_tab_service:       t("Service Performance","Dienstleistung","Производительность сервисов","Продуктивність сервісів","Performance des services","Wydajność usług"),
  rp_tab_custom:        t("Custom Reports","Benutzerdefiniert","Свои отчёты","Власні звіти","Rapports personnalisés","Raporty niestandardowe"),
  rp_tab_load:          t("Load Distribution","Lastverteilung","Распределение нагрузки","Розподіл навантаження","Répartition de charge","Rozkład obciążenia"),
  rp_tab_profit:        t("Profitability by Product","Rentabilität nach Produkt","Прибыльность по продуктам","Прибутковість за продуктом","Rentabilité par produit","Rentowność wg produktu"),
  rp_tab_country:       t("Country and Language","Land und Sprache","Страна и язык","Країна та мова","Pays et langue","Kraj i język"),
  rp_tab_alerts:        t("Alerts and Thresholds","Warnungen und Schwellenwerte","Оповещения и пороги","Сповіщення та пороги","Alertes et seuils","Alerty i progi"),

  // Date ranges
  dr_today:         t("Today","Heute","Сегодня","Сьогодні","Aujourd'hui","Dzisiaj"),
  dr_yesterday:     t("Yesterday","Gestern","Вчера","Вчора","Hier","Wczoraj"),
  dr_last7:         t("Last 7 Days","Letzte 7 Tage","Последние 7 дней","Останні 7 днів","7 derniers jours","Ostatnie 7 dni"),
  dr_last30:        t("Last 30 Days","Letzte 30 Tage","Последние 30 дней","Останні 30 днів","30 derniers jours","Ostatnie 30 dni"),
  dr_this_month:    t("This Month","Dieser Monat","Этот месяц","Цей місяць","Ce mois-ci","Ten miesiąc"),
  dr_prev_month:    t("Previous Month","Vormonat","Прошлый месяц","Минулий місяць","Mois précédent","Poprzedni miesiąc"),
  dr_this_quarter:  t("This Quarter","Dieses Quartal","Этот квартал","Цей квартал","Ce trimestre","Ten kwartał"),
  dr_this_year:     t("This Year","Dieses Jahr","Этот год","Цей рік","Cette année","Ten rok"),
  dr_custom:        t("Custom Range","Benutzerdefiniert","Свой диапазон","Власний діапазон","Plage personnalisée","Zakres niestandardowy"),

  cmp_prev_period:  t("Previous Period","Vorheriger Zeitraum","Предыдущий период","Попередній період","Période précédente","Poprzedni okres"),
  cmp_prev_month:   t("Previous Month","Vormonat","Прошлый месяц","Минулий місяць","Mois précédent","Poprzedni miesiąc"),
  cmp_prev_year:    t("Previous Year","Vorjahr","Прошлый год","Минулий рік","Année précédente","Poprzedni rok"),
  cmp_none:         t("No Comparison","Kein Vergleich","Без сравнения","Без порівняння","Sans comparaison","Bez porównania"),

  // KPI labels
  k_total_revenue:  t("Total Revenue","Gesamtumsatz","Общая выручка","Загальний дохід","Revenu total","Całkowity przychód"),
  k_net_revenue:    t("Net Revenue","Nettoumsatz","Чистая выручка","Чистий дохід","Revenu net","Przychód netto"),
  k_credits_sold:   t("Credits Sold","Verkaufte Kredite","Продано кредитов","Продано кредитів","Crédits vendus","Sprzedane kredyty"),
  k_active_subs:    t("Active Subscriptions","Aktive Abonnements","Активные подписки","Активні підписки","Abonnements actifs","Aktywne subskrypcje"),
  k_new_users:      t("New Users","Neue Benutzer","Новые пользователи","Нові користувачі","Nouveaux utilisateurs","Nowi użytkownicy"),
  k_total_orders:   t("Total Orders","Bestellungen gesamt","Всего заказов","Усього замовлень","Commandes totales","Wszystkie zamówienia"),
  k_completed:      t("Completed Orders","Abgeschlossene Bestellungen","Завершённые заказы","Завершені замовлення","Commandes terminées","Zakończone zamówienia"),
  k_cancelled:      t("Cancelled Orders","Stornierte Bestellungen","Отменённые заказы","Скасовані замовлення","Commandes annulées","Anulowane zamówienia"),
  k_refunds:        t("Refunds","Erstattungen","Возвраты","Повернення","Remboursements","Zwroty"),
  k_aov:            t("Average Order Value","Durchschnittlicher Bestellwert","Средний чек","Середній чек","Panier moyen","Średnia wartość zamówienia"),
  k_costs:          t("Estimated Platform Costs","Geschätzte Plattformkosten","Оценка расходов платформы","Оцінка витрат платформи","Coûts estimés","Szacowane koszty"),
  k_profit:         t("Estimated Profit","Geschätzter Gewinn","Оценка прибыли","Оцінка прибутку","Bénéfice estimé","Szacowany zysk"),

  // Sections
  s_by_product:  t("By Product","Nach Produkt","По продукту","За продуктом","Par produit","Wg produktu"),
  s_by_country:  t("By Country","Nach Land","По стране","За країною","Par pays","Wg kraju"),
  s_by_language: t("By Language","Nach Sprache","По языку","За мовою","Par langue","Wg języka"),
  s_by_channel:  t("By Channel","Nach Kanal","По каналу","За каналом","Par canal","Wg kanału"),
  s_over_time:   t("Over Time","Zeitverlauf","Динамика","Динаміка","Évolution","W czasie"),
  s_top:         t("Top Performers","Bestleister","Лидеры","Лідери","Meilleurs","Najlepsi"),

  // Common table headers
  h_date: t("Date","Datum","Дата","Дата","Date","Data"),
  h_order_id: t("Order ID","Bestell-ID","ID заказа","ID замовлення","ID commande","ID zamówienia"),
  h_customer: t("Customer","Kunde","Клиент","Клієнт","Client","Klient"),
  h_product: t("Product","Produkt","Продукт","Продукт","Produit","Produkt"),
  h_gross: t("Gross","Brutto","Брутто","Брутто","Brut","Brutto"),
  h_discount: t("Discount","Rabatt","Скидка","Знижка","Remise","Rabat"),
  h_refund: t("Refund","Erstattung","Возврат","Повернення","Remboursement","Zwrot"),
  h_net: t("Net","Netto","Нетто","Нетто","Net","Netto"),
  h_currency: t("Currency","Währung","Валюта","Валюта","Devise","Waluta"),
  h_status: t("Status","Status","Статус","Статус","Statut","Status"),
  h_country: t("Country","Land","Страна","Країна","Pays","Kraj"),
  h_language: t("Language","Sprache","Язык","Мова","Langue","Język"),
  h_orders: t("Orders","Bestellungen","Заказы","Замовлення","Commandes","Zamówienia"),
  h_revenue: t("Revenue","Umsatz","Выручка","Дохід","Revenus","Przychody"),
  h_credits: t("Credits","Kredite","Кредиты","Кредити","Crédits","Kredyty"),
  h_channel: t("Channel","Kanal","Канал","Канал","Canal","Kanał"),
  h_type: t("Type","Typ","Тип","Тип","Type","Typ"),
  h_uses: t("Uses","Nutzungen","Использования","Використання","Utilisations","Użycia"),
  h_views: t("Views","Ansichten","Просмотры","Перегляди","Vues","Wyświetlenia"),
  h_favorites: t("Favorites","Favoriten","Избранное","Улюблене","Favoris","Ulubione"),
  h_shares: t("Shares","Geteilt","Поделились","Поділилися","Partages","Udostępnienia"),
  h_actions: t("Actions","Aktionen","Действия","Дії","Actions","Akcje"),
  h_severity: t("Severity","Schweregrad","Серьёзность","Серйозність","Sévérité","Waga"),
  h_threshold: t("Threshold","Schwellenwert","Порог","Поріг","Seuil","Próg"),
  h_enabled: t("Enabled","Aktiviert","Включено","Увімкнено","Activé","Włączone"),

  // Filters / labels
  lbl_country_filter:  t("Country","Land","Страна","Країна","Pays","Kraj"),
  lbl_language_filter: t("Language","Sprache","Язык","Мова","Langue","Język"),
  lbl_status_filter:   t("Status","Status","Статус","Статус","Statut","Status"),
  lbl_type_filter:     t("Product Type","Produkttyp","Тип продукта","Тип продукту","Type de produit","Typ produktu"),
  lbl_priority:        t("Priority","Priorität","Приоритет","Пріоритет","Priorité","Priorytet"),
  lbl_all:             t("All","Alle","Все","Усі","Tous","Wszystkie"),
  lbl_from:            t("From","Von","С","З","Du","Od"),
  lbl_to:              t("To","Bis","По","До","Au","Do"),
  lbl_search:          t("Search","Suche","Поиск","Пошук","Recherche","Szukaj"),

  // Export
  exp_current:  t("Current View","Aktuelle Ansicht","Текущий вид","Поточний вигляд","Vue actuelle","Bieżący widok"),
  exp_selected: t("Selected Rows","Ausgewählte Zeilen","Выбранные строки","Вибрані рядки","Lignes sélectionnées","Wybrane wiersze"),
  exp_full:     t("Full Report","Vollständiger Bericht","Полный отчёт","Повний звіт","Rapport complet","Pełny raport"),
  exp_summary:  t("Summary Only","Nur Zusammenfassung","Только сводка","Лише зведення","Résumé uniquement","Tylko podsumowanie"),

  // Custom builder
  cb_name:        t("Report Name","Berichtsname","Название отчёта","Назва звіту","Nom du rapport","Nazwa raportu"),
  cb_metrics:     t("Metrics","Metriken","Метрики","Метрики","Métriques","Metryki"),
  cb_dimensions:  t("Dimensions","Dimensionen","Разрезы","Розрізи","Dimensions","Wymiary"),
  cb_filters:     t("Filters","Filter","Фильтры","Фільтри","Filtres","Filtry"),
  cb_generate:    t("Generate Preview","Vorschau erzeugen","Сгенерировать превью","Згенерувати перегляд","Aperçu","Podgląd"),
  cb_save:        t("Save Report","Bericht speichern","Сохранить отчёт","Зберегти звіт","Enregistrer","Zapisz raport"),
  cb_duplicate:   t("Duplicate","Duplizieren","Дублировать","Дублювати","Dupliquer","Duplikuj"),
  cb_delete:      t("Delete","Löschen","Удалить","Видалити","Supprimer","Usuń"),
  cb_cancel:      t("Cancel","Abbrechen","Отмена","Скасувати","Annuler","Anuluj"),
  cb_discard:     t("Discard Changes","Änderungen verwerfen","Отменить изменения","Відхилити зміни","Annuler les modifications","Odrzuć zmiany"),
  cb_unsaved:     t("Unsaved changes","Nicht gespeicherte Änderungen","Несохранённые изменения","Незбережені зміни","Modifications non enregistrées","Niezapisane zmiany"),
  cb_leave_warn:  t("You have unsaved changes. Leave anyway?","Sie haben nicht gespeicherte Änderungen. Trotzdem verlassen?","Есть несохранённые изменения. Всё равно уйти?","Є незбережені зміни. Все одно вийти?","Modifications non enregistrées. Quitter quand même ?","Masz niezapisane zmiany. Wyjść mimo to?"),

  // Alerts
  al_new:         t("New Alert","Neue Warnung","Новое оповещение","Нове сповіщення","Nouvelle alerte","Nowy alert"),
  al_test:        t("Test Alert","Warnung testen","Тест оповещения","Тест сповіщення","Tester l'alerte","Testuj alert"),

  // Validation
  v_name_required:      t("Name is required.","Name ist erforderlich.","Укажите название.","Вкажіть назву.","Nom requis.","Wymagana nazwa."),
  v_metric_required:    t("Select at least one metric.","Mindestens eine Metrik auswählen.","Выберите хотя бы одну метрику.","Оберіть хоча б одну метрику.","Sélectionnez au moins une métrique.","Wybierz co najmniej jedną metrykę."),
  v_dimension_required: t("Select at least one dimension.","Mindestens eine Dimension auswählen.","Выберите хотя бы один разрез.","Оберіть хоча б один розріз.","Sélectionnez au moins une dimension.","Wybierz co najmniej jeden wymiar."),
  v_invalid_range:      t("Start date must be before end date.","Startdatum muss vor Enddatum liegen.","Дата начала должна быть раньше даты окончания.","Дата початку має бути раніше дати завершення.","Date de début avant date de fin.","Data początkowa musi być wcześniej."),
  v_invalid_compare:    t("Comparison period not available for this range.","Vergleichszeitraum für diesen Bereich nicht verfügbar.","Сравнение для этого периода недоступно.","Порівняння для цього періоду недоступне.","Comparaison non disponible pour cette période.","Porównanie niedostępne dla tego okresu."),
  v_negative_threshold: t("Threshold cannot be negative.","Schwellenwert darf nicht negativ sein.","Порог не может быть отрицательным.","Поріг не може бути від'ємним.","Le seuil ne peut être négatif.","Próg nie może być ujemny."),
  v_schedule_required:  t("Frequency is required for scheduled reports.","Häufigkeit für geplante Berichte erforderlich.","Для запланированных отчётов нужна периодичность.","Для запланованих звітів потрібна періодичність.","Fréquence requise pour les rapports planifiés.","Wymagana częstotliwość."),
  v_export_needs:       t("Export requires at least one data section.","Export benötigt mindestens einen Datenabschnitt.","Экспорт требует хотя бы один раздел данных.","Експорт потребує хоча б один розділ.","L'export nécessite au moins une section.","Eksport wymaga sekcji danych."),
  v_unsupported:        t("This combination is not supported.","Diese Kombination wird nicht unterstützt.","Такое сочетание не поддерживается.","Таке поєднання не підтримується.","Combinaison non prise en charge.","Kombinacja nieobsługiwana."),

  // Empty / notes
  n_empty:       t("No data for the selected range.","Keine Daten für den gewählten Zeitraum.","Нет данных за выбранный период.","Немає даних за вибраний період.","Aucune donnée pour cette période.","Brak danych dla wybranego zakresu."),
  n_placeholder: t("Placeholder","Platzhalter","Заполнитель","Заповнювач","Espace réservé","Placeholder"),

  // Product labels
  p_card: t("Greeting Card","Grußkarte","Открытка","Листівка","Carte de vœux","Kartka"),
  p_animated: t("Animated Greeting","Animierter Gruß","Анимированное поздравление","Анімоване вітання","Vœu animé","Animowane"),
  p_song: t("Song","Lied","Песня","Пісня","Chanson","Piosenka"),
  p_video: t("Video Clip","Videoclip","Видеоклип","Відеокліп","Clip vidéo","Klip wideo"),
  p_cartoon: t("Cartoon","Zeichentrick","Мультфильм","Мультфільм","Dessin animé","Kreskówka"),
  p_premium: t("Premium Order","Premium-Bestellung","Премиум заказ","Преміум замовлення","Commande premium","Zamówienie premium"),
  p_individual: t("Individual Order","Individuelle Bestellung","Индивидуальный заказ","Індивідуальне замовлення","Commande individuelle","Zamówienie indywidualne"),
  p_corporate: t("Corporate Order","Firmenbestellung","Корпоративный заказ","Корпоративне замовлення","Commande d'entreprise","Zamówienie firmowe"),

  // Channels
  ch_email: t("Email","E-Mail","Email","Email","E-mail","Email"),
  ch_sms: t("SMS","SMS","SMS","SMS","SMS","SMS"),
  ch_push: t("Push","Push","Push","Push","Push","Push"),
  ch_telegram: t("Telegram","Telegram","Telegram","Telegram","Telegram","Telegram"),
  ch_whatsapp: t("WhatsApp","WhatsApp","WhatsApp","WhatsApp","WhatsApp","WhatsApp"),
  ch_internal: t("Internal","Intern","Внутренние","Внутрішні","Interne","Wewnętrzne"),

  // Alert kinds
  ak_revenue_below:        t("Revenue Below Threshold","Umsatz unter Schwellenwert","Выручка ниже порога","Дохід нижче порогу","Revenus sous le seuil","Przychód poniżej progu"),
  ak_costs_above:          t("Costs Above Threshold","Kosten über Schwellenwert","Расходы выше порога","Витрати вище порогу","Coûts au-dessus du seuil","Koszty powyżej progu"),
  ak_failed_orders:        t("Failed Orders Above Threshold","Fehlgeschlagene Bestellungen","Провалы заказов","Невдалі замовлення","Commandes échouées","Nieudane zamówienia"),
  ak_notif_failure_rate:   t("Notification Failure Rate High","Hohe Fehlerquote Benachrichtigungen","Высокая ошибка уведомлений","Висока помилка сповіщень","Taux d'échec notifications","Wysoki wskaźnik błędów"),
  ak_delivery_failure_rate:t("Delivery Failure Rate High","Hohe Zustellfehlerquote","Высокая ошибка доставки","Висока помилка доставки","Taux d'échec livraison","Wysoki wskaźnik dostaw"),
  ak_sub_churn:            t("Subscription Churn High","Hohe Abwanderung","Высокий отток подписок","Високий відтік підписок","Attrition élevée","Wysoka rezygnacja"),
  ak_queue_too_long:       t("Service Queue Too Long","Warteschlange zu lang","Очередь слишком длинная","Черга занадто довга","File d'attente trop longue","Zbyt długa kolejka"),
  ak_service_error_rate:   t("Service Error Rate High","Hohe Servicefehlerquote","Высокая ошибка сервисов","Висока помилка сервісів","Taux d'erreur service","Wysoki wskaźnik błędów usług"),
  ak_low_margin:           t("Low Profit Margin","Niedrige Gewinnmarge","Низкая маржа","Низька маржа","Marge faible","Niska marża"),
  ak_refund_activity:      t("Unusual Refund Activity","Ungewöhnliche Erstattungen","Необычные возвраты","Незвичайні повернення","Remboursements inhabituels","Nietypowe zwroty"),
};

export function useLocalRP(lang: Lang) {
  return (key: keyof typeof RP_I18N): string => {
    const row = RP_I18N[key];
    return row ? row[lang] ?? row.en : String(key);
  };
}

export type RPKey = keyof typeof RP_I18N;