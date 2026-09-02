import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ATTEMPTS_PER_PACK,
  ATTEMPT_PACK_CREDITS,
  attemptState,
  FREE_FIRST_CARD_ATTEMPTS,
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
    async ({
      data,
      context,
    }): Promise<CardAttemptState & { cardId: string | null; freeGrant: boolean }> => {
      const { data: row } = await context.supabase
        .from("user_card_attempt_sessions")
        .select("attempts_used, extra_packs, closed_at, card_id, free_grant")
        .eq("user_id", context.userId)
        .eq("session_key", data.sessionKey)
        .maybeSingle();
      // A finished card order keeps its history, but never funds a new card.
      if (row?.closed_at) return { ...attemptState(0, 0), cardId: null, freeGrant: false };
      if (!row) {
        await context.supabase
          .from("user_card_attempt_sessions")
          .insert({ user_id: context.userId, session_key: data.sessionKey })
          .select("id")
          .maybeSingle();
        return { ...attemptState(0, 0), cardId: null, freeGrant: false };
      }
      const free = row.free_grant ? FREE_FIRST_CARD_ATTEMPTS : 0;
      return {
        ...attemptState(row.attempts_used, row.extra_packs, free),
        cardId: row.card_id ?? null,
        freeGrant: Boolean(row.free_grant),
      };
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
        .select("session_key, attempts_used, extra_packs, closed_at, free_grant")
        .eq("user_id", context.userId)
        .eq("card_id", data.cardId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!row || row.closed_at) return { sessionKey: null, attempts: attemptState(0, 0) };
      return {
        sessionKey: row.session_key,
        attempts: attemptState(
          row.attempts_used,
          row.extra_packs,
          row.free_grant ? FREE_FIRST_CARD_ATTEMPTS : 0,
        ),
      };
    },
  );


/**
 * Buys one more package of attempts for a single credit. The credit is taken
 * with a conditional write, so a double click can never charge twice.
 */
export const buyCardAttemptPack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionKey: string; firstPackOnly?: boolean }) => {
    const sessionKey = String(input?.sessionKey ?? "").slice(0, 64);
    if (!sessionKey) throw new Error("session_required");
    return { sessionKey, firstPackOnly: Boolean(input?.firstPackOnly) };
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

      // Starting the card is a one-time purchase: a repeated tap that reaches
      // the server twice finds the package already there and charges nothing.
      if (data.firstPackOnly && current.extra_packs > 0) {
        const { data: w0 } = await supabaseAdmin
          .from("credit_wallets")
          .select("balance")
          .eq("user_id", context.userId)
          .maybeSingle();
        return {
          ok: true,
          attempts: attemptState(current.attempts_used, current.extra_packs),
          balance: (w0 as { balance: number } | null)?.balance ?? 0,
        };
      }


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

/**
 * Recovery for browsers whose sessionStorage is unavailable or was evicted:
 * finds the user's most recent unfinished, already-paid card package so the
 * page can continue it instead of starting (and charging) a new one.
 */
export const getOpenPaidCardSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{ sessionKey: string | null; cardId: string | null; attempts: CardAttemptState }> => {
      const { data: row } = await context.supabase
        .from("user_card_attempt_sessions")
        .select("session_key, attempts_used, extra_packs, card_id, closed_at, free_grant")
        .eq("user_id", context.userId)
        .is("closed_at", null)
        .gt("extra_packs", 0)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!row) return { sessionKey: null, cardId: null, attempts: attemptState(0, 0) };
      return {
        sessionKey: row.session_key,
        cardId: row.card_id ?? null,
        attempts: attemptState(
          row.attempts_used,
          row.extra_packs,
          row.free_grant ? FREE_FIRST_CARD_ATTEMPTS : 0,
        ),
      };
    },
  );

/**
 * First free Greeting Card of a newly registered account.
 *
 * The account-level entitlement (public.user_entitlements) stays the single
 * source of truth: the atomic `claim_first_free_greeting` database function
 * decides who may start, so rapid taps, reloads or a second device can never
 * produce two free cards. The grant unlocks exactly ONE generation for this
 * card creation and costs zero credits.
 */
