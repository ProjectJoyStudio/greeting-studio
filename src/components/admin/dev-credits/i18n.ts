import type { Lang } from "@/lib/i18n/types";

type Row = Record<Lang, string>;

const D: Record<string, Row> = {
  dtc_title: { en: "Bonus Credits", ru: "Бонусные кредиты", de: "Bonus-Credits", uk: "Бонусні кредити", fr: "Crédits bonus", pl: "Kredyty bonusowe" },
  dtc_sub: {
    en: "Bonus credits behave exactly like purchased credits, but they are only given to administrators and selected developer accounts. No payment provider is connected.",
    ru: "Бонусные кредиты работают точно как купленные, но выдаются только администраторам и выбранным тестовым аккаунтам. Платёжная система не подключена.",
    de: "Bonus-Credits verhalten sich wie gekaufte Credits, stehen aber nur Administratoren und ausgewählten Entwicklerkonten zur Verfügung. Kein Zahlungsanbieter ist verbunden.",
    uk: "Бонусні кредити працюють так само, як куплені, але доступні лише адміністраторам і вибраним тестовим акаунтам. Платіжну систему не підключено.",
    fr: "Les crédits bonus se comportent comme des crédits achetés, mais ne sont réservés qu'aux administrateurs et aux comptes de test. Aucun paiement n'est connecté.",
    pl: "Kredyty bonusowe działają jak zakupione, ale są dostępne tylko dla administratorów i wybranych kont testowych. Brak podłączonych płatności.",
  },
  dtc_accounts: { en: "Accounts", ru: "Аккаунты", de: "Konten", uk: "Акаунти", fr: "Comptes", pl: "Konta" },
  dtc_history: { en: "Bonus credit transaction history", ru: "История бонусных транзакций", de: "Verlauf der Bonus-Credits", uk: "Історія бонусних транзакцій", fr: "Historique des crédits bonus", pl: "Historia kredytów bonusowych" },
  dtc_balance: { en: "Bonus credit balance", ru: "Баланс бонусных кредитов", de: "Bonus-Guthaben", uk: "Баланс бонусних кредитів", fr: "Solde de crédits bonus", pl: "Saldo kredytów bonusowych" },
  dtc_add: { en: "Add", ru: "Начислить", de: "Hinzufügen", uk: "Нарахувати", fr: "Ajouter", pl: "Dodaj" },
  dtc_remove: { en: "Remove", ru: "Списать", de: "Abziehen", uk: "Списати", fr: "Retirer", pl: "Odejmij" },
  dtc_reset: { en: "Reset to 0", ru: "Сбросить в 0", de: "Auf 0 setzen", uk: "Скинути в 0", fr: "Remettre à 0", pl: "Wyzeruj" },
  dtc_amount: { en: "Amount", ru: "Количество", de: "Menge", uk: "Кількість", fr: "Montant", pl: "Ilość" },
  dtc_reason: { en: "Reason (optional)", ru: "Причина (необязательно)", de: "Grund (optional)", uk: "Причина (необов'язково)", fr: "Raison (facultatif)", pl: "Powód (opcjonalnie)" },
  dtc_enable: { en: "Make developer account", ru: "Сделать тестовым аккаунтом", de: "Als Entwicklerkonto markieren", uk: "Зробити тестовим акаунтом", fr: "Marquer comme compte de test", pl: "Oznacz jako konto testowe" },
  dtc_disable: { en: "Remove developer access", ru: "Убрать тестовый доступ", de: "Entwicklerzugang entfernen", uk: "Прибрати тестовий доступ", fr: "Retirer l'accès de test", pl: "Usuń dostęp testowy" },
  dtc_flag: { en: "Developer account", ru: "Тестовый аккаунт", de: "Entwicklerkonto", uk: "Тестовий акаунт", fr: "Compte de test", pl: "Konto testowe" },
  dtc_no_history: { en: "No bonus credit transactions yet.", ru: "Бонусных транзакций пока нет.", de: "Noch keine Bonus-Transaktionen.", uk: "Бонусних транзакцій ще немає.", fr: "Aucune transaction bonus.", pl: "Brak transakcji bonusowych." },
  dtc_done: { en: "Bonus credits updated", ru: "Бонусные кредиты обновлены", de: "Bonus-Credits aktualisiert", uk: "Бонусні кредити оновлено", fr: "Crédits bonus mis à jour", pl: "Kredyty bonusowe zaktualizowane" },
  dtc_all_accounts: { en: "All developer accounts", ru: "Все тестовые аккаунты", de: "Alle Entwicklerkonten", uk: "Усі тестові акаунти", fr: "Tous les comptes de test", pl: "Wszystkie konta testowe" },
  dtc_payments_off: { en: "Payments are intentionally disabled at this stage.", ru: "Платежи на этом этапе намеренно отключены.", de: "Zahlungen sind in dieser Phase bewusst deaktiviert.", uk: "Платежі на цьому етапі навмисно вимкнено.", fr: "Les paiements sont volontairement désactivés.", pl: "Płatności są celowo wyłączone." },
  dtc_col_when: { en: "When", ru: "Когда", de: "Wann", uk: "Коли", fr: "Quand", pl: "Kiedy" },
  dtc_col_account: { en: "Account", ru: "Аккаунт", de: "Konto", uk: "Акаунт", fr: "Compte", pl: "Konto" },
  dtc_col_type: { en: "Type", ru: "Тип", de: "Typ", uk: "Тип", fr: "Type", pl: "Typ" },
  dtc_col_amount: { en: "Amount", ru: "Сумма", de: "Betrag", uk: "Сума", fr: "Montant", pl: "Kwota" },
  dtc_col_after: { en: "Balance after", ru: "Баланс после", de: "Guthaben danach", uk: "Баланс після", fr: "Solde après", pl: "Saldo po" },
  dtc_col_desc: { en: "Description", ru: "Описание", de: "Beschreibung", uk: "Опис", fr: "Description", pl: "Opis" },
  dtc_search: { en: "Search by email or name", ru: "Поиск по email или имени", de: "Suche nach E-Mail oder Name", uk: "Пошук за email або ім'ям", fr: "Rechercher par e-mail ou nom", pl: "Szukaj po e-mailu lub nazwie" },
  dtc_no_match: { en: "No users found.", ru: "Пользователи не найдены.", de: "Keine Nutzer gefunden.", uk: "Користувачів не знайдено.", fr: "Aucun utilisateur trouvé.", pl: "Nie znaleziono użytkowników." },
  dtc_selected_user: { en: "Selected user", ru: "Выбранный пользователь", de: "Ausgewählter Nutzer", uk: "Вибраний користувач", fr: "Utilisateur sélectionné", pl: "Wybrany użytkownik" },
  dtc_reason_ph: { en: "Testing, Compensation, Promotion, Gift…", ru: "Тестирование, компенсация, промо, подарок…", de: "Test, Ausgleich, Promo, Geschenk…", uk: "Тестування, компенсація, промо, подарунок…", fr: "Test, compensation, promo, cadeau…", pl: "Test, rekompensata, promocja, prezent…" },
  dtc_reason_testing: { en: "Testing", ru: "Тестирование", de: "Test", uk: "Тестування", fr: "Test", pl: "Test" },
  dtc_reason_compensation: { en: "Compensation", ru: "Компенсация", de: "Ausgleich", uk: "Компенсація", fr: "Compensation", pl: "Rekompensata" },
  dtc_reason_promotion: { en: "Promotion", ru: "Промо", de: "Promotion", uk: "Промо", fr: "Promotion", pl: "Promocja" },
  dtc_reason_gift: { en: "Gift", ru: "Подарок", de: "Geschenk", uk: "Подарунок", fr: "Cadeau", pl: "Prezent" },
  dtc_reason_other: { en: "Other administrative bonus", ru: "Другой административный бонус", de: "Sonstiger Administrationsbonus", uk: "Інший адміністративний бонус", fr: "Autre bonus administratif", pl: "Inny bonus administracyjny" },
  dtc_confirm_title: { en: "Confirm bonus credits", ru: "Подтвердите начисление", de: "Bonus-Credits bestätigen", uk: "Підтвердіть нарахування", fr: "Confirmer les crédits bonus", pl: "Potwierdź kredyty bonusowe" },
  dtc_confirm_add: { en: "Add {n} Bonus Credits to {who}?", ru: "Начислить {n} бонусных кредитов пользователю {who}?", de: "{n} Bonus-Credits an {who} vergeben?", uk: "Нарахувати {n} бонусних кредитів користувачу {who}?", fr: "Ajouter {n} crédits bonus à {who} ?", pl: "Dodać {n} kredytów bonusowych dla {who}?" },
  dtc_confirm_remove: { en: "Remove {n} Bonus Credits from {who}?", ru: "Списать {n} бонусных кредитов у {who}?", de: "{n} Bonus-Credits von {who} abziehen?", uk: "Списати {n} бонусних кредитів у {who}?", fr: "Retirer {n} crédits bonus à {who} ?", pl: "Odjąć {n} kredytów bonusowych od {who}?" },
  dtc_confirm_reset: { en: "Reset bonus credit balance of {who} to 0?", ru: "Сбросить баланс бонусных кредитов {who} в 0?", de: "Bonus-Guthaben von {who} auf 0 setzen?", uk: "Скинути баланс бонусних кредитів {who} до 0?", fr: "Remettre à 0 le solde bonus de {who} ?", pl: "Wyzerować saldo bonusowe {who}?" },
  dtc_confirm_yes: { en: "Confirm", ru: "Подтвердить", de: "Bestätigen", uk: "Підтвердити", fr: "Confirmer", pl: "Potwierdź" },
  dtc_cancel: { en: "Cancel", ru: "Отмена", de: "Abbrechen", uk: "Скасувати", fr: "Annuler", pl: "Anuluj" },
};

export function useLocal(lang: Lang) {
  return (k: string): string => {
    const row = D[k];
    return row ? row[lang] ?? row.en : k;
  };
}
