import { storageFor } from "@/lib/storage/registry.server";
import { transferObject, deleteExactObjectVersions, type TransferState } from "@/lib/storage/transfer.server";
import { writePlacement, backupToReserve, appendPlacementHistory } from "@/lib/storage/backup.server";
import { isWorkingObject, pageDependencyIds } from "./storage-policy";
import { MEMORY_BOOK_R2_BUCKET } from "./materials";
type Row = Record<string, any>;
export interface PackageAsset { bucket: string; path: string; target: string; shared: boolean; checksum?: string; sizeBytes?: number; primaryVerified?: boolean; backupVerified?: boolean; transfer?: TransferState | null }
async function db() { const { supabaseAdmin } = await import("@/integrations/supabase/client.server"); return supabaseAdmin as unknown as { from: (table: string) => any }; }
export async function storageOperation(bookId: string): Promise<Row | null> {
  const { data, error } = await (await db()).from("memory_book_storage_operations").select("*").eq("book_id", bookId).maybeSingle();
  if (error) throw new Error("operation_read_failed"); return data;
}
async function save(bookId: string, patch: Row, token?: string) {
  let q = (await db()).from("memory_book_storage_operations").update({ ...patch, updated_at: new Date().toISOString() }).eq("book_id", bookId);
  if (token) q = q.eq("lease_token", token);
  const { data, error } = await q.select("book_id").maybeSingle();
  if (error || !data) throw new Error("operation_save_failed");
}
export async function inventoryBook(userId: string, bookId: string) {
  const client = await db();
  const read = async (table: string) => {
    const { data, error } = await client.from(table).select("*").eq("book_id", bookId).eq("user_id", userId);
    if (error) throw new Error(`inventory_${table}`); return data as Row[];
  };
  const { data: book, error } = await client.from("memory_book_projects").select("*").eq("id", bookId).eq("user_id", userId).single();
  if (error || !book) throw new Error("book_not_found");
  const pages = await read("memory_book_pages");
  const materials = await read("memory_book_materials"), designs = await read("memory_book_designs"), music = await read("memory_book_music_variants");
  const backgrounds = await read("memory_book_page_backgrounds");
  const ids = pageDependencyIds(pages);
  const selected = [book.selected_cover_id, book.selected_leaf_id, ...(book.back_cover_overridden ? [book.back_cover_design_id] : [])].filter(Boolean);
  const missingDesigns = selected.filter(id => !designs.some(d => d.id === id));
  if (missingDesigns.length) {
    const { data: sharedDesigns, error: sharedError } = await client.from("memory_book_designs").select("*").in("id", missingDesigns).eq("source", "library");
    if (sharedError) throw new Error("shared_design_read_failed");
    designs.push(...(sharedDesigns ?? []));
  }
  for (const id of selected) if (!designs.some(d => d.id === id)) throw new Error("design_dependency_missing");
  for (const id of ids.materials) if (!materials.some(m => m.id === id)) throw new Error("material_dependency_missing");
  const { data: decorations, error: decorationError } = ids.decorations.size ? await client.from("memory_book_decorations").select("*").in("id", [...ids.decorations]) : { data: [], error: null };
  if (decorationError || decorations.length !== ids.decorations.size) throw new Error("decoration_dependency_missing");
  const manifest: PackageAsset[] = [];
  const add = (bucket: string, path: string) => {
    if (!bucket && !path) return;
    if (!bucket || !path) throw new Error("asset_dependency_incomplete");
    if (manifest.some(a => a.bucket === bucket && a.path === path)) return;
    const shared = path.startsWith("system/") || bucket === "memory-book-library" || bucket === "music-library" || bucket === "memory-book-decorations";
    // Existing nonworking files are inventoried but cannot be copied/cleaned without approved migration.
    if (!shared && !isWorkingObject(userId, bookId, path)) throw new Error("legacy_migration_approval_required");
    const target = shared ? path : `users/${userId}/memory-book/${bookId}/completed/${path.split("/working/")[1]}`;
    manifest.push({ bucket, path, target, shared });
  };
  for (const p of pages) add(p.background_bucket, p.background_path);
  for (const m of materials) if (ids.materials.has(m.id)) add(m.bucket, m.path);
  for (const d of designs) if (selected.includes(d.id)) add(d.bucket, d.path);
  for (const d of decorations) add(d.bucket, d.path);
  if (book.music_source === "library") add(book.music_track_bucket, book.music_track_path);
  if (book.music_source === "created") {
    const selectedMusic = music.find(m => m.id === book.music_variant_id);
    if (!selectedMusic) throw new Error("music_dependency_missing"); add(selectedMusic.bucket, selectedMusic.path);
  }
  return { manifest, snapshot: { book, pages, materials: materials.filter(m => ids.materials.has(m.id)), designs: designs.filter(d => selected.includes(d.id)), music: music.filter(m => m.id === book.music_variant_id), decorations, backgrounds } };
}

