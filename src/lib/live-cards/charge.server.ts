// Server-only: Live Card animation charges and their refunds.
// A refund is always tied to the recorded charge transaction (charge_txn_id),
// never to an amount from the animation row, and the database refunds each
// charge at most once.

type Admin = { rpc: (name: string, args: Record<string, unknown>) => any; from: (t: string) => any };

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Admin;
}

export async function chargeAnimation(
  userId: string,
  price: number,
  duration: number,
): Promise<{ ok: true; chargeId: string; balance: number } | { ok: false; error: string; balance: number }> {
  const db = await admin();
  const { data, error } = await db.rpc("charge_live_card_animation", {
    _user_id: userId,
    _price: price,
    _duration: duration,
  });
  const r = (data ?? {}) as { ok?: boolean; error?: string; balance?: number; charge_id?: string };
  if (error || !r.ok || !r.charge_id) {
    return { ok: false, error: r.error ?? "charge_failed", balance: r.balance ?? 0 };
  }
  return { ok: true, chargeId: r.charge_id, balance: r.balance ?? 0 };
}

/** Refunds one recorded charge exactly once. Returns the credits given back. */
export async function refundCharge(userId: string, chargeId: string | null | undefined, reason: string): Promise<number> {
  if (!chargeId) return 0;
  const db = await admin();
  const { data, error } = await db.rpc("refund_live_card_charge", {
    _user_id: userId,
    _charge_id: chargeId,
    _reason: reason.slice(0, 80),
  });
  if (error) return 0;
  return Number((data as { refunded?: number } | null)?.refunded ?? 0);
}

/**
 * Refunds the charge of a genuinely failed animation (status already failed,
 * verified by the engine on the server) and records it on the row.
 */
export async function refundFailedAnimation(animationId: string, reason: string): Promise<number> {
  const db = await admin();
  const { data } = await db
    .from("live_card_animations")
    .select("id, user_id, status, charge_txn_id, metadata")
    .eq("id", animationId)
    .maybeSingle();
  const row = data as
    | { id: string; user_id: string; status: string; charge_txn_id: string | null; metadata: Record<string, unknown> | null }
    | null;
  if (!row || row.status !== "failed" || !row.charge_txn_id) return 0;
  const refunded = await refundCharge(row.user_id, row.charge_txn_id, reason);
  await db
    .from("live_card_animations")
    .update({ metadata: { ...(row.metadata ?? {}), refunded: true }, credits_charged: 0 })
    .eq("id", row.id);
  return refunded;
}
