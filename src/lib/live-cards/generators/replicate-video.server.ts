// Animation engines (picture → living greeting card). The engine name, model
// and vendor never reach the interface: the routing layer is the only caller.

import { liveCardsDurations } from "../env.server";
import {
  GeneratorError,
  type VideoGenerator,
  type VideoJob,
  type VideoProgress,
  type VideoRequest,
} from "./contracts.server";

const API_BASE = "https://api.replicate.com/v1";

function codeForStatus(status: number): string {
  if (status === 401 || status === 403) return "invalid_token";
  if (status === 402) return "insufficient_credit";
  if (status === 429) return "rate_limited";
  return "api_error";
}

function extractUrl(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    const first = output.find((v) => typeof v === "string");
    return typeof first === "string" ? first : null;
  }
  if (output && typeof output === "object") {
    const maybe = (output as Record<string, unknown>).video ?? (output as Record<string, unknown>).url;
    if (typeof maybe === "string") return maybe;
  }
  return null;
}

function headers(key: string): Record<string, string> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new GeneratorError("missing_token", "Animation engine credentials are not configured.", key);
  }
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function startPrediction(
  key: string,
  model: string,
  input: Record<string, unknown>,
): Promise<VideoJob> {
  const res = await fetch(`${API_BASE}/models/${model}/predictions`, {
    method: "POST",
    headers: headers(key),
    body: JSON.stringify({ input }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GeneratorError(
      codeForStatus(res.status),
      `Animation engine error [${res.status}]: ${body.slice(0, 400)}`,
      key,
    );
  }
  const json = (await res.json()) as { id?: string };
  if (!json.id) throw new GeneratorError("api_error", "The animation engine returned no job.", key);
  return { jobId: json.id };
}

async function readPrediction(key: string, jobId: string): Promise<VideoProgress> {
  const res = await fetch(`${API_BASE}/predictions/${jobId}`, { headers: headers(key) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return {
      state: "failed",
      errorCode: codeForStatus(res.status),
      errorMessage: `Animation engine error [${res.status}]: ${body.slice(0, 400)}`,
    };
  }
  const p = (await res.json()) as { status?: string; output?: unknown; error?: unknown };
  if (p.status === "starting") return { state: "queued" };
  if (p.status === "processing") return { state: "processing" };
  if (p.status === "succeeded") {
    const url = extractUrl(p.output);
    if (!url) {
      return { state: "failed", errorCode: "generation_failed", errorMessage: "No animation was returned." };
    }
    return { state: "succeeded", url, contentType: "video/mp4", fileExtension: "mp4" };
  }
  const detail = typeof p.error === "string" ? p.error : JSON.stringify(p.error ?? null);
  return {
    state: "failed",
    errorCode: p.status === "canceled" ? "cancelled" : "generation_failed",
    errorMessage: `Animation failed: ${detail.slice(0, 400)}`.trim(),
  };
}

/** First animation engine of the Live Greeting Cards section. */
export const wanImageToVideoGenerator: VideoGenerator = {
  key: "wan_i2v",
  model: process.env.LIVE_CARDS_WAN_MODEL || "wan-video/wan-2.7-i2v",
  metrics: { quality: 9, cost: 5, speed: 5 },
  durations: () => liveCardsDurations(),
  isAvailable: () => Boolean(process.env.REPLICATE_API_TOKEN),
  start(request: VideoRequest) {
    // The length always comes from the person's choice; only the resolution is
    // a Project Joy default. The chosen value is never silently replaced.
    return startPrediction(wanImageToVideoGenerator.key, wanImageToVideoGenerator.model, {
      first_frame: request.imageUrl,
      prompt: request.prompt,
      duration: request.durationSeconds,
      resolution: "720p",
      enable_prompt_expansion: true,
    });
  },
  progress(jobId: string) {
    return readPrediction(wanImageToVideoGenerator.key, jobId);
  },
};
