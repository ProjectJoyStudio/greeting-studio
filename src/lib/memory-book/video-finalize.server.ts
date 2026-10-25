// Server-only prepared-material confirmation. Originals survive until book completion.
import { MEMORY_BOOK_MATERIALS_BUCKET, MEMORY_BOOK_R2_BUCKET } from "./materials";
import { MEMORY_BOOK_FINAL_VIDEO_MAX_SECONDS } from "./video-prep";
type Row = Record<string, unknown>;
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
export interface PreparedMaterialInput {
 bookId: string; sourceMaterialId: string; sourceMaterialIds: string[];
 path: string; storage: string; fileName: string; mimeType: string;
 sizeBytes: number; durationSeconds: number;
}
export async function finalizePreparedMaterial(data: PreparedMaterialInput, context: { userId: string }, onFinalized: (materialId: string) => Promise<void>): Promise<{ok: boolean; error?: "not_found" | "too_long" | "failed"; materialId?: string; sourceRemoved?: boolean}> {
      const inR2 = data.storage === MEMORY_BOOK_R2_BUCKET;
      const prefix = inR2
        ? `memory-book/${context.userId}/${data.bookId}/`
        : `${context.userId}/${data.bookId}/`;
      if (!data.path.startsWith(prefix) && !(inR2 && data.path.startsWith(`users/${context.userId}/memory-book/${data.bookId}/working/`))) {
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
      // Persist the successful association before irreversible cleanup. If
      // this write fails, originals and saved edits remain untouched.
      await onFinalized(materialId);

      // Confirmation never deletes originals, edits or rewrites page references.
      // Whole-book verified activation owns later working-file cleanup.
      return { ok: true, materialId, sourceRemoved: false };
}
