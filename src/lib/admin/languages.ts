// ---------------------------------------------------------------------------
// Project Joy — Admin Language & Translation Management
// Frontend-only demonstration data. No backend / external services.
// ---------------------------------------------------------------------------

import type { Lang } from "@/lib/i18n";

export type LangCode = Lang;
export const ALL_LANGS: LangCode[] = ["en", "de", "ru", "uk", "fr", "pl"];

export type LanguageStatus = "active" | "inactive" | "in_progress" | "maintenance";
export type TextDirection = "ltr" | "rtl";

export interface LanguageRecord {
  code: LangCode;
  locale: string;
  shortCode: string;
  name: string;
  nativeName: string;
  flag: string;
  direction: TextDirection;
  status: LanguageStatus;
  isDefault: boolean;
  fallback: LangCode;
  availableWebsite: boolean;
  availableStudio: boolean;
  availableNotifications: boolean;
  availableAdmin: boolean;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  currencyFormat: string;
  decimalSeparator: string;
  thousandsSeparator: string;
  firstDayOfWeek: 0 | 1;
  lastUpdated: string;
  updatedBy: string;
  protected: boolean;
  coveragePercent: number;
}

export const DEMO_LANGUAGES: LanguageRecord[] = [
  { code: "en", locale: "en-US", shortCode: "EN", name: "English", nativeName: "English",
    flag: "🇬🇧", direction: "ltr", status: "active", isDefault: true, fallback: "en",
    availableWebsite: true, availableStudio: true, availableNotifications: true, availableAdmin: true,
    dateFormat: "MM/DD/YYYY", timeFormat: "hh:mm A", numberFormat: "1,234.56",
    currencyFormat: "$1,234.56", decimalSeparator: ".", thousandsSeparator: ",",
    firstDayOfWeek: 0, lastUpdated: "2026-06-01T09:12:00Z", updatedBy: "System",
    protected: true, coveragePercent: 100 },
  { code: "de", locale: "de-DE", shortCode: "DE", name: "German", nativeName: "Deutsch",
    flag: "🇩🇪", direction: "ltr", status: "active", isDefault: false, fallback: "en",
    availableWebsite: true, availableStudio: true, availableNotifications: true, availableAdmin: true,
    dateFormat: "DD.MM.YYYY", timeFormat: "HH:mm", numberFormat: "1.234,56",
    currencyFormat: "1.234,56 €", decimalSeparator: ",", thousandsSeparator: ".",
    firstDayOfWeek: 1, lastUpdated: "2026-06-04T12:20:00Z", updatedBy: "Admin",
    protected: true, coveragePercent: 92 },
  { code: "ru", locale: "ru-RU", shortCode: "RU", name: "Russian", nativeName: "Русский",
    flag: "🇷🇺", direction: "ltr", status: "active", isDefault: false, fallback: "en",
    availableWebsite: true, availableStudio: true, availableNotifications: true, availableAdmin: true,
    dateFormat: "DD.MM.YYYY", timeFormat: "HH:mm", numberFormat: "1 234,56",
    currencyFormat: "1 234,56 ₽", decimalSeparator: ",", thousandsSeparator: " ",
    firstDayOfWeek: 1, lastUpdated: "2026-06-05T15:00:00Z", updatedBy: "Admin",
    protected: true, coveragePercent: 95 },
  { code: "uk", locale: "uk-UA", shortCode: "UK", name: "Ukrainian", nativeName: "Українська",
    flag: "🇺🇦", direction: "ltr", status: "active", isDefault: false, fallback: "en",
    availableWebsite: true, availableStudio: true, availableNotifications: true, availableAdmin: true,
    dateFormat: "DD.MM.YYYY", timeFormat: "HH:mm", numberFormat: "1 234,56",
    currencyFormat: "1 234,56 ₴", decimalSeparator: ",", thousandsSeparator: " ",
    firstDayOfWeek: 1, lastUpdated: "2026-06-02T10:00:00Z", updatedBy: "Admin",
    protected: true, coveragePercent: 89 },
  { code: "fr", locale: "fr-FR", shortCode: "FR", name: "French", nativeName: "Français",
    flag: "🇫🇷", direction: "ltr", status: "in_progress", isDefault: false, fallback: "en",
    availableWebsite: true, availableStudio: true, availableNotifications: true, availableAdmin: true,
    dateFormat: "DD/MM/YYYY", timeFormat: "HH:mm", numberFormat: "1 234,56",
    currencyFormat: "1 234,56 €", decimalSeparator: ",", thousandsSeparator: " ",
    firstDayOfWeek: 1, lastUpdated: "2026-05-30T09:30:00Z", updatedBy: "Admin",
    protected: true, coveragePercent: 84 },
  { code: "pl", locale: "pl-PL", shortCode: "PL", name: "Polish", nativeName: "Polski",
    flag: "🇵🇱", direction: "ltr", status: "in_progress", isDefault: false, fallback: "en",
    availableWebsite: true, availableStudio: true, availableNotifications: true, availableAdmin: true,
    dateFormat: "DD.MM.YYYY", timeFormat: "HH:mm", numberFormat: "1 234,56",
    currencyFormat: "1 234,56 zł", decimalSeparator: ",", thousandsSeparator: " ",
    firstDayOfWeek: 1, lastUpdated: "2026-05-29T14:00:00Z", updatedBy: "Admin",
    protected: true, coveragePercent: 81 },
];

