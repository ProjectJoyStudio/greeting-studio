import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  isFirstFreeEligibleProduct,
  type FirstFreeStatus,
} from "./first-free";

interface ClaimInput {
  productType: string;
  title?: string;
  language?: string;
  recipientName?: string;
  relationship?: string;
  occasion?: string;
  message?: string;
}

/** Current signed-in user's entitlement status. */
export const getFirstFreeStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FirstFreeStatus> => {
    const { data, error } = await context.supabase.rpc("get_first_free_greeting_status", {
      _user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : null;
    return {
      used: Boolean(row?.first_free_greeting_used),
      usedAt: row?.first_free_greeting_used_at ?? null,
      orderId: row?.first_free_greeting_order_id ?? null,
      productType: row?.first_free_greeting_product_type ?? null,
    };
  });

/**
 * Atomically verifies eligibility, creates the free order and consumes the
 * entitlement. The database function is the single source of truth — the
 * client-side check below is only a fast fail.
 */
export const claimFirstFreeGreeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ClaimInput) => {
    if (!isFirstFreeEligibleProduct(input?.productType)) {
      throw new Error("product_not_eligible");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("claim_first_free_greeting", {
      _product_type: data.productType,
      _title: data.title ?? undefined,
      _language: data.language ?? "en",
      _configuration: { source: "first_free_flow", product_type: data.productType },
      _recipient_data: {
        name: data.recipientName ?? null,
        relationship: data.relationship ?? null,
        occasion: data.occasion ?? null,
      },
      _customer_text: data.message ?? undefined,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : null;
    return {
      orderId: row?.order_id ?? null,
      orderNumber: row?.order_number ?? null,
      usedAt: row?.used_at ?? null,
    };
  });

/**
 * Restores the entitlement when the related free order failed or was
 * cancelled before the customer received a valid result.
 */
export const releaseFirstFreeGreeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: released, error } = await context.supabase.rpc("release_first_free_greeting", {
      _order_id: data.orderId,
    });
    if (error) throw new Error(error.message);
    return { released: Boolean(released) };
  });

/** Admin lookup: entitlement state for any account, by email. */
export const adminLookupFirstFree = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("forbidden");

    const email = data.email.trim().toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let found: { id: string; email: string; created_at: string } | null = null;
    for (let page = 1; page <= 10 && !found; page++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      const hit = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (hit) found = { id: hit.id, email: hit.email ?? "", created_at: hit.created_at };
      if (list.users.length < 200) break;
    }
    if (!found) return { found: false as const };

    const { data: rows, error: statusError } = await context.supabase.rpc(
      "get_first_free_greeting_status",
      { _user_id: found.id },
    );
    if (statusError) throw new Error(statusError.message);
    const row = Array.isArray(rows) ? rows[0] : null;

    let orderNumber: string | null = null;
    if (row?.first_free_greeting_order_id) {
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("order_number, status")
        .eq("id", row.first_free_greeting_order_id)
        .maybeSingle();
      orderNumber = order?.order_number ?? null;
    }

    return {
      found: true as const,
      userId: found.id,
      email: found.email,
      registeredAt: found.created_at,
      status: {
        used: Boolean(row?.first_free_greeting_used),
        usedAt: row?.first_free_greeting_used_at ?? null,
        orderId: row?.first_free_greeting_order_id ?? null,
        productType: row?.first_free_greeting_product_type ?? null,
      } satisfies FirstFreeStatus,
      orderNumber,
    };
  });

/**
 * Super-administrator support action. The database function enforces the role
 * and writes the audit record (admin id, user id, timestamp, reason, order).
 */
export const adminRestoreFirstFree = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; reason: string }) => {
    if (!input?.reason || input.reason.trim().length < 3) throw new Error("reason_required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_restore_first_free_greeting", {
      _user_id: data.userId,
      _reason: data.reason.trim(),
    });
    if (error) throw new Error(error.message);
    return { restored: true };
  });