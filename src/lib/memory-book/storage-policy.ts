// Pure lifecycle safety rules; never infer ownership from a substring.
export function isWorkingObject(userId: string, bookId: string, key: string): boolean {
  return key.startsWith(`users/${userId}/memory-book/${bookId}/working/`) && !key.split("/").some(p => p === ".." || p === ".");
}
export function mayCleanWorking(activated: boolean, verifiedPrimary: boolean, verifiedBackup: boolean): boolean {
  return activated && verifiedPrimary && verifiedBackup;
}
export function pageDependencyIds(pages: Array<Record<string, unknown>>) {
  const materials = new Set<string>(), decorations = new Set<string>();
  for (const page of pages) {
    for (const slot of Array.isArray(page.slots) ? page.slots : []) if (typeof slot?.materialId === "string") materials.add(slot.materialId);
    if (typeof page.video_material_id === "string") materials.add(page.video_material_id);
    for (const decoration of Array.isArray(page.decorations) ? page.decorations : []) if (typeof decoration?.decorationId === "string") decorations.add(decoration.decorationId);
  }
  return { materials, decorations };
}
/** Automatic cleanup retry policy: bounded, growing delay, then a terminal failure. */
export const CLEANUP_RETRY_LIMIT = 8;
export function cleanupRetryDelayMs(retryCount: number): number {
  return Math.min(60_000 * 2 ** Math.max(0, retryCount - 1), 30 * 60_000);
}
/** Safety failures are never retried automatically; everything else may be temporary. */
export function cleanupErrorIsTerminal(message: string): boolean {
  return /cleanup_not_authorized|cleanup_key_invalid|cleanup_final_dependency_unverified|cleanup_final_dependency_is_working|storage_listing_unsupported/.test(message);
}
