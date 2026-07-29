import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AttemptReport = {
  model: string;
  ok: boolean;
  httpStatus: number | null;
  predictionId: string | null;
  predictionStatus: string | null;
  errorCode?: string;
  errorMessage?: string;
  detail?: string;
};

export type GenerateTestImageResult =
  | { ok: true; imageUrl: string; model: string; attempts: AttemptReport[] }
  | { ok: false; attempts: AttemptReport[] };

export const generateTestImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prompt?: string } | undefined) => ({
    prompt:
      typeof input?.prompt === "string" && input.prompt.trim().length > 0
        ? input.prompt.trim().slice(0, 1000)
        : "Beautiful summer garden with colorful flowers, butterflies, soft sunlight, ultra realistic, high quality.",
  }))
  .handler(async ({ data }): Promise<GenerateTestImageResult> => {
    const { runModel, ReplicateError, PRIMARY_MODEL, FALLBACK_MODEL } = await import("./replicate.server");
    const attempts: AttemptReport[] = [];

    // Exactly one attempt per model: primary, then a single controlled fallback.
    for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
      try {
        const { imageUrl, diagnostics } = await runModel(model, data.prompt);
        attempts.push({ ...diagnostics, ok: true });
        return { ok: true, imageUrl, model, attempts };
      } catch (err) {
        if (err instanceof ReplicateError) {
          attempts.push({ ...err.diagnostics, ok: false });
          // Token / billing / config problems are not fixed by another model.
          if (
            err.code === "missing_token" ||
            err.code === "invalid_token" ||
            err.code === "insufficient_credit"
          ) {
            break;
          }
        } else {
          attempts.push({
            model,
            ok: false,
            httpStatus: null,
            predictionId: null,
            predictionStatus: null,
            errorCode: "unknown",
            errorMessage: err instanceof Error ? err.message : "Unexpected error.",
          });
        }
      }
    }

    return { ok: false, attempts };
  });
