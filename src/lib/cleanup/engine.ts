// Verified automatic cleanup engine. Pure orchestration: storage, database and
// audit store are injected so the rules can be tested without real files.
// A file counts as deleted only after an independent presence check proves
// it is gone; an item's record is finalized only when every one of its files
// is verified deleted, verified absent, or protected because something else
// still needs it.

export type EntityType = "card" | "live_card" | "live_animation" | "pvg_project";
export const ENTITY_TYPES: EntityType[] = ["card", "live_card", "live_animation", "pvg_project"];

export type ObjectStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "VERIFIED_DELETED"
  | "ALREADY_ABSENT_VERIFIED"
  | "PROTECTED_RETAINED"
  | "RETRY_REQUIRED"
  | "FAILED"
  | "NOT_VERIFIED";
export type OperationStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "RETRY_REQUIRED"
  | "COMPLETED"
  | "FAILED"
  | "NOT_VERIFIED"
  | "CANCELLED";

export const RESOLVED: ObjectStatus[] = ["VERIFIED_DELETED", "ALREADY_ABSENT_VERIFIED", "PROTECTED_RETAINED"];
export const MAX_ATTEMPTS = 6;
export const LEASE_SECONDS = 300;

/** Buckets each product may clean. Anything else is never deleted. */
export const ALLOWED_BUCKETS: Record<EntityType, string[]> = {
  card: ["user-greeting-cards"],
  live_card: ["live-greeting-cards", "live-greeting-card-videos"],
  live_animation: ["live-greeting-card-videos"],
  pvg_project: ["pvg-photos", "pvg-scenes"],
};

export interface EntityState {
  id: string;
  ownerUserId: string | null;
  deletedAt: string | null;
  purgeAfter: string | null;
  permanentlyDeleted?: boolean;
}
export interface PlannedObject {
  bucket: string;
  key: string;
  role: string;
}
export type Presence = "present" | "absent" | "unknown";
export interface RemoveResult {
  ok: boolean;
  /** Provider listed the key among removed objects. */
  listed: boolean;
  status?: number;
  message?: string;
}
export interface OperationRow {
  id: string;
  entityType: EntityType;
  entityId: string;
  status: OperationStatus;
  nextAttemptAt: string | null;
  deletedAtSnapshot: string | null;
}
export interface ObjectRow {
  id: string;
  bucket: string;
  key: string;
  status: ObjectStatus;
  attempt: number;
  nextAttemptAt: string | null;
}
export interface ObjectUpdate {
  status: ObjectStatus;
  attempt: number;
  apiResult: string | null;
  verification: string | null;
  error: string | null;
  nextAttemptAt: string | null;
}

export interface CleanupDeps {
  now(): Date;
  listCandidates(type: EntityType): Promise<string[]>;
  loadEntity(type: EntityType, id: string): Promise<EntityState | null>;
  planObjects(type: EntityType, id: string): Promise<PlannedObject[]>;
  beforeDelete?(type: EntityType, id: string): Promise<void>;
  finalize(type: EntityType, id: string): Promise<void>;
  present(bucket: string, key: string): Promise<Presence>;
  remove(bucket: string, key: string): Promise<RemoveResult>;
  referenceCount(bucket: string, key: string, type: EntityType, id: string): Promise<number>;
  store: {
    getOperation(type: EntityType, id: string): Promise<OperationRow | null>;
    createOperation(type: EntityType, entity: EntityState): Promise<OperationRow>;
    resetOperation(opId: string, entity: EntityState): Promise<void>;
    claim(opId: string, token: string): Promise<boolean>;
    finishOperation(opId: string, token: string, patch: OperationPatch): Promise<void>;
    upsertObjects(op: OperationRow, entity: EntityState, objects: PlannedObject[], eligibility: Record<string, unknown>): Promise<void>;
    listObjects(opId: string): Promise<ObjectRow[]>;
    updateObject(obj: ObjectRow, opId: string, update: ObjectUpdate): Promise<void>;
  };
  newToken(): string;
}
export interface OperationPatch {
  status: OperationStatus;
  nextAttemptAt: string | null;
  lastError: string | null;
  counts: { total: number; verified: number; absent: number; protected: number; unresolved: number };
  finalized: boolean;
}

export function isEligible(e: EntityState | null, now: Date): boolean {
  if (!e || !e.deletedAt || !e.purgeAfter || e.permanentlyDeleted) return false;
  const at = Date.parse(e.purgeAfter);
  return Number.isFinite(at) && at <= now.getTime();
}

/** Only the item's own owner folder inside its product's buckets may be cleaned. */
export function inScope(type: EntityType, owner: string | null, bucket: string, key: string): boolean {
  if (!owner || !ALLOWED_BUCKETS[type].includes(bucket)) return false;
  if (key.includes("..") || key.startsWith("/")) return false;
  return key.startsWith(`${owner}/`);
}

