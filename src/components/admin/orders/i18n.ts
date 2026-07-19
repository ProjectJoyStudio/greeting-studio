import type { Lang } from "@/lib/i18n";

type Row = Record<Lang, string>;
const D: Record<string, Row> = {
  title: { en: "Orders", ru: "Заказы", de: "Bestellungen", uk: "Замовлення", fr: "Commandes", pl: "Zamówienia" },
  subtitle: {
    en: "Manage customer orders from creation to completion.",
    ru: "Управляйте заказами клиентов от создания до завершения.",
    de: "Verwalte Kundenbestellungen von der Erstellung bis zum Abschluss.",
    uk: "Керуйте замовленнями клієнтів від створення до завершення.",
    fr: "Gérez les commandes clients de la création à la finalisation.",
    pl: "Zarządzaj zamówieniami klientów od utworzenia do realizacji.",
  },
  demo_notice: {
    en: "Demonstration data only. No backend, queue, payment or notification service is connected.",
    ru: "Только демонстрационные данные. Бэкенд, очередь, оплата и уведомления не подключены.",
    de: "Nur Demo-Daten. Kein Backend, keine Warteschlange, keine Zahlung oder Benachrichtigung angebunden.",
    uk: "Лише демонстраційні дані. Бекенд, черга, оплата та сповіщення не підключені.",
    fr: "Données de démonstration. Aucun backend, file, paiement ou notification n'est connecté.",
    pl: "Tylko dane demonstracyjne. Brak backendu, kolejki, płatności i powiadomień.",
  },
  create_test: { en: "Create Test Order", ru: "Создать тестовый заказ", de: "Testbestellung erstellen", uk: "Створити тестове замовлення", fr: "Créer une commande test", pl: "Utwórz zamówienie testowe" },
  refresh: { en: "Refresh", ru: "Обновить", de: "Aktualisieren", uk: "Оновити", fr: "Actualiser", pl: "Odśwież" },

  search_placeholder: { en: "Search by ID, name or email…", ru: "Поиск по ID, имени или email…", de: "Suche nach ID, Name oder E-Mail…", uk: "Пошук за ID, ім'ям або email…", fr: "Rechercher ID, nom ou e-mail…", pl: "Szukaj po ID, imieniu lub e-mailu…" },
  filter_status: { en: "Status", ru: "Статус", de: "Status", uk: "Статус", fr: "Statut", pl: "Status" },
  filter_type: { en: "Order Type", ru: "Тип заказа", de: "Bestelltyp", uk: "Тип замовлення", fr: "Type", pl: "Typ" },
  filter_priority: { en: "Priority", ru: "Приоритет", de: "Priorität", uk: "Пріоритет", fr: "Priorité", pl: "Priorytet" },
  filter_all: { en: "All", ru: "Все", de: "Alle", uk: "Усі", fr: "Tous", pl: "Wszystkie" },
  sort_by: { en: "Sort by", ru: "Сортировать", de: "Sortieren", uk: "Сортувати", fr: "Trier", pl: "Sortuj" },
  sort_newest: { en: "Newest first", ru: "Сначала новые", de: "Neueste zuerst", uk: "Спочатку нові", fr: "Plus récentes", pl: "Najnowsze" },
  sort_oldest: { en: "Oldest first", ru: "Сначала старые", de: "Älteste zuerst", uk: "Спочатку старі", fr: "Plus anciennes", pl: "Najstarsze" },

  col_id: { en: "Order ID", ru: "ID заказа", de: "Bestell-ID", uk: "ID замовлення", fr: "ID commande", pl: "ID zamówienia" },
  col_customer: { en: "Customer", ru: "Клиент", de: "Kunde", uk: "Клієнт", fr: "Client", pl: "Klient" },
  col_type: { en: "Order Type", ru: "Тип заказа", de: "Bestelltyp", uk: "Тип замовлення", fr: "Type", pl: "Typ" },
  col_product: { en: "Product", ru: "Продукт", de: "Produkt", uk: "Продукт", fr: "Produit", pl: "Produkt" },
  col_credits: { en: "Credits", ru: "Кредиты", de: "Credits", uk: "Кредити", fr: "Crédits", pl: "Kredyty" },
  col_status: { en: "Status", ru: "Статус", de: "Status", uk: "Статус", fr: "Statut", pl: "Status" },
  col_priority: { en: "Priority", ru: "Приоритет", de: "Priorität", uk: "Пріоритет", fr: "Priorité", pl: "Priorytet" },
  col_queue: { en: "Queue Position", ru: "Позиция в очереди", de: "Warteschlangenposition", uk: "Позиція у черзі", fr: "File d'attente", pl: "Pozycja w kolejce" },
  col_eta: { en: "Estimated Time", ru: "Ориент. время", de: "Geschätzte Zeit", uk: "Орієнт. час", fr: "Temps estimé", pl: "Szac. czas" },
  col_created: { en: "Created", ru: "Создан", de: "Erstellt", uk: "Створено", fr: "Créée", pl: "Utworzono" },
  col_actions: { en: "Actions", ru: "Действия", de: "Aktionen", uk: "Дії", fr: "Actions", pl: "Akcje" },

  act_open: { en: "Open", ru: "Открыть", de: "Öffnen", uk: "Відкрити", fr: "Ouvrir", pl: "Otwórz" },
  act_view: { en: "View", ru: "Открыть", de: "Ansehen", uk: "Переглянути", fr: "Voir", pl: "Zobacz" },
  act_edit: { en: "Edit", ru: "Изменить", de: "Bearbeiten", uk: "Редагувати", fr: "Modifier", pl: "Edytuj" },
  act_duplicate: { en: "Duplicate", ru: "Дублировать", de: "Duplizieren", uk: "Дублювати", fr: "Dupliquer", pl: "Duplikuj" },
  act_cancel: { en: "Cancel", ru: "Отменить", de: "Stornieren", uk: "Скасувати", fr: "Annuler", pl: "Anuluj" },
  act_delete: { en: "Delete", ru: "Удалить", de: "Löschen", uk: "Видалити", fr: "Supprimer", pl: "Usuń" },

  save: { en: "Save", ru: "Сохранить", de: "Speichern", uk: "Зберегти", fr: "Enregistrer", pl: "Zapisz" },
  close: { en: "Close", ru: "Закрыть", de: "Schließen", uk: "Закрити", fr: "Fermer", pl: "Zamknij" },
  cancel: { en: "Cancel", ru: "Отмена", de: "Abbrechen", uk: "Скасувати", fr: "Annuler", pl: "Anuluj" },
  confirm: { en: "Confirm", ru: "Подтвердить", de: "Bestätigen", uk: "Підтвердити", fr: "Confirmer", pl: "Potwierdź" },
  keep: { en: "Keep", ru: "Оставить", de: "Behalten", uk: "Залишити", fr: "Conserver", pl: "Zachowaj" },

  type_card: { en: "Greeting Card", ru: "Открытка", de: "Grußkarte", uk: "Листівка", fr: "Carte de vœux", pl: "Kartka" },
  type_animated: { en: "Animated Greeting", ru: "Анимированное поздравление", de: "Animierter Gruß", uk: "Анімоване вітання", fr: "Vœux animés", pl: "Animowane życzenia" },
  type_song: { en: "Song", ru: "Песня", de: "Lied", uk: "Пісня", fr: "Chanson", pl: "Piosenka" },
  type_video: { en: "Video Clip", ru: "Видеоклип", de: "Videoclip", uk: "Відеокліп", fr: "Clip vidéo", pl: "Klip wideo" },
  type_cartoon: { en: "Cartoon", ru: "Мультфильм", de: "Zeichentrick", uk: "Мультфільм", fr: "Dessin animé", pl: "Kreskówka" },
  type_premium: { en: "Premium Order", ru: "Премиум-заказ", de: "Premium-Bestellung", uk: "Преміум-замовлення", fr: "Commande Premium", pl: "Zamówienie Premium" },
  type_individual: { en: "Individual Order", ru: "Индивидуальный заказ", de: "Individuelle Bestellung", uk: "Індивідуальне замовлення", fr: "Commande individuelle", pl: "Zamówienie indywidualne" },

  st_draft: { en: "Draft", ru: "Черновик", de: "Entwurf", uk: "Чернетка", fr: "Brouillon", pl: "Szkic" },
  st_waiting_payment: { en: "Waiting for Payment", ru: "Ожидает оплаты", de: "Wartet auf Zahlung", uk: "Очікує оплати", fr: "En attente de paiement", pl: "Oczekuje płatności" },
  st_paid: { en: "Paid", ru: "Оплачен", de: "Bezahlt", uk: "Оплачено", fr: "Payée", pl: "Opłacone" },
  st_in_queue: { en: "In Queue", ru: "В очереди", de: "In Warteschlange", uk: "У черзі", fr: "En file", pl: "W kolejce" },
  st_processing: { en: "Processing", ru: "В обработке", de: "In Bearbeitung", uk: "В обробці", fr: "En traitement", pl: "W realizacji" },
  st_ready: { en: "Ready", ru: "Готов", de: "Bereit", uk: "Готово", fr: "Prête", pl: "Gotowe" },
  st_delivered: { en: "Delivered", ru: "Доставлен", de: "Zugestellt", uk: "Доставлено", fr: "Livrée", pl: "Dostarczone" },
  st_cancelled: { en: "Cancelled", ru: "Отменён", de: "Storniert", uk: "Скасовано", fr: "Annulée", pl: "Anulowane" },

  queue_none: { en: "Not queued", ru: "Не в очереди", de: "Nicht in Warteschlange", uk: "Не у черзі", fr: "Hors file", pl: "Poza kolejką" },
  queue_pos: { en: "Queue #{n}", ru: "Очередь №{n}", de: "Warteschlange #{n}", uk: "Черга №{n}", fr: "File #{n}", pl: "Kolejka #{n}" },
  queue_in: { en: "In Queue", ru: "В очереди", de: "In Warteschlange", uk: "У черзі", fr: "En file", pl: "W kolejce" },
  queue_paused: { en: "Paused", ru: "Приостановлен", de: "Pausiert", uk: "Призупинено", fr: "En pause", pl: "Wstrzymane" },

  eta_none: { en: "Not applicable", ru: "Не применимо", de: "Nicht zutreffend", uk: "Не застосовується", fr: "Non applicable", pl: "Nie dotyczy" },
  eta_min: { en: "Approx. {n} minutes", ru: "Примерно {n} мин.", de: "ca. {n} Minuten", uk: "Приблизно {n} хв.", fr: "Env. {n} minutes", pl: "Około {n} minut" },
  eta_hr: { en: "Approx. {n} hours", ru: "Примерно {n} ч.", de: "ca. {n} Stunden", uk: "Приблизно {n} год.", fr: "Env. {n} heures", pl: "Około {n} godzin" },
  eta_day: { en: "Approx. {n} days", ru: "Примерно {n} дн.", de: "ca. {n} Tage", uk: "Приблизно {n} дн.", fr: "Env. {n} jours", pl: "Około {n} dni" },

  section_customer: { en: "Customer", ru: "Клиент", de: "Kunde", uk: "Клієнт", fr: "Client", pl: "Klient" },
  section_order: { en: "Order", ru: "Заказ", de: "Bestellung", uk: "Замовлення", fr: "Commande", pl: "Zamówienie" },
  section_content: { en: "Content", ru: "Содержимое", de: "Inhalt", uk: "Вміст", fr: "Contenu", pl: "Treść" },
  section_summary: { en: "Order Summary", ru: "Сводка заказа", de: "Bestellübersicht", uk: "Огляд замовлення", fr: "Résumé", pl: "Podsumowanie" },
  section_notify: { en: "Notifications", ru: "Уведомления", de: "Benachrichtigungen", uk: "Сповіщення", fr: "Notifications", pl: "Powiadomienia" },

  f_name: { en: "Name", ru: "Имя", de: "Name", uk: "Ім'я", fr: "Nom", pl: "Imię" },
  f_email: { en: "Email", ru: "Email", de: "E-Mail", uk: "Email", fr: "E-mail", pl: "E-mail" },
  f_language: { en: "Language", ru: "Язык", de: "Sprache", uk: "Мова", fr: "Langue", pl: "Język" },
  f_country: { en: "Country", ru: "Страна", de: "Land", uk: "Країна", fr: "Pays", pl: "Kraj" },
  f_order_id: { en: "Order ID", ru: "ID заказа", de: "Bestell-ID", uk: "ID замовлення", fr: "ID commande", pl: "ID zamówienia" },
  f_order_type: { en: "Order Type", ru: "Тип заказа", de: "Bestelltyp", uk: "Тип замовлення", fr: "Type", pl: "Typ" },
  f_credits: { en: "Credits Used", ru: "Использовано кредитов", de: "Verwendete Credits", uk: "Використано кредитів", fr: "Crédits utilisés", pl: "Wykorzystane kredyty" },
  f_payment: { en: "Payment Status", ru: "Статус оплаты", de: "Zahlungsstatus", uk: "Статус оплати", fr: "Statut de paiement", pl: "Status płatności" },
  f_queue: { en: "Queue Position", ru: "Позиция в очереди", de: "Warteschlangenposition", uk: "Позиція у черзі", fr: "File d'attente", pl: "Pozycja w kolejce" },
  f_eta: { en: "Estimated Completion Time", ru: "Ориент. время завершения", de: "Geschätzte Fertigstellung", uk: "Орієнт. час завершення", fr: "Fin estimée", pl: "Szac. czas realizacji" },
  f_recipient: { en: "Recipient Name", ru: "Имя получателя", de: "Empfängername", uk: "Ім'я одержувача", fr: "Nom du destinataire", pl: "Odbiorca" },
  f_occasion: { en: "Occasion", ru: "Повод", de: "Anlass", uk: "Привід", fr: "Occasion", pl: "Okazja" },
  f_style: { en: "Style", ru: "Стиль", de: "Stil", uk: "Стиль", fr: "Style", pl: "Styl" },
  f_duration: { en: "Duration", ru: "Длительность", de: "Dauer", uk: "Тривалість", fr: "Durée", pl: "Czas trwania" },
  f_notes: { en: "Customer Notes", ru: "Заметки клиента", de: "Kundennotizen", uk: "Нотатки клієнта", fr: "Notes du client", pl: "Uwagi klienta" },
  f_priority: { en: "Priority", ru: "Приоритет", de: "Priorität", uk: "Пріоритет", fr: "Priorité", pl: "Priorytet" },
  f_product: { en: "Product", ru: "Продукт", de: "Produkt", uk: "Продукт", fr: "Produit", pl: "Produkt" },
  f_notif_status: { en: "Notification Status", ru: "Статус уведомлений", de: "Benachrichtigungsstatus", uk: "Статус сповіщень", fr: "Statut des notifications", pl: "Status powiadomień" },
  duration_none: { en: "Not applicable", ru: "Не применимо", de: "Nicht zutreffend", uk: "Не застосовується", fr: "Non applicable", pl: "Nie dotyczy" },
  dur_seconds: { en: "{n} seconds", ru: "{n} сек.", de: "{n} Sekunden", uk: "{n} сек.", fr: "{n} secondes", pl: "{n} sekund" },
  dur_minutes: { en: "{n} minutes", ru: "{n} мин.", de: "{n} Minuten", uk: "{n} хв.", fr: "{n} minutes", pl: "{n} minut" },

  ch_email: { en: "Email", ru: "Email", de: "E-Mail", uk: "Email", fr: "E-mail", pl: "E-mail" },
  ch_sms: { en: "SMS", ru: "SMS", de: "SMS", uk: "SMS", fr: "SMS", pl: "SMS" },
  n_pending: { en: "Waiting", ru: "Ожидает", de: "Wartet", uk: "Очікує", fr: "En attente", pl: "Oczekuje" },
  n_sent: { en: "Sent", ru: "Отправлено", de: "Gesendet", uk: "Надіслано", fr: "Envoyée", pl: "Wysłane" },
  n_failed: { en: "Failed", ru: "Ошибка", de: "Fehlgeschlagen", uk: "Помилка", fr: "Échouée", pl: "Nieudane" },
  n_disabled: { en: "Disabled", ru: "Отключено", de: "Deaktiviert", uk: "Вимкнено", fr: "Désactivé", pl: "Wyłączone" },

  // Priorities
  pr_normal: { en: "Normal", ru: "Обычный", de: "Normal", uk: "Звичайний", fr: "Normale", pl: "Normalny" },
  pr_high: { en: "High", ru: "Высокий", de: "Hoch", uk: "Високий", fr: "Élevée", pl: "Wysoki" },
  pr_urgent: { en: "Urgent", ru: "Срочный", de: "Dringend", uk: "Терміновий", fr: "Urgente", pl: "Pilny" },

  // Tabs
  tab_summary: { en: "Summary", ru: "Сводка", de: "Übersicht", uk: "Огляд", fr: "Résumé", pl: "Podsumowanie" },
  tab_timeline: { en: "Timeline", ru: "Хронология", de: "Verlauf", uk: "Хронологія", fr: "Chronologie", pl: "Oś czasu" },
  tab_queue: { en: "Queue & Processing", ru: "Очередь и обработка", de: "Warteschlange & Bearbeitung", uk: "Черга та обробка", fr: "File et traitement", pl: "Kolejka i realizacja" },
  tab_notify: { en: "Notifications", ru: "Уведомления", de: "Benachrichtigungen", uk: "Сповіщення", fr: "Notifications", pl: "Powiadomienia" },
  tab_notes: { en: "Internal Notes", ru: "Внутренние заметки", de: "Interne Notizen", uk: "Внутрішні нотатки", fr: "Notes internes", pl: "Notatki wewnętrzne" },
  tab_files: { en: "Generated Files", ru: "Готовые файлы", de: "Erstellte Dateien", uk: "Готові файли", fr: "Fichiers générés", pl: "Pliki gotowe" },
  tab_history: { en: "History", ru: "История", de: "Historie", uk: "Історія", fr: "Historique", pl: "Historia" },

  // Timeline
  tl_created: { en: "Order Created", ru: "Заказ создан", de: "Bestellung erstellt", uk: "Замовлення створено", fr: "Commande créée", pl: "Zamówienie utworzone" },
  tl_payment: { en: "Payment Received", ru: "Оплата получена", de: "Zahlung erhalten", uk: "Оплату отримано", fr: "Paiement reçu", pl: "Płatność otrzymana" },
  tl_queued: { en: "Added to Queue", ru: "Добавлен в очередь", de: "In Warteschlange aufgenommen", uk: "Додано до черги", fr: "Ajoutée à la file", pl: "Dodano do kolejki" },
  tl_processing_started: { en: "Processing Started", ru: "Обработка начата", de: "Bearbeitung gestartet", uk: "Обробку розпочато", fr: "Traitement démarré", pl: "Rozpoczęto realizację" },
  tl_processing_finished: { en: "Processing Finished", ru: "Обработка завершена", de: "Bearbeitung abgeschlossen", uk: "Обробку завершено", fr: "Traitement terminé", pl: "Realizacja zakończona" },
  tl_notification_sent: { en: "Notification Sent", ru: "Уведомление отправлено", de: "Benachrichtigung gesendet", uk: "Сповіщення надіслано", fr: "Notification envoyée", pl: "Powiadomienie wysłane" },
  tl_delivered: { en: "Delivered to Customer", ru: "Доставлено клиенту", de: "An Kunde zugestellt", uk: "Доставлено клієнту", fr: "Livrée au client", pl: "Dostarczone klientowi" },
  tl_cancelled: { en: "Order Cancelled", ru: "Заказ отменён", de: "Bestellung storniert", uk: "Замовлення скасовано", fr: "Commande annulée", pl: "Zamówienie anulowane" },
  tl_priority_changed: { en: "Priority Changed", ru: "Приоритет изменён", de: "Priorität geändert", uk: "Пріоритет змінено", fr: "Priorité modifiée", pl: "Zmieniono priorytet" },
  tl_queue_moved: { en: "Queue Position Changed", ru: "Позиция в очереди изменена", de: "Warteschlangenposition geändert", uk: "Позицію у черзі змінено", fr: "Position en file modifiée", pl: "Zmieniono pozycję w kolejce" },
  tl_paused: { en: "Processing Paused", ru: "Обработка приостановлена", de: "Bearbeitung pausiert", uk: "Обробку призупинено", fr: "Traitement en pause", pl: "Realizacja wstrzymana" },
  tl_resumed: { en: "Processing Resumed", ru: "Обработка возобновлена", de: "Bearbeitung fortgesetzt", uk: "Обробку відновлено", fr: "Traitement repris", pl: "Realizacja wznowiona" },
  tl_status_changed: { en: "Status Changed", ru: "Статус изменён", de: "Status geändert", uk: "Статус змінено", fr: "Statut modifié", pl: "Zmieniono status" },
  tl_note_added: { en: "Internal Note Added", ru: "Добавлена внутренняя заметка", de: "Interne Notiz hinzugefügt", uk: "Додано внутрішню нотатку", fr: "Note interne ajoutée", pl: "Dodano notatkę wewnętrzną" },
  tl_notification_resent: { en: "Notification Resent", ru: "Уведомление отправлено повторно", de: "Benachrichtigung erneut gesendet", uk: "Сповіщення надіслано повторно", fr: "Notification renvoyée", pl: "Powiadomienie wysłane ponownie" },

  timeline_empty: { en: "No events yet.", ru: "Событий пока нет.", de: "Noch keine Ereignisse.", uk: "Подій ще немає.", fr: "Aucun événement.", pl: "Brak zdarzeń." },

  // Notes
  notes_empty: { en: "No internal notes yet. Only administrators can see them.", ru: "Внутренних заметок пока нет. Их видят только администраторы.", de: "Noch keine internen Notizen. Nur für Administratoren sichtbar.", uk: "Внутрішніх нотаток ще немає. Їх бачать лише адміністратори.", fr: "Pas de notes internes. Visibles uniquement par les administrateurs.", pl: "Brak notatek wewnętrznych. Widoczne tylko dla administratorów." },
  notes_placeholder: { en: "Write an internal note. Customers never see this.", ru: "Внутренняя заметка. Клиент её не увидит.", de: "Interne Notiz. Für Kunden nicht sichtbar.", uk: "Внутрішня нотатка. Клієнт її не побачить.", fr: "Note interne. Invisible pour le client.", pl: "Notatka wewnętrzna. Klient jej nie zobaczy." },
  notes_add: { en: "Add Note", ru: "Добавить заметку", de: "Notiz hinzufügen", uk: "Додати нотатку", fr: "Ajouter une note", pl: "Dodaj notatkę" },
  notes_admin_only: { en: "Administrator-only. Not visible to customers.", ru: "Только для администраторов. Клиенту не видно.", de: "Nur für Administratoren. Für Kunden nicht sichtbar.", uk: "Тільки для адміністраторів. Клієнту не видно.", fr: "Réservé aux administrateurs. Invisible au client.", pl: "Tylko dla administratorów. Niewidoczne dla klienta." },

  // Queue controls
  queue_move_up: { en: "Move Up", ru: "Вверх", de: "Nach oben", uk: "Вгору", fr: "Monter", pl: "W górę" },
  queue_move_down: { en: "Move Down", ru: "Вниз", de: "Nach unten", uk: "Вниз", fr: "Descendre", pl: "W dół" },
  queue_send_top: { en: "Send to Top", ru: "В начало", de: "Nach ganz oben", uk: "На початок", fr: "En tête", pl: "Na początek" },
  queue_pause: { en: "Pause", ru: "Пауза", de: "Pausieren", uk: "Пауза", fr: "Mettre en pause", pl: "Wstrzymaj" },
  queue_resume: { en: "Resume", ru: "Возобновить", de: "Fortsetzen", uk: "Відновити", fr: "Reprendre", pl: "Wznów" },

  // Processing actions
  proc_start: { en: "Start Processing", ru: "Начать обработку", de: "Bearbeitung starten", uk: "Почати обробку", fr: "Démarrer le traitement", pl: "Rozpocznij realizację" },
  proc_pause: { en: "Pause Processing", ru: "Приостановить обработку", de: "Bearbeitung pausieren", uk: "Призупинити обробку", fr: "Suspendre le traitement", pl: "Wstrzymaj realizację" },
  proc_resume: { en: "Resume Processing", ru: "Возобновить обработку", de: "Bearbeitung fortsetzen", uk: "Відновити обробку", fr: "Reprendre le traitement", pl: "Wznów realizację" },
  proc_mark_ready: { en: "Mark Ready", ru: "Отметить готовым", de: "Als bereit markieren", uk: "Позначити готовим", fr: "Marquer prête", pl: "Oznacz jako gotowe" },
  proc_mark_delivered: { en: "Mark Delivered", ru: "Отметить доставленным", de: "Als zugestellt markieren", uk: "Позначити доставленим", fr: "Marquer livrée", pl: "Oznacz jako dostarczone" },
  proc_cancel: { en: "Cancel Order", ru: "Отменить заказ", de: "Bestellung stornieren", uk: "Скасувати замовлення", fr: "Annuler la commande", pl: "Anuluj zamówienie" },

  // Notification history
  nh_send_again: { en: "Send Again", ru: "Отправить снова", de: "Erneut senden", uk: "Надіслати знову", fr: "Renvoyer", pl: "Wyślij ponownie" },
  nh_preview: { en: "Preview Message", ru: "Просмотр сообщения", de: "Vorschau", uk: "Перегляд повідомлення", fr: "Aperçu du message", pl: "Podgląd wiadomości" },
  nh_empty: { en: "No notifications have been sent yet.", ru: "Уведомления ещё не отправлялись.", de: "Noch keine Benachrichtigungen gesendet.", uk: "Сповіщення ще не надсилалися.", fr: "Aucune notification envoyée.", pl: "Nie wysłano jeszcze powiadomień." },

  // Templates
  tmpl_confirm_subject: { en: "Your Project Joy order is confirmed", ru: "Ваш заказ Project Joy подтверждён", de: "Ihre Project Joy Bestellung ist bestätigt", uk: "Ваше замовлення Project Joy підтверджено", fr: "Votre commande Project Joy est confirmée", pl: "Twoje zamówienie Project Joy zostało potwierdzone" },
  tmpl_confirm_body: { en: "Thank you for choosing Project Joy. Your order is now in our care and we will keep you posted.", ru: "Спасибо, что выбрали Project Joy. Ваш заказ принят, мы держим вас в курсе.", de: "Vielen Dank, dass Sie Project Joy gewählt haben. Ihre Bestellung ist bei uns in besten Händen.", uk: "Дякуємо, що обрали Project Joy. Ваше замовлення в надійних руках.", fr: "Merci d'avoir choisi Project Joy. Votre commande est entre de bonnes mains.", pl: "Dziękujemy za wybór Project Joy. Zajmiemy się Twoim zamówieniem i będziemy informować." },
  tmpl_ready_subject: { en: "Your Project Joy greeting is ready", ru: "Ваше поздравление Project Joy готово", de: "Ihr Project Joy Gruß ist bereit", uk: "Ваше вітання Project Joy готове", fr: "Votre message Project Joy est prêt", pl: "Twoje życzenia Project Joy są gotowe" },
  tmpl_ready_body: { en: "Your greeting has been carefully prepared and is ready to view.", ru: "Ваше поздравление бережно подготовлено и готово к просмотру.", de: "Ihr Gruß wurde sorgfältig vorbereitet und ist bereit.", uk: "Ваше вітання дбайливо підготовлене та готове.", fr: "Votre message a été préparé avec soin et est prêt.", pl: "Twoje życzenia zostały starannie przygotowane." },

  // Generated files
  files_empty: { en: "No temporary files available yet.", ru: "Готовых файлов пока нет.", de: "Noch keine Dateien verfügbar.", uk: "Файлів ще немає.", fr: "Aucun fichier disponible.", pl: "Brak dostępnych plików." },
  file_kind_card: { en: "Greeting Card", ru: "Открытка", de: "Grußkarte", uk: "Листівка", fr: "Carte", pl: "Kartka" },
  file_kind_song: { en: "Song", ru: "Песня", de: "Lied", uk: "Пісня", fr: "Chanson", pl: "Piosenka" },
  file_kind_video: { en: "Video", ru: "Видео", de: "Video", uk: "Відео", fr: "Vidéo", pl: "Wideo" },
  file_kind_cartoon: { en: "Cartoon", ru: "Мультфильм", de: "Zeichentrick", uk: "Мультфільм", fr: "Dessin animé", pl: "Kreskówka" },
  file_kind_premium: { en: "Premium Content", ru: "Премиум-контент", de: "Premium-Inhalt", uk: "Преміум-контент", fr: "Contenu Premium", pl: "Treść Premium" },
  file_download: { en: "Download", ru: "Скачать", de: "Herunterladen", uk: "Завантажити", fr: "Télécharger", pl: "Pobierz" },
  file_replace: { en: "Replace", ru: "Заменить", de: "Ersetzen", uk: "Замінити", fr: "Remplacer", pl: "Zamień" },
  file_placeholder: { en: "Temporary placeholder — no real file attached.", ru: "Временный плейсхолдер — реальный файл не подключён.", de: "Vorläufiger Platzhalter — keine echte Datei.", uk: "Тимчасовий заповнювач — реального файлу немає.", fr: "Espace réservé temporaire — aucun fichier réel.", pl: "Tymczasowy zastępnik — brak prawdziwego pliku." },

  // Cancellation
  cancel_dialog_title: { en: "Cancel this order?", ru: "Отменить этот заказ?", de: "Diese Bestellung stornieren?", uk: "Скасувати це замовлення?", fr: "Annuler cette commande ?", pl: "Anulować to zamówienie?" },
  cancel_dialog_note: { en: "The order is kept in history. It is never deleted immediately.", ru: "Заказ сохраняется в истории. Он не удаляется сразу.", de: "Die Bestellung bleibt in der Historie. Sie wird nicht sofort gelöscht.", uk: "Замовлення залишиться в історії. Воно не видаляється одразу.", fr: "La commande reste dans l'historique. Elle n'est jamais supprimée immédiatement.", pl: "Zamówienie pozostaje w historii. Nie jest natychmiast usuwane." },
  cancel_reason_label: { en: "Cancellation reason", ru: "Причина отмены", de: "Stornierungsgrund", uk: "Причина скасування", fr: "Motif d'annulation", pl: "Powód anulowania" },
  cancel_reason_customer_request: { en: "Customer Request", ru: "Просьба клиента", de: "Kundenwunsch", uk: "На прохання клієнта", fr: "Demande du client", pl: "Prośba klienta" },
  cancel_reason_payment_failed: { en: "Payment Failed", ru: "Ошибка оплаты", de: "Zahlung fehlgeschlagen", uk: "Помилка оплати", fr: "Paiement échoué", pl: "Nieudana płatność" },
  cancel_reason_technical_issue: { en: "Technical Issue", ru: "Техническая проблема", de: "Technisches Problem", uk: "Технічна проблема", fr: "Problème technique", pl: "Problem techniczny" },
  cancel_reason_duplicate: { en: "Duplicate Order", ru: "Дубликат заказа", de: "Doppelte Bestellung", uk: "Дублікат замовлення", fr: "Commande en double", pl: "Duplikat zamówienia" },
  cancel_reason_other: { en: "Other", ru: "Другое", de: "Sonstiges", uk: "Інше", fr: "Autre", pl: "Inne" },
  cancel_details_label: { en: "Additional details (optional)", ru: "Доп. детали (необязательно)", de: "Zusätzliche Details (optional)", uk: "Додаткові деталі (необов'язково)", fr: "Détails supplémentaires (facultatif)", pl: "Dodatkowe szczegóły (opcjonalnie)" },

  // Empty / dialogs
  empty: { en: "No orders match the current filters.", ru: "Ничего не найдено.", de: "Keine Bestellungen gefunden.", uk: "Нічого не знайдено.", fr: "Aucune commande.", pl: "Brak wyników." },
  confirm_delete_title: { en: "Delete order?", ru: "Удалить заказ?", de: "Bestellung löschen?", uk: "Видалити замовлення?", fr: "Supprimer la commande ?", pl: "Usunąć zamówienie?" },
  confirm_delete_body: { en: "This permanently removes the order. Consider cancelling instead — cancelled orders remain in history.", ru: "Заказ будет удалён навсегда. Рекомендуем отменить — отменённые заказы остаются в истории.", de: "Die Bestellung wird dauerhaft entfernt. Ziehen Sie eine Stornierung vor — stornierte Bestellungen bleiben in der Historie.", uk: "Замовлення буде видалено назавжди. Рекомендуємо скасувати — скасовані залишаються в історії.", fr: "La commande est supprimée définitivement. Préférez l'annulation — les commandes annulées restent dans l'historique.", pl: "Zamówienie zostanie trwale usunięte. Rozważ anulowanie — anulowane pozostają w historii." },

  // Validation
  err_id: { en: "Order ID is required.", ru: "Требуется ID заказа.", de: "Bestell-ID erforderlich.", uk: "Потрібен ID.", fr: "ID requis.", pl: "Wymagany ID." },
  err_customer: { en: "Customer name is required.", ru: "Требуется имя клиента.", de: "Kundenname erforderlich.", uk: "Потрібне ім'я клієнта.", fr: "Nom du client requis.", pl: "Wymagane imię klienta." },
  err_type: { en: "Order type is required.", ru: "Требуется тип заказа.", de: "Bestelltyp erforderlich.", uk: "Потрібен тип.", fr: "Type requis.", pl: "Wymagany typ." },
  err_status: { en: "Status is required.", ru: "Требуется статус.", de: "Status erforderlich.", uk: "Потрібен статус.", fr: "Statut requis.", pl: "Wymagany status." },
  err_credits: { en: "Credits cannot be negative.", ru: "Кредиты не могут быть отрицательными.", de: "Credits dürfen nicht negativ sein.", uk: "Кредити не можуть бути від'ємними.", fr: "Les crédits ne peuvent pas être négatifs.", pl: "Kredyty nie mogą być ujemne." },
};

export function useLocalOrders(lang: Lang) {
  return (k: string, subs?: Record<string, string | number>): string => {
    const row = D[k];
    let v = row ? row[lang] ?? row.en : k;
    if (subs) for (const [key, val] of Object.entries(subs)) v = v.replaceAll(`{${key}}`, String(val));
    return v;
  };
}

export type LocalOrders = ReturnType<typeof useLocalOrders>;