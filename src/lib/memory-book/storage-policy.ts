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