export const BACKUP_RETRY_LIMIT = 5;
export function backupRetryDelay(attempt: number, random = Math.random): number {
  return Math.min(60 * 60_000, 60_000 * 2 ** Math.max(0, attempt - 1)) * (0.75 + random() * 0.5);
}
/** Allowlist only; never persist arbitrary provider exceptions or signed URLs. */
export function safeBackupError(error: unknown): string {
  const message = error instanceof Error ? error.message : "transfer_failed";
  return /^[a-zA-Z0-9_:.-]{1,240}$/.test(message) ? message : "storage_network_or_provider_failure";
}