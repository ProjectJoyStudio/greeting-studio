import type { Lang } from "@/lib/i18n/types";

const D: Record<string, Record<Lang, string>> = {
  yc_title: { en: "Your Credits", ru: "Ваши кредиты", de: "Deine Credits", uk: "Ваші кредити", fr: "Vos crédits", pl: "Twoje kredyty" },
  yc_sub: {
    en: "Tracking of customer-owned purchased credits. This section is read-only: purchases and spending of Your Credits are not enabled yet.",
    ru: "Отслеживание купленных клиентом кредитов. Раздел только для просмотра: покупка и списание «Ваших кредитов» пока не включены.",
    de: "Übersicht der vom Kunden gekauften Credits. Nur Ansicht: Kauf und Verbrauch von „Deine Credits“ sind noch nicht aktiv.",
    uk: "Відстеження куплених клієнтом кредитів. Розділ лише для перегляду: купівля та списання «Ваших кредитів» ще не увімкнені.",
    fr: "Suivi des crédits achetés par le client. Lecture seule : l'achat et la dépense de « Vos crédits » ne sont pas encore activés.",
    pl: "Śledzenie kredytów zakupionych przez klienta. Tylko podgląd: zakup i wydawanie „Twoich kredytów” nie są jeszcze aktywne.",
  },
  yc_accounts: { en: "Users", ru: "Пользователи", de: "Nutzer", uk: "Користувачі", fr: "Utilisateurs", pl: "Użytkownicy" },
  yc_search: { en: "Search by email or name", ru: "Поиск по email или имени", de: "Suche nach E-Mail oder Name", uk: "Пошук за email або ім'ям", fr: "Rechercher par e-mail ou nom", pl: "Szukaj po e-mailu lub nazwie" },
  yc_no_match: { en: "No users found.", ru: "Пользователи не найдены.", de: "Keine Nutzer gefunden.", uk: "Користувачів не знайдено.", fr: "Aucun utilisateur trouvé.", pl: "Nie znaleziono użytkowników." },
  yc_selected: { en: "Selected user", ru: "Выбранный пользователь", de: "Ausgewählter Nutzer", uk: "Вибраний користувач", fr: "Utilisateur sélectionné", pl: "Wybrany użytkownik" },
  yc_your: { en: "Your Credits", ru: "Ваши кредиты", de: "Deine Credits", uk: "Ваші кредити", fr: "Vos crédits", pl: "Twoje kredyty" },
  yc_bonus: { en: "Bonus Credits", ru: "Бонусные кредиты", de: "Bonus-Credits", uk: "Бонусні кредити", fr: "Crédits bonus", pl: "Kredyty bonusowe" },
  yc_total: { en: "Total balance", ru: "Общий баланс", de: "Gesamtguthaben", uk: "Загальний баланс", fr: "Solde total", pl: "Saldo łączne" },
  yc_history: { en: "Your Credits transaction history", ru: "История транзакций «Ваши кредиты»", de: "Transaktionsverlauf „Deine Credits“", uk: "Історія транзакцій «Ваші кредити»", fr: "Historique des transactions « Vos crédits »", pl: "Historia transakcji „Twoje kredyty”" },
  yc_empty: { en: "No Your Credits transactions yet.", ru: "Транзакций по «Вашим кредитам» пока нет.", de: "Noch keine Transaktionen für „Deine Credits“.", uk: "Транзакцій за «Вашими кредитами» ще немає.", fr: "Aucune transaction « Vos crédits » pour l'instant.", pl: "Brak transakcji „Twoje kredyty”." },
  yc_select_hint: { en: "Select a user to see balances and history.", ru: "Выберите пользователя, чтобы увидеть балансы и историю.", de: "Nutzer auswählen, um Guthaben und Verlauf zu sehen.", uk: "Виберіть користувача, щоб побачити баланси та історію.", fr: "Sélectionnez un utilisateur pour voir les soldes et l'historique.", pl: "Wybierz użytkownika, aby zobaczyć salda i historię." },
  yc_col_when: { en: "When", ru: "Когда", de: "Wann", uk: "Коли", fr: "Quand", pl: "Kiedy" },
  yc_col_type: { en: "Type", ru: "Тип", de: "Typ", uk: "Тип", fr: "Type", pl: "Typ" },
  yc_col_amount: { en: "Amount", ru: "Сумма", de: "Betrag", uk: "Сума", fr: "Montant", pl: "Kwota" },
  yc_col_before: { en: "Before", ru: "До", de: "Vorher", uk: "До", fr: "Avant", pl: "Przed" },
  yc_col_after: { en: "After", ru: "После", de: "Nachher", uk: "Після", fr: "Après", pl: "Po" },
  yc_col_source: { en: "Source", ru: "Источник", de: "Quelle", uk: "Джерело", fr: "Source", pl: "Źródło" },
  yc_col_status: { en: "Status", ru: "Статус", de: "Status", uk: "Статус", fr: "Statut", pl: "Status" },
  yc_col_ref: { en: "Reference", ru: "Ссылка", de: "Referenz", uk: "Посилання", fr: "Référence", pl: "Odniesienie" },
  yc_col_desc: { en: "Description", ru: "Описание", de: "Beschreibung", uk: "Опис", fr: "Description", pl: "Opis" },
  yc_payments_off: { en: "No payment provider is connected — purchases are not available yet.", ru: "Платёжная система не подключена — покупки пока недоступны.", de: "Kein Zahlungsanbieter verbunden — Käufe sind noch nicht möglich.", uk: "Платіжну систему не підключено — покупки поки недоступні.", fr: "Aucun prestataire de paiement connecté — les achats ne sont pas disponibles.", pl: "Brak podłączonych płatności — zakupy nie są jeszcze dostępne." },
};

export function useLocal(lang: Lang) {
  return (k: string): string => {
    const row = D[k];
    return row ? row[lang] ?? row.en : k;
  };
}
