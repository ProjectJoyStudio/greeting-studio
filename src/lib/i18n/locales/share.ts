import type { Dict, Lang } from "../types";

/** Direct media sharing: the real image or film goes to the share sheet. */
export const SHARE_I18N: Record<Lang, Dict> = {
  en: {
    sh_share_file: "Send file",
    sh_share_image: "Send image",
    sh_share_video: "Send video",
    sh_share_link: "Share link",
    sh_download_file: "Download file",
    sh_preparing: "Preparing the file…",
    sh_failed: "The file could not be sent. Your work is saved and you can try again.",
    sh_unsupported:
      "Sending the file directly is not available on this device. You can download the file or share a link.",
  },
  ru: {
    sh_share_file: "Отправить файл",
    sh_share_image: "Отправить изображение",
    sh_share_video: "Отправить видео",
    sh_share_link: "Поделиться ссылкой",
    sh_download_file: "Скачать файл",
    sh_preparing: "Готовим файл…",
    sh_failed: "Не удалось передать файл. Ваша работа сохранена, и вы можете попробовать ещё раз.",
    sh_unsupported:
      "На этом устройстве отправка файла напрямую недоступна. Вы можете скачать файл или поделиться ссылкой.",
  },
  uk: {
    sh_share_file: "Надіслати файл",
    sh_share_image: "Надіслати зображення",
    sh_share_video: "Надіслати відео",
    sh_share_link: "Поділитися посиланням",
    sh_download_file: "Завантажити файл",
    sh_preparing: "Готуємо файл…",
    sh_failed: "Не вдалося передати файл. Вашу роботу збережено, ви можете спробувати ще раз.",
    sh_unsupported:
      "На цьому пристрої надсилання файлу напряму недоступне. Ви можете завантажити файл або поділитися посиланням.",
  },
  pl: {
    sh_share_file: "Wyślij plik",
    sh_share_image: "Wyślij obraz",
    sh_share_video: "Wyślij wideo",
    sh_share_link: "Udostępnij link",
    sh_download_file: "Pobierz plik",
    sh_preparing: "Przygotowujemy plik…",
    sh_failed: "Nie udało się wysłać pliku. Twoja praca jest zapisana, możesz spróbować ponownie.",
    sh_unsupported:
      "Na tym urządzeniu bezpośrednie wysyłanie pliku jest niedostępne. Możesz pobrać plik lub udostępnić link.",
  },
  de: {
    sh_share_file: "Datei senden",
    sh_share_image: "Bild senden",
    sh_share_video: "Video senden",
    sh_share_link: "Link teilen",
    sh_download_file: "Datei herunterladen",
    sh_preparing: "Datei wird vorbereitet…",
    sh_failed:
      "Die Datei konnte nicht gesendet werden. Ihre Arbeit ist gespeichert, Sie können es erneut versuchen.",
    sh_unsupported:
      "Auf diesem Gerät ist das direkte Senden der Datei nicht möglich. Sie können die Datei herunterladen oder einen Link teilen.",
  },
  fr: {
    sh_share_file: "Envoyer le fichier",
    sh_share_image: "Envoyer l'image",
    sh_share_video: "Envoyer la vidéo",
    sh_share_link: "Partager le lien",
    sh_download_file: "Télécharger le fichier",
    sh_preparing: "Préparation du fichier…",
    sh_failed: "Le fichier n'a pas pu être envoyé. Votre création est enregistrée, réessayez.",
    sh_unsupported:
      "L'envoi direct du fichier n'est pas disponible sur cet appareil. Vous pouvez télécharger le fichier ou partager un lien.",
  },
};
