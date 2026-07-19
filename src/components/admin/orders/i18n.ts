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
  col_queue: { en: "Queue Position", ru: "Позиция в очереди", de: "Warteschlangenposition", uk: "Позиція у черзі", fr: "File d'attente", pl: "Pozycja w kolejce" },
  col_eta: { en: "Estimated Time", ru: "Ориент. время", de: "Geschätzte Zeit", uk: "Орієнт. час", fr: "Temps estimé", pl: "Szac. czas" },
  col_created: { en: "Created", ru: "Создан", de: "Erstellt", uk: "Створено", fr: "Créée", pl: "Utworzono" },
  col_actions: { en: "Actions", ru: "Действия", de: "Aktionen", uk: "Дії", fr: "Actions", pl: "Akcje" },

  act_view: { en: "View", ru: "Открыть", de: "Ansehen", uk: "Переглянути", fr: "Voir", pl: "Zobacz" },
  act_edit: { en: "Edit", ru: "Изменить", de: "Bearbeiten", uk: "Редагувати", fr: "Modifier", pl: "Edytuj" },
  act_duplicate: { en: "Duplicate", ru: "Дублировать", de: "Duplizieren", uk: "Дублювати", fr: "Dupliquer", pl: "Duplikuj" },
  act_cancel: { en: "Cancel", ru: "Отменить", de: "Stornieren", uk: "Скасувати", fr: "Annuler", pl: "Anuluj" },
  act_delete: { en: "Delete", ru: "Удалить", de: "Löschen", uk: "Видалити", fr: "Supprimer", pl: "Usuń" },

  save: { en: "Save", ru: "Сохранить", de: "Speichern", uk: "Зберегти", fr: "Enregistrer", pl: "Zapisz" },
  close: { en: "Close", ru: "Закрыть", de: "Schließen", uk: "Закрити", fr: "Fermer", pl: "Zamknij" },
  cancel: { en: "Cancel", ru: "Отмена", de: "Abbrechen", uk: "Скасувати", fr: "Annuler", pl: "Anuluj" },
  confirm: { en: "Confirm", ru: "Подтвердить", de: "Bestätigen", uk: "Підтвердити", fr: "Confirmer", pl: "Potwierdź" },

  // Order types
  type_card: { en: "Greeting Card", ru: "Открытка", de: "Grußkarte", uk: "Листівка", fr: "Carte de vœux", pl: "Kartka" },
  type_animated: { en: "Animated Greeting", ru: "Анимированное поздравление", de: "Animierter Gruß", uk: "Анімоване вітання", fr: "Vœux animés", pl: "Animowane życzenia" },
  type_song: { en: "Song", ru: "Песня", de: "Lied", uk: "Пісня", fr: "Chanson", pl: "Piosenka" },
  type_video: { en: "Video Clip", ru: "Видеоклип", de: "Videoclip", uk: "Відеокліп", fr: "Clip vidéo", pl: "Klip wideo" },
  type_cartoon: { en: "Cartoon", ru: "Мультфильм", de: "Zeichentrick", uk: "Мультфільм", fr: "Dessin animé", pl: "Kreskówka" },
  type_premium: { en: "Premium Order", ru: "Премиум-заказ", de: "Premium-Bestellung", uk: "Преміум-замовлення", fr: "Commande Premium", pl: "Zamówienie Premium" },
  type_individual: { en: "Individual Order", ru: "Индивидуальный заказ", de: "Individuelle Bestellung", uk: "Індивідуальне замовлення", fr: "Commande individuelle", pl: "Zamówienie indywidualne" },

  // Statuses
  st_draft: { en: "Draft", ru: "Черновик", de: "Entwurf", uk: "Чернетка", fr: "Brouillon", pl: "Szkic" },
  st_waiting_payment: { en: "Waiting for Payment", ru: "Ожидает оплаты", de: "Wartet auf Zahlung", uk: "Очікує оплати", fr: "En attente de paiement", pl: "Oczekuje płatności" },
  st_paid: { en: "Paid", ru: "Оплачен", de: "Bezahlt", uk: "Оплачено", fr: "Payée", pl: "Opłacone" },
  st_in_queue: { en: "In Queue", ru: "В очереди", de: "In Warteschlange", uk: "У черзі", fr: "En file", pl: "W kolejce" },
  st_processing: { en: "Processing", ru: "В обработке", de: "In Bearbeitung", uk: "В обробці", fr: "En traitement", pl: "W realizacji" },
  st_ready: { en: "Ready", ru: "Готов", de: "Bereit", uk: "Готово", fr: "Prête", pl: "Gotowe" },
  st_delivered: { en: "Delivered", ru: "Доставлен", de: "Zugestellt", uk: "Доставлено", fr: "Livrée", pl: "Dostarczone" },
  st_cancelled: { en: "Cancelled", ru: "Отменён", de: "Storniert", uk: "Скасовано", fr: "Annulée", pl: "Anulowane" },

  // Queue labels
  queue_none: { en: "Not queued", ru: "Не в очереди", de: "Nicht in Warteschlange", uk: "Не у черзі", fr: "Hors file", pl: "Poza kolejką" },
  queue_pos: { en: "Queue #{n}", ru: "Очередь №{n}", de: "Warteschlange #{n}", uk: "Черга №{n}", fr: "File #{n}", pl: "Kolejka #{n}" },
  queue_in: { en: "In Queue", ru: "В очереди", de: "In Warteschlange", uk: "У черзі", fr: "En file", pl: "W kolejce" },

  // Estimated time
  eta_none: { en: "Not applicable", ru: "Не применимо", de: "Nicht zutreffend", uk: "Не застосовується", fr: "Non applicable", pl: "Nie dotyczy" },
  eta_min: { en: "Approx. {n} minutes", ru: "Примерно {n} мин.", de: "ca. {n} Minuten", uk: "Приблизно {n} хв.", fr: "Env. {n} minutes", pl: "Około {n} minut" },
  eta_hr: { en: "Approx. {n} hours", ru: "Примерно {n} ч.", de: "ca. {n} Stunden", uk: "Приблизно {n} год.", fr: "Env. {n} heures", pl: "Około {n} godzin" },
  eta_day: { en: "Approx. {n} days", ru: "Примерно {n} дн.", de: "ca. {n} Tage", uk: "Приблизно {n} дн.", fr: "Env. {n} jours", pl: "Około {n} dni" },

  // Details sections
  section_customer: { en: "Customer", ru: "Клиент", de: "Kunde", uk: "Клієнт", fr: "Client", pl: "Klient" },
  section_order: { en: "Order", ru: "Заказ", de: "Bestellung", uk: "Замовлення", fr: "Commande", pl: "Zamówienie" },
  section_content: { en: "Content", ru: "Содержимое", de: "Inhalt", uk: "Вміст", fr: "Contenu", pl: "Treść" },
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
  duration_none: { en: "Not applicable", ru: "Не применимо", de: "Nicht zutreffend", uk: "Не застосовується", fr: "Non applicable", pl: "Nie dotyczy" },
  dur_seconds: { en: "{n} seconds", ru: "{n} сек.", de: "{n} Sekunden", uk: "{n} сек.", fr: "{n} secondes", pl: "{n} sekund" },
  dur_minutes: { en: "{n} minutes", ru: "{n} мин.", de: "{n} Minuten", uk: "{n} хв.", fr: "{n} minutes", pl: "{n} minut" },

  ch_email: { en: "Email", ru: "Email", de: "E-Mail", uk: "Email", fr: "E-mail", pl: "E-mail" },
  ch_sms: { en: "SMS", ru: "SMS", de: "SMS", uk: "SMS", fr: "SMS", pl: "SMS" },
  n_pending: { en: "Notification Pending", ru: "Уведомление ожидает", de: "Benachrichtigung ausstehend", uk: "Сповіщення очікує", fr: "Notification en attente", pl: "Powiadomienie oczekuje" },
  n_sent: { en: "Notification Sent", ru: "Уведомление отправлено", de: "Benachrichtigung gesendet", uk: "Сповіщення надіслано", fr: "Notification envoyée", pl: "Powiadomienie wysłane" },
  n_failed: { en: "Notification Failed", ru: "Ошибка уведомления", de: "Benachrichtigung fehlgeschlagen", uk: "Помилка сповіщення", fr: "Notification échouée", pl: "Powiadomienie nieudane" },
  n_disabled: { en: "Disabled", ru: "Отключено", de: "Deaktiviert", uk: "Вимкнено", fr: "Désactivé", pl: "Wyłączone" },

  // Empty / dialogs
  empty: { en: "No orders match the current filters.", ru: "Ничего не найдено.", de: "Keine Bestellungen gefunden.", uk: "Нічого не знайдено.", fr: "Aucune commande.", pl: "Brak wyników." },
  confirm_delete_title: { en: "Delete order?", ru: "Удалить заказ?", de: "Bestellung löschen?", uk: "Видалити замовлення?", fr: "Supprimer la commande ?", pl: "Usunąć zamówienie?" },
  confirm_cancel_title: { en: "Cancel order?", ru: "Отменить заказ?", de: "Bestellung stornieren?", uk: "Скасувати замовлення?", fr: "Annuler la commande ?", pl: "Anulować zamówienie?" },
  confirm_cancel_body: { en: "The order status will be set to Cancelled.", ru: "Статус заказа будет установлен «Отменён».", de: "Der Status wird auf Storniert gesetzt.", uk: "Статус буде «Скасовано».", fr: "Le statut passera à Annulée.", pl: "Status zostanie ustawiony na Anulowane." },
  keep: { en: "Keep", ru: "Оставить", de: "Behalten", uk: "Залишити", fr: "Conserver", pl: "Zachowaj" },

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