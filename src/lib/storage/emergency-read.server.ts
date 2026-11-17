// Server-only: emergency reads are served from the BACKUP only when its copy
// is recorded present with a SHA-256 checksum and a verification time.
// Unverified or missing copies return null (the caller shows "unavailable");
// the provider listing is never trusted as proof of integrity on its own.
import { storageFor } from "./registry.server";

async function db() { const { supabaseAdmin } = await import("@/integrations/supabase/client.server"); return supabaseAdmin as unknown as { from: (t: string) => any }; }

export async function verifiedBackupCopy(key: string): Promise<{ checksum: string; sizeBytes: number } | null> {
  const backup = storageFor("backup");
  if (!backup) return null;
  const { data } = await (await db()).from("storage_placements").select("status,checksum,size_bytes,verified_at").eq("object_key", key).eq("provider", backup.id).maybeSingle();
  if (!data || data.status !== "present" || !data.verified_at || !String(data.checksum ?? "").startsWith("sha256:")) return null;
  return { checksum: data.checksum, sizeBytes: Number(data.size_bytes ?? 0) };
}

export async function verifiedBackupReadUrl(key: string, seconds: number): Promise<string | null> {
  if (!(await verifiedBackupCopy(key))) return null;
  return (await storageFor("backup")?.signedReadUrl(key, seconds)) ?? null;
}
