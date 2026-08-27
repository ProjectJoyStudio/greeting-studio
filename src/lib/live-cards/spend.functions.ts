import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LIVE_CARD_PACK_CREDITS } from "./attempts";

/**
 * Credits the person has really spent on exactly one live greeting card
 * project. Read straight from the authoritative records: the paid start-image
 * packages of the creation session and the credits still charged on the
 * animations of that session. Refunded work carries no charge any more, so
 * failed attempts never show up here.
 */
export const getLiveCardProjectSpend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { sessionId?: string | null }) => ({
    sessionId: String(input?.sessionId ?? "").slice(0, 64) || null,
  }))
  .handler(async ({ data, context }): Promise<{ spent: number }> => {
    if (!data.sessionId) return { spent: 0 };

    const [{ data: session }, { data: animations }] = await Promise.all([
      context.supabase
        .from("live_card_attempt_sessions")
        .select("packs_purchased")
        .eq("user_id", context.userId)
        .eq("session_key", data.sessionId)
        .maybeSingle(),
      context.supabase
        .from("live_card_animations")
        .select("credits_charged")
        .eq("user_id", context.userId)
        .eq("session_id", data.sessionId),
    ]);

    const packs = (session?.packs_purchased ?? 0) * LIVE_CARD_PACK_CREDITS;
    const animated = (animations ?? []).reduce(
      (sum, row) => sum + Math.max(0, (row as { credits_charged: number | null }).credits_charged ?? 0),
      0,
    );
    return { spent: packs + animated };
  });
