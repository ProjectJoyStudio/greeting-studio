import { describe, expect, it } from "vitest";

import {
  finishedVideoMaterials,
  isPreparedVideo,
  sourceVideoMaterials,
  type MemoryBookMaterial,
} from "./materials";

function material(over: Partial<MemoryBookMaterial>): MemoryBookMaterial {
  return {
    id: "m1",
    kind: "video",
    url: "https://example.test/v.mp4",
    fileName: "v.mp4",
    durationSeconds: 10,
    sizeBytes: 100,
    createdAt: "2026-10-01T00:00:00Z",
    prepared: false,
    ...over,
  };
}

describe("Memory Book material sections", () => {
  it("source videos exclude finished (prepared) videos", () => {
    const source = material({ id: "s1" });
    const finished = material({ id: "f1", prepared: true });
    const list = sourceVideoMaterials([source, finished]);
    expect(list.map((m) => m.id)).toEqual(["s1"]);
  });

  it("finished videos are exactly the prepared ones", () => {
    const source = material({ id: "s1" });
    const finished = material({ id: "f1", prepared: true });
    const list = finishedVideoMaterials([source, finished]);
    expect(list.map((m) => m.id)).toEqual(["f1"]);
  });

  it("photos are never source or finished videos", () => {
    const photo = material({ id: "p1", kind: "photo", durationSeconds: null });
    expect(sourceVideoMaterials([photo])).toEqual([]);
    expect(finishedVideoMaterials([photo])).toEqual([]);
    expect(isPreparedVideo(photo)).toBe(false);
  });
});
