import { describe, expect, it } from "vitest";

import { comboKey, solveGroup, type GroupMember } from "./group-solver";
import type { LibraryVoice } from "@/lib/voice-library/types";

function voice(id: string, gender: string, order: number): LibraryVoice {
  return {
    id,
    externalVoiceId: id,
    provider: "elevenlabs",
    name: id,
    displayName: id,
    gender,
    sortOrder: order,
    isActive: true,
    previews: [{ language: "en", audioUrl: `https://x/${id}.mp3` }],
  } as unknown as LibraryVoice;
}

const pace: Record<string, number> = {
  papa: 0.5,
  mama: 0.52,
  bella: 0.95,
  emma: 0.51,
  nora: 0.53,
  slowa: 0.95,
};

const library = [
  voice("emma", "female", 1),
  voice("nora", "female", 2),
  voice("slowa", "female", 3),
  voice("papa", "male", 4),
];

function member(
  id: string,
  voiceId: string,
  category: "female" | "male",
  preservation: GroupMember["preservation"],
): GroupMember {
  return {
    personId: id,
    label: id,
    voiceId,
    voiceName: voiceId,
    category,
    preservation,
  };
}

const context = {
  words: 8,
  budgetSeconds: 9,
  secondsPerWord: (id: string) => pace[id] ?? 0.52,
};

describe("whole-group voice solving", () => {
  it("leaves a working group untouched", () => {
    const plan = solveGroup(
      [member("a", "papa", "male", "personal"), member("b", "mama", "female", "personal")],
      library,
      "en",
      context,
    );
    expect(plan.alreadyFine).toBe(true);
    expect(plan.changes).toHaveLength(0);
  });

  it("changes only the one voice that breaks the group", () => {
    const plan = solveGroup(
      [
        member("a", "papa", "male", "personal"),
        member("b", "mama", "female", "personal"),
        member("c", "bella", "female", "manual"),
      ],
      library,
      "en",
      context,
      { failingPersonId: "c" },
    );
    expect(plan.changes).toHaveLength(1);
    expect(plan.changes[0]!.personId).toBe("c");
    expect(["emma", "nora"]).toContain(plan.changes[0]!.to.externalVoiceId);
  });

  it("keeps personal voices and never proposes a voice that breaks another", () => {
    const plan = solveGroup(
      [
        member("a", "papa", "male", "personal"),
        member("b", "mama", "female", "personal"),
        member("c", "bella", "female", "manual"),
      ],
      library,
      "en",
      context,
      { failingPersonId: "c" },
    );
    expect(plan.changes.some((c) => c.personId !== "c")).toBe(false);
    expect(plan.alternatives.map((v) => v.externalVoiceId)).not.toContain("slowa");
  });

  it("never returns to a combination that already failed", () => {
    const members = [
      member("a", "papa", "male", "personal"),
      member("b", "mama", "female", "personal"),
      member("c", "bella", "female", "manual"),
    ];
    const failed = new Set([
      comboKey(["papa", "mama", "emma"]),
      comboKey(["papa", "mama", "nora"]),
    ]);
    const plan = solveGroup(
      members,
      library,
      "en",
      { ...context, failedCombos: failed },
      {
        failingPersonId: "c",
      },
    );
    // Whatever it proposes, the resulting complete set is never one that has
    // already been proven not to work.
    const resulting = members.map(
      (m) => plan.changes.find((c) => c.personId === m.personId)?.to.externalVoiceId ?? m.voiceId,
    );
    expect(failed.has(comboKey(resulting))).toBe(false);
  });

  it("stops instead of looping when nothing can work", () => {
    const plan = solveGroup(
      [member("a", "papa", "male", "manual"), member("b", "bella", "female", "manual")],
      [voice("slowa", "female", 1)],
      "en",
      { ...context, blocked: new Set(["slowa"]) },
      { failingPersonId: "b" },
    );
    expect(plan.impossible).toBe(true);
    expect(plan.changes).toHaveLength(0);
  });
});
