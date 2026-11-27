// Simulated provider tests (in-memory storage and audit store). Real backend
// tests live in tests/cleanup_integration.ts.
import { describe, expect, it } from "vitest";
import {
  MAX_ATTEMPTS,
  backoffMs,
  classifyFailure,
  inScope,
  isEligible,
  runCleanup,
  runEntity,
  sanitize,
  type CleanupDeps,
  type EntityState,
  type ObjectRow,
  type OperationRow,
  type Presence,
  type RemoveResult,
} from "./engine";

const OWNER = "11111111-1111-1111-1111-111111111111";
const PAST = "2026-01-01T00:00:00.000Z";
const FUTURE = "2999-01-01T00:00:00.000Z";

function world(opts: {
  entity?: Partial<EntityState>;
  files?: string[];
  present?: (key: string) => Presence;
  remove?: (key: string, n: number) => RemoveResult;
  refs?: (key: string) => number;
  plan?: string[];
  bucket?: string;
}) {
  let clock = new Date("2026-11-26T12:00:00Z");
  const files = new Set(opts.files ?? []);
  const entity: EntityState = { id: "e1", ownerUserId: OWNER, deletedAt: PAST, purgeAfter: PAST, ...opts.entity };
  const ops = new Map<string, OperationRow & { lease: string | null }>();
  const objs = new Map<string, ObjectRow[]>();
  const removed: string[] = [];
  const attempts: string[] = [];
  let finalized = 0;
  let removeCalls = 0;
  const bucket = opts.bucket ?? "user-greeting-cards";
  const deps: CleanupDeps = {
    now: () => clock,
    newToken: () => Math.random().toString(36),
    listCandidates: async () => (entity && finalized === 0 ? [entity.id] : []),
    loadEntity: async () => (finalized ? null : { ...entity }),
    planObjects: async () => (opts.plan ?? [...(opts.files ?? [])]).map((k) => ({ bucket, key: k, role: "f" })),
    finalize: async () => void (finalized += 1),
    present: async (_b, k) => (opts.present ? opts.present(k) : files.has(k) ? "present" : "absent"),
    remove: async (_b, k) => {
      removeCalls += 1;
      const r = opts.remove ? opts.remove(k, removeCalls) : { ok: true, listed: true };
      if (r.ok && !opts.present) files.delete(k);
      if (r.ok) removed.push(k);
      return r;
    },
    referenceCount: async (_b, k) => (opts.refs ? opts.refs(k) : 0),
    store: {
      getOperation: async () => ops.get("op") ?? null,
      createOperation: async (_t, e) => {
        if (!ops.has("op")) ops.set("op", { id: "op", entityType: "card", entityId: e.id, status: "PENDING", nextAttemptAt: null, deletedAtSnapshot: e.deletedAt, lease: null });
        return ops.get("op")!;
      },
      resetOperation: async (_id, e) => {
        const o = ops.get("op")!;
        Object.assign(o, { status: "PENDING", nextAttemptAt: null, deletedAtSnapshot: e.deletedAt });
      },
      claim: async (_id, token) => {
        const o = ops.get("op")!;
        if (o.lease) return false;
        o.lease = token;
        o.status = "IN_PROGRESS";
        return true;
      },
      finishOperation: async (_id, token, p) => {
        const o = ops.get("op")!;
        if (o.lease !== token) return;
        Object.assign(o, { status: p.status, nextAttemptAt: p.nextAttemptAt, lease: null });
      },
      upsertObjects: async (op, _e, list) => {
        const cur = objs.get(op.id) ?? [];
        for (const p of list) if (!cur.some((c) => c.key === p.key)) cur.push({ id: p.key, bucket: p.bucket, key: p.key, status: "PENDING", attempt: 0, nextAttemptAt: null });
        objs.set(op.id, cur);
      },
      listObjects: async (id) => (objs.get(id) ?? []).map((o) => ({ ...o })),
      updateObject: async (obj, id, u) => {
        const row = (objs.get(id) ?? []).find((o) => o.id === obj.id)!;
        Object.assign(row, { status: u.status, attempt: u.attempt, nextAttemptAt: u.nextAttemptAt });
        attempts.push(`${obj.key}:${u.status}`);
      },
    },
  };
  return {
    deps,
    entity,
    op: () => ops.get("op"),
    objects: () => objs.get("op") ?? [],
    removed,
    attempts,
    finalized: () => finalized,
    advance: (ms: number) => void (clock = new Date(clock.getTime() + ms)),
    files,
  };
}

const K = (n: string) => `${OWNER}/${n}.jpg`;

