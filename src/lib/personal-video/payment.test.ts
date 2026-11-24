import { describe, it, expect, vi, beforeEach } from "vitest";
import { pvgPaymentInput } from "./payment-input";
import { videoCredits, PVS_MAX_SECONDS } from "./video-setup";
import { PVR_REGENERATION_CREDITS } from "./video-render";

const controls = vi.hoisted(() => ({
  engines: ["kling_avatar_v2", "rw_pvideo_avatar"],
  failAfterResponse: false,
}));
vi.mock("@/lib/admin/generators/runtime.server", () => ({
  generatorOrder: async () => controls.engines,
  withGeneratorSlot: async (_key: string, run: () => Promise<unknown>) => {
    const result = await run();
    if (controls.failAfterResponse) throw new Error("post_acceptance_failure");
    return result;
  },
}));
vi.mock("@/lib/runware/runware.server", () => ({
  runwareStartVideo: vi.fn(),
  runwareProgress: vi.fn(),
  RunwareError: class extends Error {},
}));
import { startFinalVideo, pollStage, PvgSubmissionUncertain } from "./generator/pipeline.server";
import { runwareStartVideo } from "@/lib/runware/runware.server";

const input = {
  imageUrl: "https://example.invalid/photo",
  audioUrl: "https://example.invalid/audio",
  prompt: "Smile",
  audioSeconds: 10,
};
beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  controls.engines = ["kling_avatar_v2", "rw_pvideo_avatar"];
  controls.failAfterResponse = false;
  process.env["PVG_VIDEO_API_TOKEN"] = "isolated-mock-token";
});

describe("PVG payment rules", () => {
  it("preserves the 15-second maximum", () => expect(PVS_MAX_SECONDS).toBe(15));
  it("preserves current duration prices", () => {
    expect(videoCredits(5)).toBe(5);
    expect(videoCredits(10)).toBe(10);
    expect(videoCredits(15)).toBe(15);
  });
  it("preserves the existing additional-film price", () =>
    expect(PVR_REGENERATION_CREDITS).toBe(5));
  it("does not accept caller price, discount, user, refund or payment status", () => {
    const parsed = pvgPaymentInput.parse({
      projectId: "aa000000-0000-4000-8000-000000000001",
      previousVideoId: null,
      price: 0,
      userId: "another-user",
      discount: 100,
      paid: true,
      refundAmount: 999,
    });
    expect(parsed).toEqual({
      projectId: "aa000000-0000-4000-8000-000000000001",
      previousVideoId: null,
    });
  });
  it("requires an explicit stable predecessor, including initial null", () => {
    expect(
      pvgPaymentInput.safeParse({ projectId: "aa000000-0000-4000-8000-000000000001" }).success,
    ).toBe(false);
  });
});

describe("isolated mocked provider acceptance", () => {
  it("checkpoints before the external submission", async () => {
    const order: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        order.push("provider");
        return Response.json({ id: "prediction-one" });
      }),
    );
    const result = await startFinalVideo({
      ...input,
      beforeSubmit: async () => {
        order.push("checkpoint");
      },
    });
    expect(order).toEqual(["checkpoint", "provider"]);
    expect(result.predictionId).toBe("prediction-one");
  });
  it("never starts a fallback after transport timeout", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("timeout");
    });
    vi.stubGlobal("fetch", fetcher);
    await expect(startFinalVideo(input)).rejects.toBeInstanceOf(PvgSubmissionUncertain);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(runwareStartVideo).not.toHaveBeenCalled();
  });
  it("never falls back after ambiguous HTTP 500 acceptance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("error", { status: 500 })),
    );
    await expect(startFinalVideo(input)).rejects.toBeInstanceOf(PvgSubmissionUncertain);
    expect(runwareStartVideo).not.toHaveBeenCalled();
  });
  it("never treats an accepted response without an ID as a rejection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({})),
    );
    await expect(startFinalVideo(input)).rejects.toBeInstanceOf(PvgSubmissionUncertain);
  });
  it("does not submit a backup after a failure following acceptance", async () => {
    controls.failAfterResponse = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ id: "accepted-one" })),
    );
    await expect(startFinalVideo(input)).rejects.toBeInstanceOf(PvgSubmissionUncertain);
    expect(runwareStartVideo).not.toHaveBeenCalled();
  });
  it("recognizes a definite provider rejection when no backup is configured", async () => {
    controls.engines = ["kling_avatar_v2"];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("rejected", { status: 422 })),
    );
    await expect(startFinalVideo(input)).rejects.toMatchObject({
      name: "PvgStageError",
      code: "api_error",
    });
  });
  it("does not call a provider when the durable checkpoint fails", async () => {
    controls.engines = ["kling_avatar_v2"];
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(
      startFinalVideo({
        ...input,
        beforeSubmit: async () => {
          throw new Error("checkpoint failure");
        },
      }),
    ).rejects.toThrow("checkpoint failure");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("retains paid progress when polling is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network timeout");
      }),
    );
    expect(await pollStage("prediction-one")).toEqual({ state: "processing" });
  });
  it("records verified asynchronous provider failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ status: "failed", error: "technical failure" })),
    );
    expect((await pollStage("prediction-one")).state).toBe("failed");
  });
  it("records successful provider output as ready, not refunded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ status: "succeeded", output: "https://example.invalid/final.mp4" }),
      ),
    );
    expect((await pollStage("prediction-one")).state).toBe("ready");
  });
});
