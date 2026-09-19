import { storeMemoryBookFile } from "../src/lib/memory-book/generated-storage.server";
import { placementsOf } from "../src/lib/storage/backup.server";
import { storageFor } from "../src/lib/storage/registry.server";
import { memoryBookFileUrl } from "../src/lib/memory-book/storage.server";
import { supabaseAdmin } from "../src/integrations/supabase/client.server";

const userId = "ddb9c1b8-8531-4371-a5f0-ef1f10089632";
const bookId = "a3a08306-acf2-4bad-9c78-378e41561fd6";
const cases = [
  { name: "design", parts: ["designs", "TEST-cover.png"], type: "image/png", legacy: "memory-book-designs" },
  { name: "improved-page", parts: ["pages", "TEST-page.png"], type: "image/png", legacy: "memory-book-designs" },
  { name: "book-music", parts: ["music", "TEST-track.mp3"], type: "audio/mpeg", legacy: "memory-book-music" },
];
const before: Record<string, number> = {};
for (const b of ["memory-book-designs", "memory-book-music"]) {
  const { data } = await supabaseAdmin.storage.from(b).list(`${userId}/${bookId}`, { limit: 1000 });
  before[b] = (data ?? []).length;
}
const keys: string[] = [];
for (const c of cases) {
  const bytes = new TextEncoder().encode(`test-${c.name}-${Date.now()}`);
  const stored = await storeMemoryBookFile({
    userId, bookId, parts: c.parts, bytes, contentType: c.type,
    legacyBucket: c.legacy, legacyPath: `${userId}/${bookId}/TEST-${c.name}`,
  });
  keys.push(stored.path);
  const pl = (await placementsOf(stored.path)).map((p) => `${p.provider}/${p.role}/${p.status}/${p.size_bytes}`);
  const url = await memoryBookFileUrl(stored.bucket, stored.path, 300);
  const res = await fetch(url!);
  console.log(c.name, "|", stored.bucket, stored.path, "|", pl.join(" "), "| read", res.status, (await res.text()).slice(0, 12));
}
for (const b of ["memory-book-designs", "memory-book-music"]) {
  const { data } = await supabaseAdmin.storage.from(b).list(`${userId}/${bookId}`, { limit: 1000 });
  console.log("legacy", b, "before", before[b], "after", (data ?? []).length);
}
await Bun.write("/tmp/test-keys.json", JSON.stringify(keys));
