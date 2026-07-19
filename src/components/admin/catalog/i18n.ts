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

// -------- Extended keys for the advanced management module --------
Object.assign(D, {
  // Section titles
  sec_basic: { en: "Basic", ru: "Основное", de: "Basis", uk: "Основне", fr: "Base", pl: "Podstawowe" },
  sec_media: { en: "Media", ru: "Медиа", de: "Medien", uk: "Медіа", fr: "Médias", pl: "Media" },
  sec_presentation: { en: "Presentation", ru: "Представление", de: "Darstellung", uk: "Подання", fr: "Présentation", pl: "Prezentacja" },
  sec_publication: { en: "Publication", ru: "Публикация", de: "Veröffentlichung", uk: "Публікація", fr: "Publication", pl: "Publikacja" },
  sec_translations: { en: "Translations", ru: "Переводы", de: "Übersetzungen", uk: "Переклади", fr: "Traductions", pl: "Tłumaczenia" },
  sec_versions: { en: "Version History", ru: "История версий", de: "Versionsverlauf", uk: "Історія версій", fr: "Historique", pl: "Historia wersji" },
  sec_stats: { en: "Statistics", ru: "Статистика", de: "Statistik", uk: "Статистика", fr: "Statistiques", pl: "Statystyki" },

  // Media placeholders
  m_main_preview: { en: "Main Preview Image", ru: "Главное превью", de: "Hauptvorschau", uk: "Головне прев'ю", fr: "Image principale", pl: "Główny podgląd" },
  m_thumbnail: { en: "Thumbnail", ru: "Миниатюра", de: "Miniaturbild", uk: "Мініатюра", fr: "Miniature", pl: "Miniatura" },
  m_audio: { en: "Audio File", ru: "Аудиофайл", de: "Audiodatei", uk: "Аудіофайл", fr: "Fichier audio", pl: "Plik audio" },
  m_video: { en: "Video File", ru: "Видеофайл", de: "Videodatei", uk: "Відеофайл", fr: "Fichier vidéo", pl: "Plik wideo" },
  m_cover: { en: "Cover Image", ru: "Обложка", de: "Cover", uk: "Обкладинка", fr: "Couverture", pl: "Okładka" },
  m_additional: { en: "Additional Media", ru: "Доп. медиа", de: "Weitere Medien", uk: "Додаткові медіа", fr: "Médias additionnels", pl: "Dodatkowe media" },
  m_placeholder_note: {
    en: "File controls are frontend placeholders. Real storage is not connected.",
    ru: "Управление файлами — демонстрационное. Реальное хранилище не подключено.",
    de: "Datei-Steuerungen sind Platzhalter. Kein Speicher angebunden.",
    uk: "Керування файлами — демонстрація. Сховище не підключене.",
    fr: "Contrôles de fichiers — démonstration. Aucun stockage n'est connecté.",
    pl: "Kontrolki plików — tylko demonstracja. Brak podłączonego magazynu.",
  },
  m_upload: { en: "Upload placeholder", ru: "Загрузка (демо)", de: "Upload (Demo)", uk: "Завантаження (демо)", fr: "Téléverser (démo)", pl: "Wgraj (demo)" },
  m_filename_ph: { en: "e.g. cover.jpg", ru: "например, cover.jpg", de: "z. B. cover.jpg", uk: "напр., cover.jpg", fr: "ex. cover.jpg", pl: "np. cover.jpg" },

  // Presentation
  p_customer_title: { en: "Customer-Facing Title", ru: "Клиентское название", de: "Kundentitel", uk: "Клієнтська назва", fr: "Titre client", pl: "Tytuł dla klienta" },
  p_short_desc: { en: "Short Description", ru: "Краткое описание", de: "Kurzbeschreibung", uk: "Короткий опис", fr: "Description courte", pl: "Krótki opis" },
  p_long_desc: { en: "Long Description", ru: "Полное описание", de: "Lange Beschreibung", uk: "Повний опис", fr: "Description complète", pl: "Pełny opis" },
  p_search_keywords: { en: "Search Keywords", ru: "Ключевые слова", de: "Schlüsselwörter", uk: "Ключові слова", fr: "Mots-clés", pl: "Słowa kluczowe" },
  p_keywords_ph: { en: "Comma-separated keywords", ru: "Ключевые слова через запятую", de: "Kommagetrennt", uk: "Через кому", fr: "Séparés par une virgule", pl: "Oddzielone przecinkiem" },

  // Flags
  flag_featured: { en: "Featured", ru: "Избранное", de: "Empfohlen", uk: "Обране", fr: "En vedette", pl: "Wyróżnione" },
  flag_recommended: { en: "Recommended", ru: "Рекомендуется", de: "Empfehlenswert", uk: "Рекомендовано", fr: "Recommandé", pl: "Polecane" },
  flag_premium: { en: "Premium", ru: "Премиум", de: "Premium", uk: "Преміум", fr: "Premium", pl: "Premium" },
  flag_new: { en: "New", ru: "Новое", de: "Neu", uk: "Нове", fr: "Nouveau", pl: "Nowe" },
  flag_popular: { en: "Popular", ru: "Популярное", de: "Beliebt", uk: "Популярне", fr: "Populaire", pl: "Popularne" },
  flag_seasonal: { en: "Seasonal", ru: "Сезонное", de: "Saisonal", uk: "Сезонне", fr: "Saisonnier", pl: "Sezonowe" },
  flag_pin: { en: "Pin to Top", ru: "Закрепить сверху", de: "Anheften", uk: "Закріпити", fr: "Épingler", pl: "Przypnij" },

  // Publication
  pub_publish_now: { en: "Publish Now", ru: "Опубликовать сейчас", de: "Jetzt veröffentlichen", uk: "Опублікувати зараз", fr: "Publier maintenant", pl: "Opublikuj teraz" },
  pub_schedule: { en: "Schedule Publication", ru: "Запланировать публикацию", de: "Veröffentlichung planen", uk: "Запланувати публікацію", fr: "Programmer la publication", pl: "Zaplanuj publikację" },
  pub_date: { en: "Publication Date", ru: "Дата публикации", de: "Veröffentlichungsdatum", uk: "Дата публікації", fr: "Date de publication", pl: "Data publikacji" },
  pub_time: { en: "Publication Time", ru: "Время публикации", de: "Uhrzeit", uk: "Час публікації", fr: "Heure", pl: "Godzina" },
  pub_hide_after: { en: "Hide After Date", ru: "Скрыть после даты", de: "Ausblenden ab", uk: "Приховати після дати", fr: "Masquer après le", pl: "Ukryj po dacie" },
  pub_no_end: { en: "No End Date", ru: "Без даты окончания", de: "Kein Enddatum", uk: "Без дати закінчення", fr: "Sans date de fin", pl: "Bez daty końca" },

  // Derived statuses
  status_scheduled: { en: "Scheduled", ru: "Запланировано", de: "Geplant", uk: "Заплановано", fr: "Programmé", pl: "Zaplanowane" },
  status_expired: { en: "Expired", ru: "Истекло", de: "Abgelaufen", uk: "Прострочено", fr: "Expiré", pl: "Wygasłe" },

  // Translations tab
  tr_status_complete: { en: "Complete", ru: "Готов", de: "Vollständig", uk: "Готово", fr: "Complet", pl: "Kompletne" },
  tr_status_incomplete: { en: "Incomplete", ru: "Не полностью", de: "Unvollständig", uk: "Неповно", fr: "Incomplet", pl: "Niekompletne" },
  tr_status_missing: { en: "Missing", ru: "Отсутствует", de: "Fehlt", uk: "Відсутнє", fr: "Manquant", pl: "Brak" },
  tr_primary: { en: "Primary", ru: "Основной", de: "Primär", uk: "Основна", fr: "Principal", pl: "Podstawowy" },
  tr_make_primary: { en: "Set as primary", ru: "Сделать основным", de: "Als primär setzen", uk: "Зробити основною", fr: "Définir principal", pl: "Ustaw jako główny" },
  tr_add: { en: "Add translation", ru: "Добавить перевод", de: "Übersetzung hinzufügen", uk: "Додати переклад", fr: "Ajouter une traduction", pl: "Dodaj tłumaczenie" },

  // Preview modal
  preview_customer: { en: "Preview Customer View", ru: "Просмотр глазами клиента", de: "Kundenansicht", uk: "Перегляд клієнта", fr: "Aperçu client", pl: "Podgląd klienta" },
  preview_language: { en: "Preview language", ru: "Язык просмотра", de: "Vorschausprache", uk: "Мова перегляду", fr: "Langue d'aperçu", pl: "Język podglądu" },
  preview_cta: { en: "Get this greeting", ru: "Получить это поздравление", de: "Diesen Gruß erhalten", uk: "Отримати вітання", fr: "Obtenir ce vœu", pl: "Odbierz to życzenie" },
  preview_draft_hidden: { en: "Draft items are hidden from customers.", ru: "Черновики скрыты от клиентов.", de: "Entwürfe sind für Kunden ausgeblendet.", uk: "Чернетки приховано від клієнтів.", fr: "Les brouillons sont cachés aux clients.", pl: "Szkice są ukryte przed klientami." },

  // Bulk actions
  bulk_selected: { en: "Selected", ru: "Выбрано", de: "Ausgewählt", uk: "Обрано", fr: "Sélectionné", pl: "Zaznaczono" },
  bulk_publish: { en: "Publish", ru: "Опубликовать", de: "Veröffentlichen", uk: "Опублікувати", fr: "Publier", pl: "Opublikuj" },
  bulk_hide: { en: "Hide", ru: "Скрыть", de: "Ausblenden", uk: "Приховати", fr: "Masquer", pl: "Ukryj" },
  bulk_archive: { en: "Archive", ru: "В архив", de: "Archivieren", uk: "В архів", fr: "Archiver", pl: "Archiwizuj" },
  bulk_restore: { en: "Restore", ru: "Восстановить", de: "Wiederherstellen", uk: "Відновити", fr: "Restaurer", pl: "Przywróć" },
  bulk_change_category: { en: "Change Category", ru: "Сменить категорию", de: "Kategorie ändern", uk: "Змінити категорію", fr: "Changer de catégorie", pl: "Zmień kategorię" },
  bulk_change_status: { en: "Change Status", ru: "Сменить статус", de: "Status ändern", uk: "Змінити статус", fr: "Changer de statut", pl: "Zmień status" },
  bulk_add_tag: { en: "Add Tag", ru: "Добавить тег", de: "Tag hinzufügen", uk: "Додати тег", fr: "Ajouter un tag", pl: "Dodaj tag" },
  bulk_remove_tag: { en: "Remove Tag", ru: "Убрать тег", de: "Tag entfernen", uk: "Прибрати тег", fr: "Retirer un tag", pl: "Usuń tag" },
  bulk_clear: { en: "Clear selection", ru: "Снять выделение", de: "Auswahl aufheben", uk: "Зняти вибір", fr: "Effacer la sélection", pl: "Wyczyść zaznaczenie" },
  bulk_confirm_title: { en: "Apply to selected?", ru: "Применить к выбранным?", de: "Auf Auswahl anwenden?", uk: "Застосувати до обраних?", fr: "Appliquer à la sélection ?", pl: "Zastosować do zaznaczonych?" },
  bulk_confirm_body: { en: "This bulk change will apply to all selected items.", ru: "Массовое изменение применится ко всем выбранным.", de: "Diese Massenänderung wirkt auf alle Ausgewählten.", uk: "Масову зміну буде застосовано до всіх обраних.", fr: "Le changement s'applique à tous les éléments sélectionnés.", pl: "Zmiana obejmie wszystkie zaznaczone." },

  // Version history
  ver_version: { en: "Version", ru: "Версия", de: "Version", uk: "Версія", fr: "Version", pl: "Wersja" },
  ver_date: { en: "Date", ru: "Дата", de: "Datum", uk: "Дата", fr: "Date", pl: "Data" },
  ver_admin: { en: "Administrator", ru: "Администратор", de: "Administrator", uk: "Адміністратор", fr: "Administrateur", pl: "Administrator" },
  ver_changed: { en: "Changed fields", ru: "Изменённые поля", de: "Geänderte Felder", uk: "Змінені поля", fr: "Champs modifiés", pl: "Zmienione pola" },
  ver_preview: { en: "Preview version", ru: "Просмотр версии", de: "Version ansehen", uk: "Перегляд версії", fr: "Aperçu", pl: "Podgląd wersji" },
  ver_restore: { en: "Restore (demo)", ru: "Восстановить (демо)", de: "Wiederherstellen (Demo)", uk: "Відновити (демо)", fr: "Restaurer (démo)", pl: "Przywróć (demo)" },
  ver_none: { en: "No versions recorded yet.", ru: "Версий пока нет.", de: "Noch keine Versionen.", uk: "Версій ще немає.", fr: "Aucune version.", pl: "Brak wersji." },
  ver_demo_note: { en: "Version history is demonstration only.", ru: "История версий — только демонстрация.", de: "Versionsverlauf ist nur Demo.", uk: "Історія версій — лише демонстрація.", fr: "Historique de démonstration uniquement.", pl: "Historia wersji tylko demonstracyjna." },

  // Statistics
  st_views: { en: "Views", ru: "Просмотры", de: "Ansichten", uk: "Перегляди", fr: "Vues", pl: "Wyświetlenia" },
  st_opens: { en: "Opens", ru: "Открытия", de: "Öffnungen", uk: "Відкриття", fr: "Ouvertures", pl: "Otwarcia" },
  st_uses: { en: "Uses", ru: "Использования", de: "Nutzungen", uk: "Використання", fr: "Utilisations", pl: "Użycia" },
  st_favorites: { en: "Favorites", ru: "В избранном", de: "Favoriten", uk: "Обране", fr: "Favoris", pl: "Ulubione" },
  st_shares: { en: "Shares", ru: "Поделились", de: "Geteilt", uk: "Поширення", fr: "Partages", pl: "Udostępnienia" },
  st_conversion: { en: "Conversion", ru: "Конверсия", de: "Conversion", uk: "Конверсія", fr: "Conversion", pl: "Konwersja" },
  st_last_used: { en: "Last used", ru: "Последнее использование", de: "Zuletzt genutzt", uk: "Востаннє використано", fr: "Dernière utilisation", pl: "Ostatnio użyto" },
  st_demo_note: { en: "All values are demonstration data.", ru: "Все значения — демонстрационные.", de: "Alle Werte sind Demodaten.", uk: "Усі значення — демонстраційні.", fr: "Toutes les valeurs sont de démonstration.", pl: "Wszystkie wartości demonstracyjne." },
  sort_views: { en: "Most Viewed", ru: "Больше всего просмотров", de: "Meist gesehen", uk: "Найпопулярніше", fr: "Plus vues", pl: "Najczęściej oglądane" },
  sort_uses: { en: "Most Used", ru: "Больше всего используется", de: "Am meisten genutzt", uk: "Найчастіше вжите", fr: "Plus utilisé", pl: "Najczęściej używane" },
  sort_favorites: { en: "Most Favorited", ru: "Больше всего в избранном", de: "Am meisten favorisiert", uk: "Найбільше в обраному", fr: "Plus favorisé", pl: "Najczęściej ulubione" },

  // Advanced filters
  filter_featured: { en: "Featured", ru: "Избранное", de: "Empfohlen", uk: "Обране", fr: "En vedette", pl: "Wyróżnione" },
  filter_recommended: { en: "Recommended", ru: "Рекомендуется", de: "Empfohlen", uk: "Рекомендовано", fr: "Recommandé", pl: "Polecane" },
  filter_premium: { en: "Premium", ru: "Премиум", de: "Premium", uk: "Преміум", fr: "Premium", pl: "Premium" },
  filter_translation: { en: "Translation status", ru: "Статус перевода", de: "Übersetzungsstatus", uk: "Стан перекладу", fr: "État de traduction", pl: "Stan tłumaczenia" },
  filter_publication_period: { en: "Publication period", ru: "Период публикации", de: "Veröffentlichungszeitraum", uk: "Період публікації", fr: "Période", pl: "Okres publikacji" },
  filter_active: { en: "Active", ru: "Активные", de: "Aktiv", uk: "Активні", fr: "Actifs", pl: "Aktywne" },
  filter_archived_only: { en: "Archived only", ru: "Только архив", de: "Nur Archiv", uk: "Лише архів", fr: "Archivés seulement", pl: "Tylko archiwum" },
  filter_credits_min: { en: "Credits min", ru: "Кредиты от", de: "Credits min", uk: "Кредити від", fr: "Crédits min", pl: "Kredyty min" },
  filter_credits_max: { en: "Credits max", ru: "Кредиты до", de: "Credits max", uk: "Кредити до", fr: "Crédits max", pl: "Kredyty max" },
  filter_period_upcoming: { en: "Upcoming", ru: "Предстоящие", de: "Bevorstehend", uk: "Майбутні", fr: "À venir", pl: "Nadchodzące" },
  filter_period_live: { en: "Live now", ru: "Сейчас идёт", de: "Jetzt live", uk: "Наразі", fr: "En cours", pl: "Trwające" },
  filter_period_past: { en: "Past", ru: "Прошедшие", de: "Vergangen", uk: "Минулі", fr: "Passés", pl: "Minione" },
  filter_reset: { en: "Reset filters", ru: "Сбросить фильтры", de: "Filter zurücksetzen", uk: "Скинути фільтри", fr: "Réinitialiser", pl: "Wyczyść filtry" },

  // Row actions
  act_preview_customer: { en: "Customer preview", ru: "Клиентский просмотр", de: "Kundenvorschau", uk: "Клієнтський перегляд", fr: "Aperçu client", pl: "Podgląd klienta" },
  act_restore: { en: "Restore", ru: "Восстановить", de: "Wiederherstellen", uk: "Відновити", fr: "Restaurer", pl: "Przywróć" },

  // Unsaved changes
  unsaved: { en: "Unsaved changes", ru: "Несохранённые изменения", de: "Ungespeicherte Änderungen", uk: "Незбережені зміни", fr: "Modifications non enregistrées", pl: "Niezapisane zmiany" },
  unsaved_confirm_title: { en: "Discard unsaved changes?", ru: "Отменить изменения?", de: "Änderungen verwerfen?", uk: "Скасувати зміни?", fr: "Abandonner les modifications ?", pl: "Odrzucić zmiany?" },
  unsaved_confirm_body: { en: "Your changes will be lost.", ru: "Ваши изменения будут потеряны.", de: "Ihre Änderungen gehen verloren.", uk: "Ваші зміни буде втрачено.", fr: "Vos modifications seront perdues.", pl: "Zmiany zostaną utracone." },
  act_discard: { en: "Discard", ru: "Отменить", de: "Verwerfen", uk: "Скасувати", fr: "Abandonner", pl: "Odrzuć" },
  act_keep_editing: { en: "Keep editing", ru: "Продолжить", de: "Weiter bearbeiten", uk: "Продовжити", fr: "Continuer", pl: "Kontynuuj" },

  // Pin confirm
  pin_replace_title: { en: "Replace pinned item?", ru: "Заменить закреплённый?", de: "Angeheftetes ersetzen?", uk: "Замінити закріплене?", fr: "Remplacer l'épinglé ?", pl: "Zamienić przypięty?" },
  pin_replace_body: {
    en: "Another item is already pinned in this category. Replace it?",
    ru: "В этой категории уже закреплён другой элемент. Заменить?",
    de: "In dieser Kategorie ist bereits ein Element angeheftet. Ersetzen?",
    uk: "У цій категорії вже закріплено інший елемент. Замінити?",
    fr: "Un autre élément est déjà épinglé dans cette catégorie. Remplacer ?",
    pl: "W tej kategorii przypięto już inny element. Zamienić?",
  },

  // Validation
  v_needs_translation: {
    en: "At least one complete language version is required before publication.",
    ru: "Для публикации нужен хотя бы один полностью заполненный перевод.",
    de: "Vor der Veröffentlichung ist mindestens eine vollständige Sprachversion erforderlich.",
    uk: "Для публікації потрібна щонайменше одна повна мовна версія.",
    fr: "Au moins une version linguistique complète est requise avant publication.",
    pl: "Do publikacji wymagana jest co najmniej jedna kompletna wersja językowa.",
  },
  v_invalid_date: { en: "Invalid date.", ru: "Некорректная дата.", de: "Ungültiges Datum.", uk: "Некоректна дата.", fr: "Date invalide.", pl: "Nieprawidłowa data." },
  v_hide_before_publish: {
    en: "Hide-after date cannot be earlier than publication date.",
    ru: "Дата скрытия не может быть раньше даты публикации.",
    de: "Ausblenddatum darf nicht vor dem Veröffentlichungsdatum liegen.",
    uk: "Дата приховування не може бути раніше дати публікації.",
    fr: "La date de masquage ne peut pas précéder la publication.",
    pl: "Data ukrycia nie może być wcześniejsza niż publikacja.",
  },
  v_archived_published: {
    en: "Archived content cannot remain Published.",
    ru: "Архивный контент не может оставаться Опубликованным.",
    de: "Archivierter Inhalt darf nicht veröffentlicht bleiben.",
    uk: "Архівний контент не може залишатися Опублікованим.",
    fr: "Un contenu archivé ne peut rester publié.",
    pl: "Zarchiwizowana treść nie może pozostać opublikowana.",
  },
  v_pin_needs_category: { en: "Pinned content must belong to a category.", ru: "Закреплённый контент должен принадлежать категории.", de: "Angeheftete Inhalte benötigen eine Kategorie.", uk: "Закріплений контент має належати до категорії.", fr: "Un contenu épinglé doit appartenir à une catégorie.", pl: "Przypięta treść musi mieć kategorię." },

  // Preview types
  pv_animated: { en: "Animated preview", ru: "Анимированное превью", de: "Animierte Vorschau", uk: "Анімоване прев'ю", fr: "Aperçu animé", pl: "Podgląd animowany" },
  pv_audio: { en: "Audio", ru: "Аудио", de: "Audio", uk: "Аудіо", fr: "Audio", pl: "Audio" },
  pv_video: { en: "Video", ru: "Видео", de: "Video", uk: "Відео", fr: "Vidéo", pl: "Wideo" },
  pv_cartoon: { en: "First frame", ru: "Первый кадр", de: "Erstes Bild", uk: "Перший кадр", fr: "Première image", pl: "Pierwszy kadr" },
  pv_premium: { en: "Premium cover", ru: "Премиум-обложка", de: "Premium-Cover", uk: "Преміум-обкладинка", fr: "Couverture premium", pl: "Okładka premium" },
  pv_template: { en: "Template", ru: "Шаблон", de: "Vorlage", uk: "Шаблон", fr: "Modèle", pl: "Szablon" },
  pv_card: { en: "Card", ru: "Открытка", de: "Karte", uk: "Листівка", fr: "Carte", pl: "Kartka" },
});