export function backoffMs(attempt: number): number {
  return Math.min(60_000 * 2 ** Math.max(0, attempt - 1), 6 * 3600_000);
}

export function classifyFailure(status: number | undefined): "transient" | "permanent" {
  if (status === undefined || status === 0 || status === 408 || status === 429 || status >= 500) return "transient";
  return "permanent";
}

export function sanitize(message: string | undefined | null): string | null {
  if (!message) return null;
  return message
    .replace(/(bearer|apikey|token|signature|key)[=:\s]+[\w.\-]+/gi, "$1=[redacted]")
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[redacted]")
    .slice(0, 300);
}

export function sameInstant(a: string | null, b: string | null): boolean {
  return a === b || (!!a && !!b && Date.parse(a) === Date.parse(b));
}

function isDue(next: string | null, now: Date) {
  return !next || Date.parse(next) <= now.getTime();
}

/** Processes one object; returns its new state. Never deletes outside scope. */
export async function processObject(
  deps: CleanupDeps,
  type: EntityType,
  entity: EntityState,
  obj: ObjectRow,
): Promise<ObjectUpdate> {
  const now = deps.now();
  const attempt = obj.attempt + 1;
  const retry = (status: ObjectStatus, apiResult: string | null, verification: string | null, error: string | null): ObjectUpdate => {
    if (attempt >= MAX_ATTEMPTS) {
      return { status: status === "NOT_VERIFIED" ? "NOT_VERIFIED" : "FAILED", attempt, apiResult, verification, error, nextAttemptAt: null };
    }
    return { status, attempt, apiResult, verification, error, nextAttemptAt: new Date(now.getTime() + backoffMs(attempt)).toISOString() };
  };

  if (!inScope(type, entity.ownerUserId, obj.bucket, obj.key)) {
    return { status: "PROTECTED_RETAINED", attempt, apiResult: "not_called", verification: "out_of_scope", error: null, nextAttemptAt: null };
  }
  let refs: number;
  try {
    refs = await deps.referenceCount(obj.bucket, obj.key, type, entity.id);
  } catch (e) {
    return retry("RETRY_REQUIRED", "not_called", "reference_check_failed", sanitize((e as Error).message));
  }
  if (refs > 0) {
    return { status: "PROTECTED_RETAINED", attempt, apiResult: "not_called", verification: `referenced_by_${refs}`, error: null, nextAttemptAt: null };
  }

  const before = await safePresent(deps, obj.bucket, obj.key);
  if (before === "unknown") return retry("NOT_VERIFIED", "not_called", "presence_unknown_before", null);
  if (before === "absent") {
    return { status: "ALREADY_ABSENT_VERIFIED", attempt, apiResult: "not_called", verification: "absent_before_delete", error: null, nextAttemptAt: null };
  }

  let res: RemoveResult;
  try {
    res = await deps.remove(obj.bucket, obj.key);
  } catch (e) {
    res = { ok: false, listed: false, message: (e as Error).message };
  }
  if (!res.ok) {
    const apiResult = `error_${res.status ?? "network"}`;
    if (classifyFailure(res.status) === "permanent") {
      return { status: "FAILED", attempt, apiResult, verification: "not_checked", error: sanitize(res.message), nextAttemptAt: null };
    }
    return retry("RETRY_REQUIRED", apiResult, "not_checked", sanitize(res.message));
  }
  const apiResult = res.listed ? "ok_listed" : "ok_not_listed";
  const after = await safePresent(deps, obj.bucket, obj.key);
  if (after === "absent") {
    return { status: "VERIFIED_DELETED", attempt, apiResult, verification: "absent_after_delete", error: null, nextAttemptAt: null };
  }
  if (after === "present") return retry("RETRY_REQUIRED", apiResult, "still_present_after_delete", null);
  return retry("NOT_VERIFIED", apiResult, "presence_unknown_after", null);
}

async function safePresent(deps: CleanupDeps, bucket: string, key: string): Promise<Presence> {
  try {
    return await deps.present(bucket, key);
  } catch {
    return "unknown";
  }
}

export interface RunSummary {
  completed: Record<EntityType, number>;
  retrying: number;
  failed: number;
  notVerified: number;
  skipped: number;
  cancelled: number;
}

