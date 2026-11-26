// Server-to-server scheduler authentication. Each scheduler has a random,
// service-only secret in its own config table (never readable by anon or
// authenticated roles); callers must send it as a Bearer token. Public keys
// are never accepted.
export type ConfigTable =
  | "pvg_dispatch_config"
  | "live_cards_dispatch_config"
  | "card_purge_dispatch_config"
  | "voice_previews_dispatch_config";

export function constantTimeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length === y.length && x.length > 0 ? 0 : 1;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function bearerOf(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ") || header.length > 200) return null;
  return header.slice(7);
}

export async function verifySchedulerRequest(request: Request, table: ConfigTable): Promise<boolean> {
  const supplied = bearerOf(request);
  if (!supplied) return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from(table).select("secret, enabled").eq("id", true).maybeSingle();
  const cfg = data as { secret: string | null; enabled: boolean } | null;
  if (!cfg?.enabled || !cfg.secret) return false;
  return constantTimeEqual(cfg.secret, supplied);
}