// -------- Performance, authors, media warnings, tooltips --------
Object.assign(D, {
  // Column headers / labels
  col_performance: { en: "Performance", ru: "Показатели", de: "Leistung", uk: "Показники", fr: "Performance", pl: "Wyniki" },
  col_author: { en: "Author", ru: "Автор", de: "Autor", uk: "Автор", fr: "Auteur", pl: "Autor" },
  col_views: { en: "Views", ru: "Просмотры", de: "Ansichten", uk: "Перегляди", fr: "Vues", pl: "Wyświetlenia" },
  col_purchases: { en: "Uses", ru: "Использования", de: "Nutzungen", uk: "Використання", fr: "Utilisations", pl: "Użycia" },

  // Tooltips
  tt_credits: { en: "Customer credit cost", ru: "Стоимость в кредитах для клиента", de: "Kunden-Credits-Kosten", uk: "Вартість у кредитах для клієнта", fr: "Coût en crédits pour le client", pl: "Koszt w kredytach dla klienta" },
  tt_views: { en: "Customer catalog views", ru: "Просмотры в каталоге клиентов", de: "Aufrufe im Kundenkatalog", uk: "Перегляди в клієнтському каталозі", fr: "Vues dans le catalogue client", pl: "Wyświetlenia w katalogu klienta" },
  tt_purchases: { en: "Completed customer uses or purchases", ru: "Успешные использования или покупки клиентами", de: "Abgeschlossene Nutzungen oder Käufe", uk: "Успішні використання або покупки", fr: "Utilisations ou achats terminés", pl: "Zakończone użycia lub zakupy" },
  tt_author: { en: "Content author or internal owner", ru: "Автор или внутренний владелец контента", de: "Autor oder interner Verantwortlicher", uk: "Автор або внутрішній власник контенту", fr: "Auteur ou responsable interne", pl: "Autor lub wewnętrzny właściciel" },
  tt_open_customer: { en: "Preview this item as a customer", ru: "Открыть глазами клиента", de: "Als Kunde anzeigen", uk: "Переглянути очима клієнта", fr: "Aperçu côté client", pl: "Podgląd jako klient" },
  tt_archive: { en: "Remove from active catalog without permanent deletion", ru: "Убрать из активного каталога без удаления", de: "Aus dem aktiven Katalog entfernen (nicht löschen)", uk: "Прибрати з активного каталогу без видалення", fr: "Retirer du catalogue actif sans suppression", pl: "Usuń z aktywnego katalogu bez trwałego usuwania" },
  tt_delete: { en: "Protected permanent deletion action", ru: "Защищённое безвозвратное удаление", de: "Geschützte endgültige Löschung", uk: "Захищене остаточне видалення", fr: "Suppression définitive protégée", pl: "Chronione trwałe usunięcie" },

  // Sort options
  sort_most_viewed: { en: "Most Viewed", ru: "Больше всего просмотров", de: "Meist gesehen", uk: "Найпопулярніше", fr: "Plus vues", pl: "Najczęściej oglądane" },
  sort_least_viewed: { en: "Least Viewed", ru: "Меньше всего просмотров", de: "Am wenigsten gesehen", uk: "Найменше переглядів", fr: "Moins vues", pl: "Najrzadziej oglądane" },
  sort_most_purchased: { en: "Most Used", ru: "Больше всего использований", de: "Am meisten genutzt", uk: "Найчастіше вжите", fr: "Plus utilisé", pl: "Najczęściej używane" },
  sort_least_purchased: { en: "Least Used", ru: "Меньше всего использований", de: "Am wenigsten genutzt", uk: "Найменше використань", fr: "Moins utilisé", pl: "Najrzadziej używane" },

  // Filters
  filter_has_views: { en: "Has views", ru: "Есть просмотры", de: "Mit Ansichten", uk: "Є перегляди", fr: "Avec vues", pl: "Ma wyświetlenia" },
  filter_never_viewed: { en: "Never viewed", ru: "Без просмотров", de: "Nie angesehen", uk: "Без переглядів", fr: "Jamais vues", pl: "Bez wyświetleń" },
  filter_has_purchases: { en: "Has uses", ru: "Есть использования", de: "Mit Nutzungen", uk: "Є використання", fr: "Avec utilisations", pl: "Ma użycia" },
  filter_never_purchased: { en: "Never used", ru: "Без использований", de: "Nie genutzt", uk: "Без використань", fr: "Jamais utilisées", pl: "Nigdy nieużyte" },
  filter_has_thumbnail: { en: "Has thumbnail", ru: "С миниатюрой", de: "Mit Miniaturbild", uk: "З мініатюрою", fr: "Avec miniature", pl: "Z miniaturą" },
  filter_missing_thumbnail: { en: "Missing thumbnail", ru: "Без миниатюры", de: "Ohne Miniaturbild", uk: "Без мініатюри", fr: "Sans miniature", pl: "Bez miniatury" },
  filter_published_missing_media: { en: "Published, missing media", ru: "Опубликовано без медиа", de: "Veröffentlicht, Medien fehlen", uk: "Опубліковано без медіа", fr: "Publié sans média", pl: "Opublikowane bez mediów" },
  filter_author_type: { en: "Author type", ru: "Тип автора", de: "Autorentyp", uk: "Тип автора", fr: "Type d'auteur", pl: "Typ autora" },
  filter_performance: { en: "Performance status", ru: "Статус показателей", de: "Leistungsstatus", uk: "Статус показників", fr: "État de performance", pl: "Status wyników" },

  // Author types
  author_project_joy: { en: "Project Joy", ru: "Project Joy", de: "Project Joy", uk: "Project Joy", fr: "Project Joy", pl: "Project Joy" },
  author_administrator: { en: "Administrator", ru: "Администратор", de: "Administrator", uk: "Адміністратор", fr: "Administrateur", pl: "Administrator" },
  author_content_manager: { en: "Content Manager", ru: "Контент-менеджер", de: "Content-Manager", uk: "Контент-менеджер", fr: "Responsable de contenu", pl: "Menedżer treści" },
  author_designer: { en: "Designer", ru: "Дизайнер", de: "Designer", uk: "Дизайнер", fr: "Designer", pl: "Projektant" },
  author_partner: { en: "Partner", ru: "Партнёр", de: "Partner", uk: "Партнер", fr: "Partenaire", pl: "Partner" },
  author_imported: { en: "Imported Content", ru: "Импортированный контент", de: "Importierter Inhalt", uk: "Імпортований контент", fr: "Contenu importé", pl: "Treść importowana" },
  author_custom: { en: "Custom Author Name", ru: "Собственное имя автора", de: "Eigener Autorenname", uk: "Власне ім'я автора", fr: "Nom d'auteur personnalisé", pl: "Własny autor" },

  // Author fields
  au_section: { en: "Author & Owner", ru: "Автор и владелец", de: "Autor & Verantwortlicher", uk: "Автор і власник", fr: "Auteur & responsable", pl: "Autor i właściciel" },
  au_type: { en: "Author Type", ru: "Тип автора", de: "Autorentyp", uk: "Тип автора", fr: "Type d'auteur", pl: "Typ autora" },
  au_display_name: { en: "Author Display Name", ru: "Отображаемое имя автора", de: "Anzeigename des Autors", uk: "Ім'я автора для показу", fr: "Nom d'affichage", pl: "Wyświetlana nazwa autora" },
  au_owner: { en: "Internal Owner", ru: "Внутренний владелец", de: "Interner Verantwortlicher", uk: "Внутрішній власник", fr: "Responsable interne", pl: "Właściciel wewnętrzny" },
  au_source: { en: "Creation Source", ru: "Источник создания", de: "Erstellungsquelle", uk: "Джерело створення", fr: "Source de création", pl: "Źródło utworzenia" },
  au_last_edited_by: { en: "Last Edited By", ru: "Кто изменил", de: "Zuletzt bearbeitet von", uk: "Хто редагував", fr: "Modifié par", pl: "Ostatnio edytowano przez" },
  au_last_edited_at: { en: "Last Edited Date", ru: "Дата последней правки", de: "Datum der letzten Änderung", uk: "Дата останньої правки", fr: "Date de modification", pl: "Data ostatniej edycji" },
  au_show_customer: { en: "Show Author to Customer", ru: "Показывать автора клиенту", de: "Autor Kunden anzeigen", uk: "Показувати автора клієнту", fr: "Afficher l'auteur au client", pl: "Pokaż autora klientowi" },
  au_hidden_note: { en: "Author is visible only inside the Admin Panel.", ru: "Автор виден только в админ-панели.", de: "Autor nur im Admin-Bereich sichtbar.", uk: "Автор видимий лише в адмін-панелі.", fr: "L'auteur est visible uniquement dans l'admin.", pl: "Autor widoczny tylko w panelu administratora." },

  // Performance labels
  perf_new: { en: "New", ru: "Новое", de: "Neu", uk: "Нове", fr: "Nouveau", pl: "Nowe" },
  perf_growing: { en: "Growing", ru: "Растёт", de: "Wachsend", uk: "Зростає", fr: "En croissance", pl: "Rośnie" },
  perf_popular: { en: "Popular", ru: "Популярное", de: "Beliebt", uk: "Популярне", fr: "Populaire", pl: "Popularne" },
  perf_top: { en: "Top Performer", ru: "Лидер", de: "Top-Performer", uk: "Лідер", fr: "Meilleur", pl: "Lider" },
  perf_low_activity: { en: "Low Activity", ru: "Низкая активность", de: "Geringe Aktivität", uk: "Низька активність", fr: "Faible activité", pl: "Niska aktywność" },

  // Media (extended)
  m_video_poster: { en: "Video Poster", ru: "Постер видео", de: "Video-Poster", uk: "Постер відео", fr: "Affiche vidéo", pl: "Plakat wideo" },
  m_first_frame: { en: "First Cartoon Frame", ru: "Первый кадр мультфильма", de: "Erstes Zeichentrickbild", uk: "Перший кадр мультфільму", fr: "Première image du dessin animé", pl: "Pierwszy kadr kreskówki" },
  m_audio_cover: { en: "Audio Cover", ru: "Обложка аудио", de: "Audio-Cover", uk: "Обкладинка аудіо", fr: "Couverture audio", pl: "Okładka audio" },
  m_preview_btn: { en: "Media Preview", ru: "Просмотр медиа", de: "Medienvorschau", uk: "Перегляд медіа", fr: "Aperçu média", pl: "Podgląd mediów" },
  m_replace: { en: "Replace Media", ru: "Заменить медиа", de: "Medien ersetzen", uk: "Замінити медіа", fr: "Remplacer le média", pl: "Zamień media" },
  m_remove: { en: "Remove Media", ru: "Удалить медиа", de: "Medien entfernen", uk: "Видалити медіа", fr: "Supprimer le média", pl: "Usuń media" },

  // Warnings
  warn_title: { en: "Publication warnings", ru: "Предупреждения публикации", de: "Veröffentlichungswarnungen", uk: "Попередження публікації", fr: "Avertissements de publication", pl: "Ostrzeżenia publikacji" },
  warn_missing_thumbnail: { en: "No usable thumbnail.", ru: "Нет пригодной миниатюры.", de: "Kein nutzbares Miniaturbild.", uk: "Немає придатної мініатюри.", fr: "Aucune miniature utilisable.", pl: "Brak użytecznej miniatury." },
  warn_missing_poster: { en: "Video content has no poster.", ru: "У видео нет постера.", de: "Video ohne Poster.", uk: "У відео немає постера.", fr: "Vidéo sans affiche.", pl: "Wideo bez plakatu." },
  warn_missing_frame: { en: "Cartoon content has no first-frame preview.", ru: "У мультфильма нет первого кадра.", de: "Zeichentrick ohne erstes Bild.", uk: "Мультфільм без першого кадру.", fr: "Dessin animé sans première image.", pl: "Kreskówka bez pierwszego kadru." },
  warn_missing_cover: { en: "Song content has no cover.", ru: "У песни нет обложки.", de: "Lied ohne Cover.", uk: "У пісні немає обкладинки.", fr: "Chanson sans couverture.", pl: "Piosenka bez okładki." },
  warn_missing_primary_text: { en: "Primary-language customer text is missing.", ru: "Отсутствует клиентский текст в основном языке.", de: "Kundentext in Primärsprache fehlt.", uk: "Немає клієнтського тексту основною мовою.", fr: "Texte client dans la langue principale manquant.", pl: "Brak tekstu klienta w języku podstawowym." },
  warn_route_unavailable: { en: "Customer-facing route is not connected yet.", ru: "Клиентский маршрут ещё не подключён.", de: "Kundenroute noch nicht angebunden.", uk: "Клієнтський маршрут ще не підключено.", fr: "Route client non connectée.", pl: "Trasa klienta jeszcze niepodłączona." },
  warn_author_visible_empty: { en: "Author visibility is on but the display name is empty.", ru: "Показ автора включён, но отображаемое имя пустое.", de: "Autor sichtbar, aber Anzeigename leer.", uk: "Показ автора увімкнено, але ім'я порожнє.", fr: "Auteur visible mais nom vide.", pl: "Widoczność autora włączona, ale nazwa pusta." },
  warn_publication_blocked: { en: "Publication is blocked until customer-facing requirements are met.", ru: "Публикация заблокирована до заполнения обязательных клиентских полей.", de: "Veröffentlichung blockiert, bis kundenrelevante Anforderungen erfüllt sind.", uk: "Публікація заблокована до виконання обов'язкових клієнтських вимог.", fr: "Publication bloquée jusqu'à ce que les exigences client soient remplies.", pl: "Publikacja zablokowana do czasu spełnienia wymogów dla klienta." },

  // Statistics extended
  st_purchases: { en: "Total Uses", ru: "Всего использований", de: "Nutzungen gesamt", uk: "Усього використань", fr: "Utilisations totales", pl: "Łączne użycia" },
  st_unique_views: { en: "Unique Views", ru: "Уникальные просмотры", de: "Eindeutige Ansichten", uk: "Унікальні перегляди", fr: "Vues uniques", pl: "Unikalne wyświetlenia" },
  st_credits_earned: { en: "Credits Earned", ru: "Заработано кредитов", de: "Verdiente Credits", uk: "Зароблено кредитів", fr: "Crédits gagnés", pl: "Zarobione kredyty" },
  st_last_viewed: { en: "Last Viewed", ru: "Последний просмотр", de: "Zuletzt gesehen", uk: "Востаннє переглянуто", fr: "Dernière vue", pl: "Ostatnio wyświetlone" },
  st_last_purchased: { en: "Last Used", ru: "Последнее использование", de: "Zuletzt genutzt", uk: "Востаннє використано", fr: "Dernière utilisation", pl: "Ostatnio użyte" },
  st_backend_note: { en: "Demonstration statistics. Real analytics will appear after backend integration.", ru: "Демонстрационные показатели. Реальная аналитика появится после подключения серверной части.", de: "Demonstrationsstatistik. Echte Analysen erscheinen nach der Backend-Integration.", uk: "Демонстраційна статистика. Реальна аналітика з'явиться після підключення бекенду.", fr: "Statistiques de démonstration. Les analyses réelles apparaîtront après l'intégration du backend.", pl: "Statystyki demonstracyjne. Prawdziwe analityki pojawią się po integracji z backendem." },

  // Customer preview labels
  preview_internal_label: { en: "Internal Customer View Preview", ru: "Внутренний просмотр глазами клиента", de: "Interne Kundenansicht", uk: "Внутрішній перегляд клієнта", fr: "Aperçu client interne", pl: "Wewnętrzny podgląd klienta" },
  preview_return_admin: { en: "Return to Admin Catalog", ru: "Вернуться в админ-каталог", de: "Zurück zum Admin-Katalog", uk: "Повернутися до адмін-каталогу", fr: "Retour au catalogue admin", pl: "Wróć do katalogu admina" },
  preview_protected_note: { en: "Draft, hidden and archived content stays inside protected preview only.", ru: "Черновики, скрытый и архивный контент доступны только во внутреннем предпросмотре.", de: "Entwürfe, ausgeblendete und archivierte Inhalte bleiben nur in der geschützten Vorschau sichtbar.", uk: "Чернетки, приховане та архівне доступні лише у захищеному перегляді.", fr: "Les brouillons, contenus masqués et archivés restent en aperçu protégé.", pl: "Szkice, ukryte i zarchiwizowane treści są dostępne tylko w chronionym podglądzie." },
  by_author: { en: "By", ru: "Автор:", de: "Von", uk: "Автор:", fr: "Par", pl: "Autor:" },

  // Columns visibility
  cols_visible: { en: "Columns", ru: "Столбцы", de: "Spalten", uk: "Стовпці", fr: "Colonnes", pl: "Kolumny" },
});

export function useLocalCatalog(lang: Lang) {
  return (k: string): string => {
    const row = D[k];
    if (!row) return k;
    return row[lang] ?? row.en;
  };
}

export type LocalCatalog = ReturnType<typeof useLocalCatalog>;