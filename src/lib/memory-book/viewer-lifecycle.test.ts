import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

const runtimeFiles = ["page-flip.browser.js", "page-flip.module.js"];

describe.each(runtimeFiles)("page-turn lifecycle: %s", (file) => {
  const source = readFileSync(`node_modules/page-flip/dist/js/${file}`, "utf8");

  function renderer() {
    // Exercise the shipped renderer, not a separate copy of the implementation.
    const match = source.match(/class (\w+)\{constructor\(t,e\)\{this.leftPage=null/);
    if (!match || match.index === undefined) throw new Error("Renderer not found");
    const end = source.indexOf(`class `, match.index + match[0].length);
    const frames = new Map<number, (time: number) => void>();
    let id = 0;
    const context = vm.createContext({
      window: { navigator: { userAgent: "test" } },
      requestAnimationFrame: (callback: (time: number) => void) => {
        frames.set(++id, callback);
        return id;
      },
      cancelAnimationFrame: (handle: number) => frames.delete(handle),
    });
    const Render = vm.runInContext(`${source.slice(match.index, end)}; ${match[1]}`, context);
    const render = new Render({}, {});
    render.update = vi.fn();
    render.drawFrame = vi.fn();
    return { render, frames };
  }

  it("keeps one frame chain and cancels it without finishing the animation", () => {
    const { render, frames } = renderer();
    const completion = vi.fn();
    render.start();
    render.start();
    expect(frames.size).toBe(1);
    render.animation = { onAnimateEnd: completion };
    render.stop();
    render.stop();
    expect(frames.size).toBe(0);
    expect(render.animation).toBeNull();
    expect(completion).not.toHaveBeenCalled();
    render.start();
    expect(frames.size).toBe(0);
  });

  it("does not reschedule when disposed inside a frame callback", () => {
    const { render, frames } = renderer();
    render.start();
    render.animation = {
      frames: [() => render.stop()],
      startedAt: 0,
      durationFrame: 10,
    };
    const callback = [...frames.values()][0];
    frames.clear();
    if (!callback) throw new Error("Frame was not scheduled");
    callback(0);
    expect(frames.size).toBe(0);
    expect(render.drawFrame).not.toHaveBeenCalled();
  });
});