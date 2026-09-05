import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  CREDIT_EURO_CENTS,
  CREDIT_MAX,
  CREDIT_MIN,
  findPackage,
} from "./packages";

export interface MemoryBookProject {
  id: string;
  packageCode: string;
  leaves: number;
  internalPages: number;
  videoCapacity: number;
  creditsSpent: number;
  status: string;
  expiresAt: string;
}

/** The customer's own purchased Memory Books, newest first. */
export const listMemoryBooks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ books: MemoryBookProject[] }> => {
    const { data } = await context.supabase
      .from("memory_book_projects")
      .select("id, package_code, leaves, internal_pages, video_capacity, credits_spent, status, expires_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as Record<string, unknown>[];
    return {
      books: rows.map((r) => ({
        id: String(r.id),
        packageCode: String(r.package_code),
        leaves: Number(r.leaves ?? 0),
        internalPages: Number(r.internal_pages ?? 0),
        videoCapacity: Number(r.video_capacity ?? 0),
        creditsSpent: Number(r.credits_spent ?? 0),
        status: String(r.status ?? "active"),
        expiresAt: String(r.expires_at ?? ""),
      })),
    };
  });

/** True only when this book belongs to the signed-in customer and was paid for. */
export const getMemoryBookAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId?: string | null }) => ({
    bookId: String(input?.bookId ?? "").slice(0, 64) || null,
  }))
  .handler(async ({ data, context }): Promise<{ allowed: boolean; book: MemoryBookProject | null }> => {
    if (!data.bookId) return { allowed: false, book: null };
    const { data: row } = await context.supabase
      .from("memory_book_projects")
      .select("id, package_code, leaves, internal_pages, video_capacity, credits_spent, status, expires_at")
      .eq("user_id", context.userId)
      .eq("id", data.bookId)
      .maybeSingle();
    if (!row) return { allowed: false, book: null };
    const r = row as Record<string, unknown>;
    return {
      allowed: Number(r.credits_spent ?? 0) > 0,
      book: {
        id: String(r.id),
        packageCode: String(r.package_code),
        leaves: Number(r.leaves ?? 0),
        internalPages: Number(r.internal_pages ?? 0),
        videoCapacity: Number(r.video_capacity ?? 0),
        creditsSpent: Number(r.credits_spent ?? 0),
        status: String(r.status ?? "active"),
        expiresAt: String(r.expires_at ?? ""),
      },
    };
  });

/**
 * Buys exactly one Memory Book package with the credits the customer already
 * has. The database locks the wallet and keys the purchase, so a double click
 * or a repeated request can never charge twice or create a second book.
 */
export const purchaseMemoryBookPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { packageCode: string; purchaseKey: string }) => ({
    packageCode: String(input?.packageCode ?? ""),
    purchaseKey: String(input?.purchaseKey ?? "").slice(0, 64),
  }))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: boolean; error?: "unknown_package" | "insufficient_credits" | "failed"; bookId?: string; balance?: number }> => {
      const pkg = findPackage(data.packageCode);
      if (!pkg || !data.purchaseKey) return { ok: false, error: "unknown_package" };

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: result, error } = await supabaseAdmin.rpc("purchase_memory_book_package", {
        _user_id: context.userId,
        _package_code: pkg.code,
        _price: pkg.credits,
        _leaves: pkg.leaves,
        _pages: pkg.internalPages,
        _videos: pkg.videos,
        _purchase_key: data.purchaseKey,
      });
      const payload = (result ?? {}) as {
        ok?: boolean;
        error?: string;
        book_id?: string;
        balance?: number;
      };
      if (error || !payload.ok) {
        return {
          ok: false,
          error: payload.error === "insufficient_credits" ? "insufficient_credits" : "failed",
          balance: payload.balance,
        };
      }
      return { ok: true, bookId: payload.book_id, balance: payload.balance };
    },
  );

/**
 * Registers the intent to buy credits. No payment provider is connected yet,
 * so the order stays unpaid: no credits and no first-purchase gift are added
 * until a real provider confirms the payment through `confirm_credit_purchase`.
 */
export const startCreditPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { credits: number }) => ({
    credits: Math.round(Number(input?.credits ?? 0)),
  }))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: boolean; orderId?: string; paymentReady: false; error?: string }> => {
      const credits = data.credits;
      if (!Number.isFinite(credits) || credits < CREDIT_MIN || credits > CREDIT_MAX) {
        return { ok: false, paymentReady: false, error: "invalid_amount" };
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error } = await supabaseAdmin
        .from("credit_purchase_orders")
        .insert({
          user_id: context.userId,
          credits,
          amount_cents: credits * CREDIT_EURO_CENTS,
          status: "pending",
        })
        .select("id")
        .maybeSingle();
      if (error) return { ok: false, paymentReady: false, error: "failed" };
      return { ok: true, orderId: (row as { id: string } | null)?.id, paymentReady: false };
    },
  );

/** Whether the customer's next confirmed payment would still earn the +4 gift. */
export const getFirstPurchaseGiftStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ eligible: boolean }> => {
    const { count } = await context.supabase
      .from("credit_purchase_orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("status", "paid");
    return { eligible: (count ?? 0) === 0 };
  });
