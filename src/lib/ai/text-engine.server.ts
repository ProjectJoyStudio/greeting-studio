// ---------------------------------------------------------------------------
// Project Joy — provider-independent writing engine.
//
// The business logic asks for text; this layer decides which engine serves the
// request, following the Admin -> Generators settings. Lovable AI and the
// Replicate backup implement the very same internal interface, so a page never
// depends on one provider.
// ---------------------------------------------------------------------------

import { generatorOrder, withGeneratorSlot } from "@/lib/admin/generators/runtime.server";
import { findGenerator } from "@/lib/admin/generators/registry";

export interface TextRequest {
  /** Registry function id, e.g. "greeting_cards.prompt_translation". */
  functionId: string;
  system: string;
  user: string;
}

async function viaLovable(model: string, req: TextRequest): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("No writing credential configured.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Writing service responded ${res.status}.`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Writing service returned no text.");
  return text;
}

async function viaReplicate(model: string, req: TextRequest): Promise<string> {
  const { runReplicate, joinOutput } = await import("@/lib/replicate/run.server");
  const output = await runReplicate(model, {
    prompt: req.user,
    system_instruction: req.system,
    temperature: 1,
  });
  const text = joinOutput(output).trim();
  if (!text) throw new Error("Backup writing service returned no text.");
  return text;
}

/** Runware writing engines receive the very same instructions. */
async function viaRunware(generatorKey: string, req: TextRequest): Promise<string> {
  const { runwareGenerateText } = await import("@/lib/runware/runware.server");
  return runwareGenerateText({ generatorKey, system: req.system, user: req.user });
}


/**
 * Writes text with the engine an administrator selected. The backup is used
 * only after a real technical failure of the engine before it, and each engine
 * is asked at most once per request — no duplicate paid calls.
 */
export async function completeText(req: TextRequest, candidates: string[]): Promise<string> {
  const order = await generatorOrder(req.functionId, candidates);
  let lastError: unknown = null;

  for (const key of order) {
    const generator = findGenerator(key);
    if (!generator) continue;
    try {
      return await withGeneratorSlot(key, () => {
        if (generator.provider === "Runware") return viaRunware(key, req);
        if (generator.provider === "Replicate") return viaReplicate(generator.model, req);
        return viaLovable(generator.model, req);
      });

    } catch (err) {
      lastError = err;
      console.error(`Text engine "${key}" failed for ${req.functionId}:`, err);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No writing engine available.");
}
