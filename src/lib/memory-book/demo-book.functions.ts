import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Key of the single app_settings row holding the demonstration material. */
export const MEMORY_BOOK_DEMO_KEY = "memory_book.demo";

/** Private bucket holding demonstration files uploaded by administrators. */
export const MEMORY_BOOK_DEMO_BUCKET = "memory-book-demo";

/** How the demonstration material is presented in the existing demo area. */
export type MemoryBookDemoKind = "book" | "video" | "image";

export interface MemoryBookDemo {
  /** Ready-to-use address of the material shown in the presentation area. */
  url: string | null;
  /** How the material must be displayed. */
  kind: MemoryBookDemoKind;
}

interface StoredDemo {
  kind: MemoryBookDemoKind;
  url: string | null;
  bucket: string | null;
  path: string | null;
}

const EMPTY: StoredDemo = { kind: "book", url: null, bucket: null, path: null };

function toKind(value: unknown): MemoryBookDemoKind {
  return value === "video" || value === "image" ? value : "book";
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalise(value: unknown): StoredDemo {
  if (!value || typeof value !== "object") return EMPTY;
  const v = value as Record<string, unknown>;
  return {
    kind: toKind(v.kind),
    url: text(v.url),
    bucket: text(v.bucket),
    path: text(v.path),
  };
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function resolve(stored: StoredDemo): Promise<MemoryBookDemo> {
  if (stored.bucket && stored.path) {
    try {
      const db = await admin();
      const signed = await db.storage
        .from(stored.bucket)
        .createSignedUrl(stored.path, 60 * 60 * 12);
      return { url: signed.data?.signedUrl ?? null, kind: stored.kind };
    } catch {
      return { url: null, kind: stored.kind };
    }
  }
  return { url: stored.url, kind: stored.kind };
}

/** Public read used by the Memory Book presentation page. */
export const getMemoryBookDemo = createServerFn({ method: "GET" }).handler(
  async (): Promise<MemoryBookDemo> => {
    try {
      const db = await admin();
      const { data } = await db
        .from("app_settings")
        .select("value")
        .eq("key", MEMORY_BOOK_DEMO_KEY)
        .maybeSingle();
      return await resolve(normalise(data?.value ?? null));
    } catch {
      return { url: null, kind: "book" };
    }
  },
);

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const { data: isAdmin } = await (
    context.supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
    }
  ).rpc("is_admin", { _user_id: context.userId });
  if (isAdmin !== true) throw new Error("forbidden");
}

/** Administrators read the raw stored selection (link or stored file). */
export const getMemoryBookDemoAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StoredDemo & { previewUrl: string | null }> => {
    await assertAdmin(context);
    const db = await admin();
    const { data } = await db
      .from("app_settings")
      .select("value")
      .eq("key", MEMORY_BOOK_DEMO_KEY)
      .maybeSingle();
    const stored = normalise(data?.value ?? null);
    const resolved = await resolve(stored);
    return { ...stored, previewUrl: resolved.url };
  });

/** Administrators select, replace or remove the demonstration material. */
export const setMemoryBookDemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      kind?: string | null;
      url?: string | null;
      bucket?: string | null;
      path?: string | null;
    }) => ({
      kind: toKind(data?.kind),
      url: text(data?.url),
      bucket: text(data?.bucket),
      path: text(data?.path),
    }),
  )
  .handler(async ({ data, context }): Promise<MemoryBookDemo> => {
    await assertAdmin(context);

    const stored: StoredDemo =
      data.bucket && data.path
        ? { kind: data.kind, url: null, bucket: data.bucket, path: data.path }
        : { kind: data.kind, url: data.url, bucket: null, path: null };

    const db = await admin();
    const { error } = await db
      .from("app_settings")
      .upsert(
        { key: MEMORY_BOOK_DEMO_KEY, value: { ...stored } as unknown as never, updated_by: context.userId },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return await resolve(stored);
  });

export interface MemoryBookDemoMaterial {
  label: string;
  kind: MemoryBookDemoKind;
  bucket: string;
  path: string;
  source: "live_card" | "personal_video" | "greeting_card" | "upload";
}

/**
 * Existing Project Joy material an administrator can put into the demo area:
 * finished Live Cards, Personal Video Greetings, greeting-card images and
 * files that were uploaded for the demonstration itself.
 */
export const listMemoryBookDemoMaterials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ materials: MemoryBookDemoMaterial[] }> => {
    await assertAdmin(context);
    const db = await admin();
    const out: MemoryBookDemoMaterial[] = [];

    const uploads = await db.storage
      .from(MEMORY_BOOK_DEMO_BUCKET)
      .list("", { limit: 50, sortBy: { column: "created_at", order: "desc" } });
    for (const file of uploads.data ?? []) {
      if (!file?.name) continue;
      const lower = file.name.toLowerCase();
      const kind: MemoryBookDemoKind = /\.(mp4|webm|mov|m4v)$/.test(lower)
        ? "video"
        : /\.(png|jpe?g|webp|gif|avif)$/.test(lower)
          ? "image"
          : "book";
      out.push({
        label: file.name,
        kind,
        bucket: MEMORY_BOOK_DEMO_BUCKET,
        path: file.name,
        source: "upload",
      });
    }

    const { data: liveCards } = await db
      .from("live_greeting_cards")
      .select("id, final_bucket, final_path, finalized_at")
      .not("final_path", "is", null)
      .order("finalized_at", { ascending: false })
      .limit(25);
    for (const row of (liveCards ?? []) as unknown as Record<string, unknown>[]) {
      const bucket = text(row.final_bucket) ?? "live-greeting-card-videos";
      const path = text(row.final_path);
      if (!path) continue;
      out.push({
        label: `Live Card · ${String(row.id).slice(0, 8)}`,
        kind: "video",
        bucket,
        path,
        source: "live_card",
      });
    }

    const { data: videos } = await db
      .from("pvg_videos")
      .select("id, storage_bucket, storage_path, created_at, status")
      .eq("status", "succeeded")
      .not("storage_path", "is", null)
      .order("created_at", { ascending: false })
      .limit(25);
    for (const row of (videos ?? []) as Record<string, unknown>[]) {
      const bucket = text(row.storage_bucket);
      const path = text(row.storage_path);
      if (!bucket || !path) continue;
      out.push({
        label: `Personal Video · ${String(row.id).slice(0, 8)}`,
        kind: "video",
        bucket,
        path,
        source: "personal_video",
      });
    }

    const { data: cards } = await db
      .from("user_greeting_cards")
      .select(
        "id, title, storage_bucket, storage_path, final_storage_bucket, final_storage_path, created_at",
      )
      .not("storage_path", "is", null)
      .order("created_at", { ascending: false })
      .limit(25);
    for (const row of (cards ?? []) as Record<string, unknown>[]) {
      const finalPath = text(row.final_storage_path);
      const bucket = finalPath
        ? (text(row.final_storage_bucket) ?? text(row.storage_bucket))
        : text(row.storage_bucket);
      const path = finalPath ?? text(row.storage_path);
      if (!bucket || !path) continue;
      out.push({
        label: text(row.title) ?? String(row.id).slice(0, 8),
        kind: "image",
        bucket,
        path,
        source: "greeting_card",
      });
    }

    return { materials: out };
  });
