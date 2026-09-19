// Server-only: moves the reusable Project Joy music library into the working
// storage area, with an independent verified reserve copy.
//
// A track stays ONE shared Project Joy asset: same library entry, same logical
// track, one single address. Nothing is copied per customer or per book, and
// the older physical file is never deleted here.

import { MEMORY_BOOK_R2_BUCKET } from "@/lib/memory-book/materials";

type Row = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export interface MusicMigrationItem {
  id: string;
  title: string;
  /** Where it was before this run. */
  from: string;
  /** The shared Project Joy address, when it is now in the working area. */
  key: string | null;
  sizeBytes: number | null;
  primary: "present" | "skipped" | "failed";
  backup: "present" | "skipped" | "failed" | "not_configured";
  switched: boolean;
  /** How many books had their reference pointed at the new address. */
  booksUpdated: number;
  error?: string;
}

/** Stable shared address of one library track. Never customer or book specific. */
export function musicKey(id: string, path: string): string {
  const dot = path.lastIndexOf(".");
  const raw = dot > -1 ? path.slice(dot + 1).toLowerCase() : "mp3";
  const ext = raw.replace(/[^a-z0-9]/g, "") || "mp3";
  return `system/music/${id}.${ext}`;
}

function contentTypeOf(key: string, fallback: string): string {
  if (key.endsWith(".wav")) return "audio/wav";
  if (key.endsWith(".m4a")) return "audio/mp4";
  if (key.endsWith(".ogg")) return "audio/ogg";
  if (key.endsWith(".mp3")) return "audio/mpeg";
  return fallback || "audio/mpeg";
}

/**
 * Copies every library track into the working area, verifies it, makes the
 * independent reserve copy and only then points the library entry — and the
 * books that already chose the track — at the new address. Safe to run again:
 * verified copies are left untouched.
 */
export async function migrateMusicLibraryToPrimary(): Promise<{
  ok: boolean;
  items: MusicMigrationItem[];
  error?: string;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { storageFor } = await import("@/lib/storage/registry.server");
  const { backupToReserve, recordPrimary } = await import("@/lib/storage/backup.server");

  const primary = storageFor("primary");
  if (!primary) return { ok: false, items: [], error: "primary_not_configured" };
  const hasBackup = storageFor("backup") !== null;

  const { data } = await supabaseAdmin
    .from("music_tracks")
    .select("id, title, storage_bucket, storage_path")
    .order("sort_order", { ascending: true });

  const items: MusicMigrationItem[] = [];

  for (const raw of ((data ?? []) as unknown as Row[])) {
    const id = String(raw.id);
    const from = text(raw.storage_bucket);
    const path = text(raw.storage_path);
    const item: MusicMigrationItem = {
      id,
      title: text(raw.title),
      from,
      key: null,
      sizeBytes: null,
      primary: "failed",
      backup: "failed",
      switched: false,
      booksUpdated: 0,
    };

    // Already in the working area: only confirm it is really there and that
    // its reserve copy exists. Nothing is copied twice.
    if (from === MEMORY_BOOK_R2_BUCKET) {
      const head = await primary.head(path);
      item.key = path;
      item.sizeBytes = head?.sizeBytes ?? null;
      item.primary = head ? "skipped" : "failed";
      item.switched = true;
      if (!head) {
        item.error = "missing_in_primary";
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

    const key = musicKey(id, path);
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
          contentTypeOf(key, file.type),
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
      //    track id, its title and every book choice stay untouched.
      const { error: upErr } = await supabaseAdmin
        .from("music_tracks")
        .update({ storage_bucket: MEMORY_BOOK_R2_BUCKET, storage_path: key } as never)
        .eq("id", id);
      item.switched = !upErr;
      if (upErr) {
        item.error = "reference_update_failed";
        items.push(item);
        continue;
      }

      // 6. books that already chose this exact track keep the same logical
      //    track and simply read it from the new address.
      const { data: books } = await supabaseAdmin
        .from("memory_book_projects")
        .select("id")
        .eq("music_track_id", id)
        .eq("music_track_path", path);
      const ids = ((books ?? []) as unknown as Row[]).map((b) => String(b.id));
      if (ids.length) {
        const { error: bookErr } = await supabaseAdmin
          .from("memory_book_projects")
          .update({ music_track_bucket: MEMORY_BOOK_R2_BUCKET, music_track_path: key } as never)
          .in("id", ids);
        if (!bookErr) item.booksUpdated = ids.length;
        else item.error = "book_reference_update_failed";
      }
    } catch (err) {
      item.error = err instanceof Error ? err.message.slice(0, 200) : "unexpected_error";
    }

    items.push(item);
  }

  return { ok: true, items };
}
