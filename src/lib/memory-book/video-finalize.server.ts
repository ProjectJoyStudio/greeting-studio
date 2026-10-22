// Server-only existing prepared-material finalization and involved-source cleanup.
import { MEMORY_BOOK_MATERIALS_BUCKET, MEMORY_BOOK_R2_BUCKET } from "./materials";
import { MEMORY_BOOK_FINAL_VIDEO_MAX_SECONDS } from "./video-prep";
type Row = Record<string, unknown>;
const text = (value: unknown) => typeof value === "string" ? value : "";
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
export interface PreparedMaterialInput {
 bookId: string; sourceMaterialId: string; sourceMaterialIds: string[];
 path: string; storage: string; fileName: string; mimeType: string;
 sizeBytes: number; durationSeconds: number;
}
export async function finalizePreparedMaterial(data: PreparedMaterialInput, context: { userId: string }): Promise<{ok: boolean; error?: "not_found" | "too_long" | "failed"; materialId?: string; sourceRemoved?: boolean}> {
      const inR2 = data.storage === MEMORY_BOOK_R2_BUCKET;
      const prefix = inR2
        ? `memory-book/${context.userId}/${data.bookId}/`
        : `${context.userId}/${data.bookId}/`;
      if (!data.path.startsWith(prefix)) {
        return { ok: false, error: "not_found" };
      }
      if (
        !Number.isFinite(data.durationSeconds) ||
        data.durationSeconds <= 0 ||
        data.durationSeconds > MEMORY_BOOK_FINAL_VIDEO_MAX_SECONDS + 1
      ) {
        return { ok: false, error: "too_long" };
      }

      const db = await admin();

      // The prepared file must really exist in storage before anything is
      // treated as saved — a missing upload must never look successful.
      if (inR2) {
        const { r2ObjectSize } = await import("./r2.server");
        const stored = await r2ObjectSize(data.path);
        if (stored == null || stored <= 0 || stored !== data.sizeBytes) return { ok: false, error: "failed" };
      } else {
        const { data: check } = await db.storage
          .from(MEMORY_BOOK_MATERIALS_BUCKET)
          .createSignedUrl(data.path, 60);
        if (!check?.signedUrl) return { ok: false, error: "failed" };
      }

      const { data: existing } = await db
        .from("memory_book_materials")
        .select("id")
        .eq("bucket", data.storage)
        .eq("path", data.path)
        .maybeSingle();

      let materialId = existing ? String((existing as unknown as Row).id) : "";

      if (!materialId) {
        const { data: inserted, error } = await db
          .from("memory_book_materials")
          .insert({
            book_id: data.bookId,
            user_id: context.userId,
            kind: "video",
            bucket: data.storage,
            path: data.path,
            file_name: data.fileName || null,
            mime_type: data.mimeType || null,
            size_bytes: data.sizeBytes || null,
            duration_seconds: Math.min(data.durationSeconds, MEMORY_BOOK_FINAL_VIDEO_MAX_SECONDS),
            prepared_from_material_id: data.sourceMaterialId,
          })
          .select("id")
          .maybeSingle();
        if (error || !inserted) return { ok: false, error: "failed" };
        materialId = String((inserted as unknown as Row).id);
      }

      // Read the stored record back: only a verified record counts as saved.
      const { data: verified } = await db
        .from("memory_book_materials")
        .select("id, book_id, user_id, path")
        .eq("id", materialId)
        .eq("book_id", data.bookId)
        .eq("user_id", context.userId)
        .maybeSingle();
      if (!verified) return { ok: false, error: "failed" };

      // The finished video in the working area gets its own independent
      // reserve copy. It can never undo or delay the customer's result.
      if (inR2) {
        const { recordPrimary, placementOf, backupToReserve } = await import("@/lib/storage/backup.server");
        if (!(await recordPrimary(data.path))) return { ok: false, error: "failed" };
        const primary = await placementOf(data.path, "r2");
        if (primary?.status !== "present" || Number(primary.size_bytes) !== data.sizeBytes) return { ok: false, error: "failed" };
        // An independent reserve failure never invalidates the working result.
        await backupToReserve(data.path).catch(() => undefined);
      }



      // Only now the long original working videos may be removed — and only
      // the ones that really took part in this assembly. Every other video of
      // the Materials page stays untouched.
      let sourceRemoved = false;
      const involved = Array.from(
        new Set(
          (data.sourceMaterialIds.length > 0
            ? data.sourceMaterialIds
            : [data.sourceMaterialId]
          ).filter(Boolean),
        ),
      );
      for (const involvedId of involved) {
        try {
          const { data: sourceRow } = await db
            .from("memory_book_materials")
            .select("id, bucket, path")
            .eq("id", involvedId)
            .eq("book_id", data.bookId)
            .eq("user_id", context.userId)
            .maybeSingle();
          const row = sourceRow as unknown as Row | null;
          if (!row) continue;
          // Move references before deleting the old row: its foreign key may
          // otherwise set those page references to null immediately on deletion.
          const { error: pageError } = await db
            .from("memory_book_pages")
            .update({ video_material_id: materialId })
            .eq("book_id", data.bookId)
            .eq("user_id", context.userId)
            .eq("video_material_id", involvedId);
          if (pageError) continue;
          const { memoryBookFileRemove } = await import("./storage.server");
          // Only the exact file of this one source video is removed.
          await memoryBookFileRemove(text(row.bucket), text(row.path));
          const { error: delError } = await db
            .from("memory_book_materials")
            .delete()
            .eq("id", involvedId)
            .eq("book_id", data.bookId)
            .eq("user_id", context.userId);
          if (!delError) {
            sourceRemoved = true;
            await db
              .from("memory_book_video_edits")
              .delete()
              .eq("book_id", data.bookId)
              .eq("source_material_id", involvedId)
              .eq("user_id", context.userId);
          }
        } catch {
          // The prepared video is already safe; cleanup can be retried later.
        }
      }


      return { ok: true, materialId, sourceRemoved };
}
