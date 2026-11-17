import { r2Adapter as r2, b2Adapter as b2 } from "@/lib/storage/providers.server";
const k = `users/ddb9c1b8-8531-4371-a5f0-ef1f10089632/memory-book/50fab26c-f57d-463f-a4db-8ce248d955ab/working/photos/w2.txt`;
for (const [n, a] of [["r2", r2], ["b2", b2]] as const) {
  for (const [label, f] of [["check", () => a.check(k)], ["listVersions", () => a.listVersions(k)], ["listKeys", () => a.listKeys!(k.replace(/w2.txt$/, ""))]] as const) {
    const t = Date.now(); try { const r = await (f as any)(); console.log(n, label, Date.now() - t, "ms", JSON.stringify(r).slice(0, 120)); } catch (e) { console.log(n, label, "ERR", Date.now() - t, String(e)); }
  }
}
