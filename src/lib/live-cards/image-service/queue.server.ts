// The private request queue of the Live Cards image service. It is an
// independent instance: pressure here never slows the greeting-card
// generator, and pressure there never reaches this section.

import { maxConcurrency, maxQueueLength, queueWaitMs } from "./config.server";
import { logInfo, logWarn } from "./log.server";

export class QueueFullError extends Error {
  code = "queue_full";
}

export class QueueTimeoutError extends Error {
  code = "queue_timeout";
}

type Waiter = { resolve: () => void; reject: (err: Error) => void; timer: ReturnType<typeof setTimeout> };

let running = 0;
const waiting: Waiter[] = [];

function release(): void {
  running -= 1;
  const next = waiting.shift();
  if (next) {
    clearTimeout(next.timer);
    running += 1;
    next.resolve();
  }
}

function acquire(): Promise<void> {
  if (running < maxConcurrency()) {
    running += 1;
    return Promise.resolve();
  }
  if (waiting.length >= maxQueueLength()) {
    logWarn("queue_full", { running, waiting: waiting.length });
    return Promise.reject(new QueueFullError("The Live Cards image service is busy. Please try again shortly."));
  }
  return new Promise<void>((resolve, reject) => {
    const waiter: Waiter = {
      resolve,
      reject,
      timer: setTimeout(() => {
        const index = waiting.indexOf(waiter);
        if (index >= 0) waiting.splice(index, 1);
        reject(new QueueTimeoutError("The Live Cards image service is busy. Please try again shortly."));
      }, queueWaitMs()),
    };
    waiting.push(waiter);
    logInfo("queued", { running, waiting: waiting.length });
  });
}

/** Runs one unit of work under the Live Cards concurrency budget. */
export async function withImageSlot<T>(task: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await task();
  } finally {
    release();
  }
}

/** Current pressure of this service, for logging and diagnostics. */
export function queueStats(): { running: number; waiting: number; capacity: number } {
  return { running, waiting: waiting.length, capacity: maxConcurrency() };
}