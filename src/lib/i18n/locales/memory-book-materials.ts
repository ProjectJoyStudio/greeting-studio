import type { Dict, Lang } from "../types";

/** Strings of the Book Materials stage of the Memory Book. */
export const MEMORY_BOOK_MATERIALS_I18N: Record<Lang, Dict> = {
  en: {
    mbm_stage: "Book materials",
    mbm_title: "Book materials",
    mbm_hint:
      "Upload the photos and videos you want to use in this book. They are saved automatically and stay with this book.",
    mbm_photos: "Photos",
    mbm_videos: "Videos",
    mbm_add_photos: "Add photos",
    mbm_add_video: "Add video",
    mbm_empty_photos: "No photos uploaded yet.",
    mbm_empty_videos: "No videos uploaded yet.",
    mbm_remove: "Remove",
    mbm_uploading: "Uploading…",
    mbm_failed: "This file could not be uploaded. Please try again.",
    mbm_video_too_long: "One source video may be no longer than 60 minutes.",
    mbm_video_unreadable: "The length of this video could not be read. Please try another file.",
    mbm_video_note:
      "One source video may be up to 60 minutes long. One finished video in the book may be up to 5 minutes long.",
    mbm_capacity: "Video positions in this book: {n}",
  },
  ru: {
    mbm_stage: "Материалы книги",
    mbm_title: "Материалы книги",
    mbm_hint:
      "Загрузите фотографии и видео, которые хотите использовать в этой книге. Всё сохраняется автоматически и остаётся с этой книгой.",
    mbm_photos: "Фотографии",
    mbm_videos: "Видео",
    mbm_add_photos: "Добавить фотографии",
    mbm_add_video: "Добавить видео",
    mbm_empty_photos: "Фотографии ещё не загружены.",
    mbm_empty_videos: "Видео ещё не загружены.",
    mbm_remove: "Удалить",
    mbm_uploading: "Загрузка…",
    mbm_failed: "Этот файл не удалось загрузить. Попробуйте ещё раз.",
    mbm_video_too_long: "Одно исходное видео может быть не длиннее 60 минут.",
    mbm_video_unreadable: "Не удалось определить длительность видео. Попробуйте другой файл.",
    mbm_video_note:
      "Одно исходное видео — до 60 минут. Одно готовое видео в книге — до 5 минут.",
    mbm_capacity: "Мест для видео в этой книге: {n}",
  },
  uk: {
    mbm_stage: "Матеріали книги",
    mbm_title: "Матеріали книги",
    mbm_hint:
      "Завантажте фотографії та відео, які хочете використати в цій книзі. Усе зберігається автоматично й залишається з цією книгою.",
    mbm_photos: "Фотографії",
    mbm_videos: "Відео",
    mbm_add_photos: "Додати фотографії",
    mbm_add_video: "Додати відео",
    mbm_empty_photos: "Фотографії ще не завантажені.",
    mbm_empty_videos: "Відео ще не завантажені.",
    mbm_remove: "Видалити",
    mbm_uploading: "Завантаження…",
    mbm_failed: "Цей файл не вдалося завантажити. Спробуйте ще раз.",
    mbm_video_too_long: "Одне вихідне відео може бути не довшим за 60 хвилин.",
    mbm_video_unreadable: "Не вдалося визначити тривалість відео. Спробуйте інший файл.",
    mbm_video_note:
      "Одне вихідне відео — до 60 хвилин. Одне готове відео в книзі — до 5 хвилин.",
    mbm_capacity: "Місць для відео в цій книзі: {n}",
  },
  pl: {
    mbm_stage: "Materiały książki",
    mbm_title: "Materiały książki",
    mbm_hint:
      "Prześlij zdjęcia i filmy, których chcesz użyć w tej książce. Wszystko zapisuje się automatycznie i pozostaje przy tej książce.",
    mbm_photos: "Zdjęcia",
    mbm_videos: "Filmy",
    mbm_add_photos: "Dodaj zdjęcia",
    mbm_add_video: "Dodaj film",
    mbm_empty_photos: "Nie przesłano jeszcze zdjęć.",
    mbm_empty_videos: "Nie przesłano jeszcze filmów.",
    mbm_remove: "Usuń",
    mbm_uploading: "Przesyłanie…",
    mbm_failed: "Nie udało się przesłać tego pliku. Spróbuj ponownie.",
    mbm_video_too_long: "Jeden film źródłowy może trwać maksymalnie 60 minut.",
    mbm_video_unreadable: "Nie udało się odczytać długości filmu. Wybierz inny plik.",
    mbm_video_note:
      "Jeden film źródłowy — do 60 minut. Jeden gotowy film w książce — do 5 minut.",
    mbm_capacity: "Miejsca na filmy w tej książce: {n}",
  },
  de: {
    mbm_stage: "Buchmaterialien",
    mbm_title: "Buchmaterialien",
    mbm_hint:
      "Laden Sie die Fotos und Videos hoch, die Sie in diesem Buch verwenden möchten. Alles wird automatisch gespeichert und bleibt bei diesem Buch.",
    mbm_photos: "Fotos",
    mbm_videos: "Videos",
    mbm_add_photos: "Fotos hinzufügen",
    mbm_add_video: "Video hinzufügen",
    mbm_empty_photos: "Es wurden noch keine Fotos hochgeladen.",
    mbm_empty_videos: "Es wurden noch keine Videos hochgeladen.",
    mbm_remove: "Entfernen",
    mbm_uploading: "Wird hochgeladen…",
    mbm_failed: "Diese Datei konnte nicht hochgeladen werden. Bitte erneut versuchen.",
    mbm_video_too_long: "Ein Quellvideo darf höchstens 60 Minuten lang sein.",
    mbm_video_unreadable:
      "Die Länge dieses Videos konnte nicht gelesen werden. Bitte eine andere Datei wählen.",
    mbm_video_note:
      "Ein Quellvideo — bis zu 60 Minuten. Ein fertiges Video im Buch — bis zu 5 Minuten.",
    mbm_capacity: "Videoplätze in diesem Buch: {n}",
  },
  fr: {
    mbm_stage: "Matériaux du livre",
    mbm_title: "Matériaux du livre",
    mbm_hint:
      "Téléversez les photos et les vidéos que vous souhaitez utiliser dans ce livre. Tout est enregistré automatiquement et reste attaché à ce livre.",
    mbm_photos: "Photos",
    mbm_videos: "Vidéos",
    mbm_add_photos: "Ajouter des photos",
    mbm_add_video: "Ajouter une vidéo",
    mbm_empty_photos: "Aucune photo téléversée pour l'instant.",
    mbm_empty_videos: "Aucune vidéo téléversée pour l'instant.",
    mbm_remove: "Supprimer",
    mbm_uploading: "Téléversement…",
    mbm_failed: "Ce fichier n'a pas pu être téléversé. Veuillez réessayer.",
    mbm_video_too_long: "Une vidéo source ne peut pas dépasser 60 minutes.",
    mbm_video_unreadable:
      "La durée de cette vidéo n'a pas pu être lue. Veuillez choisir un autre fichier.",
    mbm_video_note:
      "Une vidéo source — jusqu'à 60 minutes. Une vidéo finale dans le livre — jusqu'à 5 minutes.",
    mbm_capacity: "Emplacements vidéo dans ce livre : {n}",
  },
};
