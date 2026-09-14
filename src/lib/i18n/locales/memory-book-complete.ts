import type { Dict, Lang } from "../types";

/** Strings of the final "Complete book" action of the Memory Book. */
export const MEMORY_BOOK_COMPLETE_I18N: Record<Lang, Dict> = {
  en: {
    mbc_action: "Complete book",
    mbc_hint:
      "Your book is saved automatically while you work. Complete it only when you have finished.",
    mbc_confirm_title: "Complete book?",
    mbc_confirm_text:
      "Do you really want to complete this book? Once completed, it will be saved in your account as finished.",
    mbc_cancel: "Back to editing",
    mbc_confirm: "Yes, complete book",
    mbc_working: "Completing your book…",
    mbc_done_title: "Your book is completed",
    mbc_done_text: "It is saved in your account as a finished book.",
    mbc_go_cabinet: "Open my books",
    mbc_failed: "The book could not be completed. Nothing was changed — please try again.",
  },
  ru: {
    mbc_action: "Завершить книгу",
    mbc_hint:
      "Книга сохраняется автоматически во время работы. Завершайте её, только когда всё готово.",
    mbc_confirm_title: "Завершить книгу?",
    mbc_confirm_text:
      "Вы действительно хотите завершить эту книгу? После завершения книга будет сохранена в вашем Личном кабинете как готовая.",
    mbc_cancel: "Вернуться к редактированию",
    mbc_confirm: "Да, завершить книгу",
    mbc_working: "Завершаем вашу книгу…",
    mbc_done_title: "Книга завершена",
    mbc_done_text: "Она сохранена в вашем Личном кабинете как готовая.",
    mbc_go_cabinet: "Перейти к моим книгам",
    mbc_failed: "Не удалось завершить книгу. Ничего не изменено — попробуйте ещё раз.",
  },
  uk: {
    mbc_action: "Завершити книгу",
    mbc_hint:
      "Книга зберігається автоматично під час роботи. Завершуйте її, лише коли все готово.",
    mbc_confirm_title: "Завершити книгу?",
    mbc_confirm_text:
      "Ви справді хочете завершити цю книгу? Після завершення книга буде збережена у вашому Особистому кабінеті як готова.",
    mbc_cancel: "Повернутися до редагування",
    mbc_confirm: "Так, завершити книгу",
    mbc_working: "Завершуємо вашу книгу…",
    mbc_done_title: "Книгу завершено",
    mbc_done_text: "Вона збережена у вашому Особистому кабінеті як готова.",
    mbc_go_cabinet: "Перейти до моїх книг",
    mbc_failed: "Не вдалося завершити книгу. Нічого не змінено — спробуйте ще раз.",
  },
  pl: {
    mbc_action: "Zakończ książkę",
    mbc_hint:
      "Książka zapisuje się automatycznie podczas pracy. Zakończ ją dopiero, gdy wszystko jest gotowe.",
    mbc_confirm_title: "Zakończyć książkę?",
    mbc_confirm_text:
      "Czy na pewno chcesz zakończyć tę książkę? Po zakończeniu zostanie zapisana na Twoim koncie jako gotowa.",
    mbc_cancel: "Wróć do edycji",
    mbc_confirm: "Tak, zakończ książkę",
    mbc_working: "Kończymy Twoją książkę…",
    mbc_done_title: "Książka została zakończona",
    mbc_done_text: "Jest zapisana na Twoim koncie jako gotowa.",
    mbc_go_cabinet: "Przejdź do moich książek",
    mbc_failed: "Nie udało się zakończyć książki. Nic nie zostało zmienione — spróbuj ponownie.",
  },
  de: {
    mbc_action: "Buch abschließen",
    mbc_hint:
      "Ihr Buch wird während der Arbeit automatisch gespeichert. Schließen Sie es erst ab, wenn alles fertig ist.",
    mbc_confirm_title: "Buch abschließen?",
    mbc_confirm_text:
      "Möchten Sie dieses Buch wirklich abschließen? Nach dem Abschluss wird es in Ihrem Konto als fertiges Buch gespeichert.",
    mbc_cancel: "Zurück zum Bearbeiten",
    mbc_confirm: "Ja, Buch abschließen",
    mbc_working: "Ihr Buch wird abgeschlossen…",
    mbc_done_title: "Ihr Buch ist abgeschlossen",
    mbc_done_text: "Es ist in Ihrem Konto als fertiges Buch gespeichert.",
    mbc_go_cabinet: "Zu meinen Büchern",
    mbc_failed: "Das Buch konnte nicht abgeschlossen werden. Es wurde nichts geändert — bitte erneut versuchen.",
  },
  fr: {
    mbc_action: "Terminer le livre",
    mbc_hint:
      "Votre livre est enregistré automatiquement pendant votre travail. Terminez-le seulement quand tout est prêt.",
    mbc_confirm_title: "Terminer le livre ?",
    mbc_confirm_text:
      "Voulez-vous vraiment terminer ce livre ? Une fois terminé, il sera enregistré dans votre compte comme livre fini.",
    mbc_cancel: "Revenir à l'édition",
    mbc_confirm: "Oui, terminer le livre",
    mbc_working: "Finalisation de votre livre…",
    mbc_done_title: "Votre livre est terminé",
    mbc_done_text: "Il est enregistré dans votre compte comme livre fini.",
    mbc_go_cabinet: "Voir mes livres",
    mbc_failed: "Le livre n'a pas pu être terminé. Rien n'a été modifié — veuillez réessayer.",
  },
};
