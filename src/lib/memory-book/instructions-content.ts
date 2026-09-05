import type { Lang } from "@/lib/i18n/types";

export type InstructionSection = {
  title: string;
  /** Paragraphs and bullet lists in display order. Bullets are marked with a leading "- ". */
  blocks: string[];
};

export type InstructionContent = {
  title: string;
  intro: string[];
  sections: InstructionSection[];
};

/**
 * Approved Memory Book instruction text. Russian is the approved source;
 * the other five languages are faithful translations (no added or removed
 * information, identical numbers and limits).
 */
export const MEMORY_BOOK_INSTRUCTIONS: Record<Lang, InstructionContent> = {
  ru: {
    title: "Инструкция по использованию раздела «Книга воспоминаний и поздравлений»",
    intro: [
      "Создайте свою интерактивную «Книгу воспоминаний и поздравлений» из фотографий, видео, открыток, воспоминаний и тёплых слов.",
      "Project Joy поможет собрать ваши материалы в настоящую цифровую книгу. Вы сможете просмотреть результат, изменить расположение материалов, оформить обложку и страницы, добавить поздравления, видео и музыку.",
      "Готовую книгу можно будет открывать и перелистывать как настоящую, смотреть видео и слушать музыку.",
    ],
    sections: [
      {
        title: "1. Выберите размер книги",
        blocks: [
          "Перед началом создания выберите подходящий пакет:",
          "- 5 листов = 10 внутренних страниц — до 2 видео.",
          "- 10 листов = 20 внутренних страниц — до 3 видео.",
          "- 15 листов = 30 внутренних страниц — до 5 видео.",
          "1 лист = 2 внутренние страницы. Обложка в количество внутренних страниц не входит.",
          "Максимальный размер одной книги — 15 листов (30 внутренних страниц) и не более 5 видео.",
          "Если во время создания вам понадобится больше места, вы сможете добавлять дополнительные листы по одному, пока книга не достигла максимального размера.",
          "Обычный дополнительный лист добавляет две страницы для фотографий, открыток, поздравлений, текста и красивого оформления.",
          "Дополнительный лист с возможностью размещения видео — это такой же полноценный лист с двумя страницами. На нём также можно размещать фотографии, открытки, поздравления, текст и оформление, но дополнительно появляется возможность добавить ещё одно видео, если максимальный лимит в 5 видео ещё не достигнут.",
          "В стоимость выбранного пакета входит использование предусмотренных инструментов Project Joy для создания вашей книги, а также 21 день для её создания, редактирования, хранения и скачивания.",
          "Актуальную стоимость пакетов, дополнительных листов и дополнительных услуг смотрите на странице покупки пакетов.",
        ],
      },
      {
        title: "2. Добавьте свои материалы",
        blocks: [
          "Загрузите фотографии, открытки и видео, которые хотите сохранить в книге.",
          "Вы также сможете использовать подходящие материалы, ранее созданные вами в Project Joy.",
          "Вам не нужно заранее самостоятельно распределять всё по страницам. Project Joy поможет первоначально собрать загруженные материалы и разместить их в книге.",
          "После этого вы сможете открыть собранную книгу, посмотреть результат и изменить его по своему желанию.",
        ],
      },
      {
        title: "3. Создайте и оформите обложку",
        blocks: [
          "Для оформления обложки вы можете выбрать один из готовых шаблонов из коллекции Project Joy или создать собственную уникальную обложку по своему описанию.",
          "Опишите, какой вы хотите видеть обложку: её стиль, цвета, фон, украшения и другие детали. Project Joy поможет создать оформление по вашему желанию.",
          "Добавьте подходящее название, например:",
          "- «История нашей семьи»",
          "- «Наши лучшие воспоминания»",
          "- «С юбилеем, мама!»",
          "- «Нашему коллеге от его команды»",
          "Вы сможете подобрать обложку и название в соответствии с событием, содержанием и настроением вашей книги.",
        ],
      },
      {
        title: "4. Создайте и оформите страницы",
        blocks: [
          "Для каждой страницы книги вы можете выбрать готовый шаблон Project Joy или создать собственное оформление по своему описанию.",
          "Опишите, какой должна быть страница: стиль, фон, рамки, украшения и другие детали — и Project Joy поможет создать подходящее оформление.",
          "После этого дополняйте страницы своими фотографиями, открытками, видео, поздравлениями, воспоминаниями и текстом.",
          "Для оформления текста вы можете выбирать красивые шрифты Project Joy. Шрифт можно менять и подбирать отдельно для каждой страницы книги, чтобы он соответствовал её содержанию и оформлению.",
        ],
      },
      {
        title: "5. Просмотрите собранную книгу",
        blocks: [
          "После первоначальной сборки откройте книгу и посмотрите, как расположены ваши материалы.",
          "Книгу можно перелистывать как настоящую: пальцем на телефоне или планшете и мышью на компьютере.",
          "Если первоначальный вариант вам не подходит, вы сможете вернуться к редактированию и продолжить работу.",
        ],
      },
      {
        title: "6. Измените книгу по своему желанию",
        blocks: [
          "Первоначальная сборка — это не окончательный вариант.",
          "Вы сможете переставлять страницы и материалы, менять фотографии местами, заменять их, изменять их расположение и размер, добавлять или изменять тексты и подбирать оформление отдельных страниц.",
          "Создавайте книгу так, как нравится именно вам.",
        ],
      },
      {
        title: "7. Добавьте поздравления и воспоминания",
        blocks: [
          "Добавляйте на страницы свои поздравления, семейные истории, воспоминания, пожелания, памятные даты, подписи к фотографиям или стихотворения.",
          "Для каждой страницы вы сможете подобрать подходящий шрифт и оформление.",
        ],
      },
      {
        title: "8. Добавьте видео",
        blocks: [
          "Количество видео зависит от выбранного пакета. Максимально в одной книге можно разместить 5 видео.",
          "Продолжительность одного видео в готовой книге — до 5 минут.",
          "Если ваше видео длится до 5 минут, его можно добавить в книгу целиком без обработки для сокращения.",
          "Если исходное видео длится более 5 минут, но не более 30 минут, Project Joy поможет выбрать лучшие моменты и красиво объединить их в готовое видео продолжительностью до 5 минут.",
          "Перед подтверждением вы сможете посмотреть получившийся результат.",
          "После того как вы подтвердите готовое обработанное видео, длинный исходный видеофайл удаляется, а в вашей книге сохраняется подтверждённая версия продолжительностью до 5 минут.",
          "Максимальная продолжительность одного загружаемого исходного видео — 30 минут.",
        ],
      },
      {
        title: "9. Добавьте музыку",
        blocks: [
          "Выберите подходящую музыку из музыкальной коллекции Project Joy.",
          "Также Project Joy сможет помочь создать персональную музыку специально для вашей книги по вашему описанию.",
          "Например:",
          "«Тёплая семейная мелодия с нежным пианино, скрипкой и другими музыкальными инструментами, со спокойным и радостным звучанием для книги о нашей семье и детях».",
          "Вы сможете описать желаемое настроение и звучание музыки, чтобы она соответствовала вашей книге.",
          "Музыка будет сопровождать просмотр книги и поможет создать подходящую атмосферу.",
        ],
      },
      {
        title: "10. Проверьте готовую книгу",
        blocks: [
          "Перед завершением обязательно просмотрите книгу целиком.",
          "Откройте обложку и перелистайте книгу от первой до последней страницы. Проверьте фотографии, открытки, тексты, оформление, расположение материалов, видео и музыку.",
          "Если что-то вам не понравилось, вернитесь к редактированию и внесите необходимые изменения.",
        ],
      },
      {
        title: "11. Срок создания и хранения книги",
        blocks: [
          "С момента покупки пакета вам предоставляется 21 день для создания, редактирования, хранения и скачивания книги.",
          "Основной срок создания книги — 15 дней. Если вы не успели закончить её за это время, вы можете продолжить работу в оставшиеся дни общего 21-дневного срока.",
          "Если вы закончите книгу раньше — например, за один или два дня — она всё равно может храниться в Project Joy до окончания включённого 21-дневного срока с момента покупки пакета.",
          "После обработки длинных видео и подтверждения выбранных вариантов ненужные длинные исходные видеофайлы удаляются. В книге остаются подтверждённые готовые версии.",
          "Если вам необходимо хранить готовую книгу в Project Joy дольше, вы сможете приобрести дополнительный пакет хранения. Актуальный срок и стоимость дополнительного хранения будут указаны в соответствующем разделе покупки.",
          "Перед окончанием срока хранения Project Joy отправит вам уведомление с напоминанием:",
          "«Срок хранения вашей Книги воспоминаний и поздравлений скоро закончится. Пожалуйста, не забудьте скачать книгу на своё устройство или продлить срок её хранения.»",
        ],
      },
      {
        title: "12. Скачайте и сохраните свою книгу",
        blocks: [
          "Когда книга полностью готова, скачайте её на своё устройство.",
          "Мы рекомендуем обязательно скачать готовую книгу до окончания срока её хранения в Project Joy.",
          "Скачанную книгу можно сохранить для себя и передать своим родным, друзьям, коллегам или другим близким людям.",
          "Получатель сможет открыть книгу, перелистывать страницы, рассматривать фотографии и открытки, читать ваши поздравления и воспоминания, смотреть видео и слушать музыку.",
          "После скачивания готовая автономная книга должна работать независимо от срока её хранения в Project Joy.",
        ],
      },
    ],
  },

  en: {
    title: "How to use the “Book of Memories and Greetings” section",
    intro: [
      "Create your own interactive “Book of Memories and Greetings” from photos, videos, cards, memories and warm words.",
      "Project Joy will help you gather your materials into a real digital book. You will be able to review the result, change the arrangement of the materials, design the cover and the pages, and add greetings, videos and music.",
      "The finished book can be opened and turned page by page like a real one, with videos to watch and music to listen to.",
    ],
    sections: [
      {
        title: "1. Choose the size of the book",
        blocks: [
          "Before you start creating, choose a suitable package:",
          "- 5 leaves = 10 inner pages — up to 2 videos.",
          "- 10 leaves = 20 inner pages — up to 3 videos.",
          "- 15 leaves = 30 inner pages — up to 5 videos.",
          "1 leaf = 2 inner pages. The cover is not counted among the inner pages.",
          "The maximum size of one book is 15 leaves (30 inner pages) and no more than 5 videos.",
          "If you need more space while creating, you will be able to add extra leaves one by one until the book reaches its maximum size.",
          "A regular extra leaf adds two pages for photos, cards, greetings, text and beautiful design.",
          "An extra leaf with the option to place a video is the same full leaf with two pages. It can also hold photos, cards, greetings, text and design, but it additionally makes it possible to add one more video, if the maximum limit of 5 videos has not yet been reached.",
          "The price of the chosen package includes the use of the provided Project Joy tools for creating your book, as well as 21 days for creating, editing, storing and downloading it.",
          "For the current prices of packages, extra leaves and additional services, see the package purchase page.",
        ],
      },
      {
        title: "2. Add your materials",
        blocks: [
          "Upload the photos, cards and videos you want to keep in the book.",
          "You will also be able to use suitable materials you created earlier in Project Joy.",
          "You do not need to distribute everything across the pages yourself in advance. Project Joy will help to initially gather the uploaded materials and place them in the book.",
          "After that you will be able to open the assembled book, look at the result and change it as you wish.",
        ],
      },
      {
        title: "3. Create and design the cover",
        blocks: [
          "For the cover design you can choose one of the ready-made templates from the Project Joy collection or create your own unique cover from your description.",
          "Describe how you want the cover to look: its style, colours, background, decorations and other details. Project Joy will help create the design you want.",
          "Add a suitable title, for example:",
          "- “The story of our family”",
          "- “Our best memories”",
          "- “Happy anniversary, Mum!”",
          "- “To our colleague from his team”",
          "You will be able to match the cover and the title to the occasion, the content and the mood of your book.",
        ],
      },
      {
        title: "4. Create and design the pages",
        blocks: [
          "For each page of the book you can choose a ready-made Project Joy template or create your own design from your description.",
          "Describe what the page should be like: style, background, frames, decorations and other details — and Project Joy will help create a suitable design.",
          "After that, fill the pages with your photos, cards, videos, greetings, memories and text.",
          "For the text design you can choose beautiful Project Joy fonts. The font can be changed and chosen separately for each page of the book so that it matches its content and design.",
        ],
      },
      {
        title: "5. Review the assembled book",
        blocks: [
          "After the initial assembly, open the book and see how your materials are arranged.",
          "The book can be turned page by page like a real one: with your finger on a phone or tablet and with the mouse on a computer.",
          "If the initial version does not suit you, you will be able to return to editing and continue working.",
        ],
      },
      {
        title: "6. Change the book as you wish",
        blocks: [
          "The initial assembly is not the final version.",
          "You will be able to rearrange pages and materials, swap photos, replace them, change their position and size, add or change texts and choose the design of individual pages.",
          "Create the book exactly the way you like it.",
        ],
      },
      {
        title: "7. Add greetings and memories",
        blocks: [
          "Add your greetings, family stories, memories, wishes, memorable dates, photo captions or poems to the pages.",
          "For each page you will be able to choose a suitable font and design.",
        ],
      },
      {
        title: "8. Add videos",
        blocks: [
          "The number of videos depends on the chosen package. A maximum of 5 videos can be placed in one book.",
          "The length of one video in the finished book is up to 5 minutes.",
          "If your video lasts up to 5 minutes, it can be added to the book in full without processing to shorten it.",
          "If the source video lasts more than 5 minutes but no more than 30 minutes, Project Joy will help select the best moments and beautifully combine them into a finished video of up to 5 minutes.",
          "Before confirming, you will be able to watch the result.",
          "After you confirm the finished processed video, the long source video file is deleted, and the confirmed version of up to 5 minutes is kept in your book.",
          "The maximum length of one uploaded source video is 30 minutes.",
        ],
      },
      {
        title: "9. Add music",
        blocks: [
          "Choose suitable music from the Project Joy music collection.",
          "Project Joy will also be able to help create personal music especially for your book from your description.",
          "For example:",
          "“A warm family melody with gentle piano, violin and other musical instruments, with a calm and joyful sound for a book about our family and children.”",
          "You will be able to describe the desired mood and sound of the music so that it matches your book.",
          "The music will accompany the viewing of the book and help create the right atmosphere.",
        ],
      },
      {
        title: "10. Check the finished book",
        blocks: [
          "Before finishing, be sure to review the whole book.",
          "Open the cover and turn the book from the first to the last page. Check the photos, cards, texts, design, arrangement of the materials, videos and music.",
          "If something does not please you, return to editing and make the necessary changes.",
        ],
      },
      {
        title: "11. Time for creating and storing the book",
        blocks: [
          "From the moment you purchase the package you are given 21 days for creating, editing, storing and downloading the book.",
          "The main period for creating the book is 15 days. If you did not manage to finish it in that time, you can continue working during the remaining days of the total 21-day period.",
          "If you finish the book earlier — for example in one or two days — it can still be stored in Project Joy until the end of the included 21-day period from the moment the package was purchased.",
          "After long videos are processed and the selected versions are confirmed, the unneeded long source video files are deleted. The confirmed finished versions remain in the book.",
          "If you need to store the finished book in Project Joy for longer, you will be able to buy an additional storage package. The current duration and price of additional storage will be shown in the corresponding purchase section.",
          "Before the storage period ends, Project Joy will send you a reminder notification:",
          "“The storage period of your Book of Memories and Greetings will end soon. Please do not forget to download the book to your device or extend its storage period.”",
        ],
      },
      {
        title: "12. Download and keep your book",
        blocks: [
          "When the book is completely ready, download it to your device.",
          "We recommend downloading the finished book before the end of its storage period in Project Joy.",
          "The downloaded book can be kept for yourself and passed on to your family, friends, colleagues or other close people.",
          "The recipient will be able to open the book, turn the pages, look at the photos and cards, read your greetings and memories, watch the videos and listen to the music.",
          "After downloading, the finished standalone book should work independently of its storage period in Project Joy.",
        ],
      },
    ],
  },

  uk: {
    title: "Інструкція з використання розділу «Книга спогадів і привітань»",
    intro: [
      "Створіть свою інтерактивну «Книгу спогадів і привітань» із фотографій, відео, листівок, спогадів і теплих слів.",
      "Project Joy допоможе зібрати ваші матеріали у справжню цифрову книгу. Ви зможете переглянути результат, змінити розташування матеріалів, оформити обкладинку та сторінки, додати привітання, відео й музику.",
      "Готову книгу можна буде відкривати й гортати як справжню, дивитися відео та слухати музику.",
    ],
    sections: [
      {
        title: "1. Оберіть розмір книги",
        blocks: [
          "Перед початком створення оберіть відповідний пакет:",
          "- 5 аркушів = 10 внутрішніх сторінок — до 2 відео.",
          "- 10 аркушів = 20 внутрішніх сторінок — до 3 відео.",
          "- 15 аркушів = 30 внутрішніх сторінок — до 5 відео.",
          "1 аркуш = 2 внутрішні сторінки. Обкладинка не входить до кількості внутрішніх сторінок.",
          "Максимальний розмір однієї книги — 15 аркушів (30 внутрішніх сторінок) і не більше ніж 5 відео.",
          "Якщо під час створення вам знадобиться більше місця, ви зможете додавати додаткові аркуші по одному, доки книга не досягне максимального розміру.",
          "Звичайний додатковий аркуш додає дві сторінки для фотографій, листівок, привітань, тексту та гарного оформлення.",
          "Додатковий аркуш із можливістю розміщення відео — це такий самий повноцінний аркуш із двома сторінками. На ньому також можна розміщувати фотографії, листівки, привітання, текст і оформлення, але додатково з’являється можливість додати ще одне відео, якщо максимальний ліміт у 5 відео ще не досягнуто.",
          "У вартість обраного пакета входить використання передбачених інструментів Project Joy для створення вашої книги, а також 21 день для її створення, редагування, зберігання та завантаження.",
          "Актуальну вартість пакетів, додаткових аркушів і додаткових послуг дивіться на сторінці придбання пакетів.",
        ],
      },
      {
        title: "2. Додайте свої матеріали",
        blocks: [
          "Завантажте фотографії, листівки та відео, які хочете зберегти в книзі.",
          "Ви також зможете використати відповідні матеріали, раніше створені вами в Project Joy.",
          "Вам не потрібно заздалегідь самостійно розподіляти все по сторінках. Project Joy допоможе первинно зібрати завантажені матеріали та розмістити їх у книзі.",
          "Після цього ви зможете відкрити зібрану книгу, переглянути результат і змінити його на свій розсуд.",
        ],
      },
      {
        title: "3. Створіть і оформіть обкладинку",
        blocks: [
          "Для оформлення обкладинки ви можете обрати один із готових шаблонів із колекції Project Joy або створити власну унікальну обкладинку за своїм описом.",
          "Опишіть, якою ви хочете бачити обкладинку: її стиль, кольори, фон, прикраси та інші деталі. Project Joy допоможе створити оформлення за вашим бажанням.",
          "Додайте відповідну назву, наприклад:",
          "- «Історія нашої родини»",
          "- «Наші найкращі спогади»",
          "- «З ювілеєм, мамо!»",
          "- «Нашому колезі від його команди»",
          "Ви зможете підібрати обкладинку й назву відповідно до події, змісту та настрою вашої книги.",
        ],
      },
      {
        title: "4. Створіть і оформіть сторінки",
        blocks: [
          "Для кожної сторінки книги ви можете обрати готовий шаблон Project Joy або створити власне оформлення за своїм описом.",
          "Опишіть, якою має бути сторінка: стиль, фон, рамки, прикраси та інші деталі — і Project Joy допоможе створити відповідне оформлення.",
          "Після цього доповнюйте сторінки своїми фотографіями, листівками, відео, привітаннями, спогадами й текстом.",
          "Для оформлення тексту ви можете обирати гарні шрифти Project Joy. Шрифт можна змінювати й підбирати окремо для кожної сторінки книги, щоб він відповідав її змісту та оформленню.",
        ],
      },
      {
        title: "5. Перегляньте зібрану книгу",
        blocks: [
          "Після первинного складання відкрийте книгу й подивіться, як розташовані ваші матеріали.",
          "Книгу можна гортати як справжню: пальцем на телефоні чи планшеті та мишею на комп’ютері.",
          "Якщо первинний варіант вам не підходить, ви зможете повернутися до редагування й продовжити роботу.",
        ],
      },
      {
        title: "6. Змініть книгу на свій розсуд",
        blocks: [
          "Первинне складання — це не остаточний варіант.",
          "Ви зможете переставляти сторінки й матеріали, міняти фотографії місцями, замінювати їх, змінювати їхнє розташування та розмір, додавати або змінювати тексти й підбирати оформлення окремих сторінок.",
          "Створюйте книгу так, як подобається саме вам.",
        ],
      },
      {
        title: "7. Додайте привітання і спогади",
        blocks: [
          "Додавайте на сторінки свої привітання, родинні історії, спогади, побажання, пам’ятні дати, підписи до фотографій або вірші.",
          "Для кожної сторінки ви зможете підібрати відповідний шрифт і оформлення.",
        ],
      },
      {
        title: "8. Додайте відео",
        blocks: [
          "Кількість відео залежить від обраного пакета. Максимально в одній книзі можна розмістити 5 відео.",
          "Тривалість одного відео в готовій книзі — до 5 хвилин.",
          "Якщо ваше відео триває до 5 хвилин, його можна додати до книги повністю без обробки для скорочення.",
          "Якщо початкове відео триває понад 5 хвилин, але не більше ніж 30 хвилин, Project Joy допоможе обрати найкращі моменти й гарно поєднати їх у готове відео тривалістю до 5 хвилин.",
          "Перед підтвердженням ви зможете переглянути отриманий результат.",
          "Після того як ви підтвердите готове оброблене відео, довгий початковий відеофайл видаляється, а у вашій книзі зберігається підтверджена версія тривалістю до 5 хвилин.",
          "Максимальна тривалість одного завантажуваного початкового відео — 30 хвилин.",
        ],
      },
      {
        title: "9. Додайте музику",
        blocks: [
          "Оберіть відповідну музику з музичної колекції Project Joy.",
          "Також Project Joy зможе допомогти створити персональну музику спеціально для вашої книги за вашим описом.",
          "Наприклад:",
          "«Тепла родинна мелодія з ніжним піаніно, скрипкою та іншими музичними інструментами, зі спокійним і радісним звучанням для книги про нашу родину й дітей».",
          "Ви зможете описати бажаний настрій і звучання музики, щоб вона відповідала вашій книзі.",
          "Музика супроводжуватиме перегляд книги й допоможе створити відповідну атмосферу.",
        ],
      },
      {
        title: "10. Перевірте готову книгу",
        blocks: [
          "Перед завершенням обов’язково перегляньте книгу повністю.",
          "Відкрийте обкладинку й перегорніть книгу від першої до останньої сторінки. Перевірте фотографії, листівки, тексти, оформлення, розташування матеріалів, відео й музику.",
          "Якщо щось вам не сподобалося, поверніться до редагування та внесіть необхідні зміни.",
        ],
      },
      {
        title: "11. Термін створення та зберігання книги",
        blocks: [
          "З моменту придбання пакета вам надається 21 день для створення, редагування, зберігання та завантаження книги.",
          "Основний термін створення книги — 15 днів. Якщо ви не встигли закінчити її за цей час, ви можете продовжити роботу в решту днів загального 21-денного терміну.",
          "Якщо ви закінчите книгу раніше — наприклад, за один або два дні — вона все одно може зберігатися в Project Joy до закінчення включеного 21-денного терміну з моменту придбання пакета.",
          "Після обробки довгих відео та підтвердження обраних варіантів непотрібні довгі початкові відеофайли видаляються. У книзі залишаються підтверджені готові версії.",
          "Якщо вам необхідно зберігати готову книгу в Project Joy довше, ви зможете придбати додатковий пакет зберігання. Актуальний термін і вартість додаткового зберігання будуть зазначені у відповідному розділі придбання.",
          "Перед закінченням терміну зберігання Project Joy надішле вам повідомлення з нагадуванням:",
          "«Термін зберігання вашої Книги спогадів і привітань скоро закінчиться. Будь ласка, не забудьте завантажити книгу на свій пристрій або продовжити термін її зберігання.»",
        ],
      },
      {
        title: "12. Завантажте та збережіть свою книгу",
        blocks: [
          "Коли книга повністю готова, завантажте її на свій пристрій.",
          "Ми рекомендуємо обов’язково завантажити готову книгу до закінчення терміну її зберігання в Project Joy.",
          "Завантажену книгу можна зберегти для себе й передати своїм рідним, друзям, колегам або іншим близьким людям.",
          "Отримувач зможе відкрити книгу, гортати сторінки, розглядати фотографії та листівки, читати ваші привітання й спогади, дивитися відео та слухати музику.",
          "Після завантаження готова автономна книга має працювати незалежно від терміну її зберігання в Project Joy.",
        ],
      },
    ],
  },

  pl: {
    title: "Instrukcja korzystania z sekcji „Księga wspomnień i życzeń”",
    intro: [
      "Stwórz swoją interaktywną „Księgę wspomnień i życzeń” ze zdjęć, filmów, kartek, wspomnień i ciepłych słów.",
      "Project Joy pomoże zebrać Twoje materiały w prawdziwą cyfrową księgę. Będziesz mógł obejrzeć wynik, zmienić rozmieszczenie materiałów, zaprojektować okładkę i strony, dodać życzenia, filmy i muzykę.",
      "Gotową księgę będzie można otwierać i przewracać strony jak w prawdziwej, oglądać filmy i słuchać muzyki.",
    ],
    sections: [
      {
        title: "1. Wybierz rozmiar księgi",
        blocks: [
          "Przed rozpoczęciem tworzenia wybierz odpowiedni pakiet:",
          "- 5 kartek = 10 stron wewnętrznych — do 2 filmów.",
          "- 10 kartek = 20 stron wewnętrznych — do 3 filmów.",
          "- 15 kartek = 30 stron wewnętrznych — do 5 filmów.",
          "1 kartka = 2 strony wewnętrzne. Okładka nie wlicza się do liczby stron wewnętrznych.",
          "Maksymalny rozmiar jednej księgi to 15 kartek (30 stron wewnętrznych) i nie więcej niż 5 filmów.",
          "Jeśli podczas tworzenia będziesz potrzebować więcej miejsca, będziesz mógł dodawać dodatkowe kartki po jednej, dopóki księga nie osiągnie maksymalnego rozmiaru.",
          "Zwykła dodatkowa kartka dodaje dwie strony na zdjęcia, kartki, życzenia, tekst i piękne opracowanie graficzne.",
          "Dodatkowa kartka z możliwością umieszczenia filmu to taka sama pełna kartka z dwiema stronami. Można na niej również umieszczać zdjęcia, kartki, życzenia, tekst i oprawę graficzną, ale dodatkowo pojawia się możliwość dodania jeszcze jednego filmu, jeśli maksymalny limit 5 filmów nie został jeszcze osiągnięty.",
          "W cenie wybranego pakietu zawarte jest korzystanie z przewidzianych narzędzi Project Joy do tworzenia Twojej księgi, a także 21 dni na jej tworzenie, edytowanie, przechowywanie i pobieranie.",
          "Aktualne ceny pakietów, dodatkowych kartek i usług dodatkowych znajdziesz na stronie zakupu pakietów.",
        ],
      },
      {
        title: "2. Dodaj swoje materiały",
        blocks: [
          "Prześlij zdjęcia, kartki i filmy, które chcesz zachować w księdze.",
          "Będziesz mógł również wykorzystać odpowiednie materiały stworzone wcześniej przez Ciebie w Project Joy.",
          "Nie musisz z góry samodzielnie rozmieszczać wszystkiego na stronach. Project Joy pomoże wstępnie zebrać przesłane materiały i umieścić je w księdze.",
          "Następnie będziesz mógł otworzyć złożoną księgę, zobaczyć wynik i zmienić go według własnego uznania.",
        ],
      },
      {
        title: "3. Stwórz i zaprojektuj okładkę",
        blocks: [
          "Do zaprojektowania okładki możesz wybrać jeden z gotowych szablonów z kolekcji Project Joy albo stworzyć własną, unikalną okładkę według swojego opisu.",
          "Opisz, jak ma wyglądać okładka: jej styl, kolory, tło, ozdoby i inne szczegóły. Project Joy pomoże stworzyć oprawę zgodną z Twoim życzeniem.",
          "Dodaj odpowiedni tytuł, na przykład:",
          "- „Historia naszej rodziny”",
          "- „Nasze najlepsze wspomnienia”",
          "- „Wszystkiego najlepszego z okazji jubileuszu, Mamo!”",
          "- „Naszemu koledze od jego zespołu”",
          "Będziesz mógł dobrać okładkę i tytuł odpowiednio do wydarzenia, treści i nastroju Twojej księgi.",
        ],
      },
      {
        title: "4. Stwórz i zaprojektuj strony",
        blocks: [
          "Dla każdej strony księgi możesz wybrać gotowy szablon Project Joy albo stworzyć własną oprawę według swojego opisu.",
          "Opisz, jaka ma być strona: styl, tło, ramki, ozdoby i inne szczegóły — a Project Joy pomoże stworzyć odpowiednią oprawę.",
          "Następnie uzupełniaj strony swoimi zdjęciami, kartkami, filmami, życzeniami, wspomnieniami i tekstem.",
          "Do opracowania tekstu możesz wybierać piękne czcionki Project Joy. Czcionkę można zmieniać i dobierać osobno dla każdej strony księgi, aby odpowiadała jej treści i oprawie.",
        ],
      },
      {
        title: "5. Obejrzyj złożoną księgę",
        blocks: [
          "Po wstępnym złożeniu otwórz księgę i zobacz, jak rozmieszczone są Twoje materiały.",
          "Księgę można przewracać jak prawdziwą: palcem na telefonie lub tablecie i myszą na komputerze.",
          "Jeśli wstępna wersja Ci nie odpowiada, będziesz mógł wrócić do edycji i kontynuować pracę.",
        ],
      },
      {
        title: "6. Zmień księgę według własnego uznania",
        blocks: [
          "Wstępne złożenie to nie jest wersja ostateczna.",
          "Będziesz mógł przestawiać strony i materiały, zamieniać zdjęcia miejscami, wymieniać je, zmieniać ich położenie i rozmiar, dodawać lub zmieniać teksty oraz dobierać oprawę poszczególnych stron.",
          "Twórz księgę tak, jak podoba się właśnie Tobie.",
        ],
      },
      {
        title: "7. Dodaj życzenia i wspomnienia",
        blocks: [
          "Dodawaj na strony swoje życzenia, historie rodzinne, wspomnienia, dedykacje, pamiętne daty, podpisy do zdjęć lub wiersze.",
          "Dla każdej strony będziesz mógł dobrać odpowiednią czcionkę i oprawę.",
        ],
      },
      {
        title: "8. Dodaj filmy",
        blocks: [
          "Liczba filmów zależy od wybranego pakietu. Maksymalnie w jednej księdze można umieścić 5 filmów.",
          "Długość jednego filmu w gotowej księdze wynosi do 5 minut.",
          "Jeśli Twój film trwa do 5 minut, można go dodać do księgi w całości bez obróbki skracającej.",
          "Jeśli film źródłowy trwa dłużej niż 5 minut, ale nie więcej niż 30 minut, Project Joy pomoże wybrać najlepsze momenty i pięknie połączyć je w gotowy film o długości do 5 minut.",
          "Przed potwierdzeniem będziesz mógł obejrzeć uzyskany wynik.",
          "Po potwierdzeniu gotowego, przetworzonego filmu długi plik źródłowy zostaje usunięty, a w Twojej księdze zachowana zostaje potwierdzona wersja o długości do 5 minut.",
          "Maksymalna długość jednego przesyłanego filmu źródłowego to 30 minut.",
        ],
      },
      {
        title: "9. Dodaj muzykę",
        blocks: [
          "Wybierz odpowiednią muzykę z kolekcji muzycznej Project Joy.",
          "Project Joy będzie także mógł pomóc stworzyć osobistą muzykę specjalnie dla Twojej księgi według Twojego opisu.",
          "Na przykład:",
          "„Ciepła rodzinna melodia z delikatnym pianinem, skrzypcami i innymi instrumentami muzycznymi, o spokojnym i radosnym brzmieniu do księgi o naszej rodzinie i dzieciach”.",
          "Będziesz mógł opisać pożądany nastrój i brzmienie muzyki, aby odpowiadała Twojej księdze.",
          "Muzyka będzie towarzyszyć przeglądaniu księgi i pomoże stworzyć odpowiednią atmosferę.",
        ],
      },
      {
        title: "10. Sprawdź gotową księgę",
        blocks: [
          "Przed zakończeniem koniecznie przejrzyj całą księgę.",
          "Otwórz okładkę i przewróć księgę od pierwszej do ostatniej strony. Sprawdź zdjęcia, kartki, teksty, oprawę, rozmieszczenie materiałów, filmy i muzykę.",
          "Jeśli coś Ci się nie spodobało, wróć do edycji i wprowadź niezbędne zmiany.",
        ],
      },
      {
        title: "11. Czas tworzenia i przechowywania księgi",
        blocks: [
          "Od momentu zakupu pakietu otrzymujesz 21 dni na tworzenie, edytowanie, przechowywanie i pobieranie księgi.",
          "Podstawowy czas tworzenia księgi to 15 dni. Jeśli nie zdążysz jej skończyć w tym czasie, możesz kontynuować pracę w pozostałych dniach łącznego 21-dniowego terminu.",
          "Jeśli skończysz księgę wcześniej — na przykład w jeden lub dwa dni — może ona nadal być przechowywana w Project Joy do końca zawartego 21-dniowego terminu od momentu zakupu pakietu.",
          "Po obróbce długich filmów i potwierdzeniu wybranych wersji niepotrzebne długie pliki źródłowe zostają usunięte. W księdze pozostają potwierdzone gotowe wersje.",
          "Jeśli musisz przechowywać gotową księgę w Project Joy dłużej, będziesz mógł kupić dodatkowy pakiet przechowywania. Aktualny czas i cena dodatkowego przechowywania będą podane w odpowiedniej sekcji zakupu.",
          "Przed końcem okresu przechowywania Project Joy wyśle Ci powiadomienie z przypomnieniem:",
          "„Okres przechowywania Twojej Księgi wspomnień i życzeń wkrótce się skończy. Prosimy nie zapomnieć pobrać księgi na swoje urządzenie lub przedłużyć okres jej przechowywania.”",
        ],
      },
      {
        title: "12. Pobierz i zachowaj swoją księgę",
        blocks: [
          "Gdy księga jest całkowicie gotowa, pobierz ją na swoje urządzenie.",
          "Zalecamy koniecznie pobrać gotową księgę przed końcem okresu jej przechowywania w Project Joy.",
          "Pobraną księgę można zachować dla siebie i przekazać swoim bliskim, przyjaciołom, współpracownikom lub innym bliskim osobom.",
          "Odbiorca będzie mógł otworzyć księgę, przewracać strony, oglądać zdjęcia i kartki, czytać Twoje życzenia i wspomnienia, oglądać filmy i słuchać muzyki.",
          "Po pobraniu gotowa, samodzielna księga powinna działać niezależnie od okresu jej przechowywania w Project Joy.",
        ],
      },
    ],
  },

  de: {
    title: "Anleitung zur Nutzung des Bereichs „Buch der Erinnerungen und Grüße“",
    intro: [
      "Erstellen Sie Ihr interaktives „Buch der Erinnerungen und Grüße“ aus Fotos, Videos, Karten, Erinnerungen und warmen Worten.",
      "Project Joy hilft Ihnen, Ihre Materialien zu einem echten digitalen Buch zusammenzustellen. Sie können das Ergebnis ansehen, die Anordnung der Materialien ändern, den Umschlag und die Seiten gestalten sowie Grüße, Videos und Musik hinzufügen.",
      "Das fertige Buch lässt sich wie ein echtes öffnen und durchblättern, mit Videos zum Ansehen und Musik zum Anhören.",
    ],
    sections: [
      {
        title: "1. Wählen Sie die Größe des Buches",
        blocks: [
          "Wählen Sie vor Beginn der Erstellung ein passendes Paket:",
          "- 5 Blätter = 10 Innenseiten — bis zu 2 Videos.",
          "- 10 Blätter = 20 Innenseiten — bis zu 3 Videos.",
          "- 15 Blätter = 30 Innenseiten — bis zu 5 Videos.",
          "1 Blatt = 2 Innenseiten. Der Umschlag zählt nicht zur Anzahl der Innenseiten.",
          "Die maximale Größe eines Buches beträgt 15 Blätter (30 Innenseiten) und nicht mehr als 5 Videos.",
          "Wenn Sie während der Erstellung mehr Platz benötigen, können Sie zusätzliche Blätter einzeln hinzufügen, bis das Buch seine maximale Größe erreicht hat.",
          "Ein normales zusätzliches Blatt fügt zwei Seiten für Fotos, Karten, Grüße, Text und schöne Gestaltung hinzu.",
          "Ein zusätzliches Blatt mit der Möglichkeit, ein Video zu platzieren, ist dasselbe vollwertige Blatt mit zwei Seiten. Darauf können ebenfalls Fotos, Karten, Grüße, Text und Gestaltung platziert werden, zusätzlich entsteht jedoch die Möglichkeit, ein weiteres Video hinzuzufügen, sofern die Höchstgrenze von 5 Videos noch nicht erreicht ist.",
          "Im Preis des gewählten Pakets ist die Nutzung der vorgesehenen Project-Joy-Werkzeuge zur Erstellung Ihres Buches enthalten sowie 21 Tage für dessen Erstellung, Bearbeitung, Speicherung und Herunterladen.",
          "Die aktuellen Preise für Pakete, zusätzliche Blätter und Zusatzleistungen finden Sie auf der Seite zum Kauf der Pakete.",
        ],
      },
      {
        title: "2. Fügen Sie Ihre Materialien hinzu",
        blocks: [
          "Laden Sie die Fotos, Karten und Videos hoch, die Sie im Buch bewahren möchten.",
          "Sie können auch passende Materialien verwenden, die Sie zuvor in Project Joy erstellt haben.",
          "Sie müssen nicht im Voraus alles selbst auf die Seiten verteilen. Project Joy hilft, die hochgeladenen Materialien zunächst zusammenzustellen und im Buch zu platzieren.",
          "Danach können Sie das zusammengestellte Buch öffnen, das Ergebnis ansehen und nach Ihren Wünschen ändern.",
        ],
      },
      {
        title: "3. Erstellen und gestalten Sie den Umschlag",
        blocks: [
          "Für die Gestaltung des Umschlags können Sie eine der fertigen Vorlagen aus der Project-Joy-Kollektion wählen oder einen eigenen einzigartigen Umschlag nach Ihrer Beschreibung erstellen.",
          "Beschreiben Sie, wie Sie den Umschlag sehen möchten: Stil, Farben, Hintergrund, Verzierungen und weitere Details. Project Joy hilft, die Gestaltung nach Ihrem Wunsch zu erstellen.",
          "Fügen Sie einen passenden Titel hinzu, zum Beispiel:",
          "- „Die Geschichte unserer Familie“",
          "- „Unsere schönsten Erinnerungen“",
          "- „Alles Gute zum Jubiläum, Mama!“",
          "- „Unserem Kollegen von seinem Team“",
          "Sie können Umschlag und Titel passend zum Anlass, zum Inhalt und zur Stimmung Ihres Buches auswählen.",
        ],
      },
      {
        title: "4. Erstellen und gestalten Sie die Seiten",
        blocks: [
          "Für jede Seite des Buches können Sie eine fertige Project-Joy-Vorlage wählen oder eine eigene Gestaltung nach Ihrer Beschreibung erstellen.",
          "Beschreiben Sie, wie die Seite sein soll: Stil, Hintergrund, Rahmen, Verzierungen und weitere Details — und Project Joy hilft, eine passende Gestaltung zu erstellen.",
          "Ergänzen Sie die Seiten anschließend mit Ihren Fotos, Karten, Videos, Grüßen, Erinnerungen und Texten.",
          "Für die Textgestaltung können Sie schöne Project-Joy-Schriften wählen. Die Schrift lässt sich für jede Seite des Buches einzeln ändern und auswählen, damit sie zu deren Inhalt und Gestaltung passt.",
        ],
      },
      {
        title: "5. Sehen Sie sich das zusammengestellte Buch an",
        blocks: [
          "Öffnen Sie nach der ersten Zusammenstellung das Buch und sehen Sie, wie Ihre Materialien angeordnet sind.",
          "Das Buch lässt sich wie ein echtes durchblättern: mit dem Finger auf Telefon oder Tablet und mit der Maus am Computer.",
          "Wenn Ihnen die erste Version nicht zusagt, können Sie zur Bearbeitung zurückkehren und weiterarbeiten.",
        ],
      },
      {
        title: "6. Ändern Sie das Buch nach Ihren Wünschen",
        blocks: [
          "Die erste Zusammenstellung ist nicht die endgültige Version.",
          "Sie können Seiten und Materialien umstellen, Fotos vertauschen, ersetzen, ihre Position und Größe ändern, Texte hinzufügen oder ändern und die Gestaltung einzelner Seiten auswählen.",
          "Gestalten Sie das Buch so, wie es Ihnen gefällt.",
        ],
      },
      {
        title: "7. Fügen Sie Grüße und Erinnerungen hinzu",
        blocks: [
          "Fügen Sie den Seiten Ihre Grüße, Familiengeschichten, Erinnerungen, Wünsche, denkwürdige Daten, Bildunterschriften oder Gedichte hinzu.",
          "Für jede Seite können Sie eine passende Schrift und Gestaltung auswählen.",
        ],
      },
      {
        title: "8. Fügen Sie Videos hinzu",
        blocks: [
          "Die Anzahl der Videos hängt vom gewählten Paket ab. Maximal können in einem Buch 5 Videos platziert werden.",
          "Die Länge eines Videos im fertigen Buch beträgt bis zu 5 Minuten.",
          "Wenn Ihr Video bis zu 5 Minuten dauert, kann es vollständig und ohne kürzende Bearbeitung in das Buch aufgenommen werden.",
          "Wenn das Ausgangsvideo länger als 5 Minuten, aber nicht länger als 30 Minuten dauert, hilft Project Joy, die besten Momente auszuwählen und sie schön zu einem fertigen Video von bis zu 5 Minuten zusammenzufügen.",
          "Vor der Bestätigung können Sie sich das entstandene Ergebnis ansehen.",
          "Nachdem Sie das fertige bearbeitete Video bestätigt haben, wird die lange Ausgangsvideodatei gelöscht, und in Ihrem Buch bleibt die bestätigte Version von bis zu 5 Minuten erhalten.",
          "Die maximale Länge eines hochgeladenen Ausgangsvideos beträgt 30 Minuten.",
        ],
      },
      {
        title: "9. Fügen Sie Musik hinzu",
        blocks: [
          "Wählen Sie passende Musik aus der Musikkollektion von Project Joy.",
          "Project Joy kann außerdem helfen, nach Ihrer Beschreibung persönliche Musik speziell für Ihr Buch zu erstellen.",
          "Zum Beispiel:",
          "„Eine warme Familienmelodie mit sanftem Klavier, Geige und weiteren Musikinstrumenten, mit ruhigem und fröhlichem Klang für ein Buch über unsere Familie und Kinder.“",
          "Sie können die gewünschte Stimmung und den Klang der Musik beschreiben, damit sie zu Ihrem Buch passt.",
          "Die Musik begleitet das Betrachten des Buches und hilft, die passende Atmosphäre zu schaffen.",
        ],
      },
      {
        title: "10. Prüfen Sie das fertige Buch",
        blocks: [
          "Sehen Sie sich vor dem Abschluss unbedingt das gesamte Buch an.",
          "Öffnen Sie den Umschlag und blättern Sie das Buch von der ersten bis zur letzten Seite durch. Prüfen Sie Fotos, Karten, Texte, Gestaltung, Anordnung der Materialien, Videos und Musik.",
          "Wenn Ihnen etwas nicht gefallen hat, kehren Sie zur Bearbeitung zurück und nehmen Sie die notwendigen Änderungen vor.",
        ],
      },
      {
        title: "11. Frist für Erstellung und Speicherung des Buches",
        blocks: [
          "Ab dem Kauf des Pakets stehen Ihnen 21 Tage für die Erstellung, Bearbeitung, Speicherung und das Herunterladen des Buches zur Verfügung.",
          "Die Hauptfrist für die Erstellung des Buches beträgt 15 Tage. Wenn Sie es in dieser Zeit nicht fertigstellen konnten, können Sie in den verbleibenden Tagen der gesamten 21-Tage-Frist weiterarbeiten.",
          "Wenn Sie das Buch früher fertigstellen — zum Beispiel in einem oder zwei Tagen — kann es dennoch bis zum Ende der enthaltenen 21-Tage-Frist ab dem Kauf des Pakets in Project Joy gespeichert bleiben.",
          "Nach der Bearbeitung langer Videos und der Bestätigung der ausgewählten Varianten werden die nicht mehr benötigten langen Ausgangsvideodateien gelöscht. Im Buch bleiben die bestätigten fertigen Versionen.",
          "Wenn Sie das fertige Buch länger in Project Joy speichern müssen, können Sie ein zusätzliches Speicherpaket erwerben. Die aktuelle Dauer und der Preis der zusätzlichen Speicherung werden im entsprechenden Kaufbereich angegeben.",
          "Vor Ablauf der Speicherfrist sendet Ihnen Project Joy eine Erinnerungsbenachrichtigung:",
          "„Die Speicherfrist Ihres Buches der Erinnerungen und Grüße endet bald. Bitte vergessen Sie nicht, das Buch auf Ihr Gerät herunterzuladen oder die Speicherfrist zu verlängern.“",
        ],
      },
      {
        title: "12. Laden Sie Ihr Buch herunter und bewahren Sie es auf",
        blocks: [
          "Wenn das Buch vollständig fertig ist, laden Sie es auf Ihr Gerät herunter.",
          "Wir empfehlen, das fertige Buch unbedingt vor Ablauf seiner Speicherfrist in Project Joy herunterzuladen.",
          "Das heruntergeladene Buch können Sie für sich aufbewahren und Ihren Angehörigen, Freunden, Kollegen oder anderen nahestehenden Menschen weitergeben.",
          "Der Empfänger kann das Buch öffnen, die Seiten durchblättern, Fotos und Karten betrachten, Ihre Grüße und Erinnerungen lesen, die Videos ansehen und die Musik hören.",
          "Nach dem Herunterladen soll das fertige eigenständige Buch unabhängig von seiner Speicherfrist in Project Joy funktionieren.",
        ],
      },
    ],
  },

  fr: {
    title: "Guide d’utilisation de la section « Livre de souvenirs et de vœux »",
    intro: [
      "Créez votre « Livre de souvenirs et de vœux » interactif à partir de photos, de vidéos, de cartes, de souvenirs et de mots chaleureux.",
      "Project Joy vous aidera à rassembler vos matériaux dans un véritable livre numérique. Vous pourrez consulter le résultat, modifier la disposition des matériaux, créer la couverture et les pages, ajouter des vœux, des vidéos et de la musique.",
      "Le livre terminé pourra être ouvert et feuilleté comme un vrai livre, avec des vidéos à regarder et de la musique à écouter.",
    ],
    sections: [
      {
        title: "1. Choisissez la taille du livre",
        blocks: [
          "Avant de commencer la création, choisissez la formule qui vous convient :",
          "- 5 feuillets = 10 pages intérieures — jusqu’à 2 vidéos.",
          "- 10 feuillets = 20 pages intérieures — jusqu’à 3 vidéos.",
          "- 15 feuillets = 30 pages intérieures — jusqu’à 5 vidéos.",
          "1 feuillet = 2 pages intérieures. La couverture n’est pas comptée dans le nombre de pages intérieures.",
          "La taille maximale d’un livre est de 15 feuillets (30 pages intérieures) et de 5 vidéos au maximum.",
          "Si vous avez besoin de plus de place pendant la création, vous pourrez ajouter des feuillets supplémentaires un par un, jusqu’à ce que le livre atteigne sa taille maximale.",
          "Un feuillet supplémentaire ordinaire ajoute deux pages pour des photos, des cartes, des vœux, du texte et une belle mise en forme.",
          "Un feuillet supplémentaire permettant de placer une vidéo est un feuillet complet identique, avec deux pages. On peut également y placer des photos, des cartes, des vœux, du texte et une mise en forme, mais il offre en plus la possibilité d’ajouter une vidéo supplémentaire, si la limite maximale de 5 vidéos n’est pas encore atteinte.",
          "Le prix de la formule choisie comprend l’utilisation des outils Project Joy prévus pour créer votre livre, ainsi que 21 jours pour le créer, le modifier, le conserver et le télécharger.",
          "Pour les prix actuels des formules, des feuillets supplémentaires et des services supplémentaires, consultez la page d’achat des formules.",
        ],
      },
      {
        title: "2. Ajoutez vos matériaux",
        blocks: [
          "Téléversez les photos, les cartes et les vidéos que vous souhaitez conserver dans le livre.",
          "Vous pourrez également utiliser des matériaux appropriés que vous avez créés auparavant dans Project Joy.",
          "Vous n’avez pas besoin de répartir vous-même tout le contenu sur les pages à l’avance. Project Joy vous aidera à rassembler dans un premier temps les matériaux téléversés et à les placer dans le livre.",
          "Ensuite, vous pourrez ouvrir le livre assemblé, voir le résultat et le modifier à votre convenance.",
        ],
      },
      {
        title: "3. Créez et personnalisez la couverture",
        blocks: [
          "Pour la couverture, vous pouvez choisir l’un des modèles prêts à l’emploi de la collection Project Joy ou créer votre propre couverture unique d’après votre description.",
          "Décrivez la couverture que vous souhaitez : son style, ses couleurs, son fond, ses ornements et d’autres détails. Project Joy vous aidera à créer la mise en forme souhaitée.",
          "Ajoutez un titre approprié, par exemple :",
          "- « L’histoire de notre famille »",
          "- « Nos plus beaux souvenirs »",
          "- « Bon anniversaire, maman ! »",
          "- « À notre collègue, de la part de son équipe »",
          "Vous pourrez choisir la couverture et le titre en fonction de l’événement, du contenu et de l’ambiance de votre livre.",
        ],
      },
      {
        title: "4. Créez et personnalisez les pages",
        blocks: [
          "Pour chaque page du livre, vous pouvez choisir un modèle Project Joy prêt à l’emploi ou créer votre propre mise en forme d’après votre description.",
          "Décrivez ce que doit être la page : style, fond, cadres, ornements et autres détails — et Project Joy vous aidera à créer une mise en forme adaptée.",
          "Complétez ensuite les pages avec vos photos, vos cartes, vos vidéos, vos vœux, vos souvenirs et vos textes.",
          "Pour la mise en forme du texte, vous pouvez choisir de belles polices Project Joy. La police peut être modifiée et choisie séparément pour chaque page du livre, afin qu’elle corresponde à son contenu et à sa mise en forme.",
        ],
      },
      {
        title: "5. Consultez le livre assemblé",
        blocks: [
          "Après l’assemblage initial, ouvrez le livre et regardez comment vos matériaux sont disposés.",
          "Le livre peut être feuilleté comme un vrai : avec le doigt sur un téléphone ou une tablette et avec la souris sur un ordinateur.",
          "Si la version initiale ne vous convient pas, vous pourrez revenir à l’édition et poursuivre le travail.",
        ],
      },
      {
        title: "6. Modifiez le livre à votre convenance",
        blocks: [
          "L’assemblage initial n’est pas la version définitive.",
          "Vous pourrez déplacer les pages et les matériaux, intervertir les photos, les remplacer, modifier leur emplacement et leur taille, ajouter ou modifier des textes et choisir la mise en forme de chaque page.",
          "Créez le livre exactement comme il vous plaît.",
        ],
      },
      {
        title: "7. Ajoutez des vœux et des souvenirs",
        blocks: [
          "Ajoutez sur les pages vos vœux, vos histoires de famille, vos souvenirs, vos souhaits, des dates mémorables, des légendes de photos ou des poèmes.",
          "Pour chaque page, vous pourrez choisir une police et une mise en forme adaptées.",
        ],
      },
      {
        title: "8. Ajoutez des vidéos",
        blocks: [
          "Le nombre de vidéos dépend de la formule choisie. Un livre peut contenir au maximum 5 vidéos.",
          "La durée d’une vidéo dans le livre terminé est de 5 minutes maximum.",
          "Si votre vidéo dure jusqu’à 5 minutes, elle peut être ajoutée au livre en entier, sans traitement de raccourcissement.",
          "Si la vidéo source dure plus de 5 minutes, mais pas plus de 30 minutes, Project Joy vous aidera à choisir les meilleurs moments et à les assembler harmonieusement en une vidéo finale d’une durée maximale de 5 minutes.",
          "Avant de confirmer, vous pourrez visionner le résultat obtenu.",
          "Après que vous aurez confirmé la vidéo traitée, le long fichier vidéo source est supprimé, et la version confirmée d’une durée maximale de 5 minutes est conservée dans votre livre.",
          "La durée maximale d’une vidéo source téléversée est de 30 minutes.",
        ],
      },
      {
        title: "9. Ajoutez de la musique",
        blocks: [
          "Choisissez une musique appropriée dans la collection musicale de Project Joy.",
          "Project Joy pourra également aider à créer une musique personnelle spécialement pour votre livre, d’après votre description.",
          "Par exemple :",
          "« Une mélodie familiale chaleureuse avec un piano délicat, un violon et d’autres instruments de musique, à la sonorité calme et joyeuse, pour un livre consacré à notre famille et à nos enfants. »",
          "Vous pourrez décrire l’ambiance et la sonorité souhaitées pour que la musique corresponde à votre livre.",
          "La musique accompagnera la consultation du livre et aidera à créer l’atmosphère appropriée.",
        ],
      },
      {
        title: "10. Vérifiez le livre terminé",
        blocks: [
          "Avant de terminer, consultez impérativement le livre en entier.",
          "Ouvrez la couverture et feuilletez le livre de la première à la dernière page. Vérifiez les photos, les cartes, les textes, la mise en forme, la disposition des matériaux, les vidéos et la musique.",
          "Si quelque chose ne vous plaît pas, revenez à l’édition et apportez les modifications nécessaires.",
        ],
      },
      {
        title: "11. Délai de création et de conservation du livre",
        blocks: [
          "À partir de l’achat de la formule, vous disposez de 21 jours pour créer, modifier, conserver et télécharger le livre.",
          "Le délai principal de création du livre est de 15 jours. Si vous n’avez pas eu le temps de le terminer pendant cette période, vous pouvez poursuivre le travail durant les jours restants du délai total de 21 jours.",
          "Si vous terminez le livre plus tôt — par exemple en un ou deux jours — il peut tout de même être conservé dans Project Joy jusqu’à la fin du délai inclus de 21 jours à compter de l’achat de la formule.",
          "Après le traitement des longues vidéos et la confirmation des versions choisies, les longs fichiers vidéo sources devenus inutiles sont supprimés. Les versions finales confirmées restent dans le livre.",
          "Si vous devez conserver le livre terminé plus longtemps dans Project Joy, vous pourrez acheter une formule de conservation supplémentaire. La durée et le prix actuels de la conservation supplémentaire seront indiqués dans la section d’achat correspondante.",
          "Avant la fin de la période de conservation, Project Joy vous enverra une notification de rappel :",
          "« La période de conservation de votre Livre de souvenirs et de vœux se termine bientôt. N’oubliez pas de télécharger le livre sur votre appareil ou de prolonger sa période de conservation. »",
        ],
      },
      {
        title: "12. Téléchargez et conservez votre livre",
        blocks: [
          "Lorsque le livre est entièrement prêt, téléchargez-le sur votre appareil.",
          "Nous vous recommandons de télécharger impérativement le livre terminé avant la fin de sa période de conservation dans Project Joy.",
          "Le livre téléchargé peut être conservé pour vous et transmis à vos proches, vos amis, vos collègues ou d’autres personnes qui vous sont chères.",
          "Le destinataire pourra ouvrir le livre, feuilleter les pages, regarder les photos et les cartes, lire vos vœux et vos souvenirs, regarder les vidéos et écouter la musique.",
          "Après le téléchargement, le livre autonome terminé doit fonctionner indépendamment de sa période de conservation dans Project Joy.",
        ],
      },
    ],
  },
};
