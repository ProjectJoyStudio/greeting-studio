import { describe, expect, it } from "vitest";

import { chorusEntriesFor } from "./chorus";
import type { PersonalVoice } from "./personal-voices";
import type { PvgVoiceRecording } from "./recordings";

function personalVoice(id: string): PersonalVoice {
  return {
    id,
    displayName: `Voice ${id}`,
    scope: "library",
    projectId: null,
    language: "en",
    durationSeconds: 4,
    sourceUrl: `https://joy/${id}.mp3`,
    processedUrl: `https://joy/${id}-ready.mp3`,
    providerVoiceId: null,
    sampleCount: 1,
    previewUrl: null,
    processingStatus: "ready",
    processingError: null,
    consentConfirmed: true,
    createdAt: "",
    updatedAt: "",
  };
}

function recording(personId: string): PvgVoiceRecording {
  return {
    personId,
    language: "en",
    durationSeconds: 3,
    activeVersion: "processed",
    activeUrl: `https://joy/rec-${personId}.mp3`,
    originalUrl: null,
    processedUrl: null,
    enhancedUrl: null,
    processingStatus: "ready",
    processingError: null,
    voiceModelStatus: "not_requested",
    voiceModelId: null,
    permissionConfirmed: true,
    permissionConfirmedAt: null,
  };
}

function people(count: number, personal: Record<string, string> = {}) {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    label: `Person ${i + 1}`,
    personalVoiceId: personal[`p${i + 1}`] ?? null,
  }));
}

const empty = { assignments: {}, recordings: {}, personalVoices: [], chosen: [] };

describe("chorus validation counts every valid voice", () => {
  it("three Project Joy voices", () => {
    const entries = chorusEntriesFor({
      ...empty,
      participants: people(3),
      assignments: {
        p1: { id: "a", name: "A" },
        p2: { id: "b", name: "B" },
        p3: { id: "c", name: "C" },
      },
    });
    expect(entries).toHaveLength(3);
    expect(entries.every((e) => e.kind === "voice")).toBe(true);
  });

  it("three voices from My Voices", () => {
    const entries = chorusEntriesFor({
      ...empty,
      participants: people(3, { p1: "v1", p2: "v2", p3: "v3" }),
      personalVoices: [personalVoice("v1"), personalVoice("v2"), personalVoice("v3")],
    });
    expect(entries).toHaveLength(3);
    expect(entries.every((e) => e.kind === "audio")).toBe(true);
  });

  it("three temporary project recordings", () => {
    const entries = chorusEntriesFor({
      ...empty,
      participants: people(3),
      recordings: { p1: recording("p1"), p2: recording("p2"), p3: recording("p3") },
    });
    expect(entries).toHaveLength(3);
  });

  it("two My Voices and one Project Joy voice", () => {
    const entries = chorusEntriesFor({
      ...empty,
      participants: people(3, { p1: "v1", p2: "v2" }),
      personalVoices: [personalVoice("v1"), personalVoice("v2")],
      assignments: { p3: { id: "c", name: "C" } },
    });
    expect(entries).toHaveLength(3);
  });

  it("two Project Joy voices and one My Voice", () => {
    const entries = chorusEntriesFor({
      ...empty,
      participants: people(3, { p3: "v3" }),
      personalVoices: [personalVoice("v3")],
      assignments: { p1: { id: "a", name: "A" }, p2: { id: "b", name: "B" } },
    });
    expect(entries).toHaveLength(3);
  });

  it("one of each source", () => {
    const entries = chorusEntriesFor({
      ...empty,
      participants: people(3, { p2: "v2" }),
      personalVoices: [personalVoice("v2")],
      assignments: { p1: { id: "a", name: "A" } },
      recordings: { p3: recording("p3") },
    });
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.kind)).toEqual(["voice", "audio", "audio"]);
  });

  it("five participants with mixed sources", () => {
    const entries = chorusEntriesFor({
      ...empty,
      participants: people(5, { p2: "v2", p5: "v5" }),
      personalVoices: [personalVoice("v2"), personalVoice("v5")],
      assignments: { p1: { id: "a", name: "A" }, p4: { id: "d", name: "D" } },
      recordings: { p3: recording("p3") },
    });
    expect(entries).toHaveLength(5);
  });

  it("still warns when fewer than two participants have a voice", () => {
    const entries = chorusEntriesFor({
      ...empty,
      participants: people(3),
      assignments: { p1: { id: "a", name: "A" } },
    });
    expect(entries).toHaveLength(1);
  });

  it("keeps freely chosen voices when a participant has none", () => {
    const entries = chorusEntriesFor({
      ...empty,
      participants: people(2),
      chosen: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
        { id: "c", name: "C" },
      ],
    });
    expect(entries).toHaveLength(3);
  });
});
