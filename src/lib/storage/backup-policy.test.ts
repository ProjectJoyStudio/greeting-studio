import { describe, expect, it } from "vitest";
import { BACKUP_RETRY_LIMIT, backupRetryDelay, safeBackupError } from "./backup-policy";
describe("durable backup policy", () => {
  it("stops automatically after five claims", () => expect(BACKUP_RETRY_LIMIT).toBe(5));
  it("backs off exponentially with bounded jitter", () => {
    expect([1,2,3,4].map(n => backupRetryDelay(n, () => 0.5))).toEqual([60000,120000,240000,480000]);
    expect(backupRetryDelay(100, () => 0)).toBe(2700000);
  });
  it("does not persist exception URLs or customer contents", () => {
    expect(safeBackupError(new Error("https://private?X-Amz-Signature=secret"))).toBe("storage_network_or_provider_failure");
    expect(safeBackupError(new Error("transfer_destination_check:http_403"))).toBe("transfer_destination_check:http_403");
  });
});