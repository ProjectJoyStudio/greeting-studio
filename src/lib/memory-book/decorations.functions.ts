import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  MEMORY_BOOK_DECORATIONS_BUCKET,
  toCategory,
  type MemoryBookDecoration,
} from "./decorations";

type Row = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const { data: isAdmin } = await (
    context.supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
    }
  ).rpc("is_admin", { _user_id: context.userId });
  if (isAdmin !== true) throw new Error("forbidden");
}

/** SVG files stay scalable: the stored file itself is served, never a raster copy. */
async function toDecoration(row: Row): Promise<MemoryBookDecoration> {
  const db = await admin();
  const { data: signed } = await db.storage
    .from(text(row.bucket) || MEMORY_BOOK_DECORATIONS_BUCKET)
    .createSignedUrl(text(row.path), 60 * 60 * 12);
  return {
    id: String(row.id),
    name: text(row.name),
    category: toCategory(row.category),
    url: signed?.signedUrl ?? null,
    fileType: row.file_type === "svg" ? "svg" : "png",
    recolorable: row.recolorable === true,
    enabled: row.enabled === true,
    sortOrder: Number(row.sort_order ?? 0),
    path: text(row.path),
    createdAt: text(row.created_at),
  };
}

async function listAll(onlyEnabled: boolean): Promise<MemoryBookDecoration[]> {
  const db = await admin();
  let query = db
    .from("memory_book_decorations")
    .select("id, name, category, bucket, path, file_type, recolorable, enabled, sort_order, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (onlyEnabled) query = query.eq("enabled", true);
  const { data } = await query;
  const rows = (data ?? []) as unknown as Row[];
  const out: MemoryBookDecoration[] = [];
  for (const row of rows) out.push(await toDecoration(row));
  return out;
}

/** Decorations a customer may browse: only the ones Admin switched on. */
export const listMemoryBookDecorations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<{ decorations: MemoryBookDecoration[] }> => {
    return { decorations: await listAll(true) };
  });

/** Everything in the library, including switched-off decorations. */
export const adminListMemoryBookDecorations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ decorations: MemoryBookDecoration[] }> => {
    await assertAdmin(context);
    return { decorations: await listAll(false) };
  });

/** Registers one already uploaded decoration file in the library. */
export const adminAddMemoryBookDecoration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { name?: string; category?: string; path?: string; fileType?: string }) => ({
      name: String(input?.name ?? "").slice(0, 120),
      category: toCategory(input?.category),
      path: String(input?.path ?? "").slice(0, 400),
      fileType: input?.fileType === "svg" ? ("svg" as const) : ("png" as const),
    }),
  )
  .handler(
    async ({ data, context }): Promise<{ ok: boolean; decorations: MemoryBookDecoration[] }> => {
      await assertAdmin(context);
      if (!data.path) return { ok: false, decorations: await listAll(false) };
      const db = await admin();
      const { error } = await db.from("memory_book_decorations").insert({
        name: data.name || data.path.split("/").pop() || "",
        category: data.category,
        bucket: MEMORY_BOOK_DECORATIONS_BUCKET,
        path: data.path,
        file_type: data.fileType,
        // SVG decorations can later be recoloured by the customer.
        recolorable: data.fileType === "svg",
        enabled: true,
      });
      return { ok: !error, decorations: await listAll(false) };
    },
  );

/** Renames a decoration, moves it to another category or switches it on/off. */
export const adminUpdateMemoryBookDecoration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      name?: string;
      category?: string;
      enabled?: boolean;
      path?: string;
      fileType?: string;
    }) => ({
      id: String(input?.id ?? "").slice(0, 64),
      name: input?.name == null ? null : String(input.name).slice(0, 120),
      category: input?.category == null ? null : toCategory(input.category),
      enabled: typeof input?.enabled === "boolean" ? input.enabled : null,
      path: input?.path == null ? null : String(input.path).slice(0, 400),
      fileType:
        input?.fileType == null ? null : input.fileType === "svg" ? ("svg" as const) : ("png" as const),
    }),
  )
  .handler(
    async ({ data, context }): Promise<{ ok: boolean; decorations: MemoryBookDecoration[] }> => {
      await assertAdmin(context);
      const patch: Record<string, unknown> = {};
      if (data.name != null) patch.name = data.name;
      if (data.category != null) patch.category = data.category;
      if (data.enabled != null) patch.enabled = data.enabled;
      // Replacing the file keeps the same library entry.
      if (data.path) {
        patch.path = data.path;
        patch.bucket = MEMORY_BOOK_DECORATIONS_BUCKET;
        if (data.fileType) {
          patch.file_type = data.fileType;
          patch.recolorable = data.fileType === "svg";
        }
      }
      if (Object.keys(patch).length === 0) return { ok: true, decorations: await listAll(false) };

      const db = await admin();
      const { error } = await db
        .from("memory_book_decorations")
        .update(patch)
        .eq("id", data.id);
      return { ok: !error, decorations: await listAll(false) };
    },
  );

/** Removes one decoration and its stored file. */
export const adminRemoveMemoryBookDecoration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string }) => ({ id: String(input?.id ?? "").slice(0, 64) }))
  .handler(
    async ({ data, context }): Promise<{ ok: boolean; decorations: MemoryBookDecoration[] }> => {
      await assertAdmin(context);
      const db = await admin();
      const { data: row } = await db
        .from("memory_book_decorations")
        .select("id, bucket, path")
        .eq("id", data.id)
        .maybeSingle();
      if (row) {
        const record = row as unknown as Row;
        await db.storage.from(text(record.bucket)).remove([text(record.path)]);
        await db.from("memory_book_decorations").delete().eq("id", data.id);
      }
      return { ok: true, decorations: await listAll(false) };
    },
  );
