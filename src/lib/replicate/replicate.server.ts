// Server-only Replicate client. The token is read here and never leaves the server.

const API_BASE = "https://api.replicate.com/v1";
// FLUX image model (official model endpoint).
const FLUX_MODEL = "black-forest-labs/flux-schnell";

export class ReplicateError extends Error {
  code:
    | "missing_token"
    | "invalid_token"
    | "insufficient_credit"
    | "timeout"
    | "api_error"
    | "generation_failed";
  status?: number;

  constructor(
    code: ReplicateError["code"],
    message: string,
    status?: number,
  ) {
    super(message);
    this.name = "ReplicateError";
    this.code = code;
    this.status = status;
  }
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function readToken(): string {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new ReplicateError(
      "missing_token",
      "REPLICATE_API_TOKEN is not configured on the server.",
    );
  }
  return token;
}

async function mapErrorResponse(res: Response): Promise<never> {
  const body = await res.text().catch(() => "");
  if (res.status === 401 || res.status === 403) {
    throw new ReplicateError(
      "invalid_token",
      "Replicate rejected the API token (401/403). Check that REPLICATE_API_TOKEN is valid.",
      res.status,
    );
  }
  if (res.status === 402) {
    throw new ReplicateError(
      "insufficient_credit",
      "Replicate account has no credit. Enable billing at replicate.com/account/billing.",
      res.status,
    );
  }
  throw new ReplicateError(
    "api_error",
    `Replicate API error [${res.status}]: ${body.slice(0, 500)}`,
    res.status,
  );
}

type Prediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: unknown;
  error?: unknown;
};

function extractImageUrl(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    const first = output.find((v) => typeof v === "string");
    return typeof first === "string" ? first : null;
  }
  return null;
}

export async function generateFluxImage(
  prompt: string,
  timeoutMs = 120_000,
): Promise<{ imageUrl: string; predictionId: string }> {
  const token = readToken();

  const createRes = await fetch(`${API_BASE}/models/${FLUX_MODEL}/predictions`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      input: { prompt, num_outputs: 1, output_format: "webp", aspect_ratio: "1:1" },
    }),
  });
  if (!createRes.ok) await mapErrorResponse(createRes);

  const created = (await createRes.json()) as Prediction;
  const startedAt = Date.now();
  let prediction = created;

  while (prediction.status === "starting" || prediction.status === "processing") {
    if (Date.now() - startedAt > timeoutMs) {
      throw new ReplicateError(
        "timeout",
        `Replicate did not finish within ${Math.round(timeoutMs / 1000)}s.`,
      );
    }
    await new Promise((r) => setTimeout(r, 1500));
    const pollRes = await fetch(`${API_BASE}/predictions/${prediction.id}`, {
      headers: authHeaders(token),
    });
    if (!pollRes.ok) await mapErrorResponse(pollRes);
    prediction = (await pollRes.json()) as Prediction;
  }

  if (prediction.status !== "succeeded") {
    throw new ReplicateError(
      "generation_failed",
      `Generation ${prediction.status}: ${
        typeof prediction.error === "string"
          ? prediction.error
          : JSON.stringify(prediction.error ?? {})
      }`,
    );
  }

  const imageUrl = extractImageUrl(prediction.output);
  if (!imageUrl) {
    throw new ReplicateError(
      "generation_failed",
      "Replicate returned no image URL in the prediction output.",
    );
  }

  return { imageUrl, predictionId: prediction.id };
}