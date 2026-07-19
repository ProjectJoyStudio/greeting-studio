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

export function useLocalUsers(lang: Lang) {
  return (k: string, subs?: Record<string, string | number>): string => {
    const row = D[k];
    let v = row ? row[lang] ?? row.en : k;
    if (subs) for (const [key, val] of Object.entries(subs)) v = v.replaceAll(`{${key}}`, String(val));
    return v;
  };
}

export type LocalUsers = ReturnType<typeof useLocalUsers>;