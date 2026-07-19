import type { Lang } from "@/lib/i18n";

type Row = Record<Lang, string>;
const D: Record<string, Row> = {
  // Page shell
  title: { en: "Promotions and Promo Codes", ru: "Акции и промокоды", de: "Aktionen und Promo-Codes", uk: "Акції та промокоди", fr: "Promotions et codes promo", pl: "Promocje i kody promocyjne" },
  subtitle: {
    en: "Manage temporary discounts, bonuses and promotional campaigns.",
    ru: "Управляйте временными скидками, бонусами и промо-кампаниями.",
    de: "Verwalte temporäre Rabatte, Boni und Aktionen.",
    uk: "Керуйте тимчасовими знижками, бонусами та кампаніями.",
    fr: "Gérez les remises, bonus et campagnes temporaires.",
    pl: "Zarządzaj tymczasowymi rabatami, bonusami i kampaniami.",
  },
  demo_notice: {
    en: "Demonstration data only. Backend storage is not connected yet.",
    ru: "Только демонстрационные данные. Хранилище ещё не подключено.",
    de: "Nur Demo-Daten. Backend ist noch nicht angebunden.",
    uk: "Лише демонстраційні дані. Сховище ще не підключене.",
    fr: "Données de démonstration uniquement. Stockage non connecté.",
    pl: "Tylko dane demonstracyjne. Baza jeszcze nie podłączona.",
  },
  tab_promotions: { en: "Promotions", ru: "Акции", de: "Aktionen", uk: "Акції", fr: "Promotions", pl: "Promocje" },
  tab_codes: { en: "Promo Codes", ru: "Промокоды", de: "Promo-Codes", uk: "Промокоди", fr: "Codes promo", pl: "Kody promocyjne" },
  create_promotion: { en: "Create Promotion", ru: "Создать акцию", de: "Aktion erstellen", uk: "Створити акцію", fr: "Créer une promotion", pl: "Utwórz promocję" },
  create_code: { en: "Create Promo Code", ru: "Создать промокод", de: "Promo-Code erstellen", uk: "Створити промокод", fr: "Créer un code promo", pl: "Utwórz kod promocyjny" },

  // Common
  search: { en: "Search…", ru: "Поиск…", de: "Suchen…", uk: "Пошук…", fr: "Rechercher…", pl: "Szukaj…" },
  filter_all: { en: "All", ru: "Все", de: "Alle", uk: "Усі", fr: "Tous", pl: "Wszystkie" },
  sort_by: { en: "Sort by", ru: "Сортировать", de: "Sortieren", uk: "Сортувати", fr: "Trier", pl: "Sortuj" },
  save: { en: "Save", ru: "Сохранить", de: "Speichern", uk: "Зберегти", fr: "Enregistrer", pl: "Zapisz" },
  save_promo: { en: "Save Promotion", ru: "Сохранить акцию", de: "Aktion speichern", uk: "Зберегти акцію", fr: "Enregistrer la promotion", pl: "Zapisz promocję" },
  save_code: { en: "Save Promo Code", ru: "Сохранить промокод", de: "Promo-Code speichern", uk: "Зберегти промокод", fr: "Enregistrer le code promo", pl: "Zapisz kod" },
  cancel: { en: "Cancel", ru: "Отмена", de: "Abbrechen", uk: "Скасувати", fr: "Annuler", pl: "Anuluj" },
  edit: { en: "Edit", ru: "Изменить", de: "Bearbeiten", uk: "Редагувати", fr: "Modifier", pl: "Edytuj" },
  duplicate: { en: "Duplicate", ru: "Дублировать", de: "Duplizieren", uk: "Дублювати", fr: "Dupliquer", pl: "Duplikuj" },
  toggle: { en: "Enable / Disable", ru: "Вкл. / Выкл.", de: "Aktivieren / Deaktivieren", uk: "Увімкнути / Вимкнути", fr: "Activer / Désactiver", pl: "Włącz / Wyłącz" },
  preview: { en: "Preview", ru: "Превью", de: "Vorschau", uk: "Перегляд", fr: "Aperçu", pl: "Podgląd" },
  delete: { en: "Delete", ru: "Удалить", de: "Löschen", uk: "Видалити", fr: "Supprimer", pl: "Usuń" },
  unsaved_changes: { en: "Unsaved changes", ru: "Есть несохранённые изменения", de: "Nicht gespeicherte Änderungen", uk: "Є незбережені зміни", fr: "Modifications non enregistrées", pl: "Niezapisane zmiany" },
  unsaved_confirm: { en: "Discard unsaved changes?", ru: "Отменить несохранённые изменения?", de: "Änderungen verwerfen?", uk: "Скасувати незбережені зміни?", fr: "Abandonner les modifications ?", pl: "Odrzucić zmiany?" },
  empty: { en: "Nothing matches the current filters.", ru: "Ничего не найдено.", de: "Keine Einträge gefunden.", uk: "Нічого не знайдено.", fr: "Aucun résultat.", pl: "Brak wyników." },

  // Status
  st_draft: { en: "Draft", ru: "Черновик", de: "Entwurf", uk: "Чернетка", fr: "Brouillon", pl: "Szkic" },
  st_scheduled: { en: "Scheduled", ru: "Запланирован", de: "Geplant", uk: "Заплановано", fr: "Planifié", pl: "Zaplanowane" },
  st_active: { en: "Active", ru: "Активен", de: "Aktiv", uk: "Активний", fr: "Actif", pl: "Aktywny" },
  st_inactive: { en: "Inactive", ru: "Отключён", de: "Inaktiv", uk: "Неактивний", fr: "Inactif", pl: "Nieaktywny" },
  st_expired: { en: "Expired", ru: "Истёк", de: "Abgelaufen", uk: "Завершено", fr: "Expiré", pl: "Wygasłe" },

  // Promotion table
  col_name: { en: "Name", ru: "Название", de: "Name", uk: "Назва", fr: "Nom", pl: "Nazwa" },
  col_type: { en: "Type", ru: "Тип", de: "Typ", uk: "Тип", fr: "Type", pl: "Typ" },
  col_benefit: { en: "Benefit", ru: "Выгода", de: "Vorteil", uk: "Вигода", fr: "Avantage", pl: "Korzyść" },
  col_applies: { en: "Applies to", ru: "Применяется к", de: "Gilt für", uk: "Застосовується до", fr: "Cible", pl: "Dotyczy" },
  col_start: { en: "Start date", ru: "Начало", de: "Start", uk: "Початок", fr: "Début", pl: "Początek" },
  col_end: { en: "End date", ru: "Окончание", de: "Ende", uk: "Завершення", fr: "Fin", pl: "Koniec" },
  col_status: { en: "Status", ru: "Статус", de: "Status", uk: "Статус", fr: "Statut", pl: "Status" },
  col_usage: { en: "Usage", ru: "Использования", de: "Nutzung", uk: "Використання", fr: "Utilisation", pl: "Użycie" },
  col_last_edited: { en: "Last edited", ru: "Изменено", de: "Bearbeitet", uk: "Змінено", fr: "Modifié", pl: "Edytowano" },
  col_actions: { en: "Actions", ru: "Действия", de: "Aktionen", uk: "Дії", fr: "Actions", pl: "Akcje" },

  // Promo code table
  col_code: { en: "Code", ru: "Код", de: "Code", uk: "Код", fr: "Code", pl: "Kod" },
  col_description: { en: "Description", ru: "Описание", de: "Beschreibung", uk: "Опис", fr: "Description", pl: "Opis" },
  col_link: { en: "Linked promotion", ru: "Связанная акция", de: "Verknüpfte Aktion", uk: "Повʼязана акція", fr: "Promotion liée", pl: "Powiązana promocja" },
  col_limit: { en: "Usage limit", ru: "Лимит", de: "Limit", uk: "Ліміт", fr: "Limite", pl: "Limit" },
  col_expiration: { en: "Expiration", ru: "Срок действия", de: "Ablauf", uk: "Термін дії", fr: "Expiration", pl: "Wygaśnięcie" },

  filter_status: { en: "Status", ru: "Статус", de: "Status", uk: "Статус", fr: "Statut", pl: "Status" },
  filter_type: { en: "Type", ru: "Тип", de: "Typ", uk: "Тип", fr: "Type", pl: "Typ" },
  filter_target: { en: "Target", ru: "Цель", de: "Ziel", uk: "Ціль", fr: "Cible", pl: "Cel" },
  target_all: { en: "All packages", ru: "Все пакеты", de: "Alle Pakete", uk: "Усі пакети", fr: "Tous les packs", pl: "Wszystkie pakiety" },
  target_specific: { en: "Selected packages", ru: "Выбранные пакеты", de: "Ausgewählte Pakete", uk: "Обрані пакети", fr: "Packs sélectionnés", pl: "Wybrane pakiety" },

  usage_placeholder: { en: "0 / —", ru: "0 / —", de: "0 / —", uk: "0 / —", fr: "0 / —", pl: "0 / —" },

  // Promotion types
  type_percentage_discount: { en: "Percentage discount", ru: "Скидка в процентах", de: "Prozent-Rabatt", uk: "Знижка у %", fr: "Remise en %", pl: "Rabat procentowy" },
  type_fixed_discount: { en: "Fixed amount discount", ru: "Скидка фикс. суммой", de: "Fester Betragsrabatt", uk: "Знижка фікс. сумою", fr: "Remise montant fixe", pl: "Rabat kwotowy" },
  type_bonus_credits: { en: "Bonus credits", ru: "Бонусные кредиты", de: "Bonus-Kredits", uk: "Бонусні кредити", fr: "Crédits bonus", pl: "Bonusowe kredyty" },
  type_extra_credits_percentage: { en: "Extra credits (%)", ru: "Доп. кредиты (%)", de: "Extra-Kredits (%)", uk: "Дод. кредити (%)", fr: "Crédits supplémentaires (%)", pl: "Dodatkowe kredyty (%)" },
  type_first_purchase: { en: "First purchase offer", ru: "Первая покупка", de: "Erstkauf-Angebot", uk: "Перша покупка", fr: "Offre première achat", pl: "Oferta 1. zakupu" },
  type_package_specific: { en: "Package-specific", ru: "Для пакета", de: "Paket-spezifisch", uk: "Для пакета", fr: "Pack spécifique", pl: "Dla pakietu" },
  type_limited_time: { en: "Limited-time offer", ru: "Ограниченное время", de: "Zeitlich begrenzt", uk: "Обмежений час", fr: "Durée limitée", pl: "Ograniczona czasowo" },
  type_country_specific: { en: "Country-specific", ru: "По стране", de: "Länder-spezifisch", uk: "За країною", fr: "Par pays", pl: "Krajowa" },
  type_language_specific: { en: "Language-specific", ru: "По языку", de: "Sprach-spezifisch", uk: "За мовою", fr: "Par langue", pl: "Językowa" },
  type_seasonal: { en: "Seasonal campaign", ru: "Сезонная кампания", de: "Saison-Kampagne", uk: "Сезонна кампанія", fr: "Campagne saisonnière", pl: "Kampania sezonowa" },

  code_type_percentage: { en: "Percentage discount", ru: "Скидка в %", de: "Prozent-Rabatt", uk: "Знижка у %", fr: "Remise en %", pl: "Rabat %" },
  code_type_fixed: { en: "Fixed amount discount", ru: "Фикс. скидка", de: "Fester Rabatt", uk: "Фікс. знижка", fr: "Remise fixe", pl: "Rabat stały" },
  code_type_bonus_credits: { en: "Bonus credits", ru: "Бонусные кредиты", de: "Bonus-Kredits", uk: "Бонусні кредити", fr: "Crédits bonus", pl: "Bonus kredytów" },
  code_type_combined: { en: "Combined benefit", ru: "Комбинированная выгода", de: "Kombinierter Vorteil", uk: "Комбінована вигода", fr: "Avantage combiné", pl: "Korzyść łączona" },

  // Sections
  sec_basic: { en: "Basic information", ru: "Основная информация", de: "Grundinformationen", uk: "Основна інформація", fr: "Informations de base", pl: "Podstawowe informacje" },
  sec_settings: { en: "Promotion settings", ru: "Настройки акции", de: "Aktionseinstellungen", uk: "Налаштування акції", fr: "Paramètres de la promotion", pl: "Ustawienia promocji" },
  sec_targeting: { en: "Targeting", ru: "Таргетинг", de: "Zielgruppe", uk: "Таргетинг", fr: "Ciblage", pl: "Kierowanie" },
  sec_period: { en: "Active period", ru: "Период активности", de: "Aktivzeitraum", uk: "Період активності", fr: "Période active", pl: "Okres aktywności" },

  // Fields
  fld_internal_id: { en: "Internal ID", ru: "Внутренний ID", de: "Interne ID", uk: "Внутрішній ID", fr: "ID interne", pl: "ID wewn." },
  fld_name: { en: "Promotion name", ru: "Название акции", de: "Aktionsname", uk: "Назва акції", fr: "Nom de la promotion", pl: "Nazwa promocji" },
  fld_customer_title: { en: "Customer-facing title", ru: "Заголовок для клиента", de: "Kundentitel", uk: "Заголовок для клієнта", fr: "Titre client", pl: "Tytuł dla klienta" },
  fld_customer_desc: { en: "Short customer description", ru: "Короткое описание для клиента", de: "Kurzbeschreibung", uk: "Короткий опис для клієнта", fr: "Description client courte", pl: "Krótki opis dla klienta" },
  fld_internal_notes: { en: "Internal notes", ru: "Внутренние заметки", de: "Interne Notizen", uk: "Внутрішні нотатки", fr: "Notes internes", pl: "Notatki wewn." },
  fld_type: { en: "Promotion type", ru: "Тип акции", de: "Aktionsart", uk: "Тип акції", fr: "Type de promotion", pl: "Typ promocji" },
  fld_percentage: { en: "Percentage discount (%)", ru: "Процент скидки (%)", de: "Rabatt in %", uk: "Знижка у %", fr: "Remise (%)", pl: "Rabat (%)" },
  fld_fixed: { en: "Fixed discount amount", ru: "Фикс. сумма скидки", de: "Fester Rabatt", uk: "Фікс. сума знижки", fr: "Remise fixe", pl: "Kwota rabatu" },
  fld_bonus_credits: { en: "Fixed bonus credits", ru: "Бонусные кредиты", de: "Bonus-Kredits", uk: "Бонусні кредити", fr: "Crédits bonus", pl: "Bonus kredytów" },
  fld_bonus_percent: { en: "Bonus credits (%)", ru: "Бонусные кредиты (%)", de: "Bonus-Kredits (%)", uk: "Бонусні кредити (%)", fr: "Crédits bonus (%)", pl: "Bonus kredytów (%)" },
  fld_min_purchase: { en: "Minimum purchase amount", ru: "Мин. сумма покупки", de: "Mindestbetrag", uk: "Мін. сума покупки", fr: "Achat minimum", pl: "Min. wartość zakupu" },
  fld_max_discount: { en: "Maximum discount (optional)", ru: "Макс. скидка (опц.)", de: "Max. Rabatt (opt.)", uk: "Макс. знижка (опц.)", fr: "Remise max (opt.)", pl: "Max rabat (opc.)" },
  fld_apply_all_packages: { en: "Apply to all credit packages", ru: "Применить ко всем пакетам", de: "Für alle Pakete", uk: "Для всіх пакетів", fr: "Tous les packs", pl: "Wszystkie pakiety" },
  fld_apply_all_countries: { en: "Apply to all countries", ru: "Все страны", de: "Alle Länder", uk: "Усі країни", fr: "Tous les pays", pl: "Wszystkie kraje" },
  fld_apply_all_languages: { en: "Apply to all languages", ru: "Все языки", de: "Alle Sprachen", uk: "Усі мови", fr: "Toutes les langues", pl: "Wszystkie języki" },
  fld_first_purchase_only: { en: "First purchase only", ru: "Только первая покупка", de: "Nur Erstkauf", uk: "Тільки перша покупка", fr: "Premier achat uniquement", pl: "Tylko pierwszy zakup" },
  fld_one_per_user: { en: "One use per user", ru: "Одно использование на пользователя", de: "Einmal pro Nutzer", uk: "Одне на користувача", fr: "Un usage par utilisateur", pl: "Raz na użytkownika" },
  fld_start: { en: "Start date", ru: "Дата начала", de: "Startdatum", uk: "Дата початку", fr: "Date de début", pl: "Data początku" },
  fld_end: { en: "End date", ru: "Дата окончания", de: "Enddatum", uk: "Дата завершення", fr: "Date de fin", pl: "Data zakończenia" },
  fld_no_end: { en: "No end date", ru: "Без даты окончания", de: "Kein Enddatum", uk: "Без дати завершення", fr: "Sans date de fin", pl: "Bez daty końca" },
  fld_status: { en: "Status", ru: "Статус", de: "Status", uk: "Статус", fr: "Statut", pl: "Status" },
  fld_active_toggle: { en: "Active", ru: "Активно", de: "Aktiv", uk: "Активно", fr: "Actif", pl: "Aktywne" },

  // Promo code fields
  fld_promo_code: { en: "Promo code", ru: "Промокод", de: "Promo-Code", uk: "Промокод", fr: "Code promo", pl: "Kod promocyjny" },
  fld_promo_desc: { en: "Internal description", ru: "Внутреннее описание", de: "Interne Beschreibung", uk: "Внутрішній опис", fr: "Description interne", pl: "Opis wewnętrzny" },
  fld_promo_message: { en: "Customer message", ru: "Сообщение для клиента", de: "Kundennachricht", uk: "Повідомлення клієнту", fr: "Message client", pl: "Wiadomość dla klienta" },
  fld_discount_type: { en: "Discount type", ru: "Тип скидки", de: "Rabattart", uk: "Тип знижки", fr: "Type de remise", pl: "Typ rabatu" },
  fld_discount_value: { en: "Discount value", ru: "Размер скидки", de: "Rabattwert", uk: "Розмір знижки", fr: "Valeur", pl: "Wartość rabatu" },
  fld_linked_promo: { en: "Optional linked promotion", ru: "Связанная акция (опц.)", de: "Verknüpfte Aktion (opt.)", uk: "Повʼязана акція (опц.)", fr: "Promotion liée (opt.)", pl: "Powiązana promocja (opc.)" },
  fld_usage_limit: { en: "Usage limit (0 = unlimited)", ru: "Лимит (0 = без лимита)", de: "Nutzungslimit (0 = unbegrenzt)", uk: "Ліміт (0 = без ліміту)", fr: "Limite (0 = illimité)", pl: "Limit (0 = brak)" },
  fld_expiration: { en: "Expiration date", ru: "Дата истечения", de: "Ablaufdatum", uk: "Дата завершення", fr: "Date d’expiration", pl: "Data wygaśnięcia" },
  fld_none: { en: "None", ru: "Нет", de: "Keine", uk: "Немає", fr: "Aucun", pl: "Brak" },

  // Countries / languages picker
  countries: { en: "Countries", ru: "Страны", de: "Länder", uk: "Країни", fr: "Pays", pl: "Kraje" },
  languages: { en: "Languages", ru: "Языки", de: "Sprachen", uk: "Мови", fr: "Langues", pl: "Języki" },
  packages: { en: "Credit packages", ru: "Пакеты кредитов", de: "Kreditpakete", uk: "Пакети кредитів", fr: "Packs de crédits", pl: "Pakiety kredytów" },

  // Errors
  err_name_required: { en: "Promotion name is required.", ru: "Название обязательно.", de: "Aktionsname erforderlich.", uk: "Назва обовʼязкова.", fr: "Nom requis.", pl: "Nazwa wymagana." },
  err_id_required: { en: "Internal ID is required.", ru: "Внутренний ID обязателен.", de: "Interne ID erforderlich.", uk: "Внутрішній ID обовʼязковий.", fr: "ID interne requis.", pl: "ID wewn. wymagane." },
  err_id_unique: { en: "Internal ID must be unique.", ru: "Внутренний ID должен быть уникальным.", de: "Interne ID muss eindeutig sein.", uk: "Внутрішній ID має бути унікальним.", fr: "L’ID interne doit être unique.", pl: "ID wewn. musi być unikalne." },
  err_pct_range: { en: "Value must be between 0 and 100.", ru: "Значение должно быть от 0 до 100.", de: "Wert zwischen 0 und 100.", uk: "Значення від 0 до 100.", fr: "Valeur entre 0 et 100.", pl: "Wartość między 0 a 100." },
  err_negative: { en: "Value cannot be negative.", ru: "Значение не может быть отрицательным.", de: "Wert darf nicht negativ sein.", uk: "Значення не може бути відʼємним.", fr: "Valeur non négative.", pl: "Wartość nie może być ujemna." },
  err_end_before_start: { en: "End date cannot be earlier than start date.", ru: "Дата окончания не может быть раньше даты начала.", de: "Enddatum darf nicht vor Startdatum liegen.", uk: "Дата завершення не може бути раніше дати початку.", fr: "Date de fin après la date de début.", pl: "Data końca po dacie początku." },
  err_packages_required: { en: "Select at least one package.", ru: "Выберите хотя бы один пакет.", de: "Mindestens ein Paket wählen.", uk: "Виберіть хоча б один пакет.", fr: "Sélectionnez au moins un pack.", pl: "Wybierz co najmniej jeden pakiet." },
  err_country_required: { en: "Select at least one country.", ru: "Выберите хотя бы одну страну.", de: "Mindestens ein Land wählen.", uk: "Виберіть хоча б одну країну.", fr: "Sélectionnez au moins un pays.", pl: "Wybierz co najmniej jeden kraj." },
  err_language_required: { en: "Select at least one language.", ru: "Выберите хотя бы один язык.", de: "Mindestens eine Sprache wählen.", uk: "Виберіть хоча б одну мову.", fr: "Sélectionnez au moins une langue.", pl: "Wybierz co najmniej jeden język." },
  err_expired_active: { en: "Expired items cannot remain active.", ru: "Истёкшие элементы не могут оставаться активными.", de: "Abgelaufene Einträge können nicht aktiv bleiben.", uk: "Завершені елементи не можуть залишатись активними.", fr: "Les éléments expirés ne peuvent pas rester actifs.", pl: "Wygasłe elementy nie mogą pozostać aktywne." },
  err_code_required: { en: "Promo code is required.", ru: "Промокод обязателен.", de: "Promo-Code erforderlich.", uk: "Промокод обовʼязковий.", fr: "Code requis.", pl: "Kod wymagany." },
  err_code_spaces: { en: "Promo code cannot contain spaces.", ru: "Промокод не может содержать пробелы.", de: "Promo-Code darf keine Leerzeichen enthalten.", uk: "Промокод не може містити пробіли.", fr: "Le code ne peut pas contenir d’espaces.", pl: "Kod nie może zawierać spacji." },
  err_code_unique: { en: "This promo code already exists.", ru: "Такой промокод уже существует.", de: "Promo-Code existiert bereits.", uk: "Такий промокод вже існує.", fr: "Ce code existe déjà.", pl: "Ten kod już istnieje." },

  // Warnings
  warn_title: { en: "Overlap warnings", ru: "Предупреждения о пересечениях", de: "Überschneidungswarnungen", uk: "Попередження про перетини", fr: "Avertissements de chevauchement", pl: "Ostrzeżenia o nakładaniu" },
  warn_same_package_period: { en: "Overlaps with active promotion “{a}” in the same period.", ru: "Пересекается с активной акцией «{a}» в тот же период.", de: "Überschneidet sich mit aktiver Aktion „{a}“ im selben Zeitraum.", uk: "Перетинається з активною акцією «{a}» у той самий період.", fr: "Chevauche la promotion active « {a} » sur la même période.", pl: "Nakłada się z aktywną promocją „{a}” w tym samym okresie." },
  warn_multiple_percentage: { en: "Multiple percentage discounts may combine with “{a}”.", ru: "Возможно суммирование процентных скидок с «{a}».", de: "Mehrere Prozent-Rabatte könnten sich mit „{a}“ kombinieren.", uk: "Можливе поєднання відсоткових знижок з «{a}».", fr: "Cumul possible avec « {a} ».", pl: "Możliwe łączenie z „{a}”." },
  warn_package_and_code: { en: "May combine with promo code / promotion “{a}”.", ru: "Может сочетаться с промокодом / акцией «{a}».", de: "Kann mit Promo-Code / Aktion „{a}“ kombiniert werden.", uk: "Може комбінуватися з промокодом / акцією «{a}».", fr: "Peut se combiner avec « {a} ».", pl: "Może się łączyć z „{a}”." },
  warn_large_total_discount: { en: "Total discount is unusually large ({a}).", ru: "Итоговая скидка необычно велика ({a}).", de: "Gesamtrabatt ist ungewöhnlich hoch ({a}).", uk: "Загальна знижка незвично велика ({a}).", fr: "Remise totale inhabituelle ({a}).", pl: "Nietypowo duży rabat całkowity ({a})." },
  warn_below_min_margin: { en: "Estimated margin ({a}) may fall below the Economy minimum.", ru: "Оценка маржи ({a}) может быть ниже минимальной в Economy.", de: "Geschätzte Marge ({a}) unter Economy-Minimum.", uk: "Оцінка маржі ({a}) може бути нижчою за мінімум в Economy.", fr: "Marge estimée ({a}) sous le minimum Economy.", pl: "Szac. marża ({a}) poniżej min. Economy." },
  confirm_dangerous_title: { en: "Save despite warnings?", ru: "Сохранить несмотря на предупреждения?", de: "Trotz Warnungen speichern?", uk: "Зберегти попри попередження?", fr: "Enregistrer malgré les avertissements ?", pl: "Zapisać mimo ostrzeżeń?" },
  confirm_dangerous_body: { en: "One or more critical warnings were raised. Review them before saving.", ru: "Есть критические предупреждения. Проверьте их перед сохранением.", de: "Es liegen kritische Warnungen vor. Bitte prüfen.", uk: "Є критичні попередження. Перевірте перед збереженням.", fr: "Des avertissements critiques ont été détectés.", pl: "Wykryto krytyczne ostrzeżenia." },

  // Preview
  preview_title: { en: "Customer benefit preview", ru: "Превью выгоды клиента", de: "Vorschau Kundenvorteil", uk: "Превʼю вигоди клієнта", fr: "Aperçu de l’avantage", pl: "Podgląd korzyści" },
  preview_internal: { en: "Internal demonstration preview.", ru: "Внутреннее демо-превью.", de: "Interne Demo-Vorschau.", uk: "Внутрішнє демо-превʼю.", fr: "Aperçu de démonstration interne.", pl: "Wewnętrzny podgląd demonstracyjny." },
  preview_original: { en: "Original price (demo package)", ru: "Исходная цена (демо-пакет)", de: "Ursprungspreis (Demo)", uk: "Початкова ціна (демо)", fr: "Prix d’origine (démo)", pl: "Cena pierwotna (demo)" },
  preview_final: { en: "Final payment", ru: "Итоговая оплата", de: "Endzahlung", uk: "Підсумкова оплата", fr: "Paiement final", pl: "Płatność końcowa" },
  preview_credits: { en: "Credits received", ru: "Полученные кредиты", de: "Erhaltene Kredits", uk: "Отримані кредити", fr: "Crédits reçus", pl: "Otrzymane kredyty" },
  preview_savings: { en: "Savings", ru: "Экономия", de: "Ersparnis", uk: "Економія", fr: "Économie", pl: "Oszczędność" },
  preview_savings_pct: { en: "Savings percent", ru: "Экономия %", de: "Ersparnis %", uk: "Економія %", fr: "Économie %", pl: "Oszczędność %" },
  preview_applicable: { en: "Applicable packages", ru: "Применимые пакеты", de: "Anwendbare Pakete", uk: "Застосовні пакети", fr: "Packs applicables", pl: "Zastosowane pakiety" },
  preview_period: { en: "Active period", ru: "Период активности", de: "Aktivzeitraum", uk: "Період активності", fr: "Période active", pl: "Okres aktywności" },
  preview_all_packages: { en: "All packages", ru: "Все пакеты", de: "Alle Pakete", uk: "Усі пакети", fr: "Tous les packs", pl: "Wszystkie pakiety" },

  // Delete
  confirm_delete_promo_title: { en: "Delete promotion?", ru: "Удалить акцию?", de: "Aktion löschen?", uk: "Видалити акцію?", fr: "Supprimer la promotion ?", pl: "Usunąć promocję?" },
  confirm_delete_code_title: { en: "Delete promo code?", ru: "Удалить промокод?", de: "Promo-Code löschen?", uk: "Видалити промокод?", fr: "Supprimer le code promo ?", pl: "Usunąć kod?" },
  keep: { en: "Keep", ru: "Оставить", de: "Behalten", uk: "Залишити", fr: "Conserver", pl: "Zachowaj" },
};

export function useLocalPromo(lang: Lang) {
  return (k: string, subs?: Record<string, string>): string => {
    const row = D[k];
    let v = row ? row[lang] ?? row.en : k;
    if (subs) for (const [key, val] of Object.entries(subs)) v = v.replaceAll(`{${key}}`, val);
    return v;
  };
}

export type LocalPromo = ReturnType<typeof useLocalPromo>;