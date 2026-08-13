import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  LIVE_CARD_ATTEMPTS_PER_PACK,
  LIVE_CARD_PACK_CREDITS,
  liveCardAttemptState,
  type LiveCardAttemptState,
} from "./attempts";

/** Current attempt package of one live greeting card creation session. */
export const getLiveCardAttempts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionKey: string }) => {
    const sessionKey = String(input?.sessionKey ?? "").slice(0, 64);
    if (!sessionKey) throw new Error("session_required");
    return { sessionKey };
  })
  .handler(async ({ data, context }): Promise<LiveCardAttemptState> => {
    const { data: row } = await context.supabase
      .from("live_card_attempt_sessions")
      .select("attempts_used, packs_purchased")
      .eq("user_id", context.userId)
      .eq("session_key", data.sessionKey)
      .maybeSingle();
    if (!row) return liveCardAttemptState(0, 0);
    return liveCardAttemptState(row.attempts_used, row.packs_purchased);
  });

/**
 * Buys one package of three start-image attempts for a single credit. The
 * wallet is locked inside the database, so a double click, a refresh or a
 * repeated request can never charge twice.
 */
export const buyLiveCardAttemptPack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionKey: string }) => {
    const sessionKey = String(input?.sessionKey ?? "").slice(0, 64);
    if (!sessionKey) throw new Error("session_required");
    return { sessionKey };
  })
  .handler(
    async ({
      data,
      context,
    }): Promise<
      | { ok: true; attempts: LiveCardAttemptState; balance: number }
      | { ok: false; errorCode: string; balance: number }
    > => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: result, error } = await supabaseAdmin.rpc("buy_live_card_attempt_pack", {
        _user_id: context.userId,
        _session_key: data.sessionKey,
        _price: LIVE_CARD_PACK_CREDITS,
        _attempts_per_pack: LIVE_CARD_ATTEMPTS_PER_PACK,
      });
      if (error) return { ok: false, errorCode: "charge_failed", balance: 0 };
      const payload = (result ?? {}) as {
        ok?: boolean;
        error?: string;
        balance?: number;
        packs?: number;
        used?: number;
      };
      if (!payload.ok) {
        return {
          ok: false,
          errorCode: payload.error ?? "insufficient_credits",
          balance: payload.balance ?? 0,
        };
      }
      return {
        ok: true,
        attempts: liveCardAttemptState(payload.used ?? 0, payload.packs ?? 0),
        balance: payload.balance ?? 0,
      };
    },
  );
