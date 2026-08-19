import { describe, expect, it } from "vitest";

import type { PvgVoiceover } from "./catalog";
import { isPlayablePvgVoiceover, pvgMixSources, pvgVoiceQueryKey } from "./voice-asset";

const asset = (voiceId: string): PvgVoiceover => ({
  voiceId,
  voiceName: "Test voice",
  provider: "elevenlabs",
  language: "en",
  durationSeconds: 2.4,
  characterCount: 28,
  generatedAt: "2026-08-19T12:00:00.000Z",
  modelId: "eleven_multilingual_v2",
  modelLabel: "Eleven Multilingual v2",
  creditsUsed: 28,
  audioUrl: "https://audio.test/current.mp3",
  greetingText: "A complete test congratulation.",
});

describe("Personal Video canonical congratulation speech", () => {
  it("accepts a playable Project Joy library voice asset", () => {
    expect(isPlayablePvgVoiceover(asset("library-voice-id"))).toBe(true);
  });

  it("accepts a playable custom My Voice asset returned under its provider voice id", () => {
    expect(isPlayablePvgVoiceover(asset("cloned-provider-voice-id"))).toBe(true);
  });

  it("uses one project-scoped cache identity in speech preview and sound settings", () => {
    expect(pvgVoiceQueryKey("project-1")).toEqual(["pvg", "voice", "project-1"]);
  });

  it("keeps both voice and music as separate mixer tracks", () => {
    expect(pvgMixSources(asset("voice"), "https://audio.test/music.mp3")).toEqual({
      voiceUrl: "https://audio.test/current.mp3",
      musicUrl: "https://audio.test/music.mp3",
    });
  });

  it("keeps speech playable when music is disabled", () => {
    expect(pvgMixSources(asset("voice"), null)).toEqual({
      voiceUrl: "https://audio.test/current.mp3",
      musicUrl: null,
    });
  });

  it("rejects an empty or non-playable provider result", () => {
    expect(isPlayablePvgVoiceover({ ...asset("voice"), audioUrl: null })).toBe(false);
    expect(isPlayablePvgVoiceover({ ...asset("voice"), durationSeconds: 0 })).toBe(false);
  });
});