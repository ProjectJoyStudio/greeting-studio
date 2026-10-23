import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface VideoClassification {
  pageUsedIds: Set<string>;
  assembledIds: Set<string>;
}

/** Read existing same-book evidence; never repair records or move files. */
export async function loadVideoClassification(
  db: Pick<SupabaseClient<Database>, "from">,
  bookId: string,
  userId: string,
): Promise<VideoClassification> {
  const [pages, jobs] = await Promise.all([
    db.from("memory_book_pages").select("video_material_id")
      .eq("book_id", bookId).eq("user_id", userId),
    db.from("memory_book_video_jobs").select("material_id")
      .eq("book_id", bookId).eq("user_id", userId).eq("status", "completed"),
  ]);
  // Unknown classification must never accidentally expose a finished source.
  if (pages.error || jobs.error) throw new Error("video_classification_failed");
  return {
    pageUsedIds: new Set((pages.data ?? []).flatMap(row => row.video_material_id ? [row.video_material_id] : [])),
    assembledIds: new Set((jobs.data ?? []).flatMap(row => row.material_id ? [row.material_id] : [])),
  };
}

export function classifyVideoMaterial(
  row: { id: string; prepared_from_material_id?: unknown; accepted_finished_at?: unknown },
  classification: VideoClassification,
) {
  return {
    // Source cleanup's ON DELETE SET NULL clears the original FK marker.
    // The completed job retains the durable confirmed-output association.
    // Customer explicitly accepted an uploaded short video as finished.
    prepared:
      row.prepared_from_material_id != null ||
      row.accepted_finished_at != null ||
      classification.assembledIds.has(row.id),
    usedOnPage: classification.pageUsedIds.has(row.id),
  };
}

export function isEditingSourceRow(
  row: { id: string; kind: unknown; prepared_from_material_id?: unknown; accepted_finished_at?: unknown },
  classification: VideoClassification,
) {
  const state = classifyVideoMaterial(row, classification);
  return row.kind === "video" && !state.prepared && !state.usedOnPage;
}