export type TranslationStatus = "complete" | "missing" | "outdated" | "needs_review" | "approved";

export type TranslationSection =
  | "global_nav" | "home" | "catalog" | "studio" | "pricing" | "calendar"
  | "auth" | "account" | "orders" | "credits" | "subscriptions" | "promotions"
  | "notifications" | "admin" | "validation" | "errors" | "legal" | "email_sms"
  | "system";

export const SECTIONS: TranslationSection[] = [
  "global_nav", "home", "catalog", "studio", "pricing", "calendar",
  "auth", "account", "orders", "credits", "subscriptions", "promotions",
  "notifications", "admin", "validation", "errors", "legal", "email_sms", "system",
];

export interface InterfaceTranslation {
  id: string;
  key: string;
  section: TranslationSection;
  source: string;
  previousSource?: string;
  context?: string;
  values: Partial<Record<LangCode, string>>;
  statuses: Partial<Record<LangCode, TranslationStatus>>;
  lastUpdated: string;
  updatedBy: string;
  notes?: string;
}

export function extractPlaceholders(src: string): string[] {
  const out = new Set<string>();
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.add(m[1]);
  return [...out];
}

export function placeholderDiff(source: string, translation: string) {
  const src = new Set(extractPlaceholders(source));
  const tr = new Set(extractPlaceholders(translation));
  const missing = [...src].filter((p) => !tr.has(p));
  const unknown = [...tr].filter((p) => !src.has(p));
  return { missing, unknown };
}

const NOW = "2026-06-06T12:00:00Z";

function mk(
  key: string, section: TranslationSection, source: string,
  values: Partial<Record<LangCode, string>>, opts: Partial<InterfaceTranslation> = {},
): InterfaceTranslation {
  const statuses: Partial<Record<LangCode, TranslationStatus>> = {};
  for (const c of ALL_LANGS) {
    if (c === "en") { statuses[c] = "approved"; continue; }
    const v = values[c];
    if (!v || !v.trim()) statuses[c] = "missing";
    else statuses[c] = c === "de" || c === "ru" ? "approved" : "complete";
  }
  return {
    id: "t_" + key,
    key, section, source, values: { en: source, ...values }, statuses,
    lastUpdated: NOW, updatedBy: "Admin", ...opts,
  };
}

