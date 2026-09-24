// Server-only: keeps one independent reserve copy of a stored file.
//
// The working area (primary) is the only place customers ever read from. The
// reserve area (backup) receives an automatic, verified copy. A failed copy
// never touches the working file and never affects the customer's result.
//
// Nothing here ever switches customer traffic to the reserve area. Doing that
// stays a deliberate administrator decision, made elsewhere, later.

import { storageFor } from "./registry.server";
import type {
  StorageAdapter,
  StorageCheckResult,
  StorageProviderId,
  StorageRole,
} from "./types";

export type PlacementStatus =
  | "pending"
  | "copying"
  | "present"
  | "failed"
  | "deleting"
  | "deleted";

export interface BackupResult {
  ok: boolean;
  status: PlacementStatus;
  /** True when a verified copy already existed and nothing was copied again. */
  skipped?: boolean;
  error?: string;
}

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as {
    from: (table: string) => any;
  };
}

const TABLE = "storage_placements";

/** One placement row, or null when this file was never recorded there. */
export async function placementOf(
  objectKey: string,
  provider: StorageProviderId,
): Promise<Record<string, unknown> | null> {
  const client = await db();
  const { data } = await client
    .from(TABLE)
    .select("*")
    .eq("object_key", objectKey)
    .eq("provider", provider)
    .maybeSingle();
  return (data as Record<string, unknown> | null) ?? null;
}

/** All recorded copies of one logical file. */
export async function placementsOf(objectKey: string): Promise<Array<Record<string, unknown>>> {
  const client = await db();
  const { data } = await client.from(TABLE).select("*").eq("object_key", objectKey);
  return (data ?? []) as Array<Record<string, unknown>>;
}

interface PlacementPatch {
  role: StorageRole;
  status: PlacementStatus;
  sizeBytes?: number | null;
  contentType?: string | null;
  verifiedAt?: string | null;
  lastBackupAt?: string | null;
  lastError?: string | null;
  bumpAttempts?: boolean;
}

/**
 * Writes exactly one row per file and provider. Repeating the same call can
 * never create a second record for the same physical copy.
 */
async function writePlacement(
  objectKey: string,
  provider: StorageProviderId,
  patch: PlacementPatch,
): Promise<void> {
  const client = await db();
  const existing = await placementOf(objectKey, provider);
  const row: Record<string, unknown> = {
    object_key: objectKey,
    provider,
    role: patch.role,
    status: patch.status,
  };
  if (patch.sizeBytes !== undefined) row.size_bytes = patch.sizeBytes;
  if (patch.contentType !== undefined) row.content_type = patch.contentType;
  if (patch.verifiedAt !== undefined) row.verified_at = patch.verifiedAt;
  if (patch.lastBackupAt !== undefined) row.last_backup_at = patch.lastBackupAt;
  if (patch.lastError !== undefined) row.last_error = patch.lastError;
  if (patch.bumpAttempts) row.attempts = Number(existing?.attempts ?? 0) + 1;

  if (existing) {
    await client.from(TABLE).update(row).eq("id", existing.id as string);
    return;
  }
  await client.from(TABLE).insert(row);
}

/** Removes the bookkeeping of one copy. Never touches a stored file. */
export async function forgetPlacements(objectKey: string): Promise<void> {
  const client = await db();
  await client.from(TABLE).delete().eq("object_key", objectKey);
}

/**
 * Notes that the working copy of one file is gone. The reserve copy and its
 * record are deliberately left alone: the two areas are independent.
 */
export async function markPrimaryDeleted(objectKey: string): Promise<void> {
  try {
    const primary = storageFor("primary");
    if (!primary || !objectKey) return;
    const existing = await placementOf(objectKey, primary.id);
    if (!existing) return;
    const client = await db();
    await client
      .from(TABLE)
      .update({ status: "deleted", verified_at: null, last_error: null })
      .eq("id", existing.id as string);
  } catch {
    // Bookkeeping must never break a deletion.
  }
}


/**
 * Confirms the file really is in the working area and records it. Returns
 * false only when the object is genuinely not there.
 */
