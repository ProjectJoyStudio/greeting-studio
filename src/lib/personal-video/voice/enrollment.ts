// Client-safe prepared texts used to enroll a personal voice profile. Each
// language ships two short, phonetically varied sentences (never a greeting)
// so the clone hears a good spread of sounds from very little audio.

/** One prepared enrollment sentence a person reads aloud. */
export interface EnrollmentText {
  id: "sample1" | "sample2";
  text: string;
  words: number;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const RAW_ENROLLMENT_TEXTS: Record<string, [string, string]> = {
  en: [
    "The quick brown fox jumps over a lazy dog near the old oak tree.",
    "Bright stars twinkle above the quiet valley while owls hoot softly at midnight.",
  ],
  ru: [
    "Быстрая рыжая лиса перепрыгнула через ленивую собаку возле старого дуба.",
    "Яркие звёзды мерцают над тихой долиной, а совы тихо ухают в полночь.",
  ],
  de: [
    "Der schnelle braune Fuchs springt über den faulen Hund neben der alten Eiche.",
    "Helle Sterne funkeln über dem stillen Tal, während Eulen leise um Mitternacht rufen.",
  ],
  uk: [
    "Швидка руда лисиця перестрибнула через ледачого пса біля старого дуба.",
    "Яскраві зорі мерехтять над тихою долиною, а сови тихо кричать опівночі.",
  ],
  fr: [
    "Le rapide renard brun saute par-dessus le chien paresseux près du vieux chêne.",
    "Des étoiles brillantes scintillent au-dessus de la vallée calme pendant que les hiboux hululent doucement.",
  ],
  pl: [
    "Szybki brązowy lis przeskakuje nad leniwym psem obok starego dębu.",
    "Jasne gwiazdy migoczą nad cichą doliną, a sowy cicho pohukują o północy.",
  ],
};

const ENROLLMENT_TEXTS: Record<string, EnrollmentText[]> = Object.fromEntries(
  Object.entries(RAW_ENROLLMENT_TEXTS).map(([language, [sample1, sample2]]) => [
    language,
    [
      { id: "sample1", text: sample1, words: wordCount(sample1) },
      { id: "sample2", text: sample2, words: wordCount(sample2) },
    ],
  ]),
);

/** The two enrollment sentences for a language, falling back to English. */
export function enrollmentTexts(language: string): EnrollmentText[] {
  return ENROLLMENT_TEXTS[language] ?? ENROLLMENT_TEXTS.en;
}

/** One specific enrollment sentence, falling back to English. */
export function enrollmentText(
  language: string,
  id: "sample1" | "sample2",
): EnrollmentText {
  const found = enrollmentTexts(language).find((entry) => entry.id === id);
  return found ?? enrollmentTexts("en").find((entry) => entry.id === id)!;
}

/** i18n keys for the recording rules shown while enrolling a voice. */
export const ENROLLMENT_RULE_KEYS: string[] = [
  "mv_rule_quiet",
  "mv_rule_natural",
  "mv_rule_volume",
  "mv_rule_distance",
  "mv_rule_nomusic",
  "mv_rule_oneperson",
  "mv_rule_exact",
  "mv_rule_nochange",
];
