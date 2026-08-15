// Server-only generic Replicate runner. The token is read here and never
// leaves the server. Used by the text and transcription backup adapters.

const API_BASE = "https://api.replicate.com/v1";

function token(): string {
  const value = process.env["REPLICATE_API_TOKEN"];
  if (!value) throw new Error("REPLICATE_API_TOKEN is not configured on the server.");
  return value;
}

type Prediction = {
  id?: string;
  status?: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: unknown;
  error?: unknown;
};

/** Joins the streaming-style array output of text models into one string. */
export function joinOutput(output: unknown): string {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) return output.filter((v) => typeof v === "string").join("");
  if (output && typeof output === "object") {
    const text = (output as Record<string, unknown>)["text"];
    if (typeof text === "string") return text;
  }
  return "";
}

/** Runs one official Replicate model to completion and returns its output. */
export async function runReplicate(
  model: string,
  input: Record<string, unknown>,
  timeoutMs = 120_000,
): Promise<unknown> {
  const headers = {
    Authorization: `Bearer ${token()}`,
    "Content-Type": "application/json",
  };

  const created = await fetch(`${API_BASE}/models/${model}/predictions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ input }),
  });
  if (!created.ok) {
    const body = await created.text().catch(() => "");
    throw new Error(`Replicate error [${created.status}]: ${body.slice(0, 400)}`);
  }

  let prediction = (await created.json()) as Prediction;
  const startedAt = Date.now();
  while (prediction.status === "starting" || prediction.status === "processing") {
    if (Date.now() - startedAt > timeoutMs) throw new Error("Replicate timed out.");
    await new Promise((r) => setTimeout(r, 1200));
    const polled = await fetch(`${API_BASE}/predictions/${prediction.id}`, { headers });
    if (!polled.ok) {
      const body = await polled.text().catch(() => "");
      throw new Error(`Replicate error [${polled.status}]: ${body.slice(0, 400)}`);
    }
    prediction = (await polled.json()) as Prediction;
  }

  if (prediction.status !== "succeeded") {
    const detail =
      typeof prediction.error === "string" ? prediction.error : (prediction.status ?? "unknown");
    throw new Error(`Replicate prediction ${detail}`);
  }
  return prediction.output;
}
