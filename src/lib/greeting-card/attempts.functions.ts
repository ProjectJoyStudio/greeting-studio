import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ATTEMPTS_PER_PACK,
  ATTEMPT_PACK_CREDITS,
  attemptState,
  type CardAttemptState,
} from "./attempts";

/** Reads (and creates on first use) the attempt counter of one card creation. */
export const getCardAttempts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionKey: string }) => {
    const sessionKey = String(input?.sessionKey ?? "").slice(0, 64);
    if (!sessionKey) throw new Error("session_required");
    return { sessionKey };
  })
  .handler(
    async ({ data, context }): Promise<CardAttemptState & { cardId: string | null }> => {
      const { data: row } = await context.supabase
        .from("user_card_attempt_sessions")
        .select("attempts_used, extra_packs, closed_at, card_id")
        .eq("user_id", context.userId)
        .eq("session_key", data.sessionKey)
        .maybeSingle();
      // A finished card order keeps its history, but never funds a new card.
      if (row?.closed_at) return { ...attemptState(0, 0), cardId: null };
      if (!row) {
        await context.supabase
          .from("user_card_attempt_sessions")
          .insert({ user_id: context.userId, session_key: data.sessionKey })
          .select("id")
          .maybeSingle();
        return { ...attemptState(0, 0), cardId: null };
      }
      return { ...attemptState(row.attempts_used, row.extra_packs), cardId: row.card_id ?? null };
    },
  );

/**
 * Continue from the personal cabinet: finds the attempt package that belongs to
 * one specific unfinished card, so its remaining attempts come back with it.
 */
export const getAttemptsForCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cardId: string }) => {
    const cardId = String(input?.cardId ?? "").slice(0, 60);
    if (!cardId) throw new Error("card_required");
    return { cardId };
  })
  .handler(
    async ({
      data,
      context,
    }): Promise<{ sessionKey: string | null; attempts: CardAttemptState }> => {
      const { data: row } = await context.supabase
        .from("user_card_attempt_sessions")
        .select("session_key, attempts_used, extra_packs, closed_at")
        .eq("user_id", context.userId)
        .eq("card_id", data.cardId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!row || row.closed_at) return { sessionKey: null, attempts: attemptState(0, 0) };
      return {
        sessionKey: row.session_key,
        attempts: attemptState(row.attempts_used, row.extra_packs),
      };
    },
  );


/**
 * Buys one more package of attempts for a single credit. The credit is taken
 * with a conditional write, so a double click can never charge twice.
 */
export const buyCardAttemptPack = createServerFn({ method: "POST" })
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
      | { ok: true; attempts: CardAttemptState; balance: number }
      | { ok: false; errorCode: string; balance: number }
    > => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: session } = await context.supabase
        .from("user_card_attempt_sessions")
        .select("id, attempts_used, extra_packs, closed_at")
        .eq("user_id", context.userId)
        .eq("session_key", data.sessionKey)
        .maybeSingle();
      // A completed card order can never be topped up again.
      if (session?.closed_at) return { ok: false, errorCode: "session_closed", balance: 0 };
      const current = session ?? { id: null, attempts_used: 0, extra_packs: 0 };

      const { data: wallet } = await supabaseAdmin
        .from("credit_wallets")
        .select("id, balance, lifetime_spent")
        .eq("user_id", context.userId)
        .maybeSingle();
      const w = wallet as { id: string; balance: number; lifetime_spent: number } | null;
      if (!w || w.balance < ATTEMPT_PACK_CREDITS) {
        return { ok: false, errorCode: "insufficient_credits", balance: w?.balance ?? 0 };
      }

      const { data: charged } = await supabaseAdmin
        .from("credit_wallets")
        .update({
          balance: w.balance - ATTEMPT_PACK_CREDITS,
          lifetime_spent: w.lifetime_spent + ATTEMPT_PACK_CREDITS,
        })
        .eq("id", w.id)
        .eq("balance", w.balance)
        .select("id")
        .maybeSingle();
      if (!charged) return { ok: false, errorCode: "insufficient_credits", balance: w.balance };

      await supabaseAdmin.from("credit_transactions").insert({
        wallet_id: w.id,
        user_id: context.userId,
        txn_type: "order_charge",
        amount: -ATTEMPT_PACK_CREDITS,
        balance_after: w.balance - ATTEMPT_PACK_CREDITS,
        description: `Greeting card — ${ATTEMPTS_PER_PACK} more generation attempts`,
        metadata: { session_key: data.sessionKey },
      });

      const packs = current.extra_packs + 1;
      if (current.id) {
        await context.supabase
          .from("user_card_attempt_sessions")
          .update({ extra_packs: packs, updated_at: new Date().toISOString() })
          .eq("id", current.id);
      } else {
        await context.supabase.from("user_card_attempt_sessions").insert({
          user_id: context.userId,
          session_key: data.sessionKey,
          extra_packs: packs,
        });
      }

      return {
        ok: true,
        attempts: attemptState(current.attempts_used, packs),
        balance: w.balance - ATTEMPT_PACK_CREDITS,
      };
    },
  );

/**
 * Tells the creation page whether its active card order is already finished.
 * A closed order is history: the page starts a fresh session instead.
 */
export const getCardSessionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { sessionKey?: string }) => ({
    sessionKey: String(input?.sessionKey ?? "").slice(0, 64),
  }))
  .handler(async ({ data, context }): Promise<{ closed: boolean }> => {
    if (!data.sessionKey) return { closed: false };
    const { data: row } = await context.supabase
      .from("user_card_attempt_sessions")
      .select("closed_at")
      .eq("user_id", context.userId)
      .eq("session_key", data.sessionKey)
      .maybeSingle();
    return { closed: Boolean(row?.closed_at) };
  });
