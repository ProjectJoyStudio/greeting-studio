// Bounded-memory, restartable exact-object transfers through the shared adapters.
import type { StorageAdapter, StoragePart } from "./types";
import { checkWithRetry } from "./check-retry.server";

export interface TransferState {
  uploadId: string;
  sourceKey: string;
  destinationKey: string;
  sourceSize: number;
  sourceEtag: string | null;
  parts: StoragePart[];
  sourceChecksum?: string;
}

export async function transferObject(options: {
  source: StorageAdapter; destination: StorageAdapter;
  sourceKey: string; destinationKey: string;
  state?: TransferState | null;
  save: (state: TransferState | null) => Promise<void>;
  progress?: (stage: string, detail?: Record<string, unknown>) => Promise<void>;
}): Promise<{ checksum: string; sizeBytes: number }> {
  const { source, destination, sourceKey, destinationKey, save } = options;
  await options.progress?.("source_check");
  const sourceCheck = await checkWithRetry(source, sourceKey);
  if (sourceCheck.state === "error") throw new Error(`transfer_source_check:${sourceCheck.detail}`);
  const sourceInfo = sourceCheck.state === "exists" ? sourceCheck.info : null;
  if (!sourceInfo || sourceInfo.sizeBytes <= 0) throw new Error("transfer_source_missing");
  const destinationInfo = await checkWithRetry(destination, destinationKey, { report: async (result, attempt) => {
    await options.progress?.("destination_check", { provider: destination.id, checkAttempt: attempt, state: result.state,
      ...(result.state === "error" ? { httpStatus: result.status, code: result.code, requestId: result.requestId } : {}) });
  } });
  if (destinationInfo.state === "error") throw new Error(`transfer_destination_check:${destinationInfo.detail}`);
  await options.progress?.("source_digest");
  const sourceDigest = await source.digest(sourceKey);
  if (sourceDigest.sizeBytes !== sourceInfo.sizeBytes) throw new Error("transfer_source_changed");
  if (options.state?.sourceChecksum && options.state.sourceChecksum !== sourceDigest.checksum) throw new Error("transfer_source_changed");
  if (destinationInfo.state === "exists") {
    const existingDigest = await destination.digest(destinationKey);
    if (existingDigest.checksum !== sourceDigest.checksum || existingDigest.sizeBytes !== sourceDigest.sizeBytes) {
      // Never silently overwrite a pre-existing different object.
      throw new Error("transfer_existing_integrity_mismatch");
    }
    await save(null);
    return sourceDigest;
  }
  let state = options.state;
  if (state && (state.sourceKey !== sourceKey || state.destinationKey !== destinationKey || state.sourceSize !== sourceInfo.sizeBytes || state.sourceEtag !== (sourceInfo.etag ?? null))) throw new Error("transfer_source_changed");
  if (!state) {
    await options.progress?.("multipart_begin");
    state = { uploadId: await destination.beginMultipart(destinationKey, sourceInfo.contentType || "application/octet-stream"), sourceKey, destinationKey, sourceSize: sourceInfo.sizeBytes, sourceEtag: sourceInfo.etag ?? null, sourceChecksum: sourceDigest.checksum, parts: [] };
    await save(state);
  }
  const partSize = Math.max(8 * 1024 * 1024, Math.ceil(sourceInfo.sizeBytes / 9999));
  // Do not exceed the runtime's memory ceiling for very large files.
  if (partSize > 32 * 1024 * 1024) throw new Error("transfer_external_worker_required");
  for (let offset = state.parts.length * partSize; offset < sourceInfo.sizeBytes; offset += partSize) {
    const number: number = state.parts.length + 1;
    await options.progress?.("multipart_part", { part: number });
    const bytes = await source.readRange(sourceKey, offset, Math.min(sourceInfo.sizeBytes - 1, offset + partSize - 1));
    const etag = await destination.writePart(destinationKey, state.uploadId, number, bytes);
    state = { ...state, parts: [...state.parts, { number, etag }] };
    await save(state);
  }
  const after = await source.head(sourceKey);
  if (!after || after.etag !== sourceInfo.etag || after.sizeBytes !== sourceInfo.sizeBytes) throw new Error("transfer_source_changed");
  await options.progress?.("multipart_complete");
  // A new matching destination appearing during transfer is reused, never overwritten.
  const beforeComplete = await checkWithRetry(destination, destinationKey);
  if (beforeComplete.state === "error") throw new Error(`transfer_destination_check:${beforeComplete.detail}`);
  if (beforeComplete.state === "exists") {
    const existing = await destination.digest(destinationKey);
    if (existing.checksum !== sourceDigest.checksum || existing.sizeBytes !== sourceDigest.sizeBytes) throw new Error("transfer_existing_integrity_mismatch");
    await save(null);
    return existing;
  }
  await destination.completeMultipart(destinationKey, state.uploadId, state.parts);
  await options.progress?.("destination_verify");
  const verified = await checkWithRetry(destination, destinationKey);
  if (verified.state !== "exists") throw new Error(verified.state === "error" ? `transfer_verify:${verified.detail}` : "transfer_verify_missing");
  const copied = await destination.digest(destinationKey);
  if (copied.checksum !== sourceDigest.checksum || copied.sizeBytes !== sourceDigest.sizeBytes) throw new Error("transfer_integrity_mismatch");
  await save(null);
  return copied;
}

/** Permanent deletion is separate from ordinary independent provider deletion. */
export async function deleteExactObjectVersions(adapter: StorageAdapter, key: string): Promise<void> {
  // Listing must succeed before deletion; permission/network errors are not absence.
  const versions = await adapter.listVersions(key);
  for (const version of versions) await adapter.deleteVersion(key, version.versionId);
  const checked = await adapter.check(key);
  if (checked.state === "error") throw new Error(`delete_verify:${checked.detail}`);
  if (checked.state === "exists") {
    if (!(await adapter.deleteObject(key))) throw new Error("delete_failed");
  }
  const remaining = await adapter.listVersions(key);
  const final = await adapter.check(key);
  if (remaining.length || final.state !== "missing") throw new Error("delete_not_confirmed");
}