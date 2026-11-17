import { createFileRoute } from "@tanstack/react-router";

// Non-secret code-version marker so deployment freshness is observable.
const ENGINE = "cleanup-v1";

export const Route = createFileRoute("/api/public/memory-book-cleanup")({
  server: { handlers: { POST: async ({ request }) => {
    const header = request.headers.get("authorization") ?? "";
    if (!header.startsWith("Bearer ") || header.length > 200) return Response.json({ error: "unauthorized", engine: ENGINE }, { status: 401 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // The scheduler credential lives in a service-only application table, never in browser config.
    const { data: config } = await supabaseAdmin.from("memory_book_backup_dispatch_config").select("secret,enabled").eq("id", true).maybeSingle();
    const expected = config?.secret ?? "";
    const supplied = header.slice(7);
    const { timingSafeEqual } = await import("node:crypto");
    const a = new TextEncoder().encode(expected), b = new TextEncoder().encode(supplied);
    if (!config?.enabled || !expected || a.length !== b.length || !timingSafeEqual(a, b)) return Response.json({ error: "unauthorized" }, { status: 401 });
    const { runDueCleanups } = await import("@/lib/memory-book/storage-package.server");
    const results = await runDueCleanups(2);
    // Re-arm or unschedule depending on remaining work (no polling once drained).
    await supabaseAdmin.rpc("dispatch_memory_book_cleanups" as never);
    return Response.json({ ok: true, engine: ENGINE, processed: results.length });
  } } },
});