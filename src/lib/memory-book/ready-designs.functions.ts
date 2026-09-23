// Adding NEW Project Joy "Ready designs" (cover and leaf backgrounds) to the
// shared system library.
//
// A new ready design is written straight into the working area under its own
// permanent shared address `system/ready-designs/<stage>/<id>.<extension>` and
// then gets an independent verified reserve copy. Nothing is written to the
// older storage first, and no later move is needed.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Shared address family of the ready-made designs library. */
export const READY_DESIGN_PREFIX = "system/ready-designs";

export function readyDesignPrefix(stage: "cover" | "leaf"): string {
  return `${READY_DESIGN_PREFIX}/${stage}/`;
}

export function isReadyDesignKey(key: string): boolean {
  return key.startsWith(`${READY_DESIGN_PREFIX}/`);
}

function toStage(value: unknown): "cover" | "leaf" {
  return value === "leaf" ? "leaf" : "cover";
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const raw = dot >= 0 ? fileName.slice(dot + 1) : "";
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
}

async function isAdmin(context: { supabase: unknown; userId: string }): Promise<boolean> {
  const db = context.supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  };
  const { data } = await db.rpc("is_admin", { _user_id: context.userId });
  return data === true;
}

/** Hands the admin page one short-lived address in the working area. */
export const createReadyDesignUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { stage?: string; fileName?: string; contentType?: string }) => ({
    stage: toStage(input?.stage),
    fileName: String(input?.fileName ?? "").slice(0, 200),
    contentType: String(input?.contentType ?? "").slice(0, 120) || "image/jpeg",
  }))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: boolean; key?: string; uploadUrl?: string; contentType?: string }> => {
      if (!(await isAdmin(context))) return { ok: false };

      const { storageFor } = await import("@/lib/storage/registry.server");
      const primary = storageFor("primary");
      // Without the working area the page simply keeps its previous way.
      if (!primary) return { ok: false };

      const key = `${readyDesignPrefix(data.stage)}${crypto.randomUUID()}.${extensionOf(data.fileName)}`;
      const uploadUrl = await primary.signedWriteUrl(key, 60 * 60 * 2, data.contentType);
      if (!uploadUrl) return { ok: false };

      return { ok: true, key, uploadUrl, contentType: data.contentType };
    },
  );

/**
 * Receives the picture itself from the admin page and stores it in the working
 * area server-side. The browser therefore never talks to the storage company
 * directly, which is what made the direct upload fail from the site address.
 */
export const uploadReadyDesign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { stage?: string; fileName?: string; contentType?: string; dataBase64?: string }) => ({
      stage: toStage(input?.stage),
      fileName: String(input?.fileName ?? "").slice(0, 200),
      contentType: String(input?.contentType ?? "").slice(0, 120) || "image/jpeg",
      dataBase64: String(input?.dataBase64 ?? ""),
    }),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: boolean; key?: string; backup?: boolean; error?: string }> => {
      if (!(await isAdmin(context))) return { ok: false, error: "forbidden" };
      if (!data.dataBase64) return { ok: false, error: "bad_request" };

      let bytes: Uint8Array;
      try {
        const binary = atob(data.dataBase64);
        bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      } catch {
        return { ok: false, error: "bad_request" };
      }
      if (bytes.byteLength === 0 || bytes.byteLength > 25 * 1024 * 1024) {
        return { ok: false, error: "bad_size" };
      }

      const { storageFor } = await import("@/lib/storage/registry.server");
      const primary = storageFor("primary");
      if (!primary) return { ok: false, error: "no_primary" };

      const key = `${readyDesignPrefix(data.stage)}${crypto.randomUUID()}.${extensionOf(data.fileName)}`;
      const written = await primary.put(key, bytes as unknown as BodyInit, data.contentType);
      if (!written) return { ok: false, error: "not_stored" };

      const { recordPrimary, backupToReserve } = await import("@/lib/storage/backup.server");
      const stored = await recordPrimary(key);
      if (!stored) return { ok: false, error: "not_stored" };

      let backup = false;
      if (storageFor("backup")) {
        const res = await backupToReserve(key).catch(() => ({ ok: false }) as const);
        backup = res.ok === true;
      }
      return { ok: true, key, backup };
    },
  );

/**
 * Confirms the new ready design: the stored file is verified, recorded as the
 * working copy and given its reserve copy. A reserve failure never destroys a
 * successful upload — the design stays usable and the copy stays retryable.
 */
