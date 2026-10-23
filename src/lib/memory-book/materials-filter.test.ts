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

  it("page-used videos with no assembled marker are finished and never picker sources", () => {
    const pageVideo = material({ id: "page", prepared: false, usedOnPage: true });
    expect(finishedVideoMaterials([pageVideo]).map(m => m.id)).toEqual(["page"]);
    expect(sourceVideoMaterials([pageVideo])).toEqual([]);
  });

  it("an assembled video used on multiple pages appears only in the finished partition once", () => {
    const both = material({ id: "both", prepared: true, usedOnPage: true });
    const source = material({ id: "source" });
    expect(finishedVideoMaterials([source, both]).map(m => m.id)).toEqual(["both"]);
    expect(sourceVideoMaterials([source, both]).map(m => m.id)).toEqual(["source"]);
  });
});
