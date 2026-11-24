// Memory Book storage extensions: customer purchase and Admin price control.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { StorageOffer, StoragePurchaseError } from "./storage-offers";

type Row = Record<string, unknown>;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as { from: (t: string) => any; rpc: (f: string, a: Record<string, unknown>) => any };
}

function toOffer(r: Row): StorageOffer {
  return {
    code: String(r.code),
    service: r.service === "completed" ? "completed" : "working",
    durationDays: Number(r.duration_days ?? 0),
    durationMonths: Number(r.duration_months ?? 0),
    credits: r.credits === null || r.credits === undefined ? null : Number(r.credits),
    enabled: r.enabled === true,
    updatedAt: typeof r.updated_at === "string" ? r.updated_at : null,
  };
}

export async function readStorageOffers(): Promise<StorageOffer[]> {
  const db = await admin();
  const { data, error } = await db.from("memory_book_storage_offers").select("*").order("sort_order");
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map(toOffer);
}

/** Offers as customers see them; unpriced offers never show a price. */
export const getStorageOffers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<{ offers: StorageOffer[] }> => ({ offers: await readStorageOffers() }));

export const purchaseMemoryBookStorage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; offerCode: string; expectedPrice: number; purchaseKey: string }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64),
    offerCode: String(input?.offerCode ?? "").slice(0, 40),
    expectedPrice: Math.round(Number(input?.expectedPrice ?? -1)),
    purchaseKey: String(input?.purchaseKey ?? "").slice(0, 80),
  }))
  .handler(async ({ data, context }): Promise<{
    ok: boolean;
    error?: StoragePurchaseError;
    expiresAt?: string;
    previousExpiresAt?: string | null;
    balance?: number;
    price?: number;
    repeated?: boolean;
  }> => {
    if (!data.bookId || !data.offerCode || data.purchaseKey.length < 8) return { ok: false, error: "failed" };
    const db = await admin();
    // Ownership and state are re-checked inside the database under a lock.
    const { data: book } = await context.supabase
      .from("memory_book_projects")
      .select("id, status")
      .eq("id", data.bookId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!book) return { ok: false, error: "not_found" };
    const { data: offerRow } = await db.from("memory_book_storage_offers").select("service").eq("code", data.offerCode).maybeSingle();
    if (!offerRow) return { ok: false, error: "offer_unavailable" };

    let assetsVerified = false;
    if ((offerRow as Row).service === "completed") {
      if ((book as Row).status !== "completed") return { ok: false, error: "wrong_status" };
      // A repeated key returns the earlier result without re-checking files.
      const { data: prior } = await db.from("memory_book_storage_purchases").select("id").eq("user_id", context.userId).eq("purchase_key", data.purchaseKey).maybeSingle();
      if (prior) assetsVerified = true;
      else {
        const { verifyCompletedBookAssets } = await import("./offline-export.functions");
        const check = await verifyCompletedBookAssets(data.bookId, context.userId);
        if (!check.ok) {
          console.warn("[memory-book-storage-purchase] asset unavailable", data.bookId, check.asset);
          return { ok: false, error: "assets_unavailable" };
        }
        assetsVerified = true;
      }
    }

    const { data: result, error } = await db.rpc("purchase_memory_book_storage", {
      _user_id: context.userId,
      _book_id: data.bookId,
      _offer_code: data.offerCode,
      _expected_price: data.expectedPrice,
      _purchase_key: data.purchaseKey,
      _assets_verified: assetsVerified,
    });
    const p = (result ?? {}) as Row;
    if (error || p.ok !== true) {
      const known: StoragePurchaseError[] = ["insufficient_credits", "not_found", "wrong_status", "offer_unavailable", "price_changed", "assets_unavailable"];
      const e = known.includes(p.error as StoragePurchaseError) ? (p.error as StoragePurchaseError) : "failed";
      if (error) console.error("[memory-book-storage-purchase]", error.message);
      return { ok: false, error: e, ...(typeof p.balance === "number" ? { balance: p.balance } : {}), ...(typeof p.price === "number" ? { price: p.price } : {}) };
    }
    return {
      ok: true,
      expiresAt: String(p.expires_at),
      previousExpiresAt: typeof p.previous_expires_at === "string" ? p.previous_expires_at : null,
      balance: Number(p.balance ?? 0),
      repeated: p.repeated === true,
    };
  });

async function assertSuperAdmin(context: { supabase: unknown; userId: string }) {
  const { data } = await (context.supabase as { rpc: (f: string, a: Record<string, unknown>) => Promise<{ data: unknown }> }).rpc("is_super_admin", { _user_id: context.userId });
  if (data !== true) throw new Error("forbidden");
}

export interface StorageOfferAuditEntry {
  code: string;
  oldCredits: number | null;
  newCredits: number | null;
  oldEnabled: boolean | null;
  newEnabled: boolean | null;
  changedAt: string;
  changedBy: string;
}

export const getStorageOffersAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ offers: StorageOffer[]; audit: StorageOfferAuditEntry[] }> => {
    await assertSuperAdmin(context);
    const db = await admin();
    const { data } = await db.from("memory_book_storage_offer_audit").select("*").order("changed_at", { ascending: false }).limit(30);
    const ids = [...new Set(((data ?? []) as Row[]).map((r) => String(r.changed_by)))];
    const emails = new Map<string, string>();
    if (ids.length) {
      const { data: profiles } = await db.from("profiles").select("id, display_name").in("id", ids);
      for (const p of (profiles ?? []) as Row[]) emails.set(String(p.id), String(p.display_name ?? p.id));
    }
    return {
      offers: await readStorageOffers(),
      audit: ((data ?? []) as Row[]).map((r) => ({
        code: String(r.code),
        oldCredits: r.old_credits === null ? null : Number(r.old_credits),
        newCredits: r.new_credits === null ? null : Number(r.new_credits),
        oldEnabled: r.old_enabled === null ? null : r.old_enabled === true,
        newEnabled: r.new_enabled === null ? null : r.new_enabled === true,
        changedAt: String(r.changed_at),
        changedBy: emails.get(String(r.changed_by)) ?? String(r.changed_by),
      })),
    };
  });

export const setStorageOfferAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string; credits: number | null; enabled: boolean }) => {
    const credits = input?.credits === null ? null : Math.round(Number(input?.credits));
    return { code: String(input?.code ?? "").slice(0, 40), credits: credits === null || (Number.isFinite(credits) && credits >= 1 && credits <= 100000) ? credits : -1, enabled: input?.enabled === true };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: "invalid" | "needs_price" | "not_found"; offer?: StorageOffer }> => {
    await assertSuperAdmin(context);
    if (data.credits === -1) return { ok: false, error: "invalid" };
    if (data.enabled && data.credits === null) return { ok: false, error: "needs_price" };
    const db = await admin();
    const { data: before } = await db.from("memory_book_storage_offers").select("*").eq("code", data.code).maybeSingle();
    if (!before) return { ok: false, error: "not_found" };
    const b = before as Row;
    const { data: after, error } = await db
      .from("memory_book_storage_offers")
      .update({ credits: data.credits, enabled: data.enabled, updated_at: new Date().toISOString(), updated_by: context.userId })
      .eq("code", data.code)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await db.from("memory_book_storage_offer_audit").insert({
      code: data.code,
      old_credits: b.credits ?? null,
      new_credits: data.credits,
      old_enabled: b.enabled === true,
      new_enabled: data.enabled,
      changed_by: context.userId,
    });
    return { ok: true, offer: toOffer(after as Row) };
  });
