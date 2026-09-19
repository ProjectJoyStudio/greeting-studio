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