export const DEMO_INTERFACE_TRANSLATIONS: InterfaceTranslation[] = [
  mk("nav.home", "global_nav", "Home",
    { de: "Startseite", ru: "Главная", uk: "Головна", fr: "Accueil", pl: "Start" }),
  mk("nav.catalog", "global_nav", "Catalog",
    { de: "Katalog", ru: "Каталог", uk: "Каталог", fr: "Catalogue", pl: "Katalog" }),
  mk("nav.studio", "global_nav", "Studio",
    { de: "Studio", ru: "Студия", uk: "Студія", fr: "Studio", pl: "Studio" }),
  mk("home.hero.title", "home", "Give more than greetings. Give emotions.",
    { de: "Mehr als Grüße. Emotionen.", ru: "Больше чем поздравления. Эмоции.",
      uk: "Більше ніж вітання. Емоції.", fr: "Plus que des vœux. Des émotions.",
      pl: "Więcej niż życzenia. Emocje." }),
  mk("home.cta.create", "home", "Create Greeting",
    { de: "Grußkarte erstellen", ru: "Создать поздравление", uk: "Створити вітання",
      fr: "Créer un vœu", pl: "Utwórz życzenia" }),
  mk("home.gift.title", "home", "Your first greeting is on us",
    { de: "Deine erste Grußkarte geht auf uns", ru: "Первое поздравление — в подарок",
      uk: "Перше вітання — у подарунок", fr: "Votre premier vœu est offert" },
    { previousSource: "First greeting free" }),
  mk("catalog.search.ph", "catalog", "Search greetings…",
    { de: "Grüße suchen…", ru: "Поиск поздравлений…", uk: "Пошук вітань…",
      fr: "Rechercher des vœux…", pl: "Szukaj życzeń…" }),
  mk("studio.step.gift", "studio", "Choose a Gift",
    { de: "Geschenk wählen", ru: "Выберите подарок", uk: "Оберіть подарунок",
      fr: "Choisir un cadeau" }),
  mk("studio.step.recipient", "studio", "Recipient, {{recipientName}}",
    { de: "Empfänger, {{recipientName}}", ru: "Получатель, {{recipientName}}",
      uk: "Отримувач, {{recipientName}}" }),
  mk("orders.status.in_queue", "orders", "In Queue, position #{{position}}",
    { de: "In der Warteschlange, Platz #{{position}}", ru: "В очереди, позиция #{{position}}",
      uk: "У черзі, позиція #{{position}}", fr: "En file, position #{{position}}",
      pl: "W kolejce, pozycja #{{position}}" }),
  mk("orders.status.ready", "orders", "Ready",
    { de: "Bereit", ru: "Готово", uk: "Готово", fr: "Prêt", pl: "Gotowe" }),
  mk("credits.balance", "credits", "Balance: {{credits}} credits",
    { de: "Guthaben: {{credits}} Credits", ru: "Баланс: {{credits}} кредитов",
      uk: "Баланс: {{credits}} кредитів", fr: "Solde : {{credits}} crédits",
      pl: "Saldo: {{credits}} kredytów" }),
  mk("subscriptions.monthly", "subscriptions", "Monthly",
    { de: "Monatlich", ru: "Ежемесячно", uk: "Щомісяця", fr: "Mensuel", pl: "Miesięcznie" }),
  mk("promotions.welcome", "promotions", "Welcome Offer",
    { de: "Willkommensangebot", ru: "Приветственное предложение", uk: "Вітальна пропозиція" }),
  mk("notifications.order.ready.subject", "notifications", "Hello {{customerName}}, your greeting is ready",
    { de: "Hallo {{customerName}}, deine Grußkarte ist bereit",
      ru: "Здравствуйте, {{customerName}}, ваше поздравление готово",
      uk: "Вітаємо, {{customerName}}, ваше вітання готове",
      fr: "Bonjour {{customerName}}, votre vœu est prêt" }),
  mk("validation.required", "validation", "This field is required",
    { de: "Dieses Feld ist erforderlich", ru: "Обязательное поле",
      uk: "Обов'язкове поле", fr: "Ce champ est requis", pl: "To pole jest wymagane" }),
  mk("validation.email", "validation", "Enter a valid email address",
    { de: "Bitte gültige E-Mail-Adresse eingeben", ru: "Введите корректный email",
      uk: "Введіть коректний email" }),
  mk("errors.generic", "errors", "Something went wrong. Please try again.",
    { de: "Etwas ist schiefgelaufen. Bitte erneut versuchen.",
      ru: "Что-то пошло не так. Попробуйте снова.",
      uk: "Щось пішло не так. Спробуйте знову.",
      fr: "Une erreur est survenue. Veuillez réessayer.",
      pl: "Coś poszło nie tak. Spróbuj ponownie." }),
  mk("legal.terms", "legal", "Terms of Service",
    { de: "Nutzungsbedingungen", ru: "Условия использования", uk: "Умови користування",
      fr: "Conditions d'utilisation", pl: "Warunki korzystania" }),
  mk("email_sms.footer", "email_sms", "Sent with warmth from Project Joy",
    { de: "Herzlich versendet von Project Joy", ru: "С теплом от Project Joy",
      uk: "З теплом від Project Joy" }),
  mk("admin.dashboard.title", "admin", "Admin Overview",
    { de: "Admin-Übersicht", ru: "Обзор администратора", uk: "Огляд адміністратора",
      fr: "Aperçu administrateur", pl: "Przegląd administratora" }),
  mk("system.maintenance", "system", "The platform is under maintenance",
    { de: "Die Plattform wird gewartet", ru: "Платформа на обслуживании" }),
];

