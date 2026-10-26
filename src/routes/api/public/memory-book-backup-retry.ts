import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/memory-book-backup-retry")({
  server: { handlers: { POST: async ({ request }) => {
    const header = request.headers.get("authorization") ?? "";
    if (!header.startsWith("Bearer ") || header.length > 200) return Response.json({ error: "unauthorized" }, { status: 401 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // The scheduler credential lives in a service-only application table, never in browser config.
    const { data: config } = await supabaseAdmin.from("memory_book_backup_dispatch_config").select("secret,enabled").eq("id", true).maybeSingle();
    const expected = config?.secret ?? "";
    const supplied = header.slice(7);
    const { timingSafeEqual } = await import("node:crypto");
    const a = new TextEncoder().encode(expected), b = new TextEncoder().encode(supplied);
    if (!config?.enabled || !expected || a.length !== b.length || !timingSafeEqual(a, b)) return Response.json({ error: "unauthorized" }, { status: 401 });
    const { retryPendingBackups, BACKUP_ENGINE } = await import("@/lib/storage/backup.server");
    const result = await retryPendingBackups(2);
    return Response.json({ ok: true, engine: BACKUP_ENGINE, ...result });
  } } },
});