describe("verified cleanup", () => {
  it("1 active item (not deleted) is never selected", async () => {
    const w = world({ entity: { deletedAt: null, purgeAfter: null }, files: [K("a")] });
    expect(await runEntity(w.deps, "card", "e1")).toBe("SKIPPED");
    expect(w.removed).toEqual([]);
  });
  it("2 item still within retention is protected", async () => {
    const w = world({ entity: { purgeAfter: FUTURE }, files: [K("a")] });
    expect(await runEntity(w.deps, "card", "e1")).toBe("SKIPPED");
    expect(w.files.has(K("a"))).toBe(true);
  });
  it("3+4 expired deleted item is cleaned and each file verified absent", async () => {
    const w = world({ files: [K("a"), K("b")] });
    expect(await runEntity(w.deps, "card", "e1")).toBe("COMPLETED");
    expect(w.objects().map((o) => o.status)).toEqual(["VERIFIED_DELETED", "VERIFIED_DELETED"]);
    expect(w.finalized()).toBe(1);
  });
  it("5 already absent file is recorded as verified absent without deleting", async () => {
    const w = world({ plan: [K("gone")], files: [] });
    expect(await runEntity(w.deps, "card", "e1")).toBe("COMPLETED");
    expect(w.objects()[0]?.status).toBe("ALREADY_ABSENT_VERIFIED");
    expect(w.removed).toEqual([]);
  });
  it("6+9 permanent provider failure is recorded and escalated, item kept", async () => {
    const w = world({ files: [K("a")], remove: () => ({ ok: false, listed: false, status: 403, message: "forbidden" }) });
    expect(await runEntity(w.deps, "card", "e1")).toBe("FAILED");
    expect(w.objects()[0]?.status).toBe("FAILED");
    expect(w.finalized()).toBe(0);
    expect(await runEntity(w.deps, "card", "e1")).toBe("SKIPPED");
  });
  it("7 delete reported OK but file still present is not a success", async () => {
    const w = world({ files: [K("a")], present: () => "present" });
    expect(await runEntity(w.deps, "card", "e1")).toBe("RETRY_REQUIRED");
    expect(w.objects()[0]?.status).toBe("RETRY_REQUIRED");
    expect(w.finalized()).toBe(0);
  });
  it("7b inconclusive verification is NOT_VERIFIED after bounded retries, never success", async () => {
    let first = true;
    const w = world({ files: [K("a")], present: () => (first ? ((first = false), "present") : "unknown") });
    let status = await runEntity(w.deps, "card", "e1");
    for (let i = 0; i < MAX_ATTEMPTS + 2 && status !== "NOT_VERIFIED"; i++) {
      w.advance(7 * 3600_000);
      status = await runEntity(w.deps, "card", "e1");
    }
    expect(status).toBe("NOT_VERIFIED");
    expect(w.finalized()).toBe(0);
  });
  it("8 temporary failure is retried after backoff and then succeeds", async () => {
    const w = world({ files: [K("a")], remove: (_k, n) => (n === 1 ? { ok: false, listed: false, status: 503 } : { ok: true, listed: true }) });
    expect(await runEntity(w.deps, "card", "e1")).toBe("RETRY_REQUIRED");
    expect(await runEntity(w.deps, "card", "e1")).toBe("SKIPPED"); // not due yet
    w.advance(backoffMs(1) + 1);
    expect(await runEntity(w.deps, "card", "e1")).toBe("COMPLETED");
  });
  it("10 interrupted run resumes without reprocessing verified files", async () => {
    const w = world({ files: [K("a"), K("b")], remove: (k, n) => (n === 2 ? { ok: false, listed: false, status: 500 } : { ok: true, listed: true }) });
    await runEntity(w.deps, "card", "e1");
    expect(w.objects()[0]?.status).toBe("VERIFIED_DELETED");
    w.advance(backoffMs(1) + 1);
    expect(await runEntity(w.deps, "card", "e1")).toBe("COMPLETED");
    expect(w.removed.filter((k) => k === K("a")).length).toBe(1);
  });
  it("11 repeated runs are idempotent", async () => {
    const w = world({ files: [K("a")] });
    await runCleanup(w.deps, ["card"]);
    await runCleanup(w.deps, ["card"]);
    expect(w.removed.length).toBe(1);
    expect(w.finalized()).toBe(1);
  });
  it("12 concurrent runs: only one holds the lease", async () => {
    const w = world({ files: [K("a")] });
    const r = await Promise.all([runEntity(w.deps, "card", "e1"), runEntity(w.deps, "card", "e1")]);
    expect(r.filter((x) => x === "COMPLETED").length).toBe(1);
    expect(w.removed.length).toBe(1);
  });
  it("14 out-of-scope and shared files are never deleted", async () => {
    const other = "22222222-2222-2222-2222-222222222222/x.jpg";
    const w = world({ files: [K("shared"), other], refs: (k) => (k === K("shared") ? 1 : 0) });
    // Another owner's folder inside the product bucket is ambiguous: kept and escalated.
    expect(await runEntity(w.deps, "card", "e1")).toBe("NOT_VERIFIED");
    expect(w.removed).toEqual([]);
    expect(w.objects().map((o) => o.status)).toEqual(["PROTECTED_RETAINED", "NEEDS_REVIEW"]);
    expect(w.finalized()).toBe(0);
  });
  it("14b library/other-product buckets are protected without deletion", async () => {
    const w = world({ files: [K("lib")], bucket: "music-library" });
    expect(await runEntity(w.deps, "card", "e1")).toBe("COMPLETED");
    expect(w.removed).toEqual([]);
    expect(w.objects()[0]?.status).toBe("PROTECTED_RETAINED");
  });
  it("final PVG videos, voice-overs and recordings are cleanable for the owner", () => {
    for (const b of ["generated-videos", "generated-audio", "voice-samples"]) expect(inScope("pvg_project", OWNER, b, K("v"))).toBe(true);
    expect(inScope("live_animation", OWNER, "live-greeting-card-videos", K("final"))).toBe(true);
  });
  it("manual: item not in recycle bin is refused", async () => {
    const w = world({ entity: { deletedAt: null, purgeAfter: null }, files: [K("a")] });
    expect(await runEntity(w.deps, "card", "e1", { actorUserId: "adm", allowBeforeRetention: true })).toBe("REFUSED_NOT_IN_TRASH");
    expect(w.removed).toEqual([]);
  });
  it("manual: within retention needs explicit confirmation", async () => {
    const w = world({ entity: { purgeAfter: FUTURE }, files: [K("a")] });
    expect(await runEntity(w.deps, "card", "e1", { actorUserId: "adm", allowBeforeRetention: false })).toBe("REFUSED_RETENTION");
    expect(w.files.has(K("a"))).toBe(true);
    expect(await runEntity(w.deps, "card", "e1", { actorUserId: "adm", allowBeforeRetention: true })).toBe("COMPLETED");
    expect(w.objects()[0]?.status).toBe("VERIFIED_DELETED");
  });
  it("manual: active customer rights block deletion", async () => {
    const w = world({ files: [K("a")] });
    w.deps.activeRightsBlock = async () => "shared_link_active";
    expect(await runEntity(w.deps, "live_animation", "e1", { actorUserId: "adm", allowBeforeRetention: true })).toBe("REFUSED_ACTIVE");
    expect(w.removed).toEqual([]);
  });
  it("manual: administrator may retry an escalated failure; scheduler may not", async () => {
    let fail = true;
    const w = world({ files: [K("a")], remove: () => (fail ? { ok: false, listed: false, status: 403 } : { ok: true, listed: true }) });
    expect(await runEntity(w.deps, "card", "e1")).toBe("FAILED");
    fail = false;
    expect(await runEntity(w.deps, "card", "e1")).toBe("SKIPPED");
    expect(await runEntity(w.deps, "card", "e1", { actorUserId: "adm", allowBeforeRetention: false })).toBe("COMPLETED");
    expect(w.finalized()).toBe(1);
  });
  it("manual: concurrent requests — one runs, the other is told it is busy", async () => {
    const w = world({ files: [K("a")] });
    const m = { actorUserId: "adm", allowBeforeRetention: false };
    const r = await Promise.all([runEntity(w.deps, "card", "e1", m), runEntity(w.deps, "card", "e1", m)]);
    expect(r.sort()).toEqual(["BUSY", "COMPLETED"]);
    expect(w.removed.length).toBe(1);
  });
  it("cancelled deletion during run stops before further deletes", async () => {
    const w = world({ files: [K("a"), K("b")] });
    const orig = w.deps.loadEntity;
    let n = 0;
    w.deps.loadEntity = async (t, id) => {
      n += 1;
      const e = await orig(t, id);
      return n >= 3 && e ? { ...e, deletedAt: null } : e;
    };
    expect(await runEntity(w.deps, "card", "e1")).toBe("CANCELLED");
    expect(w.removed.length).toBe(1);
    expect(w.finalized()).toBe(0);
  });
  it("rules", () => {
    expect(isEligible({ id: "x", ownerUserId: OWNER, deletedAt: PAST, purgeAfter: PAST, permanentlyDeleted: true }, new Date())).toBe(false);
    expect(inScope("card", OWNER, "pvg-photos", K("a"))).toBe(false);
    expect(inScope("card", OWNER, "user-greeting-cards", `${OWNER}/../x`)).toBe(false);
    expect(inScope("pvg_project", OWNER, "memory-book-materials", K("a"))).toBe(false);
    expect(classifyFailure(429)).toBe("transient");
    expect(classifyFailure(401)).toBe("permanent");
    expect(backoffMs(1)).toBe(60_000);
    expect(backoffMs(20)).toBe(6 * 3600_000);
    expect(sanitize("Bearer abc.def token=xyz")).not.toContain("xyz");
  });
});
