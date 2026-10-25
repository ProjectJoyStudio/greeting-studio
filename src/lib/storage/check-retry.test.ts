import { describe, it, expect, vi } from "vitest";
import { checkWithRetry } from "./check-retry.server";
import type { StorageAdapter } from "./types";

describe("bounded destination checks", () => {
  const absent = { state: "missing" as const, status: 404 };
  const denied = { state: "error" as const, status: 403, detail: "http_403" };
  const run = (check: ReturnType<typeof vi.fn>, sleep = vi.fn(async (_ms: number) => {})) =>
    checkWithRetry({ check } as unknown as StorageAdapter, "key", { sleep, random: () => 0.5 });
  it("retries temporary 403 before accepting verified 404", async () => {
    const check = vi.fn().mockResolvedValueOnce(denied).mockResolvedValue(absent);
    expect(await run(check)).toEqual(absent); expect(check).toHaveBeenCalledTimes(2);
  });
  it("persistent 403 remains access denied after exactly four checks", async () => {
    const check = vi.fn().mockResolvedValue(denied), sleep = vi.fn(async (_ms: number) => {});
    expect(await run(check, sleep)).toEqual(denied); expect(check).toHaveBeenCalledTimes(4);
    expect(sleep.mock.calls.map(args => args[0])).toEqual([250, 500, 1000]);
  });
  it("does not retry genuine 404", async () => {
    const check = vi.fn().mockResolvedValue(absent); await run(check); expect(check).toHaveBeenCalledTimes(1);
  });
  it("retries temporary network exceptions without leaking their contents", async () => {
    const check = vi.fn().mockRejectedValueOnce(new Error("private signed URL")).mockResolvedValue(absent);
    expect(await run(check)).toEqual(absent); expect(check).toHaveBeenCalledTimes(2);
  });
  it.each([408,429,500,503])("retries transient HTTP %s", async status => {
    const check = vi.fn().mockResolvedValueOnce({ state: "error", status, detail: `http_${status}` }).mockResolvedValue(absent);
    expect(await run(check)).toEqual(absent); expect(check).toHaveBeenCalledTimes(2);
  });
  it("does not retry bad authentication 401", async () => {
    const check = vi.fn().mockResolvedValue({ state: "error", status: 401, detail: "http_401" });
    await run(check); expect(check).toHaveBeenCalledTimes(1);
  });
});