DEMO_INTERFACE_TRANSLATIONS.forEach((t) => {
  if (t.previousSource) {
    for (const c of ALL_LANGS) if (c !== "en" && t.statuses[c]) t.statuses[c] = "outdated";
  }
});
DEMO_INTERFACE_TRANSLATIONS[6].statuses.fr = "needs_review";
DEMO_INTERFACE_TRANSLATIONS[11].statuses.pl = "needs_review";

export interface CatalogTranslationEntry {
  language: LangCode;
  title: string;
  shortDescription: string;
  longDescription: string;
  tags: string[];
  keywords: string[];
  status: TranslationStatus;
}

export interface CatalogTranslationItem {
  contentId: string;
  title: string;
  primaryLanguage: LangCode;
  translations: Partial<Record<LangCode, CatalogTranslationEntry>>;
}

export const DEMO_CATALOG_TRANSLATIONS: CatalogTranslationItem[] = [
  { contentId: "CAT-001", title: "Birthday Song — Warm Acoustic", primaryLanguage: "en",
    translations: {
      en: { language: "en", title: "Birthday Song — Warm Acoustic", shortDescription: "A cozy acoustic birthday song.", longDescription: "A hand-crafted acoustic song tailored for birthdays.", tags: ["birthday", "acoustic"], keywords: ["song", "birthday"], status: "approved" },
      de: { language: "de", title: "Geburtstagslied — Warm Akustisch", shortDescription: "Ein warmes akustisches Geburtstagslied.", longDescription: "Ein handgemachtes akustisches Lied zum Geburtstag.", tags: ["geburtstag", "akustisch"], keywords: ["lied"], status: "approved" },
      ru: { language: "ru", title: "Песня на день рождения — тёплая акустика", shortDescription: "Уютная акустическая песня.", longDescription: "Акустическая песня, созданная ко дню рождения.", tags: ["день рождения"], keywords: ["песня"], status: "approved" },
      uk: { language: "uk", title: "Пісня на день народження — тепла акустика", shortDescription: "Затишна акустична пісня.", longDescription: "Акустична пісня до дня народження.", tags: ["день народження"], keywords: ["пісня"], status: "complete" },
    } },
  { contentId: "CAT-002", title: "Wedding Video Montage", primaryLanguage: "en",
    translations: {
      en: { language: "en", title: "Wedding Video Montage", shortDescription: "Elegant montage for weddings.", longDescription: "A cinematic wedding montage in warm tones.", tags: ["wedding"], keywords: ["video"], status: "approved" },
      ru: { language: "ru", title: "Свадебный видеоклип", shortDescription: "Элегантный клип для свадьбы.", longDescription: "Кинематографичный свадебный клип.", tags: ["свадьба"], keywords: ["видео"], status: "complete" },
    } },
  { contentId: "CAT-003", title: "Fairy Tale for Children", primaryLanguage: "en",
    translations: {
      en: { language: "en", title: "Fairy Tale for Children", shortDescription: "A gentle bedtime tale.", longDescription: "A warm illustrated bedtime tale.", tags: ["children"], keywords: ["tale"], status: "approved" },
      de: { language: "de", title: "Märchen für Kinder", shortDescription: "Eine sanfte Gute-Nacht-Geschichte.", longDescription: "Ein warm illustriertes Märchen.", tags: ["kinder"], keywords: ["märchen"], status: "approved" },
      fr: { language: "fr", title: "Conte pour enfants", shortDescription: "Un conte du soir tout doux.", longDescription: "Un conte illustré et chaleureux.", tags: ["enfants"], keywords: ["conte"], status: "needs_review" },
    } },
];

