// Moves the Project Joy decorations library into the working storage area.
//
// One decoration stays ONE shared Project Joy asset: it keeps its identity,
// its library entry and its single address. Nothing is copied per customer or
// per book, and the older physical file is never deleted here.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { MEMORY_BOOK_R2_BUCKET } from "./materials";

type Row = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export interface DecorationMigrationItem {
  id: string;
  name: string;
  /** Where it was before this run. */
  from: string;
  /** The shared Project Joy address, when it is now in the working area. */
  key: string | null;
  sizeBytes: number | null;
  primary: "present" | "skipped" | "failed";
  backup: "present" | "skipped" | "failed" | "not_configured";
  switched: boolean;
  error?: string;
}

/** Stable shared address of one decoration. Never customer or book specific. */
function decorationKey(id: string, path: string, fileType: string): string {
  const dot = path.lastIndexOf(".");
  const ext = dot > -1 ? path.slice(dot + 1).toLowerCase() : fileType === "svg" ? "svg" : "png";
  return `system/decorations/${id}.${ext.replace(/[^a-z0-9]/g, "") || "png"}`;
}

/**
 * Copies every library decoration into the working area, verifies it, makes
 * the independent reserve copy and only then points the library entry at the
 * new address. Safe to run again: verified copies are left untouched.
 */
export const adminMigrateDecorationsToPrimary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{ ok: boolean; items: DecorationMigrationItem[]; error?: string }> => {
      const { data: isAdmin } = await (
        context.supabase as unknown as {
          rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
        }
      ).rpc("is_admin", { _user_id: context.userId });
      if (isAdmin !== true) return { ok: false, items: [], error: "forbidden" };

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { storageFor } = await import("@/lib/storage/registry.server");
      const { backupToReserve, recordPrimary } = await import("@/lib/storage/backup.server");

      const primary = storageFor("primary");
      if (!primary) return { ok: false, items: [], error: "primary_not_configured" };
      const hasBackup = storageFor("backup") !== null;

      const { data } = await supabaseAdmin
        .from("memory_book_decorations")
        .select("id, name, bucket, path, file_type")
        .order("created_at", { ascending: true });

      const items: DecorationMigrationItem[] = [];

      for (const raw of ((data ?? []) as unknown as Row[])) {
        const id = String(raw.id);
        const from = text(raw.bucket);
        const path = text(raw.path);
        const item: DecorationMigrationItem = {
          id,
          name: text(raw.name),
          from,
          key: null,
          sizeBytes: null,
          primary: "failed",
          backup: "failed",
          switched: false,
        };

        // Already on the working area: only make sure it is really there and
        // that its reserve copy exists. Nothing is copied twice.
        if (from === MEMORY_BOOK_R2_BUCKET) {
          const head = await primary.head(path);
          item.key = path;
          item.sizeBytes = head?.sizeBytes ?? null;
          item.primary = head ? "skipped" : "failed";
          item.switched = true;
          if (!head) {
            item.error = "missing_in_primary";
            item.backup = "failed";
            items.push(item);
            continue;
          }
          if (!hasBackup) item.backup = "not_configured";
          else {
            const res = await backupToReserve(path);
            item.backup = res.ok ? (res.skipped ? "skipped" : "present") : "failed";
            if (!res.ok) item.error = res.error;
          }
          items.push(item);
          continue;
        }

        const key = decorationKey(id, path, text(raw.file_type));
        item.key = key;

        try {
          // 1. the file must be readable where it is today.
          const { data: file, error } = await supabaseAdmin.storage.from(from).download(path);
          if (error || !file) {
            item.error = "legacy_read_failed";
            items.push(item);
            continue;
          }
          const bytes = new Uint8Array(await file.arrayBuffer());
          item.sizeBytes = bytes.byteLength;

          // 2. copy into the working area, unless an identical copy is there.
          const existing = await primary.head(key);
          if (existing && existing.sizeBytes === bytes.byteLength) {
            item.primary = "skipped";
          } else {
            const stored = await primary.put(
              key,
              bytes as unknown as BodyInit,
              file.type || (key.endsWith(".svg") ? "image/svg+xml" : "image/png"),
            );
            if (!stored) {
              item.error = "primary_write_failed";
              items.push(item);
              continue;
            }
            item.primary = "present";
          }

          // 3. verify and record it.
          const ok = await recordPrimary(key);
          if (!ok) {
            item.primary = "failed";
            item.error = "primary_verify_failed";
            items.push(item);
            continue;
          }

          // 4. the independent reserve copy. A failure here never blocks a
          //    verified working copy; it stays retryable.
          if (!hasBackup) item.backup = "not_configured";
          else {
            const res = await backupToReserve(key);
            item.backup = res.ok ? (res.skipped ? "skipped" : "present") : "failed";
            if (!res.ok) item.error = res.error;
          }

          // 5. only now does the library entry point at the new address. The
          //    decoration id, its uses and its page settings stay untouched.
          const { error: upErr } = await supabaseAdmin
            .from("memory_book_decorations")
            .update({ bucket: MEMORY_BOOK_R2_BUCKET, path: key } as never)
            .eq("id", id);
          item.switched = !upErr;
          if (upErr) item.error = "reference_update_failed";
        } catch (err) {
          item.error = err instanceof Error ? err.message.slice(0, 200) : "unexpected_error";
        }

        items.push(item);
      }

      return { ok: true, items };
    },
  );
