// Server-only: which storage company currently fills which role.
//
// Product code asks for a role ("the working area"), never for a company.
// Swapping a company later, or adding a third one, happens only here.
//
// Independent backup writes are enabled. Emergency reads require an explicit
// per-book administrator decision; the primary role never switches itself.

import { b2Adapter, r2Adapter } from "./providers.server";
import type { StorageAdapter, StorageRole } from "./types";
import { readPlatformState, primaryWritesBlocked } from "./platform-state.server";

/**
 * PRIMARY wrapper: while a super-administrator has the platform in emergency
 * or recovery mode, every write and deletion on PRIMARY is refused before it
 * reaches the provider, so no workflow can report success for a file that was
 * not durably stored. Reads are unchanged here; read routing lives in callers.
 */
export function guardWrites(adapter: StorageAdapter, scope: () => string = () => "global"): StorageAdapter {
  const guard = async () => {
    const state = await readPlatformState(scope());
    if (primaryWritesBlocked(state.mode)) throw new Error("storage_emergency_writes_blocked");
  };
  const wrap = <K extends keyof StorageAdapter>(name: K) => (async (...args: unknown[]) => { await guard(); return (adapter[name] as (...a: unknown[]) => unknown)(...args); }) as StorageAdapter[K];
  return Object.assign(Object.create(adapter), {
    put: wrap("put"), signedWriteUrl: wrap("signedWriteUrl"), deleteObject: wrap("deleteObject"), deleteVersion: wrap("deleteVersion"),
    beginMultipart: wrap("beginMultipart"), writePart: wrap("writePart"), completeMultipart: wrap("completeMultipart"),
  }) as StorageAdapter;
}

const guardedPrimary = guardWrites(r2Adapter);

const ROLES: Record<StorageRole, StorageAdapter | null> = {
  primary: guardedPrimary,
  backup: b2Adapter,
  // No emergency area is configured. Nothing may fall back automatically.
  emergency: null,
};

/** The storage company currently holding one role, when it is configured. */
export function storageFor(role: StorageRole): StorageAdapter | null {
  const adapter = ROLES[role];
  return adapter && adapter.isReady() ? adapter : null;
}

/** Every provider Project Joy knows, independent of role (Storage C registers here). */
export function knownProviders(): StorageAdapter[] {
  return [r2Adapter, b2Adapter];
}
/** Exact provider by id, for admin transfers with an explicit source/destination. */
export function providerById(id: string): StorageAdapter | null {
  const found = knownProviders().find(a => a.id === id);
  return found && found.isReady() ? found : null;
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
