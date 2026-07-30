// Replicate-backed image engines. The token is read here and never leaves the
// server. Adding another Replicate engine is one entry in the list below.

import {
  GeneratorError,
  type ImageGenerator,
  type ImageOutput,
  type ImageRequest,
} from "./contracts.server";

const API_BASE = "https://api.replicate.com/v1";

type Prediction = {
  id?: string;
  status?: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: unknown;
  error?: unknown;
};

function extractUrl(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    const first = output.find((v) => typeof v === "string");
    return typeof first === "string" ? first : null;
  }
  if (output && typeof output === "object") {
    const maybe = (output as Record<string, unknown>).url ?? (output as Record<string, unknown>).image;
    if (typeof maybe === "string") return maybe;
  }
  return null;
}

function codeForStatus(status: number): string {
  if (status === 401 || status === 403) return "invalid_token";
  if (status === 402) return "insufficient_credit";
  if (status === 429) return "rate_limited";
  return "api_error";
}

async function runReplicate(
  key: string,
  model: string,
  input: Record<string, unknown>,
  timeoutMs = 180_000,
): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new GeneratorError("missing_token", "Image engine credentials are not configured.", key);
  }
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const createRes = await fetch(`${API_BASE}/models/${model}/predictions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ input }),
  });
  if (!createRes.ok) {
    const body = await createRes.text().catch(() => "");
    throw new GeneratorError(
      codeForStatus(createRes.status),
      `Image engine error [${createRes.status}]: ${body.slice(0, 400)}`,
      key,
    );
  }

  let prediction = (await createRes.json()) as Prediction;
  const startedAt = Date.now();
  while (prediction.status === "starting" || prediction.status === "processing") {
    if (Date.now() - startedAt > timeoutMs) {
      throw new GeneratorError("timeout", "The picture took too long to render.", key);
    }
    await new Promise((r) => setTimeout(r, 1500));
    const pollRes = await fetch(`${API_BASE}/predictions/${prediction.id}`, { headers });
    if (!pollRes.ok) {
      const body = await pollRes.text().catch(() => "");
      throw new GeneratorError(
        codeForStatus(pollRes.status),
        `Image engine error [${pollRes.status}]: ${body.slice(0, 400)}`,
        key,
      );
    }
    prediction = (await pollRes.json()) as Prediction;
  }

  if (prediction.status !== "succeeded") {
    const detail =
      typeof prediction.error === "string" ? prediction.error : JSON.stringify(prediction.error ?? null);
    throw new GeneratorError("generation_failed", `Rendering failed: ${detail.slice(0, 400)}`.trim(), key);
  }

  const url = extractUrl(prediction.output);
  if (!url) throw new GeneratorError("generation_failed", "The engine returned no picture.", key);
  return url;
}

/** FLUX 1.1 Pro Ultra — the first engine of the Live Greeting Cards section. */
export const fluxUltraGenerator: ImageGenerator = {
  key: "flux_ultra",
  model: "black-forest-labs/flux-1.1-pro-ultra",
  metrics: { quality: 10, cost: 4, speed: 6 },
  isAvailable: () => Boolean(process.env.REPLICATE_API_TOKEN),
  async generate(request: ImageRequest): Promise<ImageOutput> {
    const url = await runReplicate(fluxUltraGenerator.key, fluxUltraGenerator.model, {
      prompt: request.prompt,
      aspect_ratio: request.aspectRatio,
      output_format: "jpg",
      safety_tolerance: 2,
      raw: false,
    });
    return { url, contentType: "image/jpeg", fileExtension: "jpg" };
  },
};

/** Kept as a controlled second option so routing/fallback is real from day one. */
export const fluxProGenerator: ImageGenerator = {
  key: "flux_pro",
  model: "black-forest-labs/flux-1.1-pro",
  metrics: { quality: 8, cost: 6, speed: 8 },
  isAvailable: () => Boolean(process.env.REPLICATE_API_TOKEN),
  async generate(request: ImageRequest): Promise<ImageOutput> {
    const url = await runReplicate(fluxProGenerator.key, fluxProGenerator.model, {
      prompt: request.prompt,
      aspect_ratio: request.aspectRatio,
      output_format: "jpg",
      safety_tolerance: 2,
    });
    return { url, contentType: "image/jpeg", fileExtension: "jpg" };
  },
};