export async function recordPrimary(objectKey: string): Promise<boolean> {
  const primary = storageFor("primary");
  if (!primary || !objectKey) return false;
  const info = await primary.head(objectKey);
  if (!info) {
    await writePlacement(objectKey, primary.id, {
      role: "primary",
      status: "failed",
      lastError: "object_not_found",
    });
    return false;
  }
  await writePlacement(objectKey, primary.id, {
    role: "primary",
    status: "present",
    sizeBytes: info.sizeBytes,
    contentType: info.contentType,
    verifiedAt: new Date().toISOString(),
    lastError: null,
  });
  return true;
}

/** Highest number of automatic attempts before a copy waits for a human. */
export const BACKUP_MAX_ATTEMPTS = 5;

/**
 * Checks one stored copy, asking again (at most 3 checks, ~2.5 s total) when
 * the answer is not definitive. A genuine "not found" right after writing is
 * also re-asked once, since some areas report new objects a moment late.
 * Never rewrites the file.
 */
export async function verifyWithRetry(
  adapter: StorageAdapter,
  objectKey: string,
): Promise<StorageCheckResult> {
  const waits = [500, 2000];
  let result = await adapter.check(objectKey);
  for (const ms of waits) {
    if (result.state === "exists") return result;
    await new Promise((r) => setTimeout(r, ms));
    result = await adapter.check(objectKey);
  }
  return result;
}

/**
 * Copies one file from the working area to the reserve area and verifies it.
 * Safe to call again at any time: a verified matching copy is left alone.
 */
export async function backupToReserve(objectKey: string): Promise<BackupResult> {
  const primary = storageFor("primary");
  const backup = storageFor("backup");
  if (!objectKey) return { ok: false, status: "failed", error: "no_key" };
  if (!primary) return { ok: false, status: "failed", error: "primary_not_configured" };
  if (!backup) return { ok: false, status: "failed", error: "backup_not_configured" };

  const source = await primary.head(objectKey);
  if (!source) {
    return { ok: false, status: "failed", error: "primary_object_missing" };
  }

  // Already there and the same size: nothing to do, and nothing duplicated.
  const existing = await placementOf(objectKey, backup.id);
  if (existing?.status === "present") {
    const stored = await backup.head(objectKey);
    if (stored && stored.sizeBytes === source.sizeBytes) {
      return { ok: true, status: "present", skipped: true };
    }
  }

  const failed = async (error: string): Promise<BackupResult> => {
    await writePlacement(objectKey, backup.id, {
      role: "backup",
      status: "failed",
      lastBackupAt: new Date().toISOString(),
      lastError: error,
      bumpAttempts: true,
    });
    // The working copy is deliberately left exactly as it is.
    return { ok: false, status: "failed", error };
  };

  await writePlacement(objectKey, backup.id, {
    role: "backup",
    status: "copying",
    sizeBytes: source.sizeBytes,
    contentType: source.contentType,
    lastBackupAt: new Date().toISOString(),
    lastError: null,
  });

  try {
    const bytes = await primary.getBytes(objectKey);
    if (!bytes) return await failed("read_failed");

    const stored = await backup.put(
      objectKey,
      bytes as unknown as BodyInit,
      source.contentType || "application/octet-stream",
    );
    if (!stored) return await failed("write_failed");

    const verified = await verifyWithRetry(backup, objectKey);
    if (verified.state === "missing") return await failed("verify_missing");
    if (verified.state === "error") return await failed(`verify_error:${verified.detail}`);
    const check = verified.info;
    if (source.sizeBytes > 0 && check.sizeBytes !== source.sizeBytes) {
      return await failed("verify_size_mismatch");
    }

    await writePlacement(objectKey, backup.id, {
      role: "backup",
      status: "present",
      sizeBytes: check.sizeBytes,
      contentType: check.contentType ?? source.contentType,
      verifiedAt: new Date().toISOString(),
      lastBackupAt: new Date().toISOString(),
      lastError: null,
      bumpAttempts: true,
    });
    return { ok: true, status: "present" };
  } catch (err) {
    return await failed(err instanceof Error ? err.message.slice(0, 300) : "unexpected_error");
  }
}