export const finalizeReadyDesign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key?: string }) => ({
    key: String(input?.key ?? "").slice(0, 400),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; backup?: boolean; error?: string }> => {
    if (!(await isAdmin(context))) return { ok: false, error: "forbidden" };
    if (!isReadyDesignKey(data.key)) return { ok: false, error: "bad_request" };

    const { recordPrimary, backupToReserve } = await import("@/lib/storage/backup.server");
    const stored = await recordPrimary(data.key);
    if (!stored) return { ok: false, error: "not_stored" };

    const { storageFor } = await import("@/lib/storage/registry.server");
    let backup = false;
    if (storageFor("backup")) {
      const res = await backupToReserve(data.key).catch(() => ({ ok: false }) as const);
      backup = res.ok === true;
    }
    return { ok: true, backup };
  });

/* ------------------------------------------------------------------ */
/* Library management: which ready designs customers may choose today. */
/* ------------------------------------------------------------------ */

export interface AdminReadyDesignItem {
  /** Storage address of the picture; it never changes. */
  path: string;
  url: string;
  hidden: boolean;
  createdAt: string | null;
  /** True while the picture still lives in the older library area. */
  legacy: boolean;
}

async function adminDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as {
    from: (t: string) => any;
    storage: { from: (b: string) => any };
  };
}

/** Addresses of the ready designs that are currently hidden from customers. */
export async function hiddenReadyDesignPaths(stage: "cover" | "leaf"): Promise<Set<string>> {
  const db = await adminDb();
  const { data } = await db
    .from("ready_design_visibility")
    .select("object_key")
    .eq("stage", stage)
    .eq("hidden", true);
  const out = new Set<string>();
  for (const row of ((data ?? []) as Array<Record<string, unknown>>)) {
    if (typeof row.object_key === "string") out.add(row.object_key);
  }
  return out;
}

/** Everything in the ready designs library of one stage, for administrators. */
export const adminListReadyDesigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { stage?: string }) => ({ stage: toStage(input?.stage) }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; items: AdminReadyDesignItem[] }> => {
    if (!(await isAdmin(context))) return { ok: false, items: [] };

    const db = await adminDb();
    const { memoryBookFileUrl, MEMORY_BOOK_R2_BUCKET } = await import("./storage.server");
    const { MEMORY_BOOK_LIBRARY_BUCKET } = await import("./designs");
    const hidden = await hiddenReadyDesignPaths(data.stage);
    const items: AdminReadyDesignItem[] = [];

    const { data: placed } = await db
      .from("storage_placements")
      .select("object_key, created_at")
      .eq("role", "primary")
      .eq("status", "present")
      .like("object_key", `${readyDesignPrefix(data.stage)}%`)
      .order("created_at", { ascending: false })
      .limit(200);
    for (const raw of ((placed ?? []) as Array<Record<string, unknown>>)) {
      const key = typeof raw.object_key === "string" ? raw.object_key : "";
      if (!key) continue;
      const url = await memoryBookFileUrl(MEMORY_BOOK_R2_BUCKET, key, 60 * 60);
      if (!url) continue;
      items.push({
        path: key,
        url,
        hidden: hidden.has(key),
        createdAt: typeof raw.created_at === "string" ? raw.created_at : null,
        legacy: false,
      });
    }

    // Anything still stored in the older area stays visible and manageable.
    const { data: files } = await db.storage
      .from(MEMORY_BOOK_LIBRARY_BUCKET)
      .list(data.stage, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
    for (const file of ((files ?? []) as Array<Record<string, unknown>>)) {
      const name = typeof file?.name === "string" ? file.name : "";
      if (!name) continue;
      const path = `${data.stage}/${name}`;
      const url = await memoryBookFileUrl(MEMORY_BOOK_LIBRARY_BUCKET, path, 60 * 60);
      if (!url) continue;
      items.push({
        path,
        url,
        hidden: hidden.has(path),
        createdAt: typeof file.created_at === "string" ? file.created_at : null,
        legacy: true,
      });
    }

    return { ok: true, items };
  });

/**
 * Takes one ready design out of the customer library, or puts it back.
 * The picture itself is never touched: neither the working copy nor the
 * reserve copy is removed, so books already using it keep working.
 */
export const setReadyDesignHidden = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { stage?: string; path?: string; hidden?: boolean }) => ({
    stage: toStage(input?.stage),
    path: String(input?.path ?? "").slice(0, 400),
    hidden: input?.hidden === true,
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    if (!(await isAdmin(context))) return { ok: false };
    if (!data.path) return { ok: false };

    const db = await adminDb();
    const { error } = await db
      .from("ready_design_visibility")
      .upsert(
        {
          object_key: data.path,
          stage: data.stage,
          hidden: data.hidden,
          updated_by: context.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "object_key" },
      );
    if (error) return { ok: false };

    await db.from("admin_audit_log").insert({
      actor_user_id: context.userId,
      action: data.hidden ? "memory_book.ready_design_hidden" : "memory_book.ready_design_shown",
      entity_type: "memory_book",
      entity_id: null,
      previous_data: null,
      new_data: { path: data.path, stage: data.stage },
    });
    return { ok: true };
  });
