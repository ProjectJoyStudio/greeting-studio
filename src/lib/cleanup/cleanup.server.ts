// Real dependencies for the verified cleanup engine: Lovable Cloud storage,
// the authoritative storage metadata check and the server-only audit tables.
import type {
  CleanupDeps,
  EntityState,
  EntityType,
  ObjectRow,
  OperationRow,
  PlannedObject,
  Presence,
} from "./engine";
import { LEASE_SECONDS, runCleanup } from "./engine";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];
// The audit tables are new; keep calls loosely typed to avoid coupling.
type Loose = { from: (t: string) => any; rpc: (f: string, a: Record<string, unknown>) => any; storage: Admin["storage"] };

const LIMITS: Record<EntityType, number> = { card: 500, live_card: 500, live_animation: 500, pvg_project: 200 };
const TABLE: Record<EntityType, string> = {
  card: "user_greeting_cards",
  live_card: "live_greeting_cards",
  live_animation: "live_card_animations",
  pvg_project: "pvg_projects",
};

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface ServerDepsOptions {
  /** Restrict a run to these item IDs (used by isolated tests only). */
  onlyIds?: string[];
  /** Overrides for simulated provider behaviour in isolated tests. */
  override?: Partial<Pick<CleanupDeps, "remove" | "present">>;
}

