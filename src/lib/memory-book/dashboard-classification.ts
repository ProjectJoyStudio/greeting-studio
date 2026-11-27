/** A successful completed-storage purchase is authoritative even after expiry.
 * Included retention, working extensions and timestamps alone are not proof. */
export type MemoryBookCollection = "working" | "completed" | "storage";
export function memoryBookCollection(book: { status: string; purchasedStorageExpiresAt?: string | null }): MemoryBookCollection {
  if (book.status !== "completed") return "working";
  return book.purchasedStorageExpiresAt ? "storage" : "completed";
}
export function purchasedStorageExpiry(purchases: readonly { service: string; new_expires_at: string }[]): string | null {
  const confirmed = purchases.filter((p) => p.service === "completed" && Number.isFinite(Date.parse(p.new_expires_at)));
  return confirmed.reduce<string | null>((latest, p) => !latest || Date.parse(p.new_expires_at) > Date.parse(latest) ? p.new_expires_at : latest, null);
}
