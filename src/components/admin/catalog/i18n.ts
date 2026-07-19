import type { Lang } from "@/lib/i18n";

type Row = Record<Lang, string>;
const D: Record<string, Row> = {
  title: { en: "Catalog", ru: "Каталог", de: "Katalog", uk: "Каталог", fr: "Catalogue", pl: "Katalog" },
  subtitle: {
    en: "Manage all content available to customers.",
    ru: "Управляйте всем контентом, доступным клиентам.",
    de: "Verwalte alle Inhalte, die Kunden zur Verfügung stehen.",
    uk: "Керуйте всім контентом, доступним клієнтам.",
    fr: "Gérez tout le contenu accessible aux clients.",
    pl: "Zarządzaj całą treścią dostępną dla klientów.",
  },
  demo_notice: {
    en: "Demonstration data only. No storage or generation service is connected.",
    ru: "Только демонстрационные данные. Хранилище и генерация не подключены.",
    de: "Nur Demo-Daten. Kein Speicher- oder Erzeugungsdienst angebunden.",
    uk: "Лише демонстраційні дані. Сховище й генерація не підключені.",
    fr: "Données de démonstration. Aucun stockage ni service n'est connecté.",
    pl: "Tylko dane demonstracyjne. Brak podłączonego magazynu ani usługi.",
  },
  add_content: { en: "Add Content", ru: "Добавить контент", de: "Inhalt hinzufügen", uk: "Додати контент", fr: "Ajouter du contenu", pl: "Dodaj treść" },
  refresh: { en: "Refresh", ru: "Обновить", de: "Aktualisieren", uk: "Оновити", fr: "Actualiser", pl: "Odśwież" },

  search_placeholder: { en: "Search by title, ID or category…", ru: "Поиск по названию, ID или категории…", de: "Suche nach Titel, ID oder Kategorie…", uk: "Пошук за назвою, ID або категорією…", fr: "Rechercher titre, ID ou catégorie…", pl: "Szukaj po tytule, ID lub kategorii…" },
  filter_category: { en: "Category", ru: "Категория", de: "Kategorie", uk: "Категорія", fr: "Catégorie", pl: "Kategoria" },
  filter_language: { en: "Language", ru: "Язык", de: "Sprache", uk: "Мова", fr: "Langue", pl: "Język" },
  filter_status: { en: "Status", ru: "Статус", de: "Status", uk: "Статус", fr: "Statut", pl: "Status" },
  filter_type: { en: "Type", ru: "Тип", de: "Typ", uk: "Тип", fr: "Type", pl: "Typ" },
  filter_all: { en: "All", ru: "Все", de: "Alle", uk: "Усі", fr: "Tous", pl: "Wszystkie" },
  sort_by: { en: "Sort by", ru: "Сортировать", de: "Sortieren", uk: "Сортувати", fr: "Trier", pl: "Sortuj" },
  sort_title: { en: "Title (A–Z)", ru: "Название (А–Я)", de: "Titel (A–Z)", uk: "Назва (А–Я)", fr: "Titre (A–Z)", pl: "Tytuł (A–Z)" },
  sort_created: { en: "Newest first", ru: "Сначала новые", de: "Neueste zuerst", uk: "Спочатку нові", fr: "Plus récents", pl: "Najnowsze" },
  sort_credits: { en: "Credits (high to low)", ru: "Кредиты (по убыванию)", de: "Credits (absteigend)", uk: "Кредити (за спаданням)", fr: "Crédits (décroissant)", pl: "Kredyty (malejąco)" },

  col_id: { en: "Content ID", ru: "ID контента", de: "Inhalt-ID", uk: "ID контенту", fr: "ID contenu", pl: "ID treści" },
  col_preview: { en: "Preview", ru: "Превью", de: "Vorschau", uk: "Прев'ю", fr: "Aperçu", pl: "Podgląd" },
  col_title: { en: "Title", ru: "Название", de: "Titel", uk: "Назва", fr: "Titre", pl: "Tytuł" },
  col_category: { en: "Category", ru: "Категория", de: "Kategorie", uk: "Категорія", fr: "Catégorie", pl: "Kategoria" },
  col_type: { en: "Type", ru: "Тип", de: "Typ", uk: "Тип", fr: "Type", pl: "Typ" },
  col_language: { en: "Language", ru: "Язык", de: "Sprache", uk: "Мова", fr: "Langue", pl: "Język" },
  col_status: { en: "Status", ru: "Статус", de: "Status", uk: "Статус", fr: "Statut", pl: "Status" },
  col_credits: { en: "Credits", ru: "Кредиты", de: "Credits", uk: "Кредити", fr: "Crédits", pl: "Kredyty" },
  col_created: { en: "Created", ru: "Создано", de: "Erstellt", uk: "Створено", fr: "Créé", pl: "Utworzono" },
  col_actions: { en: "Actions", ru: "Действия", de: "Aktionen", uk: "Дії", fr: "Actions", pl: "Akcje" },

  act_view: { en: "View", ru: "Просмотр", de: "Ansehen", uk: "Перегляд", fr: "Voir", pl: "Podgląd" },
  act_edit: { en: "Edit", ru: "Редактировать", de: "Bearbeiten", uk: "Редагувати", fr: "Modifier", pl: "Edytuj" },
  act_duplicate: { en: "Duplicate", ru: "Дублировать", de: "Duplizieren", uk: "Дублювати", fr: "Dupliquer", pl: "Duplikuj" },
  act_archive: { en: "Archive", ru: "В архив", de: "Archivieren", uk: "В архів", fr: "Archiver", pl: "Archiwizuj" },
  act_delete: { en: "Delete", ru: "Удалить", de: "Löschen", uk: "Видалити", fr: "Supprimer", pl: "Usuń" },
  act_save: { en: "Save", ru: "Сохранить", de: "Speichern", uk: "Зберегти", fr: "Enregistrer", pl: "Zapisz" },
  act_cancel: { en: "Cancel", ru: "Отмена", de: "Abbrechen", uk: "Скасувати", fr: "Annuler", pl: "Anuluj" },
  act_close: { en: "Close", ru: "Закрыть", de: "Schließen", uk: "Закрити", fr: "Fermer", pl: "Zamknij" },

  view_title: { en: "Content Details", ru: "Детали контента", de: "Inhaltsdetails", uk: "Деталі контенту", fr: "Détails du contenu", pl: "Szczegóły treści" },
  edit_title: { en: "Edit Content", ru: "Редактировать контент", de: "Inhalt bearbeiten", uk: "Редагувати контент", fr: "Modifier le contenu", pl: "Edytuj treść" },
  new_title: { en: "New Content", ru: "Новый контент", de: "Neuer Inhalt", uk: "Новий контент", fr: "Nouveau contenu", pl: "Nowa treść" },
  delete_title: { en: "Delete content?", ru: "Удалить контент?", de: "Inhalt löschen?", uk: "Видалити контент?", fr: "Supprimer le contenu ?", pl: "Usunąć treść?" },
  delete_body: { en: "This action cannot be undone.", ru: "Это действие нельзя отменить.", de: "Diese Aktion kann nicht rückgängig gemacht werden.", uk: "Цю дію не можна скасувати.", fr: "Cette action est irréversible.", pl: "Tej akcji nie można cofnąć." },

  f_title: { en: "Title", ru: "Название", de: "Titel", uk: "Назва", fr: "Titre", pl: "Tytuł" },
  f_internal_name: { en: "Internal Name", ru: "Внутреннее имя", de: "Interner Name", uk: "Внутрішня назва", fr: "Nom interne", pl: "Nazwa wewnętrzna" },
  f_description: { en: "Description", ru: "Описание", de: "Beschreibung", uk: "Опис", fr: "Description", pl: "Opis" },
  f_category: { en: "Category", ru: "Категория", de: "Kategorie", uk: "Категорія", fr: "Catégorie", pl: "Kategoria" },
  f_type: { en: "Content Type", ru: "Тип контента", de: "Inhaltstyp", uk: "Тип контенту", fr: "Type de contenu", pl: "Typ treści" },
  f_language: { en: "Language", ru: "Язык", de: "Sprache", uk: "Мова", fr: "Langue", pl: "Język" },
  f_status: { en: "Status", ru: "Статус", de: "Status", uk: "Статус", fr: "Statut", pl: "Status" },
  f_credits: { en: "Credits Required", ru: "Требуется кредитов", de: "Benötigte Credits", uk: "Потрібно кредитів", fr: "Crédits requis", pl: "Wymagane kredyty" },
  f_preview: { en: "Preview Image", ru: "Превью", de: "Vorschaubild", uk: "Прев'ю", fr: "Aperçu", pl: "Podgląd" },
  f_tags: { en: "Tags", ru: "Теги", de: "Tags", uk: "Теги", fr: "Étiquettes", pl: "Tagi" },
  f_tags_ph: { en: "Comma-separated tags", ru: "Теги через запятую", de: "Tags mit Komma trennen", uk: "Теги через кому", fr: "Tags séparés par une virgule", pl: "Tagi oddzielone przecinkiem" },
  f_internal_notes: { en: "Internal Notes", ru: "Внутренние заметки", de: "Interne Notizen", uk: "Внутрішні нотатки", fr: "Notes internes", pl: "Notatki wewnętrzne" },

  // Types
  type_card: { en: "Greeting Card", ru: "Открытка", de: "Grußkarte", uk: "Листівка", fr: "Carte de vœux", pl: "Kartka" },
  type_animated: { en: "Animated Greeting", ru: "Анимированное поздравление", de: "Animierter Gruß", uk: "Анімоване вітання", fr: "Vœu animé", pl: "Animowane życzenia" },
  type_song: { en: "Song", ru: "Песня", de: "Lied", uk: "Пісня", fr: "Chanson", pl: "Piosenka" },
  "type_video-clip": { en: "Video Clip", ru: "Видеоклип", de: "Videoclip", uk: "Відеокліп", fr: "Clip vidéo", pl: "Klip wideo" },
  type_cartoon: { en: "Cartoon", ru: "Мультфильм", de: "Zeichentrickfilm", uk: "Мультфільм", fr: "Dessin animé", pl: "Kreskówka" },
  type_premium: { en: "Premium Content", ru: "Премиум-контент", de: "Premium-Inhalt", uk: "Преміум-контент", fr: "Contenu Premium", pl: "Treść Premium" },
  type_template: { en: "Template", ru: "Шаблон", de: "Vorlage", uk: "Шаблон", fr: "Modèle", pl: "Szablon" },

  // Categories
  cat_birthday: { en: "Birthday", ru: "День рождения", de: "Geburtstag", uk: "День народження", fr: "Anniversaire", pl: "Urodziny" },
  cat_wedding: { en: "Wedding", ru: "Свадьба", de: "Hochzeit", uk: "Весілля", fr: "Mariage", pl: "Ślub" },
  cat_anniversary: { en: "Anniversary", ru: "Годовщина", de: "Jubiläum", uk: "Річниця", fr: "Anniversaire (couple)", pl: "Rocznica" },
  cat_good_morning: { en: "Good Morning", ru: "Доброе утро", de: "Guten Morgen", uk: "Доброго ранку", fr: "Bon matin", pl: "Dzień dobry" },
  cat_good_night: { en: "Good Night", ru: "Спокойной ночи", de: "Gute Nacht", uk: "Надобраніч", fr: "Bonne nuit", pl: "Dobranoc" },
  cat_love: { en: "Love", ru: "Любовь", de: "Liebe", uk: "Кохання", fr: "Amour", pl: "Miłość" },
  cat_friendship: { en: "Friendship", ru: "Дружба", de: "Freundschaft", uk: "Дружба", fr: "Amitié", pl: "Przyjaźń" },
  cat_apology: { en: "Apology", ru: "Извинения", de: "Entschuldigung", uk: "Вибачення", fr: "Excuses", pl: "Przeprosiny" },
  cat_congratulations: { en: "Congratulations", ru: "Поздравления", de: "Glückwünsche", uk: "Вітання", fr: "Félicitations", pl: "Gratulacje" },
  cat_religious: { en: "Religious", ru: "Религиозные", de: "Religiös", uk: "Релігійні", fr: "Religieux", pl: "Religijne" },
  cat_christmas: { en: "Christmas", ru: "Рождество", de: "Weihnachten", uk: "Різдво", fr: "Noël", pl: "Boże Narodzenie" },
  cat_new_year: { en: "New Year", ru: "Новый год", de: "Neujahr", uk: "Новий рік", fr: "Nouvel An", pl: "Nowy Rok" },
  cat_travel: { en: "Travel", ru: "Путешествия", de: "Reisen", uk: "Подорожі", fr: "Voyage", pl: "Podróże" },
  cat_children: { en: "Children", ru: "Дети", de: "Kinder", uk: "Діти", fr: "Enfants", pl: "Dzieci" },
  cat_universal: { en: "Universal", ru: "Универсальные", de: "Universell", uk: "Універсальні", fr: "Universel", pl: "Uniwersalne" },

  // Statuses
  status_draft: { en: "Draft", ru: "Черновик", de: "Entwurf", uk: "Чернетка", fr: "Brouillon", pl: "Szkic" },
  status_published: { en: "Published", ru: "Опубликовано", de: "Veröffentlicht", uk: "Опубліковано", fr: "Publié", pl: "Opublikowane" },
  status_hidden: { en: "Hidden", ru: "Скрыто", de: "Ausgeblendet", uk: "Приховано", fr: "Masqué", pl: "Ukryte" },
  status_archived: { en: "Archived", ru: "В архиве", de: "Archiviert", uk: "В архіві", fr: "Archivé", pl: "Zarchiwizowane" },

  // Validation
  v_title_required: { en: "Title is required.", ru: "Название обязательно.", de: "Titel ist erforderlich.", uk: "Назва обов'язкова.", fr: "Le titre est requis.", pl: "Tytuł jest wymagany." },
  v_category_required: { en: "Category is required.", ru: "Категория обязательна.", de: "Kategorie ist erforderlich.", uk: "Категорія обов'язкова.", fr: "La catégorie est requise.", pl: "Kategoria jest wymagana." },
  v_type_required: { en: "Content type is required.", ru: "Тип контента обязателен.", de: "Inhaltstyp ist erforderlich.", uk: "Тип контенту обов'язковий.", fr: "Le type est requis.", pl: "Typ jest wymagany." },
  v_language_required: { en: "Language is required.", ru: "Язык обязателен.", de: "Sprache ist erforderlich.", uk: "Мова обов'язкова.", fr: "La langue est requise.", pl: "Język jest wymagany." },
  v_credits_negative: { en: "Credits cannot be negative.", ru: "Кредиты не могут быть отрицательными.", de: "Credits dürfen nicht negativ sein.", uk: "Кредити не можуть бути від'ємними.", fr: "Les crédits ne peuvent pas être négatifs.", pl: "Kredyty nie mogą być ujemne." },

  empty_list: { en: "No content matches your filters.", ru: "Нет контента по выбранным фильтрам.", de: "Keine Inhalte für die Filter.", uk: "Немає контенту для цих фільтрів.", fr: "Aucun contenu ne correspond.", pl: "Brak treści dla filtrów." },
};

export function useLocalCatalog(lang: Lang) {
  return (k: string): string => {
    const row = D[k];
    if (!row) return k;
    return row[lang] ?? row.en;
  };
}

export type LocalCatalog = ReturnType<typeof useLocalCatalog>;