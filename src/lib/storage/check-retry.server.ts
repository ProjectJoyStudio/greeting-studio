import type { StorageAdapter, StorageCheckResult } from "./types";

export const CHECK_MAX_ATTEMPTS = 4;
export const safeCode = (value: string | null): string | undefined =>
  value && /^[a-zA-Z0-9_.:-]{1,160}$/.test(value) ? value : undefined;

export function retryableCheck(result: StorageCheckResult): boolean {
  return result.state === "error" && (result.status === null ||
    [403, 408, 409, 425, 429].includes(result.status) || result.status >= 500);
}

/** Access denied is never absence. Retry only bounded, classified errors. */
export async function checkWithRetry(adapter: StorageAdapter, key: string, options: {
  sleep?: (ms: number) => Promise<void>; random?: () => number;
  report?: (result: StorageCheckResult, attempt: number) => Promise<void>;
} = {}): Promise<StorageCheckResult> {
  const sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const random = options.random ?? Math.random;
  let result: StorageCheckResult = { state: "error", status: null, detail: "network_failure" };
  for (let attempt = 1; attempt <= CHECK_MAX_ATTEMPTS; attempt++) {
    try { result = await adapter.check(key); }
    catch { result = { state: "error", status: null, detail: "network_failure" }; }
    await options.report?.(result, attempt);
    if (!retryableCheck(result) || attempt === CHECK_MAX_ATTEMPTS) return result;
    await sleep(250 * 2 ** (attempt - 1) * (0.75 + random() * 0.5));
  }
  return result;
}