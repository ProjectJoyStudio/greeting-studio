// Real HTTP check of the cleanup scheduler endpoint authorization and version.
// Secrets are read server-side and never printed. Valid calls run a real
// cleanup pass, so run only when no real item is eligible, or accept that.
// Usage: SCHED_BASES=http://localhost:8080,https://...-dev.lovable.app bun tests/purge_scheduler_check.ts
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
const db = supabaseAdmin as any;
const secret = (await db.from("card_purge_dispatch_config").select("secret").limit(1).single()).data.secret as string;
const other = (await db.from("pvg_dispatch_config").select("secret").limit(1).single()).data.secret as string;
const anon = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]!;
const email = `cleanup-test-${crypto.randomUUID()}@example.invalid`, password = crypto.randomUUID();
const u = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
const pub = createClient(process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"]!, anon, { auth: { persistSession: false } });
const jwt = (await pub.auth.signInWithPassword({ email, password })).data.session?.access_token ?? "";
const post = async (base: string, h: Record<string, string>) => {
  const r = await fetch(`${base}/api/public/purge-deleted-cards`, { method: "POST", headers: { "Content-Type": "application/json", ...h }, body: "{}" });
  return { s: r.status, v: r.headers.get("x-cleanup-engine"), b: r.status === 200 ? (await r.text()).slice(0, 200) : "" };
};
for (const base of (process.env["SCHED_BASES"] ?? "http://localhost:8080").split(",")) {
  const cases: Array<[string, Record<string, string>, number]> = [
    ["missing auth", {}, 401], ["wrong secret", { Authorization: `Bearer ${"0".repeat(64)}` }, 401], ["public key only", { apikey: anon }, 401],
    ["public key as bearer", { apikey: anon, Authorization: `Bearer ${anon}` }, 401], ["customer JWT", { apikey: anon, Authorization: `Bearer ${jwt}` }, 401],
    ["other scheduler secret", { Authorization: `Bearer ${other}` }, 401], ["valid private secret", { Authorization: `Bearer ${secret}` }, 200],
  ];
  for (const [n, h, exp] of cases) { const r = await post(base, h); console.log(r.s === exp ? "PASS" : "FAIL", base, n, r.s, r.v ?? "-", r.b); }
  const many = await Promise.all([1, 2, 3].map(() => post(base, { Authorization: `Bearer ${secret}` })));
  console.log(many.every((r) => r.s === 200) ? "PASS" : "FAIL", base, "3 concurrent valid", many.map((r) => r.s).join(","));
}
await supabaseAdmin.auth.admin.deleteUser(u.data.user!.id);