export type NotifChannelKind = "email" | "sms" | "push" | "internal";

export interface NotificationTranslationFields {
  subject: string; preview: string; body: string; button: string; footer: string;
  smsShort: string; pushTitle: string; pushMessage: string; status: TranslationStatus;
}

export interface NotificationTemplateI18n {
  templateId: string;
  templateType: string;
  channel: NotifChannelKind;
  sourceLanguage: LangCode;
  translations: Partial<Record<LangCode, NotificationTranslationFields>>;
}

export const DEMO_NOTIF_TEMPLATE_I18N: NotificationTemplateI18n[] = [
  { templateId: "NT-001", templateType: "order_ready", channel: "email", sourceLanguage: "en",
    translations: {
      en: { subject: "Your greeting is ready, {{customerName}}", preview: "Order {{orderId}} — ready to enjoy.", body: "Hello {{customerName}}, your greeting for {{recipientName}} is ready.", button: "Open Greeting", footer: "Sent with warmth from Project Joy", smsShort: "Order {{orderId}} ready.", pushTitle: "Greeting ready", pushMessage: "Tap to open.", status: "approved" },
      de: { subject: "Deine Grußkarte ist bereit, {{customerName}}", preview: "Bestellung {{orderId}} — bereit.", body: "Hallo {{customerName}}, deine Grußkarte für {{recipientName}} ist bereit.", button: "Grußkarte öffnen", footer: "Herzlich versendet von Project Joy", smsShort: "Bestellung {{orderId}} bereit.", pushTitle: "Grußkarte bereit", pushMessage: "Zum Öffnen tippen.", status: "approved" },
      ru: { subject: "Ваше поздравление готово, {{customerName}}", preview: "Заказ {{orderId}} готов.", body: "Здравствуйте, {{customerName}}, поздравление для {{recipientName}} готово.", button: "Открыть поздравление", footer: "С теплом от Project Joy", smsShort: "Заказ {{orderId}} готов.", pushTitle: "Поздравление готово", pushMessage: "Нажмите, чтобы открыть.", status: "approved" },
    } },
  { templateId: "NT-002", templateType: "welcome", channel: "email", sourceLanguage: "en",
    translations: {
      en: { subject: "Welcome to Project Joy, {{customerName}}", preview: "Your first greeting is on us.", body: "Welcome, {{customerName}}!", button: "Start Creating", footer: "Project Joy Team", smsShort: "Welcome to Project Joy.", pushTitle: "Welcome", pushMessage: "Your first greeting is on us.", status: "approved" },
      fr: { subject: "Bienvenue chez Project Joy, {{customerName}}", preview: "Votre premier vœu est offert.", body: "Bienvenue, {{customerName}} !", button: "Commencer", footer: "L'équipe Project Joy", smsShort: "Bienvenue.", pushTitle: "Bienvenue", pushMessage: "Votre premier vœu est offert.", status: "needs_review" },
    } },
];

