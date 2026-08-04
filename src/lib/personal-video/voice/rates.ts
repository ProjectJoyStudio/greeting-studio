// How quickly each Project Joy voice actually speaks. The pace is measured
// from real recordings, so the length Project Joy promises before generation
// and the length of the finished greeting always agree.

import { PVG_DEFAULT_SECONDS_PER_WORD } from "./speech";

const STORE_KEY = "pj-voice-pace";

type Paces = Record<string, number>;

function keyOf(voiceId: string, language: string): string {
  return `${voiceId}:${language}`;
}

function read(): Paces {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Paces) : {};
  } catch {
    return {};
  }
}

/** Seconds one word takes with this voice, as measured before. */
export function secondsPerWord(voiceId: string | null, language: string): number {
  if (!voiceId) return PVG_DEFAULT_SECONDS_PER_WORD;
  const found = read()[keyOf(voiceId, language)];
  return found && found > 0 ? found : PVG_DEFAULT_SECONDS_PER_WORD;
}

/** Remembers the pace of a voice from a recording Project Joy just made. */
export function rememberPace(
  voiceId: string,
  language: string,
  words: number,
  seconds: number,
  speed = 1,
): void {
  if (typeof window === "undefined" || words < 2 || seconds <= 0) return;
  const measured = (seconds * Math.max(0.5, speed)) / words;
  if (!Number.isFinite(measured) || measured <= 0 || measured > 2) return;
  const all = read();
  const before = all[keyOf(voiceId, language)];
  // A gentle average keeps the pace steady across greetings.
  all[keyOf(voiceId, language)] = before ? Math.round((before * 0.6 + measured * 0.4) * 1000) / 1000 : Math.round(measured * 1000) / 1000;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(all));
  } catch {
    /* a full storage never stops a greeting */
  }
}
