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
  .handler(async ({ data, context }): Promise<GenerateTestImageResult> => {
    // Diagnostics may only be run by an administrator: it spends real money.
    const { data: isAdmin } = await (
      context.supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
      }
    ).rpc("is_admin", { _user_id: context.userId });
    if (isAdmin !== true) throw new Error("forbidden");

    const { runModel, ReplicateError, PRIMARY_MODEL, FALLBACK_MODEL } = await import("./replicate.server");
    const { generatorOrder, withGeneratorSlot } = await import(
      "@/lib/admin/generators/runtime.server"
    );
    const attempts: AttemptReport[] = [];

    // The saved Admin → Generators configuration is the source of truth here
    // as well: this page never reaches for an engine that is not routed.
    const MODEL_BY_KEY: Record<string, string> = {
      flux_schnell: PRIMARY_MODEL,
      flux_dev: FALLBACK_MODEL,
      flux_1_1_pro: "black-forest-labs/flux-1.1-pro",
    };
    const order = await generatorOrder("greeting_cards.image", Object.keys(MODEL_BY_KEY));
    const models = order.map((key) => MODEL_BY_KEY[key]!).filter(Boolean);
    if (!models.length) {
      return {
        ok: false,
        attempts: [
          {
            model: "-",
            ok: false,
            httpStatus: null,
            predictionId: null,
            predictionStatus: null,
            errorCode: "no_generator",
            errorMessage:
              "No Replicate image engine is selected and enabled for greeting cards in Admin → Generators.",
          },
        ],
      };
    }

    for (const model of models) {
      const key = order[models.indexOf(model)]!;
      try {
        const { imageUrl, diagnostics } = await withGeneratorSlot(key, () =>
          runModel(model, data.prompt),
        );
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