/**
 * Records the working copy and starts the reserve copy. Used right after a
 * customer file has been stored: the customer's result never depends on it.
 */
export async function protectObject(objectKey: string): Promise<void> {
  try {
    const ok = await recordPrimary(objectKey);
    if (!ok) return;
    await backupToReserve(objectKey);
  } catch {
    // A bookkeeping or reserve problem must never reach the customer.
  }
}

/**
 * Picks up a bounded number of unfinished reserve copies and tries again.
 * Nothing loops by itself: this only does work when it is called.
 */
export async function retryPendingBackups(limit = 10): Promise<{ tried: number; done: number }> {
  const backup = storageFor("backup");
  if (!backup) return { tried: 0, done: 0 };
  const client = await db();
  const { data } = await client
    .from(TABLE)
    .select("object_key, attempts")
    .eq("provider", backup.id)
    .in("status", ["pending", "copying", "failed"])
    .lt("attempts", BACKUP_MAX_ATTEMPTS)
    .order("updated_at", { ascending: true })
    .limit(Math.max(1, Math.min(100, limit)));

  const rows = (data ?? []) as Array<{ object_key: string }>;
  let done = 0;
  for (const row of rows) {
    const res = await backupToReserve(row.object_key);
    if (res.ok) done += 1;
  }
  return { tried: rows.length, done };
}

/**
 * Notes that the copy of one file in ONE area is gone. The copy in the other
 * area and its record are deliberately left alone: the areas are independent.
 */
export async function markProviderDeleted(
  objectKey: string,
  provider: StorageProviderId,
): Promise<void> {
  try {
    if (!objectKey) return;
    const existing = await placementOf(objectKey, provider);
    if (!existing) return;
    const client = await db();
    await client
      .from(TABLE)
      .update({ status: "deleted", verified_at: null, last_error: null })
      .eq("id", existing.id as string);
  } catch {
    // Bookkeeping must never break a deletion.
  }
}

/**
 * Brings ONE file back from the reserve area into the working area and checks
 * it arrived. The reserve copy is never removed by a restore.
 */
export async function restoreFromReserve(objectKey: string): Promise<BackupResult> {
  const primary = storageFor("primary");
  const backup = storageFor("backup");
  if (!objectKey) return { ok: false, status: "failed", error: "no_key" };
  if (!primary) return { ok: false, status: "failed", error: "primary_not_configured" };
  if (!backup) return { ok: false, status: "failed", error: "backup_not_configured" };

  const source = await backup.head(objectKey);
  if (!source) return { ok: false, status: "failed", error: "reserve_object_missing" };

  const already = await primary.head(objectKey);
  if (already && already.sizeBytes === source.sizeBytes) {
    await writePlacement(objectKey, primary.id, {
      role: "primary",
      status: "present",
      sizeBytes: already.sizeBytes,
      contentType: already.contentType,
      verifiedAt: new Date().toISOString(),
      lastError: null,
    });
    return { ok: true, status: "present", skipped: true };
  }

  const failed = async (error: string): Promise<BackupResult> => {
    await writePlacement(objectKey, primary.id, {
      role: "primary",
      status: "failed",
      lastError: error,
    });
    return { ok: false, status: "failed", error };
  };

  try {
    const bytes = await backup.getBytes(objectKey);
    if (!bytes) return await failed("reserve_read_failed");
    const stored = await primary.put(
      objectKey,
      bytes as unknown as BodyInit,
      source.contentType || "application/octet-stream",
    );
    if (!stored) return await failed("write_failed");
    const check = await primary.head(objectKey);
    if (!check) return await failed("verify_missing");
    if (source.sizeBytes > 0 && check.sizeBytes !== source.sizeBytes) {
      return await failed("verify_size_mismatch");
    }
    await writePlacement(objectKey, primary.id, {
      role: "primary",
      status: "present",
      sizeBytes: check.sizeBytes,
      contentType: check.contentType ?? source.contentType,
      verifiedAt: new Date().toISOString(),
      lastError: null,
    });
    return { ok: true, status: "present" };
  } catch (err) {
    return await failed(err instanceof Error ? err.message.slice(0, 300) : "unexpected_error");
  }
}
