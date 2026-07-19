import type { Lang } from "@/lib/i18n";

type Row = Record<Lang, string>;
const D: Record<string, Row> = {
  title: { en: "Notification Center", ru: "Центр уведомлений", de: "Benachrichtigungszentrale", uk: "Центр сповіщень", fr: "Centre de notifications", pl: "Centrum powiadomień" },
  subtitle: {
    en: "Manage every customer notification from one centralized place.",
    ru: "Управляйте всеми уведомлениями клиентов из одного центра.",
    de: "Verwalte alle Kundenbenachrichtigungen an einem zentralen Ort.",
    uk: "Керуйте всіма сповіщеннями клієнтів з одного центру.",
    fr: "Gérez toutes les notifications clients depuis un lieu centralisé.",
    pl: "Zarządzaj wszystkimi powiadomieniami klientów z jednego miejsca.",
  },
  demo_notice: {
    en: "Demonstration data only. No email, SMS, push, Telegram or WhatsApp provider is connected.",
    ru: "Только демонстрационные данные. Провайдеры email, SMS, push, Telegram и WhatsApp не подключены.",
    de: "Nur Demo-Daten. Kein E-Mail-, SMS-, Push-, Telegram- oder WhatsApp-Anbieter angebunden.",
    uk: "Лише демонстраційні дані. Провайдери email, SMS, push, Telegram і WhatsApp не підключені.",
    fr: "Données de démonstration. Aucun fournisseur e-mail, SMS, push, Telegram ou WhatsApp connecté.",
    pl: "Tylko dane demonstracyjne. Brak podłączonych dostawców e-mail, SMS, push, Telegram i WhatsApp.",
  },

  btn_create: { en: "Create Notification", ru: "Создать уведомление", de: "Benachrichtigung erstellen", uk: "Створити сповіщення", fr: "Créer une notification", pl: "Utwórz powiadomienie" },
  btn_refresh: { en: "Refresh", ru: "Обновить", de: "Aktualisieren", uk: "Оновити", fr: "Actualiser", pl: "Odśwież" },
  btn_bulk_send: { en: "Bulk Send", ru: "Массовая отправка", de: "Massenversand", uk: "Масова розсилка", fr: "Envoi groupé", pl: "Wysyłka masowa" },
  btn_templates: { en: "Notification Templates", ru: "Шаблоны уведомлений", de: "Benachrichtigungsvorlagen", uk: "Шаблони сповіщень", fr: "Modèles de notifications", pl: "Szablony powiadomień" },
  btn_stats: { en: "Notification Statistics", ru: "Статистика уведомлений", de: "Statistik", uk: "Статистика сповіщень", fr: "Statistiques", pl: "Statystyki" },

  search_placeholder: { en: "Search by recipient, email, phone, order or subject…", ru: "Поиск: получатель, email, телефон, заказ, тема…", de: "Suche: Empfänger, E-Mail, Telefon, Bestellung, Betreff…", uk: "Пошук: одержувач, email, телефон, замовлення, тема…", fr: "Rechercher : destinataire, e-mail, téléphone, commande, sujet…", pl: "Szukaj: odbiorca, e-mail, telefon, zamówienie, temat…" },

  f_status: { en: "Status", ru: "Статус", de: "Status", uk: "Статус", fr: "Statut", pl: "Status" },
  f_type: { en: "Type", ru: "Тип", de: "Typ", uk: "Тип", fr: "Type", pl: "Typ" },
  f_channel: { en: "Channel", ru: "Канал", de: "Kanal", uk: "Канал", fr: "Canal", pl: "Kanał" },
  f_language: { en: "Language", ru: "Язык", de: "Sprache", uk: "Мова", fr: "Langue", pl: "Język" },
  f_country: { en: "Country", ru: "Страна", de: "Land", uk: "Країна", fr: "Pays", pl: "Kraj" },
  f_priority: { en: "Priority", ru: "Приоритет", de: "Priorität", uk: "Пріоритет", fr: "Priorité", pl: "Priorytet" },
  f_from: { en: "From", ru: "С", de: "Von", uk: "Від", fr: "De", pl: "Od" },
  f_to: { en: "To", ru: "По", de: "Bis", uk: "До", fr: "À", pl: "Do" },
  f_all: { en: "All", ru: "Все", de: "Alle", uk: "Усі", fr: "Tous", pl: "Wszystkie" },

  sort_by: { en: "Sort by", ru: "Сортировать", de: "Sortieren", uk: "Сортувати", fr: "Trier", pl: "Sortuj" },
  sort_newest: { en: "Newest first", ru: "Сначала новые", de: "Neueste zuerst", uk: "Спочатку нові", fr: "Plus récentes", pl: "Najnowsze" },
  sort_oldest: { en: "Oldest first", ru: "Сначала старые", de: "Älteste zuerst", uk: "Спочатку старі", fr: "Plus anciennes", pl: "Najstarsze" },
  sort_status: { en: "Status", ru: "Статус", de: "Status", uk: "Статус", fr: "Statut", pl: "Status" },
  sort_recipient: { en: "Recipient", ru: "Получатель", de: "Empfänger", uk: "Одержувач", fr: "Destinataire", pl: "Odbiorca" },
  sort_type: { en: "Type", ru: "Тип", de: "Typ", uk: "Тип", fr: "Type", pl: "Typ" },
  sort_channel: { en: "Channel", ru: "Канал", de: "Kanal", uk: "Канал", fr: "Canal", pl: "Kanał" },

  col_id: { en: "ID", ru: "ID", de: "ID", uk: "ID", fr: "ID", pl: "ID" },
  col_recipient: { en: "Recipient", ru: "Получатель", de: "Empfänger", uk: "Одержувач", fr: "Destinataire", pl: "Odbiorca" },
  col_contact: { en: "Email / Phone", ru: "Email / Телефон", de: "E-Mail / Telefon", uk: "Email / Телефон", fr: "E-mail / Téléphone", pl: "E-mail / Telefon" },
  col_order: { en: "Order", ru: "Заказ", de: "Bestellung", uk: "Замовлення", fr: "Commande", pl: "Zamówienie" },
  col_type: { en: "Type", ru: "Тип", de: "Typ", uk: "Тип", fr: "Type", pl: "Typ" },
  col_channel: { en: "Channel", ru: "Канал", de: "Kanal", uk: "Канал", fr: "Canal", pl: "Kanał" },
  col_language: { en: "Lang", ru: "Язык", de: "Sprache", uk: "Мова", fr: "Langue", pl: "Język" },
  col_country: { en: "Country", ru: "Страна", de: "Land", uk: "Країна", fr: "Pays", pl: "Kraj" },
  col_priority: { en: "Priority", ru: "Приоритет", de: "Priorität", uk: "Пріоритет", fr: "Priorité", pl: "Priorytet" },
  col_status: { en: "Status", ru: "Статус", de: "Status", uk: "Статус", fr: "Statut", pl: "Status" },
  col_created: { en: "Created", ru: "Создано", de: "Erstellt", uk: "Створено", fr: "Créée", pl: "Utworzono" },
  col_scheduled: { en: "Scheduled", ru: "Запланировано", de: "Geplant", uk: "Заплановано", fr: "Planifiée", pl: "Zaplanowano" },
  col_sent: { en: "Sent", ru: "Отправлено", de: "Gesendet", uk: "Надіслано", fr: "Envoyée", pl: "Wysłane" },
  col_actions: { en: "Actions", ru: "Действия", de: "Aktionen", uk: "Дії", fr: "Actions", pl: "Akcje" },

  act_view: { en: "View", ru: "Открыть", de: "Ansehen", uk: "Переглянути", fr: "Voir", pl: "Zobacz" },
  act_edit: { en: "Edit", ru: "Изменить", de: "Bearbeiten", uk: "Редагувати", fr: "Modifier", pl: "Edytuj" },
  act_duplicate: { en: "Duplicate", ru: "Дублировать", de: "Duplizieren", uk: "Дублювати", fr: "Dupliquer", pl: "Duplikuj" },
  act_preview: { en: "Preview", ru: "Предпросмотр", de: "Vorschau", uk: "Перегляд", fr: "Aperçu", pl: "Podgląd" },
  act_send_again: { en: "Send Again", ru: "Отправить снова", de: "Erneut senden", uk: "Надіслати знову", fr: "Renvoyer", pl: "Wyślij ponownie" },
  act_cancel: { en: "Cancel", ru: "Отменить", de: "Stornieren", uk: "Скасувати", fr: "Annuler", pl: "Anuluj" },
  act_delete: { en: "Delete", ru: "Удалить", de: "Löschen", uk: "Видалити", fr: "Supprimer", pl: "Usuń" },
  act_send_now: { en: "Send Now", ru: "Отправить сейчас", de: "Jetzt senden", uk: "Надіслати зараз", fr: "Envoyer maintenant", pl: "Wyślij teraz" },

  bulk_send: { en: "Send Selected", ru: "Отправить выбранные", de: "Ausgewählte senden", uk: "Надіслати вибрані", fr: "Envoyer la sélection", pl: "Wyślij zaznaczone" },
  bulk_cancel: { en: "Cancel Selected", ru: "Отменить выбранные", de: "Ausgewählte stornieren", uk: "Скасувати вибрані", fr: "Annuler la sélection", pl: "Anuluj zaznaczone" },
  bulk_delete: { en: "Delete Selected", ru: "Удалить выбранные", de: "Ausgewählte löschen", uk: "Видалити вибрані", fr: "Supprimer la sélection", pl: "Usuń zaznaczone" },
  bulk_export: { en: "Export Selected", ru: "Экспорт выбранных", de: "Ausgewählte exportieren", uk: "Експорт вибраних", fr: "Exporter la sélection", pl: "Eksportuj zaznaczone" },
  bulk_selected: { en: "{n} selected", ru: "Выбрано: {n}", de: "{n} ausgewählt", uk: "Вибрано: {n}", fr: "{n} sélectionnées", pl: "Zaznaczono: {n}" },
  clear_selection: { en: "Clear selection", ru: "Снять выделение", de: "Auswahl aufheben", uk: "Зняти виділення", fr: "Effacer la sélection", pl: "Wyczyść zaznaczenie" },

  save: { en: "Save", ru: "Сохранить", de: "Speichern", uk: "Зберегти", fr: "Enregistrer", pl: "Zapisz" },
  close: { en: "Close", ru: "Закрыть", de: "Schließen", uk: "Закрити", fr: "Fermer", pl: "Zamknij" },
  cancel: { en: "Cancel", ru: "Отмена", de: "Abbrechen", uk: "Скасувати", fr: "Annuler", pl: "Anuluj" },
  confirm: { en: "Confirm", ru: "Подтвердить", de: "Bestätigen", uk: "Підтвердити", fr: "Confirmer", pl: "Potwierdź" },
  delete: { en: "Delete", ru: "Удалить", de: "Löschen", uk: "Видалити", fr: "Supprimer", pl: "Usuń" },

  // Fields
  fld_recipient: { en: "Recipient name", ru: "Имя получателя", de: "Empfängername", uk: "Ім'я одержувача", fr: "Nom du destinataire", pl: "Odbiorca" },
  fld_email: { en: "Email", ru: "Email", de: "E-Mail", uk: "Email", fr: "E-mail", pl: "E-mail" },
  fld_phone: { en: "Phone", ru: "Телефон", de: "Telefon", uk: "Телефон", fr: "Téléphone", pl: "Telefon" },
  fld_language: { en: "Language", ru: "Язык", de: "Sprache", uk: "Мова", fr: "Langue", pl: "Język" },
  fld_country: { en: "Country", ru: "Страна", de: "Land", uk: "Країна", fr: "Pays", pl: "Kraj" },
  fld_related_order: { en: "Related order", ru: "Связанный заказ", de: "Zugehörige Bestellung", uk: "Пов'язане замовлення", fr: "Commande liée", pl: "Powiązane zamówienie" },
  fld_type: { en: "Notification type", ru: "Тип уведомления", de: "Benachrichtigungstyp", uk: "Тип сповіщення", fr: "Type de notification", pl: "Typ powiadomienia" },
  fld_channel: { en: "Delivery channel", ru: "Канал доставки", de: "Zustellkanal", uk: "Канал доставки", fr: "Canal de diffusion", pl: "Kanał wysyłki" },
  fld_priority: { en: "Priority", ru: "Приоритет", de: "Priorität", uk: "Пріоритет", fr: "Priorité", pl: "Priorytet" },
  fld_status: { en: "Status", ru: "Статус", de: "Status", uk: "Статус", fr: "Statut", pl: "Status" },
  fld_subject: { en: "Subject", ru: "Тема", de: "Betreff", uk: "Тема", fr: "Sujet", pl: "Temat" },
  fld_message: { en: "Full message", ru: "Полный текст", de: "Vollständige Nachricht", uk: "Повний текст", fr: "Message complet", pl: "Pełna treść" },
  fld_attachments: { en: "Attachments", ru: "Вложения", de: "Anhänge", uk: "Вкладення", fr: "Pièces jointes", pl: "Załączniki" },
  fld_created: { en: "Created", ru: "Создано", de: "Erstellt", uk: "Створено", fr: "Créée", pl: "Utworzono" },
  fld_scheduled: { en: "Scheduled", ru: "Запланировано", de: "Geplant", uk: "Заплановано", fr: "Planifiée", pl: "Zaplanowano" },
  fld_sent: { en: "Sent", ru: "Отправлено", de: "Gesendet", uk: "Надіслано", fr: "Envoyée", pl: "Wysłane" },
  fld_read: { en: "Read", ru: "Прочитано", de: "Gelesen", uk: "Прочитано", fr: "Lue", pl: "Przeczytane" },
  fld_attempts: { en: "Delivery attempts", ru: "Попытки доставки", de: "Zustellversuche", uk: "Спроби доставки", fr: "Tentatives", pl: "Próby dostarczenia" },
  fld_error_log: { en: "Error log", ru: "Журнал ошибок", de: "Fehlerprotokoll", uk: "Журнал помилок", fr: "Journal d'erreurs", pl: "Dziennik błędów" },
  fld_repeat: { en: "Repeat", ru: "Повторение", de: "Wiederholung", uk: "Повторення", fr: "Répétition", pl: "Powtarzanie" },
  none_placeholder: { en: "—", ru: "—", de: "—", uk: "—", fr: "—", pl: "—" },
  no_attachments: { en: "No attachments.", ru: "Без вложений.", de: "Keine Anhänge.", uk: "Без вкладень.", fr: "Aucune pièce jointe.", pl: "Brak załączników." },
  no_error: { en: "No delivery errors.", ru: "Ошибок доставки нет.", de: "Keine Zustellfehler.", uk: "Помилок доставки немає.", fr: "Aucune erreur de livraison.", pl: "Brak błędów doręczenia." },

  // Tabs
  tab_details: { en: "Details", ru: "Детали", de: "Details", uk: "Деталі", fr: "Détails", pl: "Szczegóły" },
  tab_preview: { en: "Preview", ru: "Предпросмотр", de: "Vorschau", uk: "Перегляд", fr: "Aperçu", pl: "Podgląd" },
  tab_history: { en: "History", ru: "История", de: "Historie", uk: "Історія", fr: "Historique", pl: "Historia" },
  tab_notifications: { en: "Notifications", ru: "Уведомления", de: "Benachrichtigungen", uk: "Сповіщення", fr: "Notifications", pl: "Powiadomienia" },
  tab_templates: { en: "Templates", ru: "Шаблоны", de: "Vorlagen", uk: "Шаблони", fr: "Modèles", pl: "Szablony" },
  tab_stats: { en: "Statistics", ru: "Статистика", de: "Statistik", uk: "Статистика", fr: "Statistiques", pl: "Statystyki" },

  // Scheduling
  sched_send_now: { en: "Send immediately", ru: "Отправить немедленно", de: "Sofort senden", uk: "Надіслати негайно", fr: "Envoyer immédiatement", pl: "Wyślij natychmiast" },
  sched_at: { en: "Schedule date & time", ru: "Дата и время отправки", de: "Datum & Uhrzeit", uk: "Дата й час", fr: "Date et heure", pl: "Data i godzina" },
  repeat_none: { en: "No repeat", ru: "Без повтора", de: "Kein Wiederholen", uk: "Без повтору", fr: "Sans répétition", pl: "Bez powtarzania" },
  repeat_daily: { en: "Repeat daily", ru: "Ежедневно", de: "Täglich", uk: "Щодня", fr: "Chaque jour", pl: "Codziennie" },
  repeat_weekly: { en: "Repeat weekly", ru: "Еженедельно", de: "Wöchentlich", uk: "Щотижня", fr: "Chaque semaine", pl: "Co tydzień" },
  repeat_monthly: { en: "Repeat monthly", ru: "Ежемесячно", de: "Monatlich", uk: "Щомісяця", fr: "Chaque mois", pl: "Co miesiąc" },

  // Preview
  preview_title: { en: "How the customer will see this", ru: "Как это увидит клиент", de: "So sieht es der Kunde", uk: "Як це побачить клієнт", fr: "Aperçu côté client", pl: "Widok klienta" },
  preview_channel: { en: "Channel", ru: "Канал", de: "Kanal", uk: "Канал", fr: "Canal", pl: "Kanał" },

  // History labels
  h_created: { en: "Created", ru: "Создано", de: "Erstellt", uk: "Створено", fr: "Créée", pl: "Utworzono" },
  h_edited: { en: "Edited", ru: "Изменено", de: "Bearbeitet", uk: "Змінено", fr: "Modifiée", pl: "Zmieniono" },
  h_scheduled: { en: "Scheduled", ru: "Запланировано", de: "Geplant", uk: "Заплановано", fr: "Planifiée", pl: "Zaplanowano" },
  h_sent: { en: "Sent", ru: "Отправлено", de: "Gesendet", uk: "Надіслано", fr: "Envoyée", pl: "Wysłane" },
  h_delivered: { en: "Delivered", ru: "Доставлено", de: "Zugestellt", uk: "Доставлено", fr: "Livrée", pl: "Dostarczone" },
  h_read: { en: "Read", ru: "Прочитано", de: "Gelesen", uk: "Прочитано", fr: "Lue", pl: "Przeczytane" },
  h_failed: { en: "Failed", ru: "Ошибка", de: "Fehlgeschlagen", uk: "Помилка", fr: "Échouée", pl: "Nieudana" },
  h_cancelled: { en: "Cancelled", ru: "Отменено", de: "Storniert", uk: "Скасовано", fr: "Annulée", pl: "Anulowana" },

  // Stats
  stat_total: { en: "Total Notifications", ru: "Всего уведомлений", de: "Benachrichtigungen gesamt", uk: "Усього сповіщень", fr: "Total notifications", pl: "Łącznie powiadomień" },
  stat_sent_today: { en: "Sent Today", ru: "Отправлено сегодня", de: "Heute gesendet", uk: "Надіслано сьогодні", fr: "Envoyées aujourd'hui", pl: "Wysłane dziś" },
  stat_delivered: { en: "Delivered", ru: "Доставлено", de: "Zugestellt", uk: "Доставлено", fr: "Livrées", pl: "Dostarczone" },
  stat_failed: { en: "Failed", ru: "Ошибок", de: "Fehlgeschlagen", uk: "Помилок", fr: "Échouées", pl: "Nieudane" },
  stat_read_rate: { en: "Read Rate", ru: "% прочитанных", de: "Leserate", uk: "% прочитаних", fr: "Taux de lecture", pl: "Odczyty" },
  stat_delivery_rate: { en: "Delivery Rate", ru: "% доставки", de: "Zustellrate", uk: "% доставки", fr: "Taux de livraison", pl: "Dostarczalność" },
  stat_top_types: { en: "Top Notification Types", ru: "Топ типов", de: "Top-Typen", uk: "Топ типів", fr: "Types principaux", pl: "Najczęstsze typy" },
  stat_top_languages: { en: "Top Languages", ru: "Топ языков", de: "Top-Sprachen", uk: "Топ мов", fr: "Langues principales", pl: "Najczęstsze języki" },
  stat_top_countries: { en: "Top Countries", ru: "Топ стран", de: "Top-Länder", uk: "Топ країн", fr: "Pays principaux", pl: "Najczęstsze kraje" },

  // Templates
  tpl_new: { en: "New template", ru: "Новый шаблон", de: "Neue Vorlage", uk: "Новий шаблон", fr: "Nouveau modèle", pl: "Nowy szablon" },
  tpl_name: { en: "Name", ru: "Название", de: "Name", uk: "Назва", fr: "Nom", pl: "Nazwa" },
  tpl_category: { en: "Category", ru: "Категория", de: "Kategorie", uk: "Категорія", fr: "Catégorie", pl: "Kategoria" },
  tpl_channel: { en: "Channel", ru: "Канал", de: "Kanal", uk: "Канал", fr: "Canal", pl: "Kanał" },
  tpl_language: { en: "Language", ru: "Язык", de: "Sprache", uk: "Мова", fr: "Langue", pl: "Język" },
  tpl_subject: { en: "Subject", ru: "Тема", de: "Betreff", uk: "Тема", fr: "Sujet", pl: "Temat" },
  tpl_body: { en: "Body", ru: "Текст", de: "Text", uk: "Текст", fr: "Contenu", pl: "Treść" },
  tpl_updated: { en: "Updated", ru: "Обновлено", de: "Aktualisiert", uk: "Оновлено", fr: "Mis à jour", pl: "Zaktualizowano" },
  tpl_archived: { en: "Archived", ru: "В архиве", de: "Archiviert", uk: "В архіві", fr: "Archivé", pl: "Zarchiwizowane" },
  tpl_archive: { en: "Archive", ru: "В архив", de: "Archivieren", uk: "В архів", fr: "Archiver", pl: "Archiwizuj" },
  tpl_restore: { en: "Restore", ru: "Восстановить", de: "Wiederherstellen", uk: "Відновити", fr: "Restaurer", pl: "Przywróć" },
  tpl_empty: { en: "No templates yet.", ru: "Шаблонов пока нет.", de: "Noch keine Vorlagen.", uk: "Поки немає шаблонів.", fr: "Aucun modèle.", pl: "Brak szablonów." },

  empty: { en: "No notifications match the current filters.", ru: "Уведомления не найдены.", de: "Keine Benachrichtigungen gefunden.", uk: "Сповіщень не знайдено.", fr: "Aucune notification.", pl: "Brak wyników." },
  confirm_delete_title: { en: "Delete notification?", ru: "Удалить уведомление?", de: "Benachrichtigung löschen?", uk: "Видалити сповіщення?", fr: "Supprimer la notification ?", pl: "Usunąć powiadomienie?" },
  confirm_delete_body: { en: "This permanently removes the notification and its history.", ru: "Уведомление и его история будут удалены навсегда.", de: "Die Benachrichtigung und ihre Historie werden dauerhaft entfernt.", uk: "Сповіщення та його історію буде видалено назавжди.", fr: "La notification et son historique sont supprimés définitivement.", pl: "Powiadomienie i jego historia zostaną trwale usunięte." },

  future_integrations_title: { en: "Ready for future integrations", ru: "Готово к будущим интеграциям", de: "Bereit für zukünftige Integrationen", uk: "Готово до майбутніх інтеграцій", fr: "Prêt pour de futures intégrations", pl: "Gotowe na przyszłe integracje" },
  future_integrations_body: { en: "Prepared connection points: SMTP Email, SMS Gateway, Telegram Bot, WhatsApp Business, Push Notifications. Not connected in this demonstration.", ru: "Подготовлены точки подключения: SMTP Email, SMS Gateway, Telegram Bot, WhatsApp Business, Push. В демонстрации не подключены.", de: "Vorbereitete Anschlusspunkte: SMTP-E-Mail, SMS-Gateway, Telegram-Bot, WhatsApp Business, Push. In der Demo nicht angebunden.", uk: "Підготовлені точки підключення: SMTP Email, SMS Gateway, Telegram Bot, WhatsApp Business, Push. У демонстрації не підключені.", fr: "Points de connexion préparés : SMTP Email, SMS Gateway, Telegram Bot, WhatsApp Business, Push. Non connectés dans cette démonstration.", pl: "Przygotowane punkty integracji: SMTP Email, SMS Gateway, Telegram Bot, WhatsApp Business, Push. Nieaktywne w demonstracji." },

  // Types
  type_registration: { en: "Registration", ru: "Регистрация", de: "Registrierung", uk: "Реєстрація", fr: "Inscription", pl: "Rejestracja" },
  type_email_verification: { en: "Email Verification", ru: "Подтверждение email", de: "E-Mail-Bestätigung", uk: "Підтвердження email", fr: "Vérification e-mail", pl: "Weryfikacja e-mail" },
  type_welcome_message: { en: "Welcome Message", ru: "Приветствие", de: "Willkommensnachricht", uk: "Вітання", fr: "Message de bienvenue", pl: "Powitanie" },
  type_credits_purchased: { en: "Credits Purchased", ru: "Кредиты куплены", de: "Credits gekauft", uk: "Кредити куплені", fr: "Crédits achetés", pl: "Kredyty kupione" },
  type_credits_added: { en: "Credits Added", ru: "Кредиты начислены", de: "Credits gutgeschrieben", uk: "Кредити нараховано", fr: "Crédits ajoutés", pl: "Kredyty dodane" },
  type_credits_low: { en: "Credits Low", ru: "Мало кредитов", de: "Wenig Credits", uk: "Мало кредитів", fr: "Crédits faibles", pl: "Mało kredytów" },
  type_subscription_activated: { en: "Subscription Activated", ru: "Подписка активирована", de: "Abo aktiviert", uk: "Підписку активовано", fr: "Abonnement activé", pl: "Subskrypcja aktywna" },
  type_subscription_renewed: { en: "Subscription Renewed", ru: "Подписка продлена", de: "Abo verlängert", uk: "Підписку продовжено", fr: "Abonnement renouvelé", pl: "Subskrypcja odnowiona" },
  type_subscription_expiring: { en: "Subscription Expiring", ru: "Подписка истекает", de: "Abo läuft ab", uk: "Підписка закінчується", fr: "Abonnement expire bientôt", pl: "Subskrypcja wygasa" },
  type_subscription_expired: { en: "Subscription Expired", ru: "Подписка истекла", de: "Abo abgelaufen", uk: "Підписка завершилася", fr: "Abonnement expiré", pl: "Subskrypcja wygasła" },
  type_order_received: { en: "Order Received", ru: "Заказ принят", de: "Bestellung erhalten", uk: "Замовлення прийнято", fr: "Commande reçue", pl: "Zamówienie przyjęte" },
  type_order_waiting: { en: "Order Waiting", ru: "Заказ ожидает", de: "Bestellung wartet", uk: "Замовлення в очікуванні", fr: "Commande en attente", pl: "Zamówienie oczekuje" },
  type_order_processing: { en: "Order Processing", ru: "Заказ в обработке", de: "Bestellung in Bearbeitung", uk: "Замовлення в обробці", fr: "Commande en traitement", pl: "Zamówienie w realizacji" },
  type_order_ready: { en: "Order Ready", ru: "Заказ готов", de: "Bestellung bereit", uk: "Замовлення готове", fr: "Commande prête", pl: "Zamówienie gotowe" },
  type_order_delivered: { en: "Order Delivered", ru: "Заказ доставлен", de: "Bestellung zugestellt", uk: "Замовлення доставлено", fr: "Commande livrée", pl: "Zamówienie dostarczone" },
  type_payment_successful: { en: "Payment Successful", ru: "Оплата успешна", de: "Zahlung erfolgreich", uk: "Оплата успішна", fr: "Paiement réussi", pl: "Płatność udana" },
  type_payment_failed: { en: "Payment Failed", ru: "Ошибка оплаты", de: "Zahlung fehlgeschlagen", uk: "Помилка оплати", fr: "Paiement échoué", pl: "Płatność nieudana" },
  type_refund: { en: "Refund", ru: "Возврат", de: "Rückerstattung", uk: "Повернення коштів", fr: "Remboursement", pl: "Zwrot" },
  type_promotion: { en: "Promotion", ru: "Акция", de: "Aktion", uk: "Акція", fr: "Promotion", pl: "Promocja" },
  type_promo_code: { en: "Promo Code", ru: "Промокод", de: "Promo-Code", uk: "Промокод", fr: "Code promo", pl: "Kod promocyjny" },
  type_birthday: { en: "Birthday", ru: "День рождения", de: "Geburtstag", uk: "День народження", fr: "Anniversaire", pl: "Urodziny" },
  type_christmas: { en: "Christmas", ru: "Рождество", de: "Weihnachten", uk: "Різдво", fr: "Noël", pl: "Boże Narodzenie" },
  type_new_year: { en: "New Year", ru: "Новый год", de: "Neujahr", uk: "Новий рік", fr: "Nouvel An", pl: "Nowy Rok" },
  type_easter: { en: "Easter", ru: "Пасха", de: "Ostern", uk: "Великдень", fr: "Pâques", pl: "Wielkanoc" },
  type_good_morning: { en: "Good Morning", ru: "Доброе утро", de: "Guten Morgen", uk: "Доброго ранку", fr: "Bonjour", pl: "Dzień dobry" },
  type_good_night: { en: "Good Night", ru: "Спокойной ночи", de: "Gute Nacht", uk: "Доброї ночі", fr: "Bonne nuit", pl: "Dobranoc" },
  type_reminder: { en: "Reminder", ru: "Напоминание", de: "Erinnerung", uk: "Нагадування", fr: "Rappel", pl: "Przypomnienie" },
  type_announcement: { en: "Announcement", ru: "Объявление", de: "Ankündigung", uk: "Оголошення", fr: "Annonce", pl: "Ogłoszenie" },
  type_maintenance: { en: "Maintenance", ru: "Обслуживание", de: "Wartung", uk: "Обслуговування", fr: "Maintenance", pl: "Konserwacja" },
  type_system_notification: { en: "System Notification", ru: "Системное уведомление", de: "Systembenachrichtigung", uk: "Системне сповіщення", fr: "Notification système", pl: "Powiadomienie systemowe" },

  // Channels
  ch_email: { en: "Email", ru: "Email", de: "E-Mail", uk: "Email", fr: "E-mail", pl: "E-mail" },
  ch_sms: { en: "SMS", ru: "SMS", de: "SMS", uk: "SMS", fr: "SMS", pl: "SMS" },
  ch_push: { en: "Push", ru: "Push", de: "Push", uk: "Push", fr: "Push", pl: "Push" },
  ch_telegram: { en: "Telegram", ru: "Telegram", de: "Telegram", uk: "Telegram", fr: "Telegram", pl: "Telegram" },
  ch_whatsapp: { en: "WhatsApp", ru: "WhatsApp", de: "WhatsApp", uk: "WhatsApp", fr: "WhatsApp", pl: "WhatsApp" },
  ch_internal: { en: "Internal", ru: "Внутреннее", de: "Intern", uk: "Внутрішнє", fr: "Interne", pl: "Wewnętrzne" },

  // Statuses
  st_draft: { en: "Draft", ru: "Черновик", de: "Entwurf", uk: "Чернетка", fr: "Brouillon", pl: "Szkic" },
  st_scheduled: { en: "Scheduled", ru: "Запланировано", de: "Geplant", uk: "Заплановано", fr: "Planifiée", pl: "Zaplanowane" },
  st_waiting: { en: "Waiting", ru: "Ожидает", de: "Wartet", uk: "Очікує", fr: "En attente", pl: "Oczekuje" },
  st_sending: { en: "Sending", ru: "Отправка", de: "Wird gesendet", uk: "Надсилається", fr: "Envoi en cours", pl: "Wysyłanie" },
  st_sent: { en: "Sent", ru: "Отправлено", de: "Gesendet", uk: "Надіслано", fr: "Envoyée", pl: "Wysłane" },
  st_delivered: { en: "Delivered", ru: "Доставлено", de: "Zugestellt", uk: "Доставлено", fr: "Livrée", pl: "Dostarczone" },
  st_read: { en: "Read", ru: "Прочитано", de: "Gelesen", uk: "Прочитано", fr: "Lue", pl: "Przeczytane" },
  st_failed: { en: "Failed", ru: "Ошибка", de: "Fehlgeschlagen", uk: "Помилка", fr: "Échouée", pl: "Nieudane" },
  st_cancelled: { en: "Cancelled", ru: "Отменено", de: "Storniert", uk: "Скасовано", fr: "Annulée", pl: "Anulowane" },

  // Priorities
  pr_low: { en: "Low", ru: "Низкий", de: "Niedrig", uk: "Низький", fr: "Basse", pl: "Niski" },
  pr_normal: { en: "Normal", ru: "Обычный", de: "Normal", uk: "Звичайний", fr: "Normale", pl: "Normalny" },
  pr_high: { en: "High", ru: "Высокий", de: "Hoch", uk: "Високий", fr: "Élevée", pl: "Wysoki" },
  pr_critical: { en: "Critical", ru: "Критический", de: "Kritisch", uk: "Критичний", fr: "Critique", pl: "Krytyczny" },

  // Template categories
  cat_welcome: { en: "Welcome", ru: "Приветствие", de: "Willkommen", uk: "Вітання", fr: "Bienvenue", pl: "Powitanie" },
  cat_registration: { en: "Registration", ru: "Регистрация", de: "Registrierung", uk: "Реєстрація", fr: "Inscription", pl: "Rejestracja" },
  cat_credits: { en: "Credits", ru: "Кредиты", de: "Credits", uk: "Кредити", fr: "Crédits", pl: "Kredyty" },
  cat_orders: { en: "Orders", ru: "Заказы", de: "Bestellungen", uk: "Замовлення", fr: "Commandes", pl: "Zamówienia" },
  cat_promotions: { en: "Promotions", ru: "Акции", de: "Aktionen", uk: "Акції", fr: "Promotions", pl: "Promocje" },
  cat_subscription: { en: "Subscription", ru: "Подписка", de: "Abonnement", uk: "Підписка", fr: "Abonnement", pl: "Subskrypcja" },
  cat_birthday: { en: "Birthday", ru: "День рождения", de: "Geburtstag", uk: "День народження", fr: "Anniversaire", pl: "Urodziny" },
  cat_holiday: { en: "Holiday", ru: "Праздник", de: "Feiertag", uk: "Свято", fr: "Fête", pl: "Święto" },
  cat_reminder: { en: "Reminder", ru: "Напоминание", de: "Erinnerung", uk: "Нагадування", fr: "Rappel", pl: "Przypomnienie" },
  cat_system: { en: "System", ru: "Система", de: "System", uk: "Система", fr: "Système", pl: "System" },
};

export function useLocalNotifs(lang: Lang) {
  return (k: string, subs?: Record<string, string | number>): string => {
    const row = D[k];
    let v = row ? row[lang] ?? row.en : k;
    if (subs) for (const [key, val] of Object.entries(subs)) v = v.replaceAll(`{${key}}`, String(val));
    return v;
  };
}

export type LocalNotifs = ReturnType<typeof useLocalNotifs>;