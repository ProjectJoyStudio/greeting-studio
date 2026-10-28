import { describe, expect, it } from "vitest";
import { autoTurnAction, viewerPageWidth } from "./viewer-navigation";

const reading = { position: 0, faceCount: 12, ready: true, turning: false, frozen: false, hidden: false };
describe("automatic reader navigation", () => {
  it("advances each of the ten internal pages from the front cover", () => {
    for (let position = 0; position < 11; position++) {
      expect(autoTurnAction({ ...reading, position })).toBe("next");
    }
  });
  it("stops at the 5-leaf back cover", () => {
    expect(autoTurnAction({ ...reading, position: 11 })).toBe("stop");
  });
  it("stops at the 15-leaf back cover", () => {
    expect(autoTurnAction({ ...reading, faceCount: 32, position: 31 })).toBe("stop");
  });
  it("waits during rotation while the engine is unavailable", () => {
    expect(autoTurnAction({ ...reading, ready: false })).toBe("wait");
  });
  it("never overlaps a physical turn", () => {
    expect(autoTurnAction({ ...reading, turning: true })).toBe("wait");
  });
  it("waits for a photo or video to close", () => {
    expect(autoTurnAction({ ...reading, frozen: true })).toBe("wait");
    expect(autoTurnAction(reading)).toBe("next");
  });
  it("waits in a background browser tab", () => {
    expect(autoTurnAction({ ...reading, hidden: true })).toBe("wait");
  });
  it("does not exceed narrow available width or landscape height", () => {
    expect(viewerPageWidth(120, 400, true)).toBe(120);
    expect(viewerPageWidth(800, 120, false)).toBe(90);
  });
});