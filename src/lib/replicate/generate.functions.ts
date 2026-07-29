import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type GenerateTestImageResult =
  | { ok: true; imageUrl: string; predictionId: string }
  | { ok: false; errorCode: string; errorMessage: string };

export const generateTestImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prompt?: string } | undefined) => ({
    prompt:
      typeof input?.prompt === "string" && input.prompt.trim().length > 0
        ? input.prompt.trim().slice(0, 1000)
        : "Beautiful summer garden with colorful flowers, butterflies, soft sunlight, ultra realistic, high quality.",
  }))
  .handler(async ({ data }): Promise<GenerateTestImageResult> => {
    const { generateFluxImage, ReplicateError } = await import("./replicate.server");
    try {
      const { imageUrl, predictionId } = await generateFluxImage(data.prompt);
      return { ok: true, imageUrl, predictionId };
    } catch (err) {
      if (err instanceof ReplicateError) {
        return { ok: false, errorCode: err.code, errorMessage: err.message };
      }
      return {
        ok: false,
        errorCode: "unknown",
        errorMessage: err instanceof Error ? err.message : "Unexpected error.",
      };
    }
  });