/** One asset per invocation: persisted cursor and lease make interruption safe. */
export async function advanceBookPackage(userId: string, bookId: string, method: string, retentionDays: number) {
  const client = await db();
  let op = await storageOperation(bookId);
  if (!op) {
    const { data: book } = await client.from("memory_book_projects").select("storage_version").eq("id", bookId).eq("user_id", userId).single();
    if (book?.storage_version !== 2) throw new Error("existing_book_protected");
    const inventory = await inventoryBook(userId, bookId);
    const { error } = await client.from("memory_book_storage_operations").upsert({ book_id: bookId, user_id: userId, kind: "finalize", method, ...inventory }, { onConflict: "book_id", ignoreDuplicates: true });
    if (error) throw new Error("operation_create_failed");
    op = await storageOperation(bookId);
  }
  if (!op || op.user_id !== userId) throw new Error("operation_not_found");
  if (op.activated_at) return { ok: true, pending: false };
  const token = crypto.randomUUID();
  const now = new Date().toISOString();
  const { data: locked, error } = await client.from("memory_book_storage_operations").update({ lease_token: token, lease_until: new Date(Date.now() + 15 * 60000).toISOString() }).eq("book_id", bookId).or(`lease_until.is.null,lease_until.lt.${now}`).select("*").maybeSingle();
  if (error) throw new Error("operation_lock_failed");
  if (!locked) return { ok: false, pending: true };
  op = locked;
  if (!op) throw new Error("operation_not_found");
  const manifest = op.manifest as PackageAsset[];
  try {
    const primary = storageFor("primary"), backup = storageFor("backup");
    if (!primary || !backup) throw new Error("storage_not_configured");
    const index = Number(op.cursor);
    if (index < manifest.length) {
      const asset = manifest[index];
      // Shared legacy assets need explicit verified migration, not silent copies.
      if (asset.bucket !== MEMORY_BOOK_R2_BUCKET) throw new Error("shared_legacy_verification_required");
      await save(bookId, { stage: "preparing", last_error: null }, token);
      await save(bookId, { stage: "primary_verifying" }, token);
      const digest = asset.shared ? await primary.digest(asset.path) : await transferObject({ source: primary, destination: primary, sourceKey: asset.path, destinationKey: asset.target, state: asset.transfer,
        save: async state => { asset.transfer = state; await save(bookId, { manifest }, token); },
      });
      Object.assign(asset, { checksum: digest.checksum, sizeBytes: digest.sizeBytes, primaryVerified: true });
      await writePlacement(asset.target, primary.id, { role: "primary", status: "present", checksum: digest.checksum, sizeBytes: digest.sizeBytes, verifiedAt: new Date().toISOString(), lastError: null });
      await save(bookId, { stage: "backup_verifying", manifest }, token);
      // Finalization is customer-initiated: claim the reserve copy even inside a
      // scheduler back-off window. Leases still prevent concurrent writers.
      const reserve = await backupToReserve(asset.target, { manual: true });
      if (!reserve.ok) throw new Error(`backup_verifying:b2:${reserve.error || "backup_failed"}`);
      // A digest returned by this call was read back from B2 independently of
      // the source; otherwise (copy already present) re-read B2 ourselves.
      const reserveDigest = reserve.checksum && reserve.sizeBytes ? { checksum: reserve.checksum, sizeBytes: reserve.sizeBytes } : await backup.digest(asset.target);
      if (reserveDigest.checksum !== digest.checksum || reserveDigest.sizeBytes !== digest.sizeBytes) throw new Error("backup_integrity_mismatch");
      asset.backupVerified = true;
      await writePlacement(asset.target, backup.id, { role: "backup", status: "present", checksum: digest.checksum, sizeBytes: digest.sizeBytes, verifiedAt: new Date().toISOString(), lastError: null });
      await appendPlacementHistory(asset.target, backup.id, { stage: "finalize_verified", status: "present", provider: backup.id, checksum: digest.checksum, cursor: index, error: null });
      await save(bookId, { manifest, cursor: index + 1, lease_token: null, lease_until: null }, token);
      return { ok: false, pending: true };
    }
    if (!manifest.every(a => a.primaryVerified && a.backupVerified && a.checksum)) throw new Error("package_not_verified");
    await save(bookId, { stage: "activating" }, token);
    // Atomic activation: an interrupted request cannot publish half a transition.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: activated, error: activationError } = await supabaseAdmin.rpc("activate_memory_book_storage", { _book_id: bookId, _user_id: userId, _lease_token: token, _retention_days: retentionDays });
    if (activationError || !activated) throw new Error("activation_failed");
    return { ok: true, pending: false };
  } catch (e) {
    const message = e instanceof Error ? e.message.slice(0, 300) : "package_failed";
    const failing = manifest[Number(op.cursor)];
    if (failing && op.stage === "backup_verifying") {
      const b = storageFor("backup");
      if (b) await appendPlacementHistory(failing.target, b.id, { stage: "finalize_failed", status: "unchanged", provider: b.id, cursor: Number(op.cursor), error: message });
    }
    await save(bookId, { stage: "failed", last_error: message, lease_token: null, lease_until: null }, token);
    throw e;
  }
}