export type TermStatus = "approved" | "draft" | "archived";

export interface TermRecord {
  id: string; source: string; context: string;
  values: Partial<Record<LangCode, string>>; status: TermStatus;
}

export const DEMO_TERMS: TermRecord[] = [
  { id: "T-1", source: "Credit", context: "singular currency unit", values: { en: "Credit", de: "Credit", ru: "Кредит", uk: "Кредит", fr: "Crédit", pl: "Kredyt" }, status: "approved" },
  { id: "T-2", source: "Credits", context: "plural currency unit", values: { en: "Credits", de: "Credits", ru: "Кредиты", uk: "Кредити", fr: "Crédits", pl: "Kredyty" }, status: "approved" },
  { id: "T-3", source: "Greeting", context: "customer-facing product noun", values: { en: "Greeting", de: "Grußkarte", ru: "Поздравление", uk: "Вітання", fr: "Vœu", pl: "Życzenie" }, status: "approved" },
  { id: "T-4", source: "Greeting Card", context: "specific format", values: { en: "Greeting Card", de: "Grußkarte", ru: "Открытка", uk: "Листівка", fr: "Carte de vœux", pl: "Kartka" }, status: "approved" },
  { id: "T-5", source: "Order", context: "customer purchase", values: { en: "Order", de: "Bestellung", ru: "Заказ", uk: "Замовлення", fr: "Commande", pl: "Zamówienie" }, status: "approved" },
  { id: "T-6", source: "Subscription", context: "recurring plan", values: { en: "Subscription", de: "Abonnement", ru: "Подписка", uk: "Підписка", fr: "Abonnement", pl: "Subskrypcja" }, status: "approved" },
  { id: "T-7", source: "Monthly", context: "billing period", values: { en: "Monthly", de: "Monatlich", ru: "Ежемесячно", uk: "Щомісяця", fr: "Mensuel", pl: "Miesięcznie" }, status: "approved" },
  { id: "T-8", source: "Yearly", context: "billing period", values: { en: "Yearly", de: "Jährlich", ru: "Ежегодно", uk: "Щорічно", fr: "Annuel", pl: "Rocznie" }, status: "approved" },
  { id: "T-9", source: "Premium", context: "quality tier", values: { en: "Premium", de: "Premium", ru: "Премиум", uk: "Преміум", fr: "Premium", pl: "Premium" }, status: "approved" },
  { id: "T-10", source: "Recipient", context: "person receiving greeting", values: { en: "Recipient", de: "Empfänger", ru: "Получатель", uk: "Отримувач", fr: "Destinataire", pl: "Odbiorca" }, status: "approved" },
  { id: "T-11", source: "Occasion", context: "reason for greeting", values: { en: "Occasion", de: "Anlass", ru: "Повод", uk: "Привід", fr: "Occasion", pl: "Okazja" }, status: "approved" },
  { id: "T-12", source: "Approximate Time", context: "time estimate label", values: { en: "Approximate Time", de: "Ungefähre Zeit", ru: "Примерное время", uk: "Приблизний час", fr: "Temps approximatif", pl: "Przybliżony czas" }, status: "approved" },
  { id: "T-13", source: "In Queue", context: "order status", values: { en: "In Queue", de: "In der Warteschlange", ru: "В очереди", uk: "У черзі", fr: "En file", pl: "W kolejce" }, status: "approved" },
  { id: "T-14", source: "Ready", context: "order status", values: { en: "Ready", de: "Bereit", ru: "Готово", uk: "Готово", fr: "Prêt", pl: "Gotowe" }, status: "approved" },
  { id: "T-15", source: "Delivered", context: "order status", values: { en: "Delivered", de: "Zugestellt", ru: "Доставлено", uk: "Доставлено", fr: "Livré", pl: "Dostarczone" }, status: "approved" },
  { id: "T-16", source: "Create Greeting", context: "primary CTA", values: { en: "Create Greeting", de: "Grußkarte erstellen", ru: "Создать поздравление", uk: "Створити вітання", fr: "Créer un vœu", pl: "Utwórz życzenia" }, status: "approved" },
  { id: "T-17", source: "Buy Credits", context: "purchase CTA", values: { en: "Buy Credits", de: "Credits kaufen", ru: "Купить кредиты", uk: "Купити кредити", fr: "Acheter des crédits", pl: "Kup kredyty" }, status: "approved" },
];

