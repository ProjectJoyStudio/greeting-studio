// Server-only: which storage company currently fills which role.
//
// Product code asks for a role ("the working area"), never for a company.
// Swapping a company later, or adding a third one, happens only here.
//
// Independent backup writes are enabled. Emergency reads require an explicit
// per-book administrator decision; the primary role never switches itself.

import { b2Adapter, r2Adapter } from "./providers.server";
import type { StorageAdapter, StorageRole } from "./types";

const ROLES: Record<StorageRole, StorageAdapter | null> = {
  primary: r2Adapter,
  backup: b2Adapter,
  // No emergency area is configured. Nothing may fall back automatically.
  emergency: null,
};

/** The storage company currently holding one role, when it is configured. */
export function storageFor(role: StorageRole): StorageAdapter | null {
  const adapter = ROLES[role];
  return adapter && adapter.isReady() ? adapter : null;
}

/** True when a role can actually be used right now. */
export function storageReady(role: StorageRole): boolean {
  return storageFor(role) !== null;
}

/**
 * Whether an independent reserve is configured for automatic protection.
 */
export function backupWritesEnabled(): boolean {
  return storageReady("backup");
}

/** Plain overview for reports and checks. Contains no keys or secrets. */
export function storageOverview(): Array<{
  role: StorageRole;
  provider: string | null;
  ready: boolean;
}> {
  return (Object.keys(ROLES) as StorageRole[]).map((role) => {
    const adapter = ROLES[role];
    return {
      role,
      provider: adapter ? adapter.describe() : null,
      ready: adapter ? adapter.isReady() : false,
    };
  });
}
