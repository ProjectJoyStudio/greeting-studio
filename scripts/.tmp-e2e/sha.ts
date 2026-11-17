import { advanceChecksumBackfill } from "@/lib/storage/storage-admin.server";
const tot = { matched: 0, mismatched: 0, skipped: 0 }; let r: any;
const t0 = Date.now();
do { r = await advanceChecksumBackfill("ddb9c1b8-8531-4371-a5f0-ef1f10089632", 40000); tot.matched += r.matched; tot.mismatched += r.mismatched; tot.skipped += r.skipped; console.log(JSON.stringify(r)); } while (r.pending && Date.now() - t0 < 520000);
console.log("TOTAL", JSON.stringify(tot), "remaining", r.remaining);
