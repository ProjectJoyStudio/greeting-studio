import type { Lang } from "@/lib/i18n";

type Row = Record<Lang, string>;
const D: Record<string, Row> = {
  title: { en: "Users", ru: "Пользователи", de: "Benutzer", uk: "Користувачі", fr: "Utilisateurs", pl: "Użytkownicy" },
  subtitle: {
    en: "Manage registered customers and their accounts.",
    ru: "Управляйте зарегистрированными клиентами и их аккаунтами.",
    de: "Verwalte registrierte Kunden und deren Konten.",
    uk: "Керуйте зареєстрованими клієнтами та їхніми обліковими записами.",
    fr: "Gérez les clients enregistrés et leurs comptes.",
    pl: "Zarządzaj zarejestrowanymi klientami i ich kontami.",
  },
  demo_notice: {
    en: "Demonstration data only. No backend, authentication or payment service is connected.",
    ru: "Только демонстрационные данные. Бэкенд, авторизация и оплата не подключены.",
    de: "Nur Demo-Daten. Kein Backend, Authentifizierung oder Zahlung angebunden.",
    uk: "Лише демонстраційні дані. Бекенд, автентифікація та оплата не підключені.",
    fr: "Données de démonstration. Aucun backend, authentification ou paiement n'est connecté.",
    pl: "Tylko dane demonstracyjne. Brak backendu, uwierzytelniania i płatności.",
  },
  create_test: { en: "Create Test User", ru: "Создать тестового пользователя", de: "Testbenutzer erstellen", uk: "Створити тестового користувача", fr: "Créer un utilisateur test", pl: "Utwórz użytkownika testowego" },
  refresh: { en: "Refresh", ru: "Обновить", de: "Aktualisieren", uk: "Оновити", fr: "Actualiser", pl: "Odśwież" },

  search_placeholder: { en: "Search by ID, name or email…", ru: "Поиск по ID, имени или email…", de: "Suche nach ID, Name oder E-Mail…", uk: "Пошук за ID, ім'ям або email…", fr: "Rechercher ID, nom ou e-mail…", pl: "Szukaj po ID, imieniu lub e-mailu…" },
  filter_status: { en: "Status", ru: "Статус", de: "Status", uk: "Статус", fr: "Statut", pl: "Status" },
  filter_country: { en: "Country", ru: "Страна", de: "Land", uk: "Країна", fr: "Pays", pl: "Kraj" },
  filter_language: { en: "Language", ru: "Язык", de: "Sprache", uk: "Мова", fr: "Langue", pl: "Język" },
  filter_subscription: { en: "Subscription", ru: "Подписка", de: "Abonnement", uk: "Підписка", fr: "Abonnement", pl: "Subskrypcja" },
  filter_all: { en: "All", ru: "Все", de: "Alle", uk: "Усі", fr: "Tous", pl: "Wszystkie" },
  sort_by: { en: "Sort by", ru: "Сортировать", de: "Sortieren", uk: "Сортувати", fr: "Trier", pl: "Sortuj" },
  sort_newest: { en: "Newest registration", ru: "Сначала новые", de: "Neueste zuerst", uk: "Спочатку нові", fr: "Plus récents", pl: "Najnowsi" },
  sort_oldest: { en: "Oldest registration", ru: "Сначала старые", de: "Älteste zuerst", uk: "Спочатку старі", fr: "Plus anciens", pl: "Najstarsi" },
  sort_credits: { en: "Credits (high to low)", ru: "Кредиты (по убыванию)", de: "Credits (absteigend)", uk: "Кредити (за спаданням)", fr: "Crédits (décroissant)", pl: "Kredyty (malejąco)" },
  sort_orders: { en: "Orders (high to low)", ru: "Заказы (по убыванию)", de: "Bestellungen (absteigend)", uk: "Замовлення (за спаданням)", fr: "Commandes (décroissant)", pl: "Zamówienia (malejąco)" },

  col_id: { en: "User ID", ru: "ID пользователя", de: "Benutzer-ID", uk: "ID користувача", fr: "ID utilisateur", pl: "ID użytkownika" },
  col_name: { en: "Full Name", ru: "Полное имя", de: "Vollständiger Name", uk: "Повне ім'я", fr: "Nom complet", pl: "Imię i nazwisko" },
  col_email: { en: "Email", ru: "Email", de: "E-Mail", uk: "Email", fr: "E-mail", pl: "E-mail" },
  col_country: { en: "Country", ru: "Страна", de: "Land", uk: "Країна", fr: "Pays", pl: "Kraj" },
  col_language: { en: "Language", ru: "Язык", de: "Sprache", uk: "Мова", fr: "Langue", pl: "Język" },
  col_registered: { en: "Registration Date", ru: "Дата регистрации", de: "Registrierungsdatum", uk: "Дата реєстрації", fr: "Date d'inscription", pl: "Data rejestracji" },
  col_status: { en: "Account Status", ru: "Статус аккаунта", de: "Kontostatus", uk: "Статус акаунта", fr: "Statut du compte", pl: "Status konta" },
  col_credits: { en: "Credits Balance", ru: "Баланс кредитов", de: "Kreditsaldo", uk: "Баланс кредитів", fr: "Solde de crédits", pl: "Saldo kredytów" },
  col_subscription: { en: "Active Subscription", ru: "Активная подписка", de: "Aktives Abo", uk: "Активна підписка", fr: "Abonnement actif", pl: "Aktywna subskrypcja" },
  col_orders: { en: "Total Orders", ru: "Всего заказов", de: "Bestellungen gesamt", uk: "Всього замовлень", fr: "Commandes totales", pl: "Zamówienia razem" },
  col_actions: { en: "Actions", ru: "Действия", de: "Aktionen", uk: "Дії", fr: "Actions", pl: "Akcje" },

  act_view: { en: "View", ru: "Открыть", de: "Ansehen", uk: "Переглянути", fr: "Voir", pl: "Zobacz" },
  act_edit: { en: "Edit", ru: "Изменить", de: "Bearbeiten", uk: "Редагувати", fr: "Modifier", pl: "Edytuj" },
  act_block: { en: "Block", ru: "Заблокировать", de: "Sperren", uk: "Заблокувати", fr: "Bloquer", pl: "Zablokuj" },
  act_unblock: { en: "Unblock", ru: "Разблокировать", de: "Entsperren", uk: "Розблокувати", fr: "Débloquer", pl: "Odblokuj" },
  act_delete: { en: "Delete", ru: "Удалить", de: "Löschen", uk: "Видалити", fr: "Supprimer", pl: "Usuń" },

  save: { en: "Save", ru: "Сохранить", de: "Speichern", uk: "Зберегти", fr: "Enregistrer", pl: "Zapisz" },
  close: { en: "Close", ru: "Закрыть", de: "Schließen", uk: "Закрити", fr: "Fermer", pl: "Zamknij" },
  cancel: { en: "Cancel", ru: "Отмена", de: "Abbrechen", uk: "Скасувати", fr: "Annuler", pl: "Anuluj" },
  confirm: { en: "Confirm", ru: "Подтвердить", de: "Bestätigen", uk: "Підтвердити", fr: "Confirmer", pl: "Potwierdź" },

  st_active: { en: "Active", ru: "Активен", de: "Aktiv", uk: "Активний", fr: "Actif", pl: "Aktywny" },
  st_inactive: { en: "Inactive", ru: "Неактивен", de: "Inaktiv", uk: "Неактивний", fr: "Inactif", pl: "Nieaktywny" },
  st_blocked: { en: "Blocked", ru: "Заблокирован", de: "Gesperrt", uk: "Заблокований", fr: "Bloqué", pl: "Zablokowany" },
  st_suspended: { en: "Suspended", ru: "Приостановлен", de: "Ausgesetzt", uk: "Призупинений", fr: "Suspendu", pl: "Zawieszony" },

  sub_none: { en: "No Subscription", ru: "Нет подписки", de: "Kein Abo", uk: "Немає підписки", fr: "Aucun abonnement", pl: "Brak subskrypcji" },
  sub_monthly: { en: "Monthly", ru: "Ежемесячная", de: "Monatlich", uk: "Щомісячна", fr: "Mensuel", pl: "Miesięczna" },
  sub_yearly: { en: "Yearly", ru: "Годовая", de: "Jährlich", uk: "Річна", fr: "Annuel", pl: "Roczna" },

  section_personal: { en: "Personal Information", ru: "Личные данные", de: "Persönliche Angaben", uk: "Особисті дані", fr: "Informations personnelles", pl: "Dane osobowe" },
  section_account: { en: "Account", ru: "Аккаунт", de: "Konto", uk: "Акаунт", fr: "Compte", pl: "Konto" },
  section_stats: { en: "Statistics", ru: "Статистика", de: "Statistik", uk: "Статистика", fr: "Statistiques", pl: "Statystyki" },
  section_subscription: { en: "Subscription", ru: "Подписка", de: "Abonnement", uk: "Підписка", fr: "Abonnement", pl: "Subskrypcja" },
  section_credits: { en: "Credit Information", ru: "Информация о кредитах", de: "Kreditinformationen", uk: "Інформація про кредити", fr: "Informations sur les crédits", pl: "Informacje o kredytach" },

  f_full_name: { en: "Full Name", ru: "Полное имя", de: "Vollständiger Name", uk: "Повне ім'я", fr: "Nom complet", pl: "Imię i nazwisko" },
  f_email: { en: "Email", ru: "Email", de: "E-Mail", uk: "Email", fr: "E-mail", pl: "E-mail" },
  f_country: { en: "Country", ru: "Страна", de: "Land", uk: "Країна", fr: "Pays", pl: "Kraj" },
  f_language: { en: "Language", ru: "Язык", de: "Sprache", uk: "Мова", fr: "Langue", pl: "Język" },
  f_registration: { en: "Registration Date", ru: "Дата регистрации", de: "Registrierungsdatum", uk: "Дата реєстрації", fr: "Date d'inscription", pl: "Data rejestracji" },
  f_status: { en: "Status", ru: "Статус", de: "Status", uk: "Статус", fr: "Statut", pl: "Status" },
  f_balance: { en: "Credits Balance", ru: "Баланс кредитов", de: "Kreditsaldo", uk: "Баланс кредитів", fr: "Solde de crédits", pl: "Saldo kredytów" },
  f_sub_type: { en: "Subscription Type", ru: "Тип подписки", de: "Abo-Typ", uk: "Тип підписки", fr: "Type d'abonnement", pl: "Typ subskrypcji" },
  f_sub_start: { en: "Subscription Start", ru: "Начало подписки", de: "Abo-Beginn", uk: "Початок підписки", fr: "Début de l'abonnement", pl: "Początek subskrypcji" },
  f_sub_end: { en: "Subscription Expiration", ru: "Окончание подписки", de: "Abo-Ende", uk: "Закінчення підписки", fr: "Fin de l'abonnement", pl: "Koniec subskrypcji" },
  f_total_orders: { en: "Total Orders", ru: "Всего заказов", de: "Bestellungen gesamt", uk: "Всього замовлень", fr: "Commandes totales", pl: "Zamówienia razem" },
  f_credits_purchased: { en: "Total Credits Purchased", ru: "Всего куплено кредитов", de: "Gekaufte Credits gesamt", uk: "Всього придбано кредитів", fr: "Crédits achetés au total", pl: "Zakupione kredyty razem" },
  f_credits_used: { en: "Total Credits Used", ru: "Всего использовано кредитов", de: "Verwendete Credits gesamt", uk: "Всього використано кредитів", fr: "Crédits utilisés au total", pl: "Wykorzystane kredyty razem" },
  f_credits_remaining: { en: "Remaining Credits", ru: "Осталось кредитов", de: "Verbleibende Credits", uk: "Залишок кредитів", fr: "Crédits restants", pl: "Pozostałe kredyty" },

  none: { en: "—", ru: "—", de: "—", uk: "—", fr: "—", pl: "—" },
  empty: { en: "No users match the current filters.", ru: "Пользователи не найдены.", de: "Keine Benutzer gefunden.", uk: "Користувачів не знайдено.", fr: "Aucun utilisateur.", pl: "Brak wyników." },

  confirm_delete_title: { en: "Delete user?", ru: "Удалить пользователя?", de: "Benutzer löschen?", uk: "Видалити користувача?", fr: "Supprimer l'utilisateur ?", pl: "Usunąć użytkownika?" },
  confirm_delete_body: { en: "This permanently removes the user record from the demonstration list.", ru: "Пользователь будет удалён из демонстрационного списка.", de: "Der Benutzer wird dauerhaft aus der Demoliste entfernt.", uk: "Користувача буде видалено з демо-списку.", fr: "L'utilisateur sera supprimé de la liste de démonstration.", pl: "Użytkownik zostanie usunięty z listy demonstracyjnej." },

  edit_title: { en: "Edit user", ru: "Редактировать пользователя", de: "Benutzer bearbeiten", uk: "Редагувати користувача", fr: "Modifier l'utilisateur", pl: "Edytuj użytkownika" },
  view_title: { en: "User profile", ru: "Профиль пользователя", de: "Benutzerprofil", uk: "Профіль користувача", fr: "Profil utilisateur", pl: "Profil użytkownika" },

  err_name: { en: "Name is required.", ru: "Требуется имя.", de: "Name erforderlich.", uk: "Потрібне ім'я.", fr: "Nom requis.", pl: "Wymagane imię." },
  err_email: { en: "Email is required.", ru: "Требуется email.", de: "E-Mail erforderlich.", uk: "Потрібен email.", fr: "E-mail requis.", pl: "Wymagany e-mail." },
  err_email_format: { en: "Invalid email format.", ru: "Неверный формат email.", de: "Ungültiges E-Mail-Format.", uk: "Невірний формат email.", fr: "Format e-mail invalide.", pl: "Nieprawidłowy format e-mail." },
  err_email_unique: { en: "This email is already used.", ru: "Такой email уже используется.", de: "Diese E-Mail wird bereits verwendet.", uk: "Такий email вже використовується.", fr: "Cet e-mail est déjà utilisé.", pl: "Ten e-mail jest już używany." },
  err_country: { en: "Country is required.", ru: "Требуется страна.", de: "Land erforderlich.", uk: "Потрібна країна.", fr: "Pays requis.", pl: "Wymagany kraj." },
  err_language: { en: "Language is required.", ru: "Требуется язык.", de: "Sprache erforderlich.", uk: "Потрібна мова.", fr: "Langue requise.", pl: "Wymagany język." },
};

