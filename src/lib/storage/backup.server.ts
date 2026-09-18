// Server-only: keeps one independent reserve copy of a stored file.
//
// The working area (primary) is the only place customers ever read from. The
// reserve area (backup) receives an automatic, verified copy. A failed copy
// never touches the working file and never affects the customer's result.
//
// Nothing here ever switches customer traffic to the reserve area. Doing that
// stays a deliberate administrator decision, made elsewhere, later.

import { storageFor } from "./registry.server";
import type { StorageProviderId, StorageRole } from "./types";

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

    const check = await backup.head(objectKey);
    if (!check) return await failed("verify_missing");
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
