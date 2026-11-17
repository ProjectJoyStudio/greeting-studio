import { describe, it, expect } from "vitest";
import { classifyKey, recoveryReadiness, overallStatus, EMERGENCY_PHRASE, RETURN_PHRASE } from "./storage-admin-policy";
const fresh = { ok: true, checked_at: new Date().toISOString() };
const done = { status: "completed", conflicts: 0, failed: 0, total: 3, verified: 3 };
describe("Storage Admin rules", () => {
  it("classifies customer and system keys separately", () => {
    expect(classifyKey("users/u1/memory-book/b1/working/photos/a.jpg")).toMatchObject({ kind: "customer", product: "memory-book", userId: "u1", projectId: "b1", stage: "working", category: "photos" });
    expect(classifyKey("system/music/x.mp3")).toMatchObject({ kind: "system", category: "music" });
    expect(classifyKey("memory-book/u/x.jpg").kind).toBe("other");
  });
  it("allows return to R2 only after a complete, conflict-free recovery and a fresh healthy R2 check", () => {
    expect(recoveryReadiness({ mode: "recovery", operation: done, r2Health: fresh, now: Date.now() }).ready).toBe(true);
    expect(recoveryReadiness({ mode: "recovery", operation: { ...done, conflicts: 1 }, r2Health: fresh, now: Date.now() }).blockers).toContain("conflicts");
    expect(recoveryReadiness({ mode: "recovery", operation: { ...done, status: "running" }, r2Health: fresh, now: Date.now() }).blockers).toContain("recovery_incomplete");
    expect(recoveryReadiness({ mode: "recovery", operation: done, r2Health: { ok: true, checked_at: new Date(Date.now() - 11 * 60000).toISOString() }, now: Date.now() }).blockers).toContain("primary_health");
    expect(recoveryReadiness({ mode: "emergency", operation: done, r2Health: fresh, now: Date.now() }).blockers).toContain("not_in_recovery");
  });
  it("never reports healthy without real successful checks", () => {
    expect(overallStatus({ mode: "normal", r2Ok: null, b2Ok: true, recoveryRunning: false, backupFailed: 0, integrityProblems: 0 })).toBe("DEGRADED");
    expect(overallStatus({ mode: "normal", r2Ok: true, b2Ok: true, recoveryRunning: false, backupFailed: 0, integrityProblems: 0 })).toBe("HEALTHY");
    expect(overallStatus({ mode: "emergency", r2Ok: false, b2Ok: true, recoveryRunning: false, backupFailed: 0, integrityProblems: 0 })).toBe("EMERGENCY");
    expect(overallStatus({ mode: "normal", r2Ok: false, b2Ok: false, recoveryRunning: false, backupFailed: 0, integrityProblems: 0 })).toBe("UNAVAILABLE");
  });
  it("uses fixed confirmation phrases", () => {
    expect(EMERGENCY_PHRASE).toBe("ACTIVATE B2 EMERGENCY");
    expect(RETURN_PHRASE).toBe("RETURN TO R2 PRIMARY");
  });
});