/** Runs one cleanup pass over one item. Returns its resulting status, or null when skipped. */
export async function runEntity(deps: CleanupDeps, type: EntityType, id: string): Promise<OperationStatus | "SKIPPED"> {
  const now = deps.now();
  const entity = await deps.loadEntity(type, id);
  let op = await deps.store.getOperation(type, id);
  if (!isEligible(entity, now) || !entity) {
    return "SKIPPED";
  }
  if (!op) {
    op = await deps.store.createOperation(type, entity);
  } else if (op.status === "COMPLETED" || op.status === "FAILED" || op.status === "NOT_VERIFIED") {
    // Terminal: escalated to administrators, never retried automatically.
    return "SKIPPED";
  } else if (op.status === "CANCELLED" || !sameInstant(op.deletedAtSnapshot, entity.deletedAt)) {
    await deps.store.resetOperation(op.id, entity);
  } else if (!isDue(op.nextAttemptAt, now)) {
    return "SKIPPED";
  }

  const token = deps.newToken();
  if (!(await deps.store.claim(op.id, token))) return "SKIPPED";

  let lastError: string | null = null;
  try {
    // Persist intent for every planned file before anything destructive.
    const planned = await deps.planObjects(type, id);
    await deps.store.upsertObjects(op, entity, planned, {
      deleted_at: entity.deletedAt,
      purge_after: entity.purgeAfter,
      checked_at: now.toISOString(),
      rule: "deleted_at set and purge_after reached",
    });
    const objects = await deps.store.listObjects(op.id);
    const work = objects.filter(
      (o) => !RESOLVED.includes(o.status) && o.status !== "FAILED" && !(o.status === "NOT_VERIFIED" && !o.nextAttemptAt) && isDue(o.nextAttemptAt, now),
    );
    if (work.length > 0 && deps.beforeDelete) await deps.beforeDelete(type, id);

    for (const obj of work) {
      // Revalidate against fresh authoritative state before each destructive step.
      const fresh = await deps.loadEntity(type, id);
      if (!fresh || !isEligible(fresh, deps.now()) || !sameInstant(fresh?.deletedAt ?? null, entity.deletedAt)) {
        await deps.store.finishOperation(op.id, token, {
          status: "CANCELLED",
          nextAttemptAt: null,
          lastError: "eligibility_lost",
          counts: count(await deps.store.listObjects(op.id)),
          finalized: false,
        });
        return "CANCELLED";
      }
      const update = await processObject(deps, type, fresh, obj);
      await deps.store.updateObject(obj, op.id, update);
    }

    const final = await deps.store.listObjects(op.id);
    const counts = count(final);
    let status: OperationStatus;
    let next: string | null = null;
    let finalized = false;
    if (final.every((o) => RESOLVED.includes(o.status))) {
      try {
        await deps.finalize(type, id);
        status = "COMPLETED";
        finalized = true;
      } catch (e) {
        status = "RETRY_REQUIRED";
        lastError = sanitize(`finalize: ${(e as Error).message}`);
        next = new Date(deps.now().getTime() + backoffMs(1)).toISOString();
      }
    } else if (final.some((o) => o.status === "FAILED")) {
      status = "FAILED";
      lastError = "one or more files failed";
    } else if (final.some((o) => o.status === "NOT_VERIFIED" && !o.nextAttemptAt)) {
      status = "NOT_VERIFIED";
      lastError = "deletion could not be verified";
    } else {
      status = "RETRY_REQUIRED";
      const dues = final.map((o) => o.nextAttemptAt).filter((x): x is string => !!x).sort();
      next = dues[0] ?? new Date(deps.now().getTime() + backoffMs(1)).toISOString();
    }
    await deps.store.finishOperation(op.id, token, { status, nextAttemptAt: next, lastError, counts, finalized });
    return status;
  } catch (e) {
    await deps.store.finishOperation(op.id, token, {
      status: "RETRY_REQUIRED",
      nextAttemptAt: new Date(deps.now().getTime() + backoffMs(1)).toISOString(),
      lastError: sanitize((e as Error).message),
      counts: count(await deps.store.listObjects(op.id).catch(() => [])),
      finalized: false,
    });
    return "RETRY_REQUIRED";
  }
}

function count(rows: ObjectRow[]) {
  return {
    total: rows.length,
    verified: rows.filter((r) => r.status === "VERIFIED_DELETED").length,
    absent: rows.filter((r) => r.status === "ALREADY_ABSENT_VERIFIED").length,
    protected: rows.filter((r) => r.status === "PROTECTED_RETAINED").length,
    unresolved: rows.filter((r) => !RESOLVED.includes(r.status)).length,
  };
}

export async function runCleanup(deps: CleanupDeps, types: EntityType[] = ENTITY_TYPES): Promise<RunSummary> {
  const summary: RunSummary = {
    completed: { card: 0, live_card: 0, live_animation: 0, pvg_project: 0 },
    retrying: 0,
    failed: 0,
    notVerified: 0,
    skipped: 0,
    cancelled: 0,
  };
  for (const type of types) {
    for (const id of await deps.listCandidates(type)) {
      const s = await runEntity(deps, type, id);
      if (s === "COMPLETED") summary.completed[type] += 1;
      else if (s === "RETRY_REQUIRED") summary.retrying += 1;
      else if (s === "FAILED") summary.failed += 1;
      else if (s === "NOT_VERIFIED") summary.notVerified += 1;
      else if (s === "CANCELLED") summary.cancelled += 1;
      else summary.skipped += 1;
    }
  }
  return summary;
}
