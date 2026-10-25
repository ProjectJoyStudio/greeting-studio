// Bounded-memory, restartable exact-object transfers through the shared adapters.
import type { StorageAdapter, StoragePart } from "./types";

export interface TransferState {
  uploadId: string;
  sourceKey: string;
  destinationKey: string;
  sourceSize: number;
  sourceEtag: string | null;
  parts: StoragePart[];
}

export async function transferObject(options: {
  source: StorageAdapter; destination: StorageAdapter;
  sourceKey: string; destinationKey: string;
  state?: TransferState | null;
  save: (state: TransferState | null) => Promise<void>;
}): Promise<{ checksum: string; sizeBytes: number }> {
  const { source, destination, sourceKey, destinationKey, save } = options;
  const sourceInfo = await source.head(sourceKey);
  if (!sourceInfo || sourceInfo.sizeBytes <= 0) throw new Error("transfer_source_missing");
  const destinationInfo = await destination.check(destinationKey);
  const sourceDigest = await source.digest(sourceKey);
  if (destinationInfo.state === "error") throw new Error(`transfer_destination_check:${destinationInfo.detail}`);
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
    state = { uploadId: await destination.beginMultipart(destinationKey, sourceInfo.contentType || "application/octet-stream"), sourceKey, destinationKey, sourceSize: sourceInfo.sizeBytes, sourceEtag: sourceInfo.etag ?? null, parts: [] };
    await save(state);
  }
  const partSize = Math.max(8 * 1024 * 1024, Math.ceil(sourceInfo.sizeBytes / 9999));
  // Do not exceed the runtime's memory ceiling for very large files.
  if (partSize > 32 * 1024 * 1024) throw new Error("transfer_external_worker_required");
  for (let offset = state.parts.length * partSize; offset < sourceInfo.sizeBytes; offset += partSize) {
    const number: number = state.parts.length + 1;
    const bytes = await source.readRange(sourceKey, offset, Math.min(sourceInfo.sizeBytes - 1, offset + partSize - 1));
    const etag = await destination.writePart(destinationKey, state.uploadId, number, bytes);
    state = { ...state, parts: [...state.parts, { number, etag }] };
    await save(state);
  }
  const after = await source.head(sourceKey);
  if (!after || after.etag !== sourceInfo.etag || after.sizeBytes !== sourceInfo.sizeBytes) throw new Error("transfer_source_changed");
  await destination.completeMultipart(destinationKey, state.uploadId, state.parts);
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