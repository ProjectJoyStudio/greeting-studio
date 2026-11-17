// Client-safe Storage Admin rules (pure; unit-tested).
export const EMERGENCY_PHRASE = "ACTIVATE B2 EMERGENCY";
export const RETURN_PHRASE = "RETURN TO R2 PRIMARY";
/** A provider check older than this cannot justify a mode change. */
export const HEALTH_FRESH_MS = 10 * 60 * 1000;

export interface KeyClass { area: string; kind: "customer" | "system" | "other"; product: string | null; userId: string | null; projectId: string | null; stage: string | null; category: string | null }

/** Logical ownership from the key alone: users/{user}/{product}/{project}/{stage}/… or system/{category}/… */
export function classifyKey(key: string): KeyClass {
  const parts = key.split("/");
  if (parts[0] === "users" && parts.length >= 4) {
    const stage = ["working", "completed"].includes(parts[4] ?? "") ? parts[4] : null;
    return { area: `users/${parts[2]}`, kind: "customer", product: parts[2], userId: parts[1], projectId: parts[3], stage, category: stage ? parts[5] ?? null : parts[4] ?? null };
  }
  if (parts[0] === "system" && parts.length >= 2) return { area: `system/${parts[1]}`, kind: "system", product: null, userId: null, projectId: null, stage: null, category: parts[1] };
  return { area: "other", kind: "other", product: null, userId: null, projectId: null, stage: null, category: null };
}

export type Readiness = { ready: boolean; blockers: string[] };
/** Return to PRIMARY only after a finished recovery with zero conflicts/failures and a fresh healthy R2. */
export function recoveryReadiness(input: { mode: string; operation: { status: string; conflicts: number; failed: number; total: number; verified: number } | null; r2Health: { ok: boolean; checked_at: string } | null; now: number }): Readiness {
  const blockers: string[] = [];
  if (input.mode !== "recovery") blockers.push("not_in_recovery");
  if (!input.operation) blockers.push("no_recovery");
  else {
    if (input.operation.status !== "completed") blockers.push("recovery_incomplete");
    if (input.operation.conflicts > 0) blockers.push("conflicts");
    if (input.operation.failed > 0) blockers.push("failed_items");
    if (input.operation.verified !== input.operation.total) blockers.push("unverified_items");
  }
  if (!input.r2Health?.ok || input.now - Date.parse(input.r2Health.checked_at) > HEALTH_FRESH_MS) blockers.push("primary_health");
  return { ready: blockers.length === 0, blockers };
}

/** Overall label shown on the dashboard. Never "healthy" without a real recent check. */
export function overallStatus(input: { mode: string; r2Ok: boolean | null; b2Ok: boolean | null; recoveryRunning: boolean; backupFailed: number; integrityProblems: number }): "HEALTHY" | "DEGRADED" | "UNAVAILABLE" | "SYNCING" | "EMERGENCY" | "RECOVERY_REQUIRED" {
  if (input.mode === "emergency") return "EMERGENCY";
  if (input.mode === "recovery") return input.recoveryRunning ? "SYNCING" : "RECOVERY_REQUIRED";
  if (input.r2Ok === false && input.b2Ok === false) return "UNAVAILABLE";
  if (input.r2Ok === false) return "RECOVERY_REQUIRED";
  if (input.r2Ok !== true || input.b2Ok !== true || input.backupFailed > 0 || input.integrityProblems > 0) return "DEGRADED";
  return "HEALTHY";
}

/** Public list prices (USD per GB-month) used ONLY for clearly-labelled estimates. */
export const PRICE_BASIS = { r2: { perGbMonth: 0.015, source: "Cloudflare R2 Standard list price" }, b2: { perGbMonth: 0.006, source: "Backblaze B2 list price" } } as const;