// ---------- Advanced profile keys ----------
Object.assign(D, {
  // Tabs
  tab_overview: { en: "Overview", ru: "Обзор", de: "Übersicht", uk: "Огляд", fr: "Aperçu", pl: "Przegląd" },
  tab_orders: { en: "Orders", ru: "Заказы", de: "Bestellungen", uk: "Замовлення", fr: "Commandes", pl: "Zamówienia" },
  tab_credits: { en: "Credits History", ru: "История кредитов", de: "Kredithistorie", uk: "Історія кредитів", fr: "Historique des crédits", pl: "Historia kredytów" },
  tab_subs: { en: "Subscription History", ru: "История подписок", de: "Abonnement-Verlauf", uk: "Історія підписок", fr: "Historique des abonnements", pl: "Historia subskrypcji" },
  tab_notifs: { en: "Notifications", ru: "Уведомления", de: "Benachrichtigungen", uk: "Сповіщення", fr: "Notifications", pl: "Powiadomienia" },
  tab_notes: { en: "Internal Notes", ru: "Внутренние заметки", de: "Interne Notizen", uk: "Внутрішні нотатки", fr: "Notes internes", pl: "Notatki wewnętrzne" },
  tab_activity: { en: "Activity Log", ru: "Журнал активности", de: "Aktivitätsprotokoll", uk: "Журнал активності", fr: "Journal d'activité", pl: "Dziennik aktywności" },

  // Orders tab
  col_order_id: { en: "Order ID", ru: "ID заказа", de: "Bestell-ID", uk: "ID замовлення", fr: "ID commande", pl: "ID zamówienia" },
  col_product: { en: "Product", ru: "Продукт", de: "Produkt", uk: "Продукт", fr: "Produit", pl: "Produkt" },
  col_queue: { en: "Queue Position", ru: "Позиция в очереди", de: "Warteschlangenposition", uk: "Місце в черзі", fr: "Position", pl: "Kolejka" },
  col_estimate: { en: "Estimated Time", ru: "Ожидаемое время", de: "Voraussichtliche Zeit", uk: "Орієнтовний час", fr: "Temps estimé", pl: "Szacowany czas" },
  col_created: { en: "Created", ru: "Создано", de: "Erstellt", uk: "Створено", fr: "Créé", pl: "Utworzono" },
  act_open: { en: "Open", ru: "Открыть", de: "Öffnen", uk: "Відкрити", fr: "Ouvrir", pl: "Otwórz" },
  act_duplicate: { en: "Duplicate", ru: "Дублировать", de: "Duplizieren", uk: "Дублювати", fr: "Dupliquer", pl: "Duplikuj" },
  act_cancel_order: { en: "Cancel", ru: "Отменить", de: "Stornieren", uk: "Скасувати", fr: "Annuler", pl: "Anuluj" },

  prod_card: { en: "Greeting Card", ru: "Открытка", de: "Grußkarte", uk: "Листівка", fr: "Carte", pl: "Kartka" },
  prod_animated: { en: "Animated Greeting", ru: "Анимированное поздравление", de: "Animierter Gruß", uk: "Анімоване привітання", fr: "Vœu animé", pl: "Animowane życzenia" },
  prod_song: { en: "Song", ru: "Песня", de: "Lied", uk: "Пісня", fr: "Chanson", pl: "Piosenka" },
  prod_video: { en: "Video", ru: "Видео", de: "Video", uk: "Відео", fr: "Vidéo", pl: "Wideo" },
  prod_cartoon: { en: "Cartoon", ru: "Мультфильм", de: "Zeichentrick", uk: "Мультфільм", fr: "Dessin animé", pl: "Kreskówka" },
  prod_premium: { en: "Premium Order", ru: "Премиум-заказ", de: "Premium-Bestellung", uk: "Преміум-замовлення", fr: "Commande premium", pl: "Zamówienie premium" },
  prod_individual: { en: "Individual Order", ru: "Индивидуальный заказ", de: "Individuelle Bestellung", uk: "Індивідуальне замовлення", fr: "Commande individuelle", pl: "Zamówienie indywidualne" },

  est_10m: { en: "Approx. 10 minutes", ru: "Около 10 минут", de: "Ca. 10 Minuten", uk: "Близько 10 хвилин", fr: "Env. 10 minutes", pl: "Ok. 10 minut" },
  est_30m: { en: "Approx. 30 minutes", ru: "Около 30 минут", de: "Ca. 30 Minuten", uk: "Близько 30 хвилин", fr: "Env. 30 minutes", pl: "Ok. 30 minut" },
  est_2h: { en: "Approx. 2 hours", ru: "Около 2 часов", de: "Ca. 2 Stunden", uk: "Близько 2 годин", fr: "Env. 2 heures", pl: "Ok. 2 godzin" },
  est_1d: { en: "Approx. 1 day", ru: "Около 1 дня", de: "Ca. 1 Tag", uk: "Близько 1 дня", fr: "Env. 1 jour", pl: "Ok. 1 dnia" },

  ost_draft: { en: "Draft", ru: "Черновик", de: "Entwurf", uk: "Чернетка", fr: "Brouillon", pl: "Szkic" },
  ost_waiting_payment: { en: "Waiting for Payment", ru: "Ожидает оплаты", de: "Wartet auf Zahlung", uk: "Очікує оплати", fr: "En attente de paiement", pl: "Oczekuje płatności" },
  ost_paid: { en: "Paid", ru: "Оплачено", de: "Bezahlt", uk: "Оплачено", fr: "Payé", pl: "Opłacone" },
  ost_in_queue: { en: "In Queue", ru: "В очереди", de: "In Warteschlange", uk: "У черзі", fr: "En file", pl: "W kolejce" },
  ost_processing: { en: "Processing", ru: "В работе", de: "In Bearbeitung", uk: "В обробці", fr: "En traitement", pl: "W trakcie" },
  ost_ready: { en: "Ready", ru: "Готово", de: "Fertig", uk: "Готово", fr: "Prêt", pl: "Gotowe" },
  ost_delivered: { en: "Delivered", ru: "Доставлено", de: "Zugestellt", uk: "Доставлено", fr: "Livré", pl: "Dostarczone" },
  ost_cancelled: { en: "Cancelled", ru: "Отменено", de: "Storniert", uk: "Скасовано", fr: "Annulé", pl: "Anulowane" },

  queue_pos: { en: "Queue #{n}", ru: "Очередь №{n}", de: "Warteschlange #{n}", uk: "Черга №{n}", fr: "File n°{n}", pl: "Kolejka #{n}" },
  queue_in: { en: "In Queue", ru: "В очереди", de: "In Warteschlange", uk: "У черзі", fr: "En file", pl: "W kolejce" },

  // Credits history
  col_ch_date: { en: "Date", ru: "Дата", de: "Datum", uk: "Дата", fr: "Date", pl: "Data" },
  col_ch_type: { en: "Type", ru: "Тип", de: "Typ", uk: "Тип", fr: "Type", pl: "Typ" },
  col_ch_credits: { en: "Credits", ru: "Кредиты", de: "Credits", uk: "Кредити", fr: "Crédits", pl: "Kredyty" },
  col_ch_balance: { en: "Balance After", ru: "Баланс после", de: "Saldo danach", uk: "Баланс після", fr: "Solde après", pl: "Saldo po" },
  col_ch_desc: { en: "Description", ru: "Описание", de: "Beschreibung", uk: "Опис", fr: "Description", pl: "Opis" },
  ct_purchased: { en: "Purchased", ru: "Покупка", de: "Gekauft", uk: "Придбано", fr: "Acheté", pl: "Zakup" },
  ct_bonus: { en: "Bonus", ru: "Бонус", de: "Bonus", uk: "Бонус", fr: "Bonus", pl: "Bonus" },
  ct_used: { en: "Used", ru: "Использовано", de: "Verbraucht", uk: "Використано", fr: "Utilisé", pl: "Wykorzystane" },
  ct_refund: { en: "Refund", ru: "Возврат", de: "Rückerstattung", uk: "Повернення", fr: "Remboursement", pl: "Zwrot" },
  credits_desc_purchase: { en: "Purchased credits", ru: "Куплены кредиты", de: "Credits gekauft", uk: "Придбано кредити", fr: "Crédits achetés", pl: "Zakupione kredyty" },
  credits_desc_bonus: { en: "Welcome bonus", ru: "Приветственный бонус", de: "Willkommensbonus", uk: "Вітальний бонус", fr: "Bonus de bienvenue", pl: "Bonus powitalny" },
  credits_desc_used: { en: "Used for greeting", ru: "Списано за поздравление", de: "Für Gruß verwendet", uk: "Використано на привітання", fr: "Utilisés pour un vœu", pl: "Wykorzystane na życzenie" },

  // Subscription history
  col_sh_plan: { en: "Plan", ru: "Тариф", de: "Plan", uk: "Тариф", fr: "Plan", pl: "Plan" },
  col_sh_start: { en: "Start Date", ru: "Дата начала", de: "Startdatum", uk: "Дата початку", fr: "Début", pl: "Początek" },
  col_sh_end: { en: "End Date", ru: "Дата окончания", de: "Enddatum", uk: "Дата завершення", fr: "Fin", pl: "Koniec" },
  sh_active: { en: "Active", ru: "Активна", de: "Aktiv", uk: "Активна", fr: "Active", pl: "Aktywna" },
  sh_renewed: { en: "Renewed", ru: "Продлена", de: "Verlängert", uk: "Продовжена", fr: "Renouvelée", pl: "Odnowiona" },
  sh_expired: { en: "Expired", ru: "Истекла", de: "Abgelaufen", uk: "Завершена", fr: "Expirée", pl: "Wygasła" },
  sh_cancelled: { en: "Cancelled", ru: "Отменена", de: "Storniert", uk: "Скасована", fr: "Annulée", pl: "Anulowana" },

  // Notifications
  col_notif_channel: { en: "Channel", ru: "Канал", de: "Kanal", uk: "Канал", fr: "Canal", pl: "Kanał" },
  col_notif_subject: { en: "Subject", ru: "Тема", de: "Betreff", uk: "Тема", fr: "Sujet", pl: "Temat" },
  ch_email: { en: "Email", ru: "Email", de: "E-Mail", uk: "Email", fr: "E-mail", pl: "E-mail" },
  ch_sms: { en: "SMS", ru: "SMS", de: "SMS", uk: "SMS", fr: "SMS", pl: "SMS" },
  ch_push: { en: "Push", ru: "Push", de: "Push", uk: "Push", fr: "Push", pl: "Push" },
  ch_system: { en: "System", ru: "Система", de: "System", uk: "Система", fr: "Système", pl: "System" },
  ns_delivered: { en: "Delivered", ru: "Доставлено", de: "Zugestellt", uk: "Доставлено", fr: "Livré", pl: "Dostarczone" },
  ns_pending: { en: "Pending", ru: "Ожидание", de: "Ausstehend", uk: "Очікує", fr: "En attente", pl: "Oczekuje" },
  ns_failed: { en: "Failed", ru: "Ошибка", de: "Fehlgeschlagen", uk: "Помилка", fr: "Échec", pl: "Nieudane" },
  notif_welcome: { en: "Welcome to Project Joy", ru: "Добро пожаловать в Project Joy", de: "Willkommen bei Project Joy", uk: "Ласкаво просимо до Project Joy", fr: "Bienvenue chez Project Joy", pl: "Witamy w Project Joy" },
  notif_order_ready: { en: "Your greeting is ready", ru: "Ваше поздравление готово", de: "Ihr Gruß ist bereit", uk: "Ваше привітання готове", fr: "Votre vœu est prêt", pl: "Twoje życzenie jest gotowe" },
  notif_promo: { en: "A gift is waiting for you", ru: "Вас ждёт подарок", de: "Ein Geschenk wartet auf Sie", uk: "На вас чекає подарунок", fr: "Un cadeau vous attend", pl: "Czeka na Ciebie prezent" },
  notif_password: { en: "Password changed", ru: "Пароль изменён", de: "Passwort geändert", uk: "Пароль змінено", fr: "Mot de passe modifié", pl: "Hasło zmienione" },

  // Internal notes
  notes_add: { en: "Add note", ru: "Добавить заметку", de: "Notiz hinzufügen", uk: "Додати нотатку", fr: "Ajouter une note", pl: "Dodaj notatkę" },
  notes_placeholder: { en: "Write a note visible only to administrators…", ru: "Напишите заметку, видимую только администраторам…", de: "Notiz nur für Administratoren sichtbar…", uk: "Нотатка, видима лише адміністраторам…", fr: "Note visible uniquement par les administrateurs…", pl: "Notatka widoczna tylko dla administratorów…" },
  notes_empty: { en: "No internal notes yet.", ru: "Пока нет заметок.", de: "Noch keine Notizen.", uk: "Ще немає нотаток.", fr: "Aucune note interne.", pl: "Brak notatek." },
  notes_edit: { en: "Edit", ru: "Изменить", de: "Bearbeiten", uk: "Редагувати", fr: "Modifier", pl: "Edytuj" },
  notes_delete: { en: "Delete", ru: "Удалить", de: "Löschen", uk: "Видалити", fr: "Supprimer", pl: "Usuń" },
  notes_customer_hidden: { en: "Customer never sees these notes.", ru: "Клиент никогда не увидит эти заметки.", de: "Kunden sehen diese Notizen nie.", uk: "Клієнт ніколи не побачить ці нотатки.", fr: "Le client ne voit jamais ces notes.", pl: "Klient nigdy nie widzi tych notatek." },
  notes_author: { en: "Administrator", ru: "Администратор", de: "Administrator", uk: "Адміністратор", fr: "Administrateur", pl: "Administrator" },

  // Activity log
  act_registered: { en: "Registered", ru: "Регистрация", de: "Registriert", uk: "Реєстрація", fr: "Inscription", pl: "Rejestracja" },
  act_purchased_credits: { en: "Purchased credits", ru: "Куплены кредиты", de: "Credits gekauft", uk: "Придбано кредити", fr: "Crédits achetés", pl: "Zakupione kredyty" },
  act_created_order: { en: "Created order", ru: "Создан заказ", de: "Bestellung erstellt", uk: "Створено замовлення", fr: "Commande créée", pl: "Utworzono zamówienie" },
  act_cancelled_order: { en: "Cancelled order", ru: "Отменён заказ", de: "Bestellung storniert", uk: "Скасовано замовлення", fr: "Commande annulée", pl: "Anulowano zamówienie" },
  act_subscription_purchased: { en: "Subscription purchased", ru: "Куплена подписка", de: "Abo gekauft", uk: "Придбано підписку", fr: "Abonnement acheté", pl: "Kupiono subskrypcję" },
  act_password_changed: { en: "Password changed", ru: "Пароль изменён", de: "Passwort geändert", uk: "Пароль змінено", fr: "Mot de passe modifié", pl: "Zmieniono hasło" },
  act_language_changed: { en: "Language changed", ru: "Язык изменён", de: "Sprache geändert", uk: "Мову змінено", fr: "Langue modifiée", pl: "Zmieniono język" },
  act_login: { en: "Signed in", ru: "Вход в аккаунт", de: "Angemeldet", uk: "Вхід", fr: "Connexion", pl: "Zalogowano" },

  // Quick actions
  qa_send_email: { en: "Send Email", ru: "Отправить email", de: "E-Mail senden", uk: "Надіслати email", fr: "Envoyer un e-mail", pl: "Wyślij e-mail" },
  qa_send_sms: { en: "Send SMS", ru: "Отправить SMS", de: "SMS senden", uk: "Надіслати SMS", fr: "Envoyer un SMS", pl: "Wyślij SMS" },
  qa_grant_credits: { en: "Grant Bonus Credits", ru: "Начислить бонусные кредиты", de: "Bonus-Credits gutschreiben", uk: "Нарахувати бонусні кредити", fr: "Attribuer des crédits bonus", pl: "Przyznaj kredyty bonusowe" },
  qa_reset_password: { en: "Reset Password", ru: "Сбросить пароль", de: "Passwort zurücksetzen", uk: "Скинути пароль", fr: "Réinitialiser le mot de passe", pl: "Zresetuj hasło" },
  qa_grant_amount: { en: "Amount", ru: "Количество", de: "Betrag", uk: "Кількість", fr: "Montant", pl: "Ilość" },
  qa_done: { en: "Recorded in demonstration.", ru: "Записано в демонстрации.", de: "In der Demo erfasst.", uk: "Записано у демо.", fr: "Enregistré en démonstration.", pl: "Zapisane w demonstracji." },

  // VIP labels
  vip_vip: { en: "VIP", ru: "VIP", de: "VIP", uk: "VIP", fr: "VIP", pl: "VIP" },
  vip_premium: { en: "Premium Member", ru: "Премиум-участник", de: "Premium-Mitglied", uk: "Преміум-учасник", fr: "Membre Premium", pl: "Członek Premium" },
  vip_top: { en: "Top Customer", ru: "Топ-клиент", de: "Top-Kunde", uk: "Топ-клієнт", fr: "Client Top", pl: "Najlepszy klient" },

  // Last login / spend
  section_login: { en: "Last Login", ru: "Последний вход", de: "Letzter Login", uk: "Останній вхід", fr: "Dernière connexion", pl: "Ostatnie logowanie" },
  f_last_login: { en: "Last Login", ru: "Последний вход", de: "Letzter Login", uk: "Останній вхід", fr: "Dernière connexion", pl: "Ostatnie logowanie" },
  f_last_ip: { en: "Last IP", ru: "Последний IP", de: "Letzte IP", uk: "Остання IP", fr: "Dernière IP", pl: "Ostatnie IP" },
  f_last_device: { en: "Last Device", ru: "Последнее устройство", de: "Letztes Gerät", uk: "Останній пристрій", fr: "Dernier appareil", pl: "Ostatnie urządzenie" },
  section_spend: { en: "Financials", ru: "Финансы", de: "Finanzen", uk: "Фінанси", fr: "Finances", pl: "Finanse" },
  f_total_spent: { en: "Total Money Spent", ru: "Всего потрачено", de: "Gesamtausgaben", uk: "Всього витрачено", fr: "Total dépensé", pl: "Łącznie wydano" },
  f_lifetime_value: { en: "Lifetime Value", ru: "Пожизненная ценность", de: "Lifetime Value", uk: "Життєва цінність", fr: "Valeur à vie", pl: "Wartość życiowa" },
  f_avg_order: { en: "Average Order Value", ru: "Средний чек", de: "Ø Bestellwert", uk: "Середній чек", fr: "Panier moyen", pl: "Średnia wartość" },

  empty_list: { en: "No records to display.", ru: "Нет записей.", de: "Keine Einträge.", uk: "Немає записів.", fr: "Aucun enregistrement.", pl: "Brak wpisów." },
});

export function useLocalUsers(lang: Lang) {
  return (k: string, subs?: Record<string, string | number>): string => {
    const row = D[k];
    let v = row ? row[lang] ?? row.en : k;
    if (subs) for (const [key, val] of Object.entries(subs)) v = v.replaceAll(`{${key}}`, String(val));
    return v;
  };
}

export type LocalUsers = ReturnType<typeof useLocalUsers>;