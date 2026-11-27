// Client-safe validation of the explicit confirmation for irreversible deletion.
export const MANUAL_CONFIRM_WORD = "DELETE";

export function parseManualInput(input: unknown): { confirm: string; allowBeforeRetention: boolean } {
  const r = (input ?? {}) as Record<string, unknown>;
  if (r["confirm"] !== MANUAL_CONFIRM_WORD) throw new Error("confirmation_required");
  return { confirm: MANUAL_CONFIRM_WORD, allowBeforeRetention: r["allowBeforeRetention"] === true };
}