export async function resolvePackageAsset(bookId: string, bucket: string, path: string) {
  const op = await storageOperation(bookId);
  if (!op?.activated_at) return { bucket, path, emergency: false };
  const asset = (op.manifest as PackageAsset[]).find(a => a.bucket === bucket && a.path === path);
  if (!asset) return { bucket, path, emergency: false };
  return { bucket: MEMORY_BOOK_R2_BUCKET, path: asset.target, emergency: !!op.emergency_until && Date.parse(op.emergency_until) > Date.now() };
}

export async function cleanupBookWorking(userId: string, bookId: string) {
  const op = await storageOperation(bookId);
  if (!op?.activated_at || op.user_id !== userId || !(op.manifest as PackageAsset[]).every(a => a.primaryVerified && a.backupVerified && a.checksum)) throw new Error("cleanup_not_authorized");
  const client = await db();
  const token = crypto.randomUUID(), now = new Date().toISOString();
  const { data: locked } = await client.from("memory_book_storage_operations").update({ lease_token: token, lease_until: new Date(Date.now() + 15 * 60000).toISOString(), stage: "cleanup_running" }).eq("book_id", bookId).or(`lease_until.is.null,lease_until.lt.${now}`).select("*").maybeSingle();
  if (!locked) throw new Error("cleanup_busy");
  const results: Row[] = locked.cleanup_results ?? [];
  try {
    const { data: rows, error } = await client.from("storage_placements").select("object_key").like("object_key", `users/${userId}/memory-book/${bookId}/working/%`);
    if (error) throw new Error("cleanup_inventory_failed");
    for (const key of new Set<string>((rows ?? []).map((r: Row) => r.object_key))) {
      if (!isWorkingObject(userId, bookId, key)) throw new Error("cleanup_key_invalid");
      if (results.some(r => r.key === key && r.ok)) continue;
      // Reverify every final dependency immediately before any destructive step.
      for (const asset of op.manifest as PackageAsset[]) for (const role of ["primary", "backup"] as const) {
        const adapter = storageFor(role); if (!adapter) throw new Error("storage_not_configured");
        const digest = await adapter.digest(asset.target); if (digest.checksum !== asset.checksum || digest.sizeBytes !== asset.sizeBytes) throw new Error("cleanup_final_dependency_unverified");
      }
      for (const role of ["primary", "backup"] as const) {
        const adapter = storageFor(role); if (!adapter) throw new Error("storage_not_configured");
        await deleteExactObjectVersions(adapter, key);
        await writePlacement(key, adapter.id, { role, status: "deleted", verifiedAt: null, lastError: null });
      }
      results.push({ key, ok: true }); await save(bookId, { cleanup_results: results }, token);
      // Bound work; next explicit retry resumes the same cleanup ledger.
      await save(bookId, { stage: "cleanup_pending", lease_token: null, lease_until: null }, token);
      return { pending: true };
    }
    const { error: updateError } = await client.from("memory_book_projects").update({ working_cleaned_at: now }).eq("id", bookId).eq("user_id", userId);
    if (updateError) throw new Error("cleanup_timestamp_failed");
    await save(bookId, { stage: "cleanup_completed", lease_token: null, lease_until: null, last_error: null }, token);
    return { pending: false };
  } catch (e) {
    await save(bookId, { stage: "cleanup_failed", last_error: e instanceof Error ? e.message : "cleanup_failed", cleanup_results: results, lease_token: null, lease_until: null }, token); throw e;
  }
}