export interface TranslationVersion {
  id: string; translationKey: string; language: LangCode;
  previousText: string; newText: string; date: string; admin: string;
  action: "created" | "edited" | "approved" | "reviewed" | "restored";
  status: TranslationStatus;
}

export const DEMO_HISTORY: TranslationVersion[] = [
  { id: "v1", translationKey: "home.hero.title", language: "de", previousText: "Mehr als Karten. Emotionen.", newText: "Mehr als Grüße. Emotionen.", date: "2026-06-01T10:00:00Z", admin: "Admin", action: "edited", status: "approved" },
  { id: "v2", translationKey: "home.gift.title", language: "ru", previousText: "Первая открытка бесплатно", newText: "Первое поздравление — в подарок", date: "2026-06-04T12:30:00Z", admin: "Admin", action: "approved", status: "approved" },
  { id: "v3", translationKey: "catalog.search.ph", language: "fr", previousText: "Chercher…", newText: "Rechercher des vœux…", date: "2026-06-05T08:15:00Z", admin: "Admin", action: "reviewed", status: "complete" },
  { id: "v4", translationKey: "orders.status.ready", language: "pl", previousText: "", newText: "Gotowe", date: "2026-05-30T14:00:00Z", admin: "Admin", action: "created", status: "complete" },
  { id: "v5", translationKey: "validation.email", language: "fr", previousText: "Email invalide", newText: "Entrez une adresse e-mail valide", date: "2026-06-02T09:45:00Z", admin: "Admin", action: "edited", status: "needs_review" },
];

export function coverageFor(items: InterfaceTranslation[], lang: LangCode) {
  let done = 0, missing = 0, outdated = 0, needsReview = 0;
  for (const it of items) {
    const s = it.statuses[lang];
    if (!s || s === "missing") missing++;
    else if (s === "outdated") outdated++;
    else if (s === "needs_review") needsReview++;
    else done++;
  }
  const total = items.length;
  return { total, done, missing, outdated, needsReview, percent: total ? Math.round((done / total) * 100) : 0 };
}

export const STATUS_TONE: Record<TranslationStatus, string> = {
  complete: "text-emerald-700 bg-emerald-500/10 border-emerald-500/30",
  approved: "text-emerald-800 bg-emerald-500/15 border-emerald-500/40",
  missing: "text-rose-700 bg-rose-500/10 border-rose-500/30",
  outdated: "text-amber-700 bg-amber-500/10 border-amber-500/30",
  needs_review: "text-sky-700 bg-sky-500/10 border-sky-500/30",
};

export const LANG_STATUS_TONE: Record<LanguageStatus, string> = {
  active: "text-emerald-700 bg-emerald-500/10 border-emerald-500/30",
  inactive: "text-muted-foreground bg-muted/40 border-border/60",
  in_progress: "text-amber-700 bg-amber-500/10 border-amber-500/30",
  maintenance: "text-sky-700 bg-sky-500/10 border-sky-500/30",
};
