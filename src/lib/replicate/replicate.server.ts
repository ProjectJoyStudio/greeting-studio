// Server-only Replicate client. The token is read here and never leaves the server.

const API_BASE = "https://api.replicate.com/v1";

// Current official Black Forest Labs text-to-image models on Replicate.
// Primary uses the official-model endpoint (no hardcoded version hash).
export const PRIMARY_MODEL = "black-forest-labs/flux-schnell";
export const FALLBACK_MODEL = "black-forest-labs/flux-dev";

export type ReplicateErrorCode =
  | "missing_token"
  | "invalid_token"
  | "insufficient_credit"
  | "timeout"
  | "api_error"
  | "generation_failed";

export type AttemptDiagnostics = {
  model: string;
  httpStatus: number | null;
  predictionId: string | null;
  predictionStatus: string | null;
  errorCode?: ReplicateErrorCode;
  errorMessage?: string;
  detail?: string;
};

export class ReplicateError extends Error {
  code: ReplicateErrorCode;
  diagnostics: AttemptDiagnostics;

  constructor(code: ReplicateErrorCode, message: string, diagnostics: AttemptDiagnostics) {
    super(message);
    this.name = "ReplicateError";
    this.code = code;
    this.diagnostics = { ...diagnostics, errorCode: code, errorMessage: message };
  }
}

function readToken(): string {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new ReplicateError("missing_token", "REPLICATE_API_TOKEN is not configured on the server.", {
      model: "-",
      httpStatus: null,
      predictionId: null,
      predictionStatus: null,
    });
  }
  return token;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

type Prediction = {
  id?: string;
  status?: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: unknown;
  error?: unknown;
  logs?: unknown;
};

function extractImageUrl(output: unknown): string | null {
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

function codeForStatus(status: number): ReplicateErrorCode {
  if (status === 401 || status === 403) return "invalid_token";
  if (status === 402) return "insufficient_credit";
  return "api_error";
}

function messageForStatus(status: number, body: string): string {
  if (status === 401 || status === 403) return "Replicate rejected the API token (401/403).";
  if (status === 402) return "Replicate account has no credit. Enable billing at replicate.com/account/billing.";
  return `Replicate API error [${status}]: ${body.slice(0, 600)}`;
}

// Inputs kept strictly to the current flux-schnell / flux-dev schema.
// No null / undefined / deprecated fields are sent.
function buildInput(model: string, prompt: string): Record<string, unknown> {
  const base: Record<string, unknown> = {
    prompt,
    aspect_ratio: "1:1",
    num_outputs: 1,
    output_format: "webp",
  };
  if (model === PRIMARY_MODEL) base.go_fast = true;
  return base;
}

export type GenerationSuccess = {
  imageUrl: string;
  diagnostics: AttemptDiagnostics;
};

export async function runModel(
  model: string,
  prompt: string,
  timeoutMs = 120_000,
): Promise<GenerationSuccess> {
  const token = readToken();
  const diag: AttemptDiagnostics = {
    model,
    httpStatus: null,
    predictionId: null,
    predictionStatus: null,
  };

  // Official model endpoint — resolves the latest version server-side.
  const createRes = await fetch(`${API_BASE}/models/${model}/predictions`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ input: buildInput(model, prompt) }),
  });
  diag.httpStatus = createRes.status;

  if (!createRes.ok) {
    const body = await createRes.text().catch(() => "");
    throw new ReplicateError(codeForStatus(createRes.status), messageForStatus(createRes.status, body), diag);
  }

  let prediction = (await createRes.json()) as Prediction;
  diag.predictionId = prediction.id ?? null;
  diag.predictionStatus = prediction.status ?? null;

  const startedAt = Date.now();
  while (prediction.status === "starting" || prediction.status === "processing") {
    if (Date.now() - startedAt > timeoutMs) {
      throw new ReplicateError(
        "timeout",
        `Replicate did not reach a final status within ${Math.round(timeoutMs / 1000)}s.`,
        diag,
      );
    }
    await new Promise((r) => setTimeout(r, 1500));
    const pollRes = await fetch(`${API_BASE}/predictions/${prediction.id}`, {
      headers: authHeaders(token),
    });
    diag.httpStatus = pollRes.status;
    if (!pollRes.ok) {
      const body = await pollRes.text().catch(() => "");
      throw new ReplicateError(codeForStatus(pollRes.status), messageForStatus(pollRes.status, body), diag);
    }
    prediction = (await pollRes.json()) as Prediction;
    diag.predictionId = prediction.id ?? diag.predictionId;
    diag.predictionStatus = prediction.status ?? null;
  }

  if (prediction.status !== "succeeded") {
    const detail =
      typeof prediction.error === "string"
        ? prediction.error
        : prediction.error
          ? JSON.stringify(prediction.error).slice(0, 600)
          : "no error detail returned";
    diag.detail = detail;
    throw new ReplicateError(
      "generation_failed",
      `Prediction ${prediction.status ?? "unknown"}: ${detail}`,
      diag,
    );
  }

  const imageUrl = extractImageUrl(prediction.output);
  if (!imageUrl) {
    diag.detail = JSON.stringify(prediction.output ?? null).slice(0, 400);
    throw new ReplicateError("generation_failed", "Replicate returned no image URL in the output.", diag);
  }

  return { imageUrl, diagnostics: diag };
}