export async function serverDeps(opts: ServerDepsOptions = {}): Promise<CleanupDeps> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as Loose;

  const opFromRow = (r: Record<string, unknown>): OperationRow => ({
    id: String(r["id"]),
    entityType: r["entity_type"] as EntityType,
    entityId: String(r["entity_id"]),
    status: r["status"] as OperationRow["status"],
    nextAttemptAt: (r["next_attempt_at"] as string | null) ?? null,
    deletedAtSnapshot: (r["deleted_at_snapshot"] as string | null) ?? null,
  });

  const present = async (bucket: string, key: string): Promise<Presence> => {
    const meta = await db.rpc("cleanup_object_present", { _bucket: bucket, _key: key });
    if (meta.error || typeof meta.data !== "boolean") return "unknown";
    let head: Presence;
    try {
      const r = await supabaseAdmin.storage.from(bucket).exists(key);
      const status = (r.error as { status?: number } | null)?.status;
      head = r.data === true ? "present" : status === 404 || status === 400 ? "absent" : "unknown";
    } catch {
      head = "unknown";
    }
    if (meta.data && head !== "unknown") return "present";
    if (!meta.data && head === "absent") return "absent";
    if (meta.data && head === "unknown") return "present";
    return "unknown";
  };

  const deps: CleanupDeps = {
    now: () => new Date(),
    newToken: () => crypto.randomUUID(),
    async listCandidates(type) {
      let q = db.from(TABLE[type]).select("id").not("deleted_at", "is", null).lte("purge_after", new Date().toISOString());
      if (type === "pvg_project") q = q.eq("permanently_deleted", false);
      if (opts.onlyIds) q = q.in("id", opts.onlyIds);
      const { data, error } = await q.order("purge_after", { ascending: true }).limit(LIMITS[type]);
      if (error) throw new Error(`candidates ${type}: ${error.message}`);
      return ((data ?? []) as { id: string }[]).map((r) => r.id);
    },
    async loadEntity(type, id): Promise<EntityState | null> {
      const cols = type === "pvg_project" ? "id, user_id, deleted_at, purge_after, permanently_deleted" : "id, user_id, deleted_at, purge_after";
      const { data, error } = await db.from(TABLE[type]).select(cols).eq("id", id).maybeSingle();
      if (error) throw new Error(`load ${type}: ${error.message}`);
      if (!data) return null;
      return {
        id: data.id,
        ownerUserId: data.user_id ?? null,
        deletedAt: data.deleted_at ?? null,
        purgeAfter: data.purge_after ?? null,
        permanentlyDeleted: data.permanently_deleted === true,
      };
    },
    async planObjects(type, id): Promise<PlannedObject[]> {
      const out: PlannedObject[] = [];
      const add = (bucket: unknown, key: unknown, role: string) => {
        if (typeof bucket === "string" && bucket && typeof key === "string" && key) out.push({ bucket, key, role });
      };
      if (type === "card") {
        const { data } = await db.from(TABLE.card).select("storage_bucket, storage_path, final_storage_bucket, final_storage_path").eq("id", id).maybeSingle();
        if (data) {
          add(data.storage_bucket || "user-greeting-cards", data.storage_path, "artwork");
          add(data.final_storage_bucket || "user-greeting-cards", data.final_storage_path, "final");
        }
      } else if (type === "live_card") {
        const { data } = await db.from(TABLE.live_card).select("storage_bucket, storage_path, video_storage_bucket, video_storage_path").eq("id", id).maybeSingle();
        if (data) {
          add(data.storage_bucket, data.storage_path, "source_image");
          add(data.video_storage_bucket, data.video_storage_path, "video");
        }
      } else if (type === "live_animation") {
        const { data } = await db.from(TABLE.live_animation).select("storage_bucket, storage_path, music_storage_bucket, music_storage_path").eq("id", id).maybeSingle();
        if (data) {
          add(data.storage_bucket, data.storage_path, "animation");
          add(data.music_storage_bucket, data.music_storage_path, "music");
        }
      } else {
        const { collectProjectFiles } = await import("@/lib/personal-video/pvg.server");
        for (const f of await collectProjectFiles(id)) add(f.bucket, f.path, f.role);
      }
      const seen = new Set<string>();
      return out.filter((o) => (seen.has(`${o.bucket}/${o.key}`) ? false : (seen.add(`${o.bucket}/${o.key}`), true)));
    },
    async beforeDelete(type, id) {
      if (type === "pvg_project") {
        const { cancelRunningScenes } = await import("@/lib/personal-video/pvg.server");
        await cancelRunningScenes(id);
      }
    },
    async finalize(type, id) {
      if (type === "card") {
        await must(db.from("user_card_events").delete().eq("card_id", id));
        await must(db.from(TABLE.card).delete().eq("id", id));
      } else if (type === "live_card") {
        await must(db.from(TABLE.live_card).delete().eq("id", id));
      } else if (type === "live_animation") {
        await must(db.from(TABLE.live_animation).delete().eq("id", id));
      } else {
        const { finalizePvgProjectRecord } = await import("@/lib/personal-video/order.server");
        await finalizePvgProjectRecord(id);
      }
    },
    present: opts.override?.present ?? present,
    remove:
      opts.override?.remove ??
      (async (bucket, key) => {
        const { data, error } = await supabaseAdmin.storage.from(bucket).remove([key]);
        if (error) {
          const e = error as { status?: number; statusCode?: string };
          const status = e.status ?? (Number(e.statusCode) || undefined);
          return { ok: false, listed: false, status, message: error.message };
        }
        return { ok: true, listed: (data ?? []).some((f) => f.name === key) };
      }),
    async referenceCount(bucket, key, type, id) {
      const { data, error } = await db.rpc("cleanup_object_reference_count", { _bucket: bucket, _key: key, _entity_type: type, _entity_id: id });
      if (error) throw new Error(error.message);
      return Number(data ?? 0);
    },
    store: {
      async getOperation(type, id) {
        const { data, error } = await db.from("cleanup_operations").select("*").eq("entity_type", type).eq("entity_id", id).maybeSingle();
        if (error) throw new Error(error.message);
        return data ? opFromRow(data) : null;
      },
      async createOperation(type, e) {
        const row = { entity_type: type, entity_id: e.id, owner_user_id: e.ownerUserId, deleted_at_snapshot: e.deletedAt, purge_after_snapshot: e.purgeAfter, is_test: !!opts.onlyIds };
        await db.from("cleanup_operations").upsert(row, { onConflict: "entity_type,entity_id", ignoreDuplicates: true });
        const op = await deps.store.getOperation(type, e.id);
        if (!op) throw new Error("operation not created");
        return op;
      },
      async resetOperation(opId, e) {
        await must(
          db.from("cleanup_operations").update({ status: "PENDING", next_attempt_at: null, last_error: null, deleted_at_snapshot: e.deletedAt, purge_after_snapshot: e.purgeAfter, updated_at: new Date().toISOString() }).eq("id", opId).is("lease_token", null),
        );
      },
      async claim(opId, token) {
        const { data, error } = await db.rpc("claim_cleanup_operation", { _op: opId, _token: token, _seconds: LEASE_SECONDS });
        return !error && data === true;
      },
      async finishOperation(opId, token, p) {
        const now = new Date().toISOString();
        await must(
          db.from("cleanup_operations").update({
            status: p.status,
            next_attempt_at: p.nextAttemptAt,
            last_error: p.lastError,
            objects_total: p.counts.total,
            objects_verified: p.counts.verified,
            objects_absent: p.counts.absent,
            objects_protected: p.counts.protected,
            objects_unresolved: p.counts.unresolved,
            record_finalized_at: p.finalized ? now : null,
            lease_token: null,
            lease_until: null,
            updated_at: now,
          }).eq("id", opId).eq("lease_token", token),
        );
      },
      async upsertObjects(op, e, objects, eligibility) {
        if (objects.length === 0) return;
        const rows = await Promise.all(
          objects.map(async (o) => ({
            operation_id: op.id,
            entity_type: op.entityType,
            entity_id: op.entityId,
            bucket: o.bucket,
            object_key: o.key,
            key_hash: await sha256(`${o.bucket}/${o.key}`),
            role: o.role,
            eligibility,
            deleted_at_snapshot: e.deletedAt,
            purge_after_snapshot: e.purgeAfter,
          })),
        );
        await must(db.from("cleanup_object_audit").upsert(rows, { onConflict: "operation_id,bucket,object_key", ignoreDuplicates: true }));
      },
      async listObjects(opId): Promise<ObjectRow[]> {
        const { data, error } = await db.from("cleanup_object_audit").select("id, bucket, object_key, status, attempt, next_attempt_at").eq("operation_id", opId).order("created_at");
        if (error) throw new Error(error.message);
        return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
          id: String(r["id"]),
          bucket: String(r["bucket"]),
          key: String(r["object_key"]),
          status: r["status"] as ObjectRow["status"],
          attempt: Number(r["attempt"] ?? 0),
          nextAttemptAt: (r["next_attempt_at"] as string | null) ?? null,
        }));
      },
      async updateObject(obj, opId, u) {
        const now = new Date().toISOString();
        await must(
          db.from("cleanup_object_audit").update({ status: u.status, attempt: u.attempt, api_result: u.apiResult, verification: u.verification, error: u.error, next_attempt_at: u.nextAttemptAt, last_attempt_at: now, updated_at: now }).eq("id", obj.id),
        );
        await must(
          db.from("cleanup_object_attempts").insert({ object_id: obj.id, operation_id: opId, attempt: u.attempt, api_result: u.apiResult, verification: u.verification, status: u.status, error: u.error }),
        );
      },
    },
  };
  return deps;
}

async function must(p: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await p;
  if (error) throw new Error(error.message);
}

export async function runVerifiedCleanup(opts: ServerDepsOptions = {}) {
  return runCleanup(await serverDeps(opts));
}
