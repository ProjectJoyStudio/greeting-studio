import { describe, expect, it } from "vitest";

import { autoAssignVoices, recommendVoices } from "./auto-assign";
import { voiceCategory, type LibraryVoice } from "@/lib/voice-library/types";

function voice(id: string, gender: string): LibraryVoice {
  return {
    id,
    provider: "elevenlabs",
    externalVoiceId: id,
    name: id,
    displayName: id,
    description: "",
    gender,
    language: "en",
    category: gender,
    modelCompatibility: [],
    isActive: true,
    sortOrder: 0,
    importedAt: "",
    previews: [
      { language: "en", audioUrl: `https://x/${id}.mp3`, durationSeconds: 3, characterCount: 40, generatedAt: "" },
    ],
  };
}

const VOICES = [
  voice("f1", "female"),
  voice("f2", "female"),
  voice("f3", "female"),
  voice("m1", "male"),
  voice("m2", "male"),
  voice("m3", "male"),
  voice("c1", "child"),
];

function run(cats: ("female" | "male" | "children")[], confirmedIds: string[] = []) {
  return autoAssignVoices({
    participants: cats.map((c, i) => ({
      id: `p${i}`,
      category: c,
      confirmed: confirmedIds.includes(`p${i}`),
      voiceId: confirmedIds.includes(`p${i}`) ? "f1" : null,
      words: 10,
    })),
    voices: VOICES,
    language: "en",
    budgetSeconds: 20,
    secondsPerWord: () => 0.5,
  });
}

const groupOf = (id: string) =>
  voiceCategory(VOICES.find((v) => v.externalVoiceId === id)!);

describe("automatic voice assignment", () => {
  it("two male participants get only male voices", () => {
    const out = run(["male", "male"]);
    expect(out).toHaveLength(2);
    expect(out.every((s) => groupOf(s.voiceId) === "male")).toBe(true);
  });

  it("two female participants get only female voices", () => {
    const out = run(["female", "female"]);
    expect(out.every((s) => groupOf(s.voiceId) === "female")).toBe(true);
  });

  it("one male and one female keep their own group", () => {
    const out = run(["male", "female"]);
    expect(groupOf(out[0]!.voiceId)).toBe("male");
    expect(groupOf(out[1]!.voiceId)).toBe("female");
  });

  it("two males and two females never cross groups", () => {
    const out = run(["male", "male", "female", "female"]);
    expect(out.map((s) => groupOf(s.voiceId))).toEqual(["male", "male", "female", "female"]);
  });

  it("five mixed participants each keep their group and voice", () => {
    const out = run(["male", "female", "children", "male", "female"]);
    expect(out.map((s) => groupOf(s.voiceId))).toEqual([
      "male",
      "female",
      "children",
      "male",
      "female",
    ]);
    expect(new Set(out.map((s) => s.voiceId)).size).toBe(5);
  });

  it("confirmed voices are left untouched", () => {
    const out = run(["female", "female"], ["p0"]);
    expect(out.map((s) => s.personId)).toEqual(["p1"]);
    expect(out[0]!.voiceId).not.toBe("f1");
  });

  it("recommendations never leave the group", () => {
    expect(recommendVoices(VOICES, "male", "en").every((v) => voiceCategory(v) === "male")).toBe(
      true,
    );
    expect(
      recommendVoices(VOICES, "children", "en").every((v) => voiceCategory(v) === "children"),
    ).toBe(true);
  });
});
