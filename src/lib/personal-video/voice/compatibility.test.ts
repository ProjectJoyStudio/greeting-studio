import { describe, expect, it } from "vitest";

import { compatibleReplacements, fitsWithGroup } from "./compatibility";
import { groupSyncCheck, naturalTarget } from "./sync-limits";
import type { LibraryVoice } from "@/lib/voice-library/types";

function voice(id: string, gender: string, order: number): LibraryVoice {
  return {
    id,
    externalVoiceId: id,
    provider: "elevenlabs",
    name: id,
    displayName: id,
    gender,
    accent: null,
    age: null,
    useCase: null,
    description: null,
    sortOrder: order,
    isActive: true,
    previews: [{ language: "en", audioUrl: `https://x/${id}.mp3` }],
  } as unknown as LibraryVoice;
}

describe("natural synchronisation limits", () => {
  it("finds a middle length instead of the longest voice", () => {
    const target = naturalTarget([4, 4.4]);
    expect(target).not.toBeNull();
    expect(target!).toBeGreaterThan(4);
    expect(target!).toBeLessThan(4.4);
  });

  it("never stretches a short voice far to reach a slow one", () => {
    expect(naturalTarget([3, 6])).toBeNull();
    expect(groupSyncCheck([3, 6]).ok).toBe(false);
  });

  it("keeps the group inside the video length", () => {
    expect(groupSyncCheck([4, 4.2], 4).ok).toBe(true);
    expect(groupSyncCheck([8, 8.2], 3).ok).toBe(false);
  });
});

describe("recommended replacements", () => {
  const context = {
    others: [4, 4.1],
    words: 8,
    budgetSeconds: 6,
    secondsPerWord: (id: string) => (id === "slow" ? 0.9 : id === "fast" ? 0.2 : 0.52),
    measured: (id: string) => id === "good",
    blocked: new Set<string>(["blockedVoice"]),
  };

  it("rejects voices that cannot keep step with the current group", () => {
    expect(fitsWithGroup("slow", context)).toBe(false);
    expect(fitsWithGroup("fast", context)).toBe(false);
    expect(fitsWithGroup("good", context)).toBe(true);
  });

  it("never recommends a voice that already failed for this greeting", () => {
    expect(fitsWithGroup("blockedVoice", context)).toBe(false);
  });

  it("shows only compatible voices, best first", () => {
    const list = compatibleReplacements(
      [
        voice("slow", "male", 1),
        voice("good", "male", 2),
        voice("ok", "male", 3),
        voice("fast", "male", 4),
      ],
      "male",
      "en",
      context,
    );
    expect(list.map((v) => v.externalVoiceId)).toEqual(["good", "ok"]);
  });
});
