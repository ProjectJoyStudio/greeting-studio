// Server-only: which storage company currently fills which role.
//
// Product code asks for a role ("the working area"), never for a company.
// Swapping a company later, or adding a third one, happens only here.
//
// IMPORTANT for today: only the working area is actually used. The backup
// area is registered so it can be reported on, but nothing writes to it, and
// no emergency switching exists. Both are deliberate future steps.

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
 * Deliberately false: copying Project Joy files to the backup area is a
 * separate, later decision. Nothing in the app may write there until this
 * returns true.
 */
export function backupWritesEnabled(): boolean {
  return false;
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
