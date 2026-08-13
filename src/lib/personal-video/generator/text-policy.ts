// Whether the customer asked for visible writing inside the picture.
//
// Project Joy never puts words into a picture by itself. The name of the
// person receiving the greeting and the occasion are used to plan the scene,
// never to print anything on it. Only when the customer's own description
// clearly asks for writing does the engine get permission to draw words.

const TEXT_WORDS = [
  // English
  "text",
  "caption",
  "subtitle",
  "letter",
  "lettering",
  "word",
  "writing",
  "written",
  "inscription",
  "sign",
  "banner",
  "poster",
  "label",
  "message on",
  "logo",
  // Russian / Ukrainian
  "текст",
  "надпис",
  "подпис",
  "буквы",
  "літери",
  "слова",
  "плакат",
  "баннер",
  "банер",
  "вывеск",
  "вивіск",
  "логотип",
  // German
  "schrift",
  "beschriftung",
  "aufschrift",
  "buchstaben",
  "banner",
  "plakat",
  // French
  "texte",
  "inscription",
  "lettres",
  "affiche",
  "pancarte",
  // Polish
  "tekst",
  "napis",
  "litery",
  "plakat",
];

/** True when the customer's own words ask for writing inside the picture. */
export function wantsVisibleText(description: string): boolean {
  const d = description.toLowerCase();
  return TEXT_WORDS.some((w) => d.includes(w));
}

/** The plain instruction that keeps a picture or a film free of writing. */
export const NO_TEXT_INSTRUCTION =
  "No text of any kind: no captions, no subtitles, no titles, no letters, no numbers, no words, no signs, no banners, no logos, no watermarks and no fake or unreadable writing anywhere in the image.";

export const NO_NEW_TEXT_IN_VIDEO_INSTRUCTION =
  "Do not add any writing that is not already in the picture: no subtitles, no captions, no translations, no titles, no logos, no watermarks and no fake or unreadable letters. Keep the approved scene exactly as it is.";