export const startFreeFirstCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionKey: string; language?: string }) => {
    const sessionKey = String(input?.sessionKey ?? "").slice(0, 64);
    if (!sessionKey) throw new Error("session_required");
    return { sessionKey, language: String(input?.language ?? "en").slice(0, 5) };
  })
  .handler(
    async ({
      data,
      context,
    }): Promise<
      { ok: true; attempts: CardAttemptState } | { ok: false; errorCode: string }
    > => {
      const { data: session } = await context.supabase
        .from("user_card_attempt_sessions")
        .select("id, attempts_used, extra_packs, closed_at, free_grant")
        .eq("user_id", context.userId)
        .eq("session_key", data.sessionKey)
        .maybeSingle();
      if (session?.closed_at) return { ok: false, errorCode: "session_closed" };

      // Idempotent: a second tap on the same card creation never claims twice.
      if (session?.free_grant) {
        return {
          ok: true,
          attempts: attemptState(
            session.attempts_used,
            session.extra_packs,
            FREE_FIRST_CARD_ATTEMPTS,
          ),
        };
      }

      const { data: rows, error } = await context.supabase.rpc("claim_first_free_greeting", {
        _product_type: "card",
        _language: data.language,
        _configuration: { source: "create_card_free_first", product_type: "card" },
      });
      if (error) {
        return {
          ok: false,
          errorCode: error.message.includes("already_used") ? "already_used" : "claim_failed",
        };
      }
      const orderId = (Array.isArray(rows) ? rows[0]?.order_id : null) ?? null;

      if (session?.id) {
        await context.supabase
          .from("user_card_attempt_sessions")
          .update({
            free_grant: true,
            free_order_id: orderId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", session.id);
      } else {
        await context.supabase.from("user_card_attempt_sessions").insert({
          user_id: context.userId,
          session_key: data.sessionKey,
          free_grant: true,
          free_order_id: orderId,
        });
      }

      return {
        ok: true,
        attempts: attemptState(
          session?.attempts_used ?? 0,
          session?.extra_packs ?? 0,
          FREE_FIRST_CARD_ATTEMPTS,
        ),
      };
    },
  );

/**
 * A technical generation failure must never burn the one free card: as long as
 * no picture was successfully stored for this creation, the account-level
 * entitlement is released again and the customer can simply retry for free.
 */
export const releaseFreeFirstCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionKey: string }) => ({
    sessionKey: String(input?.sessionKey ?? "").slice(0, 64),
  }))
  .handler(async ({ data, context }): Promise<{ released: boolean }> => {
    if (!data.sessionKey) return { released: false };
    const { data: session } = await context.supabase
      .from("user_card_attempt_sessions")
      .select("id, attempts_used, free_grant, free_order_id")
      .eq("user_id", context.userId)
      .eq("session_key", data.sessionKey)
      .maybeSingle();
    // A successful picture already exists: the free right stays used.
    if (!session?.free_grant || session.attempts_used > 0) return { released: false };

    if (session.free_order_id) {
      const { error } = await context.supabase.rpc("release_first_free_greeting", {
        _order_id: session.free_order_id,
      });
      if (error) return { released: false };
    }
    await context.supabase
      .from("user_card_attempt_sessions")
      .update({ free_grant: false, free_order_id: null, updated_at: new Date().toISOString() })
      .eq("id", session.id);
    return { released: true };
  });

/**
 * Mobile-resume recovery, narrowly scoped.
 *
 * Finds ONLY the paid attempt packages that can be the just-interrupted card
 * start: same signed-in user, paid, still open, not a single successful picture
 * yet and created within the last few hours. Old unfinished cabinet drafts
 * always have at least one stored picture (attempts_used > 0) and are therefore
 * never returned here — they stay reachable through "Continue" only.
 */
const INTERRUPTED_WINDOW_MS = 6 * 60 * 60 * 1000;

export const findInterruptedPaidCardSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{
      candidates: { sessionKey: string; cardId: string | null; attempts: CardAttemptState }[];
    }> => {
      const since = new Date(Date.now() - INTERRUPTED_WINDOW_MS).toISOString();
      const { data: rows } = await context.supabase
        .from("user_card_attempt_sessions")
        .select("session_key, attempts_used, extra_packs, card_id, free_grant, updated_at")
        .eq("user_id", context.userId)
        .is("closed_at", null)
        .eq("attempts_used", 0)
        .gt("extra_packs", 0)
        .gte("updated_at", since)
        .order("updated_at", { ascending: false })
        .limit(3);
      return {
        candidates: (rows ?? []).map((row) => ({
          sessionKey: row.session_key,
          cardId: row.card_id ?? null,
          attempts: attemptState(
            row.attempts_used,
            row.extra_packs,
            row.free_grant ? FREE_FIRST_CARD_ATTEMPTS : 0,
          ),
        })),
      };
